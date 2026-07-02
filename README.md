# Ziwei Agent

教学型紫微斗数命理师 agent 原型，使用 Node.js 构建。

最终产品目标不是只输出排盘或本命盘草稿，而是让用户输入出生资料和咨询主题后，先得到结构化命盘，再由 agent 按文献、知识库、规则计算和大模型归纳逐层生成用户报告。报告方向包括综合命盘、性格画像、婚姻感情、事业发展、财富资源、阶段运势，以及因果、前世今生等偏象征性和文化诠释的主题。当前代码仍处在底层建设阶段，已支持部分报告领域的证据链底稿；尚未支持的主题会先登记为最终报告目标，并明确标注不能输出深入断语。

当前阶段实现了出生资料采集、历法转换、命宫/身宫计算、五行局计算、十四主星基础落宫，左辅、右弼、天刑、天姚、天月、天巫等月系辅星，三台、八座等日系辅星，禄存、擎羊、陀罗、天魁、天钺、天官、天福、天厨等年干星曜，截空等空曜，火星、铃星等基础煞曜，生年四化，大限年龄段，按分析日期定位当前大限、流年和流月，并能基于大限、流年、流月和四化重叠生成安全触发观察点、组合验证主题、组合主题解释、跨宫跨限运关系和报告专题细分任务单。排盘流程已经抽成可复用的 `chartBuilder` 服务，并加入命理师 agent 外壳，用“分析上下文 -> 报告规划 -> 报告生成器合同 -> provider 选择 -> 正文草稿 -> 报告审计 -> 用户报告发布”的流程组织命盘证据、分析重点、当前能力边界和输出安全检查。报告生成器已支持同步/异步 provider，并提供通用外部 HTTP 大模型 provider 适配器；该适配器带有超时、重试、响应大小限制和脱敏诊断，外部模型产出的草稿仍必须通过报告审计和发布门禁。HTTP API 入口已加入请求追踪、结构化观测、请求大小限制、多凭证 scoped bearer 鉴权、credential 托管密钥命令桥接、secret 文件载入、内存限流和可选文件持久化配额，并提供轻量 Web UI 展示生辰输入、命盘图和审计后报告。事业、财富、婚姻和当前阶段运势已支持结构性底稿，但仍不能推具体年份事件、月份事件、应期、吉凶、婚恋结果、职位结果或财富结果。后续会在此基础上加入资料检索、命理分析和完整报告生成。

## 架构文档

- [紫微斗数 Agent 架构与审计说明](docs/AGENT_ARCHITECTURE.md)
- [Ziwei Agent 运维手册](docs/OPERATIONS.md)

## 运行

```bash
npm start
npm run serve
npm run validate:runtime
npm run validate:deploy
npm run validate:release
npm run validate:release:summary
npm run smoke:api
node src/cli.js examples/profile.example.json
node src/cli.js examples/profile.example.json data/knowledge-snippets.example.json
npm run validate:knowledge
npm run knowledge:draft -- --input examples/knowledge-candidate.example.json --output .runtime/knowledge-draft.json
npm run knowledge:promote -- --input .runtime/knowledge-draft.json --output .runtime/knowledge-verified.json
npm run knowledge:append -- --input .runtime/knowledge-verified.json --store data/knowledge-snippets.example.json --output .runtime/knowledge-snippets.next.json
npm run knowledge:draft-batch -- --input examples/knowledge-candidates.example.json --output .runtime/knowledge-drafts.json
npm run knowledge:promote-batch -- --input .runtime/knowledge-drafts.json --output .runtime/knowledge-verified-batch.json
npm run knowledge:append-batch -- --input .runtime/knowledge-verified-batch.json --store data/knowledge-snippets.example.json --output .runtime/knowledge-snippets.batch.next.json
```

`npm start` 会加载 `data/knowledge-snippets.example.json`，用于演示“verified 知识片段 -> 报告规划 -> 知识覆盖审计 -> 用户报告引用”的闭环。这个示例知识库目前包含本地审校分析框架样本和专题知识笔记，覆盖命宫、性格、婚姻、财富、事业和当前阶段运势；它不代表用户提供的 PDF、书籍和扫描件已经完成全量结构化录入。

书籍、PDF、OCR 或研读笔记进入 agent 时，先整理为 candidate JSON，再用 `knowledge:draft` 标准化为 draft；人工复核字段、来源、主题和规则引用后，用 `knowledge:promote` 晋升为 verified；最后用 `knowledge:append` 追加到知识库。批量资料可用 `knowledge:draft-batch`、`knowledge:promote-batch` 和 `knowledge:append-batch` 处理 `{ "candidates": [...] }` 或 `{ "snippets": [...] }` 队列。`append` 和 `append-batch` 会拒绝 draft、重复 id 和追加后无法通过全库审计的 store。示例里把追加结果写到 `.runtime/knowledge-snippets.next.json`，便于先审计，再决定是否覆盖正式知识库。

