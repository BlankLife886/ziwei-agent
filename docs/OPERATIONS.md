# Ziwei Agent 运维手册

这份手册用于把命理师 agent 的生产运行链路固定下来。它只覆盖服务启动、部署校验、密钥轮换、健康检查、观测、故障定位和回滚，不改变排盘、解释、报告规划或发布门禁。

## 启动前门禁

部署前按顺序执行：

```bash
npm test
npm run validate:knowledge
npm run validate:architecture
node --env-file=.env src/validateRuntimeConfig.js
node --env-file=.env src/validateDeployment.js
npm run validate:release
npm run deploy:cloudflare
npm run validate:release:summary
```

门禁含义：

- `npm test`：验证排盘、agent pipeline、报告审计、HTTP API、限流、鉴权、Web UI 静态入口和部署校验。
- `validate:knowledge`：验证示例知识库 JSON store；生产若使用自定义知识库，应把 `ZIWEI_KNOWLEDGE_STORE` 指到对应文件后再跑部署校验。
- `validate:architecture`：按复杂 Agent 架构审计 Router、Context Builder、Planner、State Machine、Executor、Tool Runtime、Memory/Knowledge、Reviewer、Human-in-the-loop、Guardrails、Observability 和 Deployment；核心层缺失会阻断发布，当前底层应达到 `aligned`，后续真实资料规模化录入属于能力扩展而非架构缺口。
- `validateRuntimeConfig.js`：验证端口、请求体上限、限流、观测模式和生产鉴权配置。
- `validateDeployment.js`：复用运行时门禁，审计知识库，并临时启动同一个 HTTP server 请求 `/`、`/health`、`/v1/reports`。
- `validate:release`：串联全量测试、知识库、运行时、部署、Cloudflare dry-run、架构合规审计、`.env.example` 部署校验和 `git diff --check`；GitHub Actions 在 push/PR 上执行同一条 release gate，并额外跑 Compose 配置检查和 Docker build。
- `deploy:cloudflare`：通过 `src/deployCloudflare.js` 调用项目本地 Wrangler，并在部署时注入 `ZIWEI_RELEASE_VERSION=<package-version>+<short-commit>`、`ZIWEI_RELEASE_COMMIT=<full-commit>` 和 `ZIWEI_RELEASE_SOURCE=cloudflare-workers`，让 `/health` 与 `/ready` 能证明当前线上版本。
- `validate:release:summary`：运行同一条 release gate，并写出 `.runtime/release-summary.json`，供 CI artifact、部署平台或人工发布审计读取。也可以直接执行 `node src/validateRelease.js --summary <path>` 或设置 `ZIWEI_RELEASE_SUMMARY_PATH=<path>`。

任何一项返回非零退出码，都不应继续发布。

## 运行环境

推荐生产环境变量：

```bash
NODE_ENV=production
PORT=3000
ZIWEI_API_CREDENTIALS=[{"id":"app-client","token":"replace-with-secret","scopes":["reports:write"],"disabled":false}]
ZIWEI_API_OBSERVABILITY=stdout
ZIWEI_API_MAX_BODY_BYTES=100000
ZIWEI_API_RATE_LIMIT_WINDOW_MS=60000
ZIWEI_API_RATE_LIMIT_MAX=60
ZIWEI_API_QUOTA_STORE=.runtime/api-quota.json
ZIWEI_KNOWLEDGE_STORE=data/knowledge-snippets.example.json
ZIWEI_RELEASE_VERSION=development
ZIWEI_RELEASE_COMMIT=
ZIWEI_RELEASE_SOURCE=local
ZIWEI_RELEASE_SUMMARY_PATH=.runtime/release-summary.json
```

生产中可把密钥放进托管密钥平台或 mounted secret 文件，避免直接写在 `.env`：

```bash
ZIWEI_MANAGED_SECRET_COMMAND='["aws","secretsmanager","get-secret-value","--secret-id","ziwei-agent/runtime"]'
ZIWEI_MANAGED_SECRET_TIMEOUT_MS=5000
ZIWEI_RUNTIME_SECRETS_FILE=/run/secrets/ziwei-runtime.json
ZIWEI_API_CREDENTIALS_FILE=/run/secrets/ziwei-api-credentials
ZIWEI_API_TOKEN_FILE=/run/secrets/ziwei-api-token
ZIWEI_LLM_API_KEY_FILE=/run/secrets/ziwei-llm-api-key
```

`ZIWEI_MANAGED_SECRET_COMMAND` 必须是 JSON 字符串数组，运行时用无 shell 子进程执行。命令可以对接 AWS Secrets Manager、GCP Secret Manager、Azure Key Vault CLI 或内部 sidecar；输出必须能解析为运行时 JSON object，也支持 AWS `SecretString`、Azure `value` 和 GCP `payload.data` 包装。`ZIWEI_RUNTIME_SECRETS_FILE` 必须是 JSON object，键名沿用环境变量名，例如：

