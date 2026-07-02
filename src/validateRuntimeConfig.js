import { resolveRuntimeEnv } from "./runtimeEnv.js";
import { buildServerRuntimeConfig } from "./serverRuntimeConfig.js";

const runtimeEnv = resolveRuntimeEnv(process.env);
const config = buildServerRuntimeConfig(runtimeEnv.env);
const issues = [
  ...runtimeEnv.issues,
  ...config.issues
];

console.log("运行时配置校验：");
console.log(`- 状态：${issues.length === 0 ? "ready" : "invalid"}`);
console.log(`- 端口：${config.values.port}`);
console.log(`- 请求体上限：${config.values.maxBodyBytes} bytes`);
console.log(`- 限流窗口：${config.values.rateLimitWindowMs} ms`);
console.log(`- 限流次数：${config.values.rateLimitMaxRequests}`);
console.log(`- 观测模式：${config.values.observabilityMode}`);
console.log(`- 配额存储：${config.values.quotaStorePath ?? "memory"}`);
console.log(`- 知识库：${config.values.knowledgeStorePath ?? "none"}`);
console.log(`- release version：${config.values.release.version}`);
console.log(`- release commit：${config.values.release.commit ?? "none"}`);
console.log(`- release summary：${config.values.release.summaryConfigured ? "configured" : "none"}`);
console.log(`- secret 来源：${runtimeEnv.secretSources.length} 项`);

if (issues.length > 0) {
  console.log("- 问题：");
  for (const issue of issues) {
    console.log(`  - ${issue}`);
  }
  process.exitCode = 2;
} else {
  console.log("- 问题：0 项");
}
