import { loadKnowledgeSnippetStore } from "./agent/knowledgeSnippetStore.js";
import { runApiSmokeCheck } from "./smokeApi.js";
import { buildServerRuntimeConfig } from "./serverRuntimeConfig.js";

async function main() {
  const env = process.env;
  const runtimeConfig = buildServerRuntimeConfig(env);
  const checks = [];
  const issues = [];

  checks.push({
    name: "runtime",
    status: runtimeConfig.status
  });
  issues.push(...runtimeConfig.issues);

  if (runtimeConfig.status === "ready" && runtimeConfig.values.knowledgeStorePath) {
    const knowledgeStore = await loadKnowledgeSnippetStore(runtimeConfig.values.knowledgeStorePath);

    checks.push({
      name: "knowledge",
      status: knowledgeStore.status,
      count: knowledgeStore.snippets.length
    });

    if (knowledgeStore.status !== "ready") {
      issues.push(...knowledgeStore.issues.map((issue) => {
        return issue.snippetId
          ? `${issue.snippetId}: ${issue.message}`
          : issue.message;
      }));
    }
  } else if (runtimeConfig.status === "ready") {
    checks.push({
      name: "knowledge",
      status: "skipped"
    });
  }

  if (issues.length === 0) {
    const smokeResult = await runApiSmokeCheck({ env });

    checks.push({
      name: "api-smoke",
      status: smokeResult.status
    });

    if (smokeResult.status !== "ready") {
      issues.push(...smokeResult.issues);
    }
  }

  printDeploymentValidation({
    checks,
    issues
  });

  if (issues.length > 0) {
    process.exitCode = 2;
  }
}

function printDeploymentValidation({ checks, issues }) {
  console.log("部署校验：");
  console.log(`- 状态：${issues.length === 0 ? "ready" : "invalid"}`);

  for (const check of checks) {
    const suffix = check.count === undefined ? "" : `（${check.count} 项）`;
    console.log(`- ${check.name}：${check.status}${suffix}`);
  }

  if (issues.length === 0) {
    console.log("- 问题：0 项");
    return;
  }

  console.log("- 问题：");

  for (const issue of issues) {
    console.log(`  - ${issue}`);
  }
}

main().catch((error) => {
  console.error("部署校验：");
  console.error("- 状态：failed");
  console.error(`- 原因：${error.message}`);
  process.exitCode = 2;
});