如果要让 CLI 走外部大模型报告 provider，可设置以下环境变量：

```bash
ZIWEI_REPORT_PROVIDER=external-llm \
ZIWEI_LLM_ENDPOINT=https://example.com/v1/chat/completions \
ZIWEI_LLM_API_KEY=your-api-key \
ZIWEI_LLM_MODEL=your-model \
ZIWEI_LLM_TIMEOUT_MS=30000 \
ZIWEI_LLM_RETRY_COUNT=1 \
ZIWEI_LLM_MAX_RESPONSE_BYTES=200000 \
node src/cli.js examples/profile.example.json data/knowledge-snippets.example.json
```

外部 provider 缺少配置、请求失败、请求超时、响应过大或响应无法解析为 `reportDraft` 时，pipeline 会阻断发布，不会把未审计内容输出为用户报告。

如果要通过 HTTP API 调用 agent，可启动服务：

```bash
cp .env.example .env
node --env-file=.env src/validateRuntimeConfig.js
node --env-file=.env src/validateDeployment.js
node --env-file=.env src/smokeApi.js
node --env-file=.env src/server.js
```

启动后可打开：

```text
http://localhost:3000/
```

页面会调用同一个 `POST /v1/reports`，不会绕过报告规划、报告审计或发布门禁。

或直接设置环境变量：

```bash
ZIWEI_API_TOKEN=local-secret \
ZIWEI_API_CREDENTIALS='[{"id":"app-client","token":"app-secret","scopes":["reports:write"],"disabled":false}]' \
ZIWEI_KNOWLEDGE_STORE=data/knowledge-snippets.example.json \
ZIWEI_API_OBSERVABILITY=stdout \
ZIWEI_API_RATE_LIMIT_WINDOW_MS=60000 \
ZIWEI_API_RATE_LIMIT_MAX=60 \
ZIWEI_API_QUOTA_STORE=.runtime/api-quota.json \
npm run serve
```

随后请求：

```bash
curl -X POST http://localhost:3000/v1/reports \
  -H "authorization: Bearer local-secret" \
  -H "content-type: application/json" \
  -d '{"profile":{"name":"示例命主","gender":"female","calendar":"solar","birth_date":"1990-05-18","birth_time":"23:30","birth_place":"Shanghai, China","timezone":"Asia/Shanghai","use_true_solar_time":false,"is_leap_month":false,"analysis_date":"2026-07-01"},"query":"我想看婚姻和今年运势"}'
```

API 入口同样只调用统一 agent pipeline；它不会绕过报告规划、报告审计或发布门禁。

API 鉴权支持两种配置：`ZIWEI_API_TOKEN` 是兼容旧路径的单 token，会自动获得 `reports:write` 权限；`ZIWEI_API_CREDENTIALS` 支持 JSON 数组，每个元素包含 `id`、`token` 和 `scopes`，并可选 `disabled`、`notBefore`、`expiresAt` 做禁用、生效时间和过期控制。`POST /v1/reports` 需要当前可用的 `reports:write`，token 缺失或错误返回 401，token 已禁用、未生效、已过期或 scope 不足也会被拒绝。响应和日志只暴露 principal id 和 scopes，不回显 token。

生产环境可以不把密钥直接写进 `.env`。`ZIWEI_MANAGED_SECRET_COMMAND` 可配置为 JSON argv 数组，用无 shell 子进程从托管密钥平台 CLI 或 sidecar 拉取 secret；命令输出支持运行时 JSON object、AWS `SecretString`、Azure `value` 或 GCP `payload.data` 形态。`ZIWEI_RUNTIME_SECRETS_FILE` 可指向一个 JSON object，支持 `ZIWEI_API_CREDENTIALS`、`ZIWEI_API_TOKEN`、`ZIWEI_LLM_API_KEY`、`ZIWEI_LLM_ENDPOINT`、`ZIWEI_LLM_MODEL` 等运行时键；也可用 `ZIWEI_API_CREDENTIALS_FILE`、`ZIWEI_API_TOKEN_FILE`、`ZIWEI_LLM_API_KEY_FILE` 分别指向单项 secret 文件。直接环境变量优先于托管密钥和文件内容；secret 命令失败、secret 文件无法读取、JSON 不合法或包含未支持键时，运行时校验和部署校验会 fail closed。

