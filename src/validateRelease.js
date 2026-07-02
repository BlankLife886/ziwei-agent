import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const CHECKS = [
  {
    name: "tests",
    command: "npm",
    args: ["test"]
  },
  {
    name: "knowledge",
    command: "npm",
    args: ["run", "validate:knowledge"]
  },
  {
    name: "runtime",
    command: "npm",
    args: ["run", "validate:runtime"]
  },
  {
    name: "deployment",
    command: "npm",
    args: ["run", "validate:deploy"]
  },
  {
    name: "cloudflare",
    command: "npm",
    args: ["run", "validate:cloudflare"]
  },
  {
    name: "env-example-deployment",
    command: process.execPath,
    args: ["--env-file=.env.example", "src/validateDeployment.js"]
  },
  {
    name: "diff-check",
    command: "git",
    args: ["diff", "--check"]
  }
];

async function main() {
  const results = [];
  const options = parseCliArgs(process.argv.slice(2));

  for (const check of CHECKS) {
    const result = await runCheck(check);
    results.push(result);

    if (result.status !== "passed") {
      printReleaseValidation(results);
      await writeReleaseSummaryIfRequested(results, options);
      process.exitCode = 2;
      return;
    }
  }

  printReleaseValidation(results);
  await writeReleaseSummaryIfRequested(results, options);
}

function runCheck(check) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(resolveCommand(check.command), check.args, {
      stdio: "inherit",
      env: process.env
    });

    child.on("error", (error) => {
      resolve({
        name: check.name,
        status: "failed",
        durationMs: Date.now() - startedAt,
        message: error.message
      });
    });

    child.on("close", (code) => {
      resolve({
        name: check.name,
        status: code === 0 ? "passed" : "failed",
        durationMs: Date.now() - startedAt,
        code
      });
    });
  });
}

function printReleaseValidation(results) {
  const failed = results.filter((result) => result.status !== "passed");

  console.log("发布校验：");
  console.log(`- 状态：${failed.length === 0 ? "ready" : "invalid"}`);

  for (const result of results) {
    const suffix = result.code === undefined ? "" : ` exit=${result.code}`;
    console.log(`- ${result.name}：${result.status}（${result.durationMs} ms${suffix}）`);

    if (result.message) {
      console.log(`  - ${result.message}`);
    }
  }
}

export function buildReleaseSummary(results, options = {}) {
  const failed = results.filter((result) => result.status !== "passed");

  return {
    type: "ziwei-release-validation",
    status: failed.length === 0 ? "ready" : "invalid",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    nodeVersion: process.version,
    checks: results.map((result) => {
      return {
        name: result.name,
        status: result.status,
        durationMs: result.durationMs,
        code: result.code,
        message: result.message
      };
    })
  };
}

async function writeReleaseSummaryIfRequested(results, options) {
  const summaryPath = options.summaryPath ?? process.env.ZIWEI_RELEASE_SUMMARY_PATH;

  if (!summaryPath) {
    return;
  }

  const summary = buildReleaseSummary(results);

  await mkdir(dirname(summaryPath), {
    recursive: true
  });
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`- summary：${summaryPath}`);
}

function parseCliArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== "--summary") {
      continue;
    }

    const summaryPath = args[index + 1];

    if (!summaryPath) {
      throw new Error("--summary 需要提供输出路径。");
    }

    options.summaryPath = summaryPath;
    index += 1;
  }

  return options;
}

function resolveCommand(command) {
  if (command !== "npm" || process.platform !== "win32") {
    return command;
  }

  return "npm.cmd";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("发布校验：");
    console.error("- 状态：failed");
    console.error(`- 原因：${error.message}`);
    process.exitCode = 2;
  });
}