```json
{
  "ZIWEI_API_CREDENTIALS": [
    {
      "id": "app-client",
      "token": "replace-with-secret",
      "scopes": ["reports:write"]
    }
  ],
  "ZIWEI_LLM_API_KEY": "replace-with-model-key"
}
```

直接环境变量优先于托管密钥命令，托管密钥命令优先于 mounted secret 文件。命令超时、命令非零退出、secret 文件读取失败、JSON 不合法或包含未支持键时，启动校验和部署校验会失败。

## 部署模板

本仓库提供三个部署模板：

- `deploy/docker-compose.yml`：本地或单机容器运行模板，挂载 `deploy/runtime-secrets.example.json` 为 runtime secret，并把 `.runtime` 映射为持久化 volume。
- `deploy/kubernetes.yml`：Kubernetes Namespace、Secret、PVC、Deployment 和 Service 模板，包含 `/health` livenessProbe、`/ready` readinessProbe、runtime secret 挂载和 quota state PVC。
- `wrangler.toml`：Cloudflare Workers 模板，入口是 `src/cloudflareWorker.js`，静态 Web UI 通过 Cloudflare Assets binding 提供，业务 API 复用同一条 agent pipeline。

发布前必须替换模板中的示例 token 和模型 key。使用模板前仍需执行启动前门禁；模板只固定运行边界，不替代测试、知识库审计和 API smoke。

Compose 示例：

```bash
docker compose -f deploy/docker-compose.yml up --build
```

Kubernetes 示例：

```bash
kubectl apply -f deploy/kubernetes.yml
```

Cloudflare 示例：

```bash
npm run validate:cloudflare
npx wrangler secret put ZIWEI_API_CREDENTIALS
npx wrangler deploy
```

`ZIWEI_API_CREDENTIALS` 的 secret 值仍使用同一套 JSON 数组格式：

```json
[
  {
    "id": "cloudflare-client",
    "token": "replace-with-secret",
    "scopes": ["reports:write"]
  }
]
```

Cloudflare Worker 没有本地文件系统，因此不要在 Cloudflare 上使用 `ZIWEI_KNOWLEDGE_STORE`、`ZIWEI_API_QUOTA_STORE`、`ZIWEI_RUNTIME_SECRETS_FILE` 或 `*_FILE` secret 路径。Cloudflare 知识片段使用 `ZIWEI_KNOWLEDGE_SNIPPETS` 环境变量或 secret，值可以是：

```json
{
  "snippets": []
}
```

如果后续知识库规模超过 Worker 环境变量适用范围，应接入 KV、R2、D1 或外部检索服务；接入前仍要保持知识片段 schema 审计、本地或外部检索索引摘要和 `reportAuditor` 发布门禁。

Cloudflare 上线后执行真实部署验证：

```bash
BASE_URL=https://<your-worker-domain>
TOKEN=<your-reports-write-token>

curl "$BASE_URL/health"
curl "$BASE_URL/ready"
curl "$BASE_URL/openapi.json"
curl -X POST "$BASE_URL/v1/reports" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $TOKEN" \
  --data @examples/report-request.example.json
```

验证标准：

- `/health` 返回 `status=ok`，`checks.platform=cloudflare-workers`。
- `/ready` 返回 `status=ready`，`checks.agentEntry.pipeline` 仍包含 `reportPublisher`。
- `/openapi.json` 返回 OpenAPI `3.1.0`，且包含 `POST /v1/reports`。
- `POST /v1/reports` 返回 `status=published`，响应里有 `chart`、`report`、`audits.report` 和 `audits.readiness`。
- `release.source` 应为 `cloudflare-workers`，`release.commit` 应等于本次部署 commit，`release.version` 应包含包版本和短 commit。

外部大模型 provider 只通过报告生成器合同接入：

```bash
ZIWEI_REPORT_PROVIDER=external-llm
ZIWEI_LLM_ENDPOINT=https://example.com/v1/chat/completions
ZIWEI_LLM_API_KEY=replace-with-model-key
ZIWEI_LLM_MODEL=your-model
ZIWEI_LLM_TIMEOUT_MS=30000
ZIWEI_LLM_RETRY_COUNT=1
ZIWEI_LLM_MAX_RESPONSE_BYTES=200000
```

外部 provider 产出的草稿仍必须通过 `reportAuditor` 和 `reportPublisher`，不能直接对用户发布。

## API Credential 轮换

`ZIWEI_API_CREDENTIALS` 支持多 credential：

```json
[
  {
    "id": "app-client-2026-07",
    "token": "new-secret",
    "scopes": ["reports:write"],
    "disabled": false,
    "notBefore": "2026-07-02T00:00:00Z",
    "expiresAt": "2026-10-01T00:00:00Z"
  },
  {
    "id": "app-client-2026-04",
    "token": "old-secret",
    "scopes": ["reports:write"],
    "disabled": false,
    "expiresAt": "2026-07-15T00:00:00Z"
  }
]
```