每个 API 响应都会返回 `x-request-id`，响应体也包含同一个 `requestId`。`GET /health` 是轻量 liveness 探针，不消耗业务限流配额，并返回 HTTP、agent 入口和已加载知识片段数量；`GET /ready` 是部署 readiness 探针，会检查 runtime、agent 入口、知识库加载状态和报告 provider 配置，外部大模型 provider 缺少 endpoint、API key 或 model 时返回 503。业务 API 限流默认窗口为 60 秒、每个身份 60 次请求；如果存在 bearer token，限流按 token 哈希分桶，否则按 `x-forwarded-for` 或远端地址分桶。超过配额会返回 `429 rate_limited` 和 `retryAfterMs`。默认配额只保存在进程内存；设置 `ZIWEI_API_QUOTA_STORE` 后，窗口计数会写入 JSON 文件，服务重启后仍会沿用尚未过期的窗口。配额文件读取或写入失败时限流器会 fail closed，阻断请求，避免异常状态下无限放行。当 `ZIWEI_API_OBSERVABILITY=stdout` 时，服务会输出 JSON 结构化事件，包括请求开始、完成、阻断或失败状态；事件会脱敏 `authorization`、API key 和完整 body。

`GET /openapi.json` 返回 OpenAPI 3.1 合同，覆盖 `/health`、`/ready` 和 `POST /v1/reports`。它用于外部调用方、前端和部署检查对齐当前真实 API 边界，不声明尚未实现的报告能力。

`ZIWEI_RELEASE_VERSION`、`ZIWEI_RELEASE_COMMIT`、`ZIWEI_RELEASE_SOURCE` 和 `ZIWEI_RELEASE_SUMMARY_PATH` 用于运行实例追溯；`/health` 与 `/ready` 会返回脱敏 release metadata，方便部署后确认当前实例对应哪次构建和是否配置 release summary。该信息只属于运维层，不参与排盘、解释或用户报告生成。

服务收到 `SIGTERM` 或 `SIGINT` 时会进入 draining 状态：`/ready` 立即返回 `not_ready`，让部署平台停止转发新流量；`/health` 仍保持可用，随后 HTTP server 关闭并等待现有连接退出。Kubernetes 模板设置了 `terminationGracePeriodSeconds: 30` 配合这条链路。

生产模式下（`NODE_ENV=production`，或显式设置 `ZIWEI_REQUIRE_API_AUTH=true`），服务启动前会校验 API credential、端口、请求体上限、限流窗口、限流次数和观测模式。生产部署必须提供 `ZIWEI_API_TOKEN` 或至少一个当前可用且带 `reports:write` scope 的 `ZIWEI_API_CREDENTIALS`；配置不合格时服务不会启动。

部署前可以运行 `npm run validate:deploy`。它会复用运行时配置门禁，检查已配置知识库是否通过审计，并临时启动同一个 HTTP server 请求 `/health`、`/ready` 与 `/v1/reports`，确认入口到用户报告发布链路可用。

发布前可以运行 `npm run validate:release`。它会串联全量测试、知识库校验、运行时配置校验、部署 smoke、`.env.example` 部署校验和 `git diff --check`。`npm run validate:release:summary` 会运行同一条门禁，并把机器可读结果写入 `.runtime/release-summary.json`；也可以直接用 `node src/validateRelease.js --summary <path>` 或 `ZIWEI_RELEASE_SUMMARY_PATH=<path>` 指定输出路径。GitHub Actions 会在 push/PR 上执行同一条 release gate，并额外验证 Compose 模板和 Docker build。

生产发布、密钥轮换、健康检查、观测诊断和回滚流程见 [运维手册](docs/OPERATIONS.md)。

Docker 构建和运行示例：

```bash
docker build -t ziwei-agent .
docker run --rm -p 3000:3000 \
  --env-file .env \
  -v "$PWD/.runtime:/app/.runtime" \
  ziwei-agent
```

也可以使用部署模板：

```bash
docker compose -f deploy/docker-compose.yml up --build
kubectl apply -f deploy/kubernetes.yml
```

`deploy/docker-compose.yml` 和 `deploy/kubernetes.yml` 都示范了 runtime secret 文件、配额文件持久化、`/health` liveness 和 `/ready` readiness。模板里的 secret 是示例值，生产发布前必须替换。

## 当前模块

