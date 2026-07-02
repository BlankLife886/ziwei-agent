import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CLOUDFLARE_RELEASE_SOURCE = "cloudflare-workers";

export function buildCloudflareReleaseMetadata({
  packageJsonPath = "package.json",
  gitHead = readGitHead()
} = {}) {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const shortCommit = gitHead.slice(0, 7);

  return {
    // Keep this shell-safe and accepted by serverRuntimeConfig's release text parser.
    version: `${packageJson.version}+${shortCommit}`,
    commit: gitHead,
    source: CLOUDFLARE_RELEASE_SOURCE
  };
}

export function buildWranglerDeployArgs(releaseMetadata, passthroughArgs = []) {
  return [
    "deploy",
    "--var",
    `ZIWEI_RELEASE_VERSION:${releaseMetadata.version}`,
    "--var",
    `ZIWEI_RELEASE_COMMIT:${releaseMetadata.commit}`,
    "--var",
    `ZIWEI_RELEASE_SOURCE:${releaseMetadata.source}`,
    ...passthroughArgs
  ];
}

export function runCloudflareDeploy({
  releaseMetadata = buildCloudflareReleaseMetadata(),
  passthroughArgs = process.argv.slice(2)
} = {}) {
  const wranglerPath = resolveLocalWranglerPath();
  const args = buildWranglerDeployArgs(releaseMetadata, passthroughArgs);

  // Use the project-local Wrangler binary so deployment behavior follows package-lock.
  // Secrets remain managed by Cloudflare; only non-secret release metadata is injected here.
  const child = spawn(wranglerPath, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: "false"
    }
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exitCode = code ?? 1;
  });

  child.on("error", (error) => {
    console.error(`Cloudflare 部署无法启动：${error.message}`);
    process.exitCode = 1;
  });
}

function readGitHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim();
}

function resolveLocalWranglerPath() {
  return join(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "wrangler.cmd" : "wrangler"
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCloudflareDeploy();
}