轮换流程：

1. 先追加新 credential，设置 `notBefore` 和 `expiresAt`。
2. 若使用 secret 文件，先更新 mounted secret，再执行 `node --env-file=.env src/validateDeployment.js`。
3. 发布新环境变量或新 secret 版本并重启服务。
4. 客户端切换到新 token。
5. 确认观测事件中 principal id 已切到新 credential。
6. 把旧 credential 设置 `disabled: true` 或等待 `expiresAt` 到期。
7. 再次执行部署校验。

生产模式下，若不存在当前可用的 `reports:write` credential，服务启动校验会失败。

## 健康检查

`GET /health` 是 liveness 探针：

- 不读取请求体。
- 不消耗业务限流配额。
- 返回 `status`、`service`、`requestId`、`release` 和 `checks`。
- `checks.knowledgeSnippetCount` 表示当前服务启动时加载进来的可用知识片段数量。

`GET /ready` 是 readiness 探针：

- 不读取请求体。
- 不消耗业务限流配额。
- 返回 release metadata、runtime、agent 入口、知识库加载状态和报告 provider 配置状态。
- 当 `ZIWEI_REPORT_PROVIDER=external-llm` 但缺少 `ZIWEI_LLM_ENDPOINT`、`ZIWEI_LLM_API_KEY` 或 `ZIWEI_LLM_MODEL` 时返回 503。
- 收到 `SIGTERM` 或 `SIGINT` 后会进入 draining，`checks.runtime.status` 变为 `not_ready`，用于让部署平台停止转发新请求。

示例：

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
curl http://localhost:3000/openapi.json
```

停机流程：

1. 部署平台发送 `SIGTERM`。
2. 服务标记 draining，`/ready` 返回 503，`/health` 继续返回 200。
3. HTTP server 停止接收新连接，并等待已有请求结束。
4. 若关闭超时，进程以非零状态退出，便于平台记录异常。

Web UI 入口是：

```text
http://localhost:3000/
```

页面只调用 `POST /v1/reports`，不在前端重新排盘或生成解释。

## 观测和诊断

设置：

```bash
ZIWEI_API_OBSERVABILITY=stdout
```

服务会输出 JSON 事件：

- `api.request.started`
- `api.request.completed`
- `api.request.blocked`
- `api.request.failed`

事件会脱敏：

- `authorization`
- API key
- 完整请求体

诊断时优先看：

- `requestId`
- `statusCode`
- `responseStatus`
- `diagnostics.buildStatus`
- `diagnostics.reportPlanStatus`
- `diagnostics.reportGenerationStatus`
- `diagnostics.reportOutputStatus`
- `authorization.principalId`

## 常见阻断

`401 unauthorized`：

- 缺少 bearer token。
- token 错误。
- credential 已禁用、未生效或过期。

`403 forbidden`：

- token 存在，但缺少 `reports:write` scope。

`413 payload_too_large`：

- 请求体超过 `ZIWEI_API_MAX_BODY_BYTES`。

`429 rate_limited`：

- 身份或 IP 超过 `ZIWEI_API_RATE_LIMIT_MAX`。
- 若使用文件配额存储，重启后仍会沿用未过期窗口。

`409` 或报告未发布：

- agent 链路被报告规划、报告生成或报告审计阻断。
- 先看响应中的 `audits` 和 `diagnostics`。

## 回滚

回滚时保持三个原则：

1. 回滚代码前先保存当前 `.env` 和 `.runtime/api-quota.json`。
2. 回滚后必须执行 `node --env-file=.env src/validateDeployment.js`。
3. 若涉及 credential 轮换，确认旧 token 仍在生命周期窗口内，或临时启用一个新的 `reports:write` credential。

如果外部大模型 provider 造成报告生成阻断，可以先移除：

```bash
ZIWEI_REPORT_PROVIDER=
ZIWEI_LLM_ENDPOINT=
ZIWEI_LLM_API_KEY=
ZIWEI_LLM_MODEL=
```

默认确定性 provider 会继续走同一条报告规划、审计和发布链路。

## 发布完成检查

发布后执行：

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
npm run smoke:api
node --env-file=.env src/validateDeployment.js
npm run validate:architecture
npm run validate:release
npm run validate:release:summary
```

同时人工确认：

- Web UI 可以打开。
- `/openapi.json` 返回 OpenAPI 3.1，且包含 `POST /v1/reports`。
- 示例命盘可以生成命盘图和报告。
- 响应包含 `chart`、`report`、`audits`、`diagnostics`。
- 报告章节仍保留 `evidenceRefs`、`referenceRefs`、`sourceRefs`、`knowledgeSnippetRefs`、`interpretationRefs`。
