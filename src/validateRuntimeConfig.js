import { buildServerRuntimeConfig } from "./serverRuntimeConfig.js";

const config = buildServerRuntimeConfig(process.env);

console.log("运行时配置校验：");
console.log(`- 状态：${config.status}`);
console.log(`- 端口：${config.values.port}`);
console.log(`- 请求体上限：${config.values.maxBodyBytes} bytes`);
console.log(`- 限流窗口：${config.values.rateLimitWindowMs} ms`);
console.log(`- 限流次数：${config.values.rateLimitMaxRequests}`);
console.log(`- 观测模式：${config.values.observabilityMode}`);
console.log(`- 配额存储：${config.values.quotaStorePath ?? "memory"}`);
console.log(`- 知识库：${config.values.knowledgeStorePath ?? "none"}`);

if (config.issues.length > 0) {
  console.log("- 问题：");
  for (const issue of config.issues) {
    console.log(`  - ${issue}`);
  }
  process.exitCode = 2;
} else {
  console.log("- 问题：0 项");
}