- `src/intake.js`: 校验用户出生资料，并把出生时间标准化为十二时辰。
- `src/calendarConverter.js`: 把公历生日转换为农历生日，供排盘模块使用。
- `src/chart.js`: 定义命盘数据结构，包括十二宫、主星、辅星、煞曜、空曜、四化和命盘骨架。
- `src/chartBuilder.js`: 编排输入校验、历法转换和各类排盘规则，输出可供 CLI、API 或 agent 使用的结构化命盘。
- `src/agent/ziweiPipeline.js`: 统一编排 agent 主流程，把排盘结果转换为分析上下文、报告规划、正文草稿、报告审计和用户报告。
- `src/agent/agentReadinessAuditor.js`: 按工程能力项审计 agent 完整度，输出当前进度、阻塞项和下一步优先级；该进度不是命理准确率。
- `src/agent/intakeSession.js`: 维护多轮输入中的出生资料草稿，把用户新补充的字段合并后重新调用完整 agent 流程。
- `src/agent/ziweiApiHandler.js`: 把 HTTP/API 请求转换为统一 agent pipeline 调用，提供请求大小限制、可选 bearer 鉴权、健康检查和基础请求诊断。
- `src/agent/apiCredentials.js`: 解析 API credential 配置，执行 bearer token 和 scope 鉴权，并只向下游暴露脱敏 principal 摘要。
- `src/agent/apiObservability.js`: 生成 API 结构化观测事件，并对鉴权头、API key 和完整请求体做脱敏。
- `src/agent/apiQuotaStore.js`: 提供内存和 JSON 文件两种 API 配额窗口存储，供限流器选择使用。
- `src/agent/apiRateLimiter.js`: 提供服务入口使用的限流器，按 bearer token 或客户端地址分桶，并可接入内存或文件配额存储。
- `public/`: 轻量 Web UI，展示生辰输入、命盘十二宫图和已发布用户报告；所有结果仍来自 HTTP API。
- `src/runtimeEnv.js`: 解析托管密钥命令、运行时 secret 文件和单项 secret 文件，把密钥配置汇合成服务、校验和 smoke 使用的 resolved env。
- `src/openApiDocument.js`: 输出当前 HTTP API 的 OpenAPI 合同，供 `/openapi.json` 和测试复用。
- `src/serverRuntimeConfig.js`: 校验 API 服务运行时配置，生产模式下要求可用鉴权配置，并整理 release/build 元数据。
- `src/validateRuntimeConfig.js`: 命令行运行时配置校验入口，供部署前检查环境变量。
- `src/validateDeployment.js`: 部署前校验入口，串联运行时配置、知识库审计和 API smoke。
- `src/validateRelease.js`: 发布前总门禁，串联测试、知识库、运行时、部署、示例环境和 diff 检查，并可输出机器可读 release summary。
- `deploy/`: Compose、Kubernetes 和 runtime secret 示例，固定生产部署时的 secret、探针和 quota state 约定。
- `src/agent/profilePatchParser.js`: 把用户自然语言补充转换为可审计的结构化资料 patch，支持出生资料和分析日期，并保留字段来源片段。
- `src/agent/queryIntentParser.js`: 把“看当前大限 / 看事业 / 看财帛 / 看运势 / 看四化”等自然语言问题转换为可审计的查询意图，用于收敛本轮报告章节，并保留事业、财帛、迁移等专题上下文。
- `src/agent/reportDomainCatalog.js`: 定义最终用户报告领域，包括性格、事业、财富、婚姻、运势、因果、前世今生等，并标注当前支持程度和缺失能力。
- `src/agent/referenceCatalog.js`: 定义本地规则、分析框架引用 id 和本地来源目录，后续可映射到书籍、PDF、笔记或知识库片段。
- `src/agent/timingTriggerCatalog.js`: 基于当前大限、流年太岁、流月月建、生年四化、大限四化和流年四化生成安全触发观察点，只输出待验证主题，不生成事件断语。
- `src/agent/timingCombinationVerifier.js`: 对安全触发候选做多层信号验证，只把证据层数和强度达标的观察点交给报告合参。
- `src/agent/timingCombinationThemeInterpreter.js`: 把已通过组合验证的宫位转成当前阶段合参主题，例如关系、资源、外部环境或制度支持，仍不输出事件、应期或结果。
- `src/agent/timingCrossLayerInterpreter.js`: 把已验证阶段主题与当前大限、流年、流月定位之间的同宫或分宫关系整理为跨层合参结构，仍不输出事件、应期或结果。
- `src/agent/topicRefinementInterpreter.js`: 把报告章节整理为专题角度、证据范围和禁止断语，供确定性报告器和未来大模型按任务单写作。
- `src/agent/knowledgeSnippetCatalog.js`: 定义外部书籍、PDF、笔记和知识库片段的 schema、审计和检索接口；只有字段完整、来源已登记且 `status` 为 `verified` 的片段才允许进入报告规划，当前示例包含本地审校框架样本和专题知识笔记，不把未录入内容作为报告依据。
- `src/agent/knowledgeSnippetIngestor.js`: 把候选摘录或研读笔记标准化为 draft 知识片段，并提供晋升为 verified 的门禁，避免未复核材料直接进入报告依据。
- `src/agent/knowledgeSnippetStore.js`: 从 JSON 文件加载 verified 知识片段，逐条审计后只把通过的片段交给报告规划。
- `src/manageKnowledgeSnippets.js`: 提供 `draft`、`draft-batch`、`promote`、`promote-batch`、`append`、`append-batch` 知识片段管理命令，把 PDF/OCR/研读笔记候选摘录纳入可审计的入库流程。
- `src/agent/interpretationCatalog.js`: 定义当前可用的命理解释条目，让报告正文引用受控解释，而不是直接散写断语。
- `src/agent/inputQuestionnaire.js`: 把缺失字段转换为结构化追问，包括字段名、提问话术、示例和追问原因，方便后续接入聊天 UI 或多轮 agent。
- `src/agent/ziweiAgent.js`: 根据排盘结果生成 agent 分析上下文，包括核心证据、建议分析重点和当前限制；核心证据同时保留文本和结构化 `evidenceItems`。
- `src/agent/reportSectionCatalog.js`: 集中定义各类报告章节的标题、目的、引导问题、写作提示和解释引用构造规则。
- `src/agent/reportPlanner.js`: 把 agent 分析上下文转换为报告草稿章节，包括写作问题、可用证据、`evidenceRefs`、`referenceRefs`、`interpretationRefs` 和写作边界。
- `src/agent/knowledgeCoverageAuditor.js`: 审计报告章节是否已有 verified 外部知识片段，防止把只有本地规则支撑的保守底稿包装成知识库充分支撑的深入报告。
- `src/agent/reportGenerator.js`: 定义报告生成器合同层，把 report plan、证据、引用、知识片段、解释条目、专题细分任务单和 guardrails 组织为 generation context；当前默认 provider 使用确定性模板，也支持选择外部大模型 provider。若选择外部大模型但未配置可调用 provider，会在生成前阻断，避免绕过审计链路。
- `src/agent/externalLLMReportProvider.js`: 把 generation context 包装成外部 HTTP 大模型请求，并把返回结果解析为 `reportDraft`；缺配置、HTTP 失败、超时、响应过大或解析失败都会阻断后续发布，并返回不含密钥和请求体的诊断信息。
- `src/agent/reportComposer.js`: 根据报告规划生成保守的正文草稿，确保每段内容能通过 `evidenceRefs` 回指到已有证据，并通过 `referenceRefs` 回指到规则/分析框架。
- `src/agent/reportAuditor.js`: 审计报告草稿是否遵守章节引用契约，并扫描未被边界约束的高风险断语。
- `src/agent/reportPublisher.js`: 作为最终发布门禁，只有审计通过的草稿才会转换成可交付的用户报告。
- `src/formatters.js`: 把结构化排盘结果转换为 CLI 展示文本，避免展示逻辑混入排盘流程。
- `src/palaceCalculator.js`: 根据农历月份和出生时辰计算命宫、身宫。
- `src/fiveElementClassCalculator.js`: 根据出生年干、命宫干支和纳音计算五行局。
- `src/mainStarCalculator.js`: 根据农历生日和五行局计算紫微星落宫，并按口诀安紫微星系、天府星系。
- `src/auxiliaryStarCalculator.js`: 根据农历月份计算左辅、右弼等辅星。
- `src/yearStemStarCalculator.js`: 根据出生年干计算禄存、擎羊、陀罗、天魁、天钺、天官、天福、天厨、截空等星曜。
- `src/maleficStarCalculator.js`: 根据出生年支和出生时辰计算火星、铃星等煞曜。
- `src/fourTransformationCalculator.js`: 根据出生年干、当前大限宫干和流年天干计算生年四化、大限四化与流年四化，并把结构化四化证据挂回命盘。
- `src/majorPeriodCalculator.js`: 根据五行局与阴阳男女规则计算大限年龄段，并在提供分析日期时按虚岁定位当前大限。
- `src/monthlyPeriodCalculator.js`: 根据分析日期换算农历月份，并按月建地支定位流月所在本命宫位。
- `src/cli.js`: 命令行入口，用于实战测试输入资料。
- `src/server.js`: Node HTTP 服务入口，暴露 `/health`、`/ready` 和 `POST /v1/reports`。
- `src/runtimeOptions.js`: 统一 CLI 和 API 的外部 provider 运行时配置。

## 测试

```bash
npm test
```
