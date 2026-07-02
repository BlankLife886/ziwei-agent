import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const REQUIRED_WRANGLER_MARKERS = [
  'main = "src/cloudflareWorker.js"',
  'compatibility_flags = ["nodejs_compat"]',
  "[assets]",
  'directory = "./public"',
  'binding = "ASSETS"'
];

async function main() {
  const issues = [];

  await validateWranglerConfig(issues);
  await validatePackageScripts(issues);

  if (issues.length === 0) {
    const dryRun = await runWranglerDryRun();

    if (dryRun.status !== "ready") {
      issues.push(dryRun.message);
    }
  }

  printCloudflareValidation(issues);

  if (issues.length > 0) {
    process.exitCode = 2;
  }
}

async function validateWranglerConfig(issues) {
  const config = await readFile("wrangler.toml", "utf8");

  for (const marker of REQUIRED_WRANGLER_MARKERS) {
    if (!config.includes(marker)) {
      issues.push(`wrangler.toml 缺少必要配置：${marker}`);
    }
  }
}

async function validatePackageScripts(issues) {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  if (packageJson.scripts?.["deploy:cloudflare"] !== "node src/deployCloudflare.js") {
    issues.push("package.json 缺少带 release metadata 注入的 deploy:cloudflare 脚本。");
  }

  if (packageJson.scripts?.["validate:cloudflare"] !== "node src/validateCloudflare.js") {
    issues.push("package.json 缺少 validate:cloudflare 脚本。");
  }
}

function runWranglerDryRun() {
  return new Promise((resolve) => {
    const child = spawn(resolveCommand("npx"), [
      "wrangler",
      "deploy",
      "--dry-run",
      "--outdir",
      ".runtime/cloudflare-dry-run"
    ], {
      env: {
        ...process.env,
        WRANGLER_SEND_METRICS: "false"
      },
      stdio: "pipe"
    });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      resolve({
        status: "invalid",
        message: `wrangler dry-run 无法启动：${error.message}`
      });
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          status: "ready"
        });
        return;
      }

      resolve({
        status: "invalid",
        message: `wrangler dry-run 失败，exit=${code}：${summarize(stderr)}`
      });
    });
  });
}

function printCloudflareValidation(issues) {
  console.log("Cloudflare 部署校验：");
  console.log(`- 状态：${issues.length === 0 ? "ready" : "invalid"}`);
  console.log("- Worker 入口：src/cloudflareWorker.js");
  console.log("- Wrangler 配置：wrangler.toml");
  console.log("- 静态资源：Cloudflare Assets binding");

  if (issues.length === 0) {
    console.log("- 问题：0 项");
    return;
  }

  console.log("- 问题：");
  for (const issue of issues) {
    console.log(`  - ${issue}`);
  }
}

function summarize(text) {
  return text.trim().split("\n").slice(-4).join(" ");
}

function resolveCommand(command) {
  if (command !== "npx" || process.platform !== "win32") {
    return command;
  }

  return "npx.cmd";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Cloudflare 部署校验：");
    console.error("- 状态：failed");
    console.error(`- 原因：${error.message}`);
    process.exitCode = 2;
  });
}
