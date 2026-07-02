import { readFile } from "node:fs/promises";
import { createZiweiHttpServer } from "./server.js";
import { parseApiCredentialsFromRuntime } from "./agent/apiCredentials.js";
import { loadKnowledgeSnippetStore } from "./agent/knowledgeSnippetStore.js";
import { buildServerRuntimeConfig } from "./serverRuntimeConfig.js";

const DEFAULT_PROFILE_PATH = "examples/profile.example.json";
const DEFAULT_QUERY = "我想看婚姻、事业、财富和当前运势";

async function main() {
  const env = process.env;
  const runtimeConfig = buildServerRuntimeConfig(env);

  // Smoke 校验先复用生产启动前的同一套配置门禁，避免出现“脚本能跑、
  // 服务不能启动”的假阳性。
  if (runtimeConfig.status !== "ready") {
    printFailure("运行时配置不合格", runtimeConfig.issues);
    process.exitCode = 2;
    return;
  }

  // 这里启动的是项目真实 HTTP server，而不是直接调用 pipeline。
  // 目的在于同时覆盖鉴权、请求体解析、知识库加载、限流参数和报告发布门禁。
  const knowledgeStore = runtimeConfig.values.knowledgeStorePath
    ? await loadKnowledgeSnippetStore(runtimeConfig.values.knowledgeStorePath)
    : { snippets: [] };
  const profile = JSON.parse(await readFile(DEFAULT_PROFILE_PATH, "utf8"));
  const server = createZiweiHttpServer({
    env,
    knowledgeSnippets: knowledgeStore.snippets,
    maxBodyBytes: runtimeConfig.values.maxBodyBytes,
    rateLimitWindowMs: runtimeConfig.values.rateLimitWindowMs,
    rateLimitMaxRequests: runtimeConfig.values.rateLimitMaxRequests,
    observabilityMode: "off"
  });

  await listen(server);

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    await assertHealth(baseUrl);
    await assertReport(baseUrl, {
      env,
      profile
    });

    console.log("API smoke 校验：");
    console.log("- 状态：ready");
    console.log("- /health：通过");
    console.log("- /v1/reports：通过");
    console.log("- 结果：HTTP 入口到 agent 报告发布链路可用");
  } finally {
    await close(server);
  }
}

async function assertHealth(baseUrl) {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  if (response.status !== 200 || body.status !== "ok") {
    throw new Error(`health check failed: ${response.status} ${body.status}`);
  }
}

async function assertReport(baseUrl, { env, profile }) {
  // 使用示例命盘做最小可复现请求：只判断链路发布成功和关键产物存在，
  // 不在 smoke 阶段绑定具体文案，避免把内容迭代变成部署阻断。
  const response = await fetch(`${baseUrl}/v1/reports`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...buildAuthHeaders(env)
    },
    body: JSON.stringify({
      profile,
      query: DEFAULT_QUERY
    })
  });
  const body = await response.json();

  if (response.status !== 200 || body.status !== "published") {
    throw new Error(`report check failed: ${response.status} ${body.status}`);
  }

  if (!body.chart || body.report?.status !== "published") {
    throw new Error("report check failed: missing published chart or report");
  }

  if (!body.audits?.readiness || typeof body.audits.readiness.percent !== "number") {
    throw new Error("report check failed: readiness audit did not run");
  }
}

function buildAuthHeaders(env) {
  // 如果环境启用了 bearer credential，smoke 脚本自动选取第一个具备
  // reports:write 权限的凭证；本地未配置鉴权时则走匿名开发模式。
  const credential = parseApiCredentialsFromRuntime({ env }).find((item) => {
    return item.scopes.includes("*") || item.scopes.includes("reports:write");
  });

  if (!credential) {
    return {};
  }

  return {
    authorization: `Bearer ${credential.token}`
  };
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
}

function close(server) {
  return new Promise((resolve) => {
    server.close(resolve);
  });
}

function printFailure(title, details) {
  console.error("API smoke 校验：");
  console.error(`- 状态：invalid`);
  console.error(`- 原因：${title}`);

  for (const detail of details) {
    console.error(`  - ${detail}`);
  }
}

main().catch((error) => {
  console.error("API smoke 校验：");
  console.error("- 状态：failed");
  console.error(`- 原因：${error.message}`);
  process.exitCode = 2;
});
