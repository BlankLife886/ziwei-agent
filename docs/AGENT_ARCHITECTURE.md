# 紫微斗数 Agent 架构与审计说明

本文档用于回答两个问题：

1. 当前项目是否严格按“agent”来做，而不是只做一个排盘脚本。
2. 最终产品要产出什么报告，以及当前底层是否足够坚固。

## 最终产品形态

最终目标是一个紫微斗数命理师 agent。用户输入出生资料和咨询问题后，系统应先生成结构化命盘，再根据用户问题组织证据、规则、知识库引用和大模型归纳，输出用户可读的专题报告。

目标报告包括：

- 综合命盘结构报告
- 性格画像报告
- 婚姻感情报告
- 事业发展报告
- 财富资源报告
- 阶段运势报告
- 因果主题报告
- 前世今生主题报告

当前项目还没有进入“完整命运报告”阶段。现在的核心产出是通过发布门禁的用户报告底稿：它能说明用了哪些命盘证据、引用了哪些本地规则、哪些解释条目参与了正文生成，以及哪些结论不能写。没有通过审计的草稿只能用于调试，不能作为用户报告发布。

知识覆盖审计会单独标记每个章节是否已有 verified 知识片段。当前示例库只录入了本地审校分析框架样本，用于验证 agent 的知识引用闭环；真实书籍/PDF片段尚未全量结构化录入时，系统仍不能把它包装成文献和知识库已经充分支撑的深入命运报告。

知识片段录入遵循候选材料、draft、verified 三段流程：扫描件 OCR、PDF 摘录或研读笔记先作为候选片段进入 `knowledgeSnippetIngestor` 标准化；字段完整后仍保持 draft；只有经过人工复核并晋升为 verified 的片段，才允许被 `reportPlanner` 检索并进入报告引用链。

知识片段持久化入口是 JSON store。`knowledgeSnippetStore` 会读取 `snippets` 数组并逐条审计，只有通过 schema 审计的 verified 片段会传入 `runZiweiPipeline`；失败片段保留在 store 审计问题里，不进入报告规划。

## 当前 Agent 链路

当前主链路在 `src/agent/ziweiPipeline.js`：

```text
birth/profile input
  -> buildChart
  -> queryIntent
  -> ziweiAgent context
  -> reportPlanner
  -> knowledgeCoverageAudit
  -> reportGenerator
  -> provider resolution
  -> reportComposer/default provider 或 async external LLM provider
  -> reportDraft
  -> reportAuditor
  -> reportPublisher
  -> reportOutput
```

CLI 和 HTTP API 都必须进入这条链路。`ziweiApiHandler` 只负责接收 `profile`、`query` 或显式 `queryIntent`，然后调用 `buildChart` 和 `runZiweiPipelineAsync`；它不会直接调用报告 composer，也不会跳过审计发布门禁。`server`、`serverRuntimeConfig`、`apiCredentials`、`apiObservability`、`apiQuotaStore` 和 `apiRateLimiter` 只负责服务入口治理，例如运行时配置校验、scoped 鉴权、请求追踪、脱敏日志、限流、配额窗口持久化、请求体大小限制和响应封装，不负责命理解释。

Web UI 只作为同一 HTTP API 的浏览器入口。页面收集出生资料和咨询问题，调用 `POST /v1/reports`，再把返回的 `chart` 与 `report` 渲染为命盘图和用户报告；它不在前端重新排盘、不生成解释、不跳过报告审计。

各层职责如下：

- `buildChart`：只负责排盘计算，输出结构化命盘。
- `queryIntentParser`：把用户问题转换成可审计的专题意图。
- `runtimeEnv`：在服务启动前汇合托管密钥命令、mounted secret 文件和单项 secret 文件，只允许白名单运行时键，失败时阻断部署校验。
- `serverRuntimeConfig`：在服务启动前校验端口、请求体上限、限流、观测模式、release/build 元数据和生产鉴权配置；生产模式下没有当前可用的可写报告 scope 时不会启动。
- `smokeApi`：临时启动同一个 HTTP server，依次调用 `/health` 和 `/v1/reports`，证明部署环境中的 API 入口、鉴权、知识库加载、pipeline 和报告发布门禁可以串起来。
- `validateDeployment`：部署前串联运行时配置、知识库 store 审计和 API smoke；配置了知识库但未通过审计时会阻断部署校验。
- `public/`：轻量 Web UI，渲染输入表单、命盘十二宫图和发布后的报告章节；所有命理结果都来自 API 响应。
- `ziweiApiHandler`：把 HTTP/API 请求转换为统一 pipeline 调用，负责请求大小限制、可选 bearer 鉴权、健康检查和基础请求诊断，不负责命理解释。
- `apiCredentials`：解析 legacy 单 token 或多 credential 配置，执行 bearer token、scope 和 credential 生命周期鉴权；下游只获得 principal id 和 scopes，不获得原始 token。
- `apiObservability`：生成结构化 API 事件，并对鉴权头、API key 和完整 body 做脱敏；观测失败不能阻断 agent 主链路。
- `apiQuotaStore`：为限流窗口提供内存或 JSON 文件存储；文件模式用于让尚未过期的配额窗口跨服务重启延续。
- `apiRateLimiter`：在 HTTP 服务入口读取完整 body 前按 bearer token 或客户端地址做限流；超过配额时返回 `429 rate_limited`，配额存储不可读写时 fail closed。
- `ziweiAgent`：把命盘转换为 agent 分析上下文，包括证据、分析重点、限制和追问。
- `reportPlanner`：把分析上下文转换为报告章节计划。
- `topicRefinementInterpreter`：把报告章节整理成专题角度、证据范围和禁止断语，作为确定性报告器和未来大模型的可审计任务单。
- `knowledgeCoverageAuditor`：审计每个报告章节是否已有 verified 外部知识片段，用于判断能否升级为文献/知识库支撑的深入报告；该审计不阻塞当前保守底稿发布。
- `reportGenerator`：建立报告生成器合同，把章节、证据、引用、知识片段、解释条目、专题细分任务单和 guardrails 组织成可交给报告 provider 的 generation context；当前默认 provider 调用确定性模板，也支持选择同步或异步外部大模型 provider。若选择 `external-llm` 但未配置可调用 provider，会在生成前阻断。
- `externalLLMReportProvider`：把 generation context 包装为通用 HTTP 大模型请求，并把响应解析为 `reportDraft`；缺配置、HTTP 失败、请求超时、响应过大或响应不可解析都会阻断发布，并返回不含密钥和请求体的诊断信息。
- `reportComposer`：用确定性模板生成保守正文草稿，作为当前默认 provider 的实现。
- `reportAuditor`：检查报告草稿是否断开证据链、引用链，或出现未被边界约束的高风险断语。
- `reportPublisher`：作为最终发布门禁，只把审计通过的草稿转换为用户报告。

这个分层是当前底座最重要的约束：计算层不写报告，报告层不重新排盘，解释层必须通过证据链回指到已计算结果。

## 报告生成器边界

`reportGenerator` 是未来接入大模型的隔离层，而不是让模型直接读取整份命盘对象自由发挥。它先生成 `generationContext`，其中只包含本轮报告计划允许使用的章节、证据、引用、知识片段、解释条目、专题细分任务单和写作边界。

当前支持三类 provider 路径：

- `deterministic-template`：默认路径，调用确定性 `reportComposer` 生成保守底稿。
- `custom`：测试或调用方显式传入 provider 函数，用于验证报告器合同。
- `external-llm`：外部大模型路径。只有在调用方提供可调用 provider 时才会执行；未配置、未知 generator、非函数 provider、异步 provider 误走同步 pipeline 或 provider 抛错都会返回阻断状态，不进入发布门禁。

外部 provider 返回的草稿仍然必须经过 `reportAuditor` 和 `reportPublisher`。这意味着大模型只能作为报告写作器，不能替代排盘、证据选择、规则引用、知识片段审计或发布门禁。

真实 HTTP 大模型调用由 `externalLLMReportProvider` 适配。CLI 可通过 `ZIWEI_REPORT_PROVIDER=external-llm`、`ZIWEI_LLM_ENDPOINT`、`ZIWEI_LLM_API_KEY` 和 `ZIWEI_LLM_MODEL` 切到异步 provider 路径，并可用 `ZIWEI_LLM_TIMEOUT_MS`、`ZIWEI_LLM_RETRY_COUNT` 和 `ZIWEI_LLM_MAX_RESPONSE_BYTES` 控制超时、重试和响应大小。该路径仍只发送 `generationContext` 和输出契约，不允许模型绕过证据链自由读取或改写底层命盘。

## 证据链契约

每个报告章节必须保留三类引用：

- `evidenceRefs`：回指本次命盘已经生成的证据。
- `referenceRefs`：回指本地规则或分析框架。
- `interpretationRefs`：回指受控解释条目。

这三类引用是后续接入知识库和大模型前的安全底线。大模型只能在这些结构化材料上归纳表达，不能绕过证据直接生成断语。

## 用户报告对象

`reportOutput` 是当前对外可交付的用户报告对象。它必须经过 `reportPublisher` 发布门禁，并包含：

- `metadata`：报告类型、发布状态、审计状态、查询意图、章节列表、证据引用、规则引用、解释引用和写作边界。
- `sourceRefs`：当前规则/框架引用对应的来源目录；现阶段主要是本地已实现规则和本地分析框架，后续可映射到书籍、PDF、笔记或向量检索片段。
- `knowledgeSnippetRefs`：知识库片段引用。片段必须字段完整、可追踪来源，并通过 `verified` 状态审计后才能进入报告规划；当前示例报告可引用本地审校框架样本，但书籍/PDF片段仍需后续按来源、页码或段落定位继续录入。
- `introduction`：报告开篇。
- `sections`：按专题组织的报告正文段落，每段继续保留 `evidenceRefs`、`referenceRefs` 和 `interpretationRefs`。
- `topicRefinements`：每个已支持章节的专题细分任务单，说明本节按哪些角度展开、允许使用哪些证据/知识片段、禁止输出哪些断语。
- `closing`：报告收束和边界提示。
- `audit`：发布时使用的审计结果。

HTTP API 的 `POST /v1/reports` 会返回：

- `chart`：本次输入生成的结构化命盘；资料不完整或非法时为 `null`。
- `report`：经过发布门禁后的用户报告；未通过时为 blocked 状态。
- `validation`：出生资料校验结果和缺失字段。
- `queryIntent`：本轮用户问题解析结果。
- `audits`：知识覆盖、报告审计和完整度审计。
- `diagnostics`：请求耗时、排盘状态、报告规划状态、生成状态和发布状态。

当设置 `ZIWEI_API_TOKEN` 时，API 只接受 `authorization: Bearer <token>`，该 legacy token 自动获得 `reports:write`。生产式配置可使用 `ZIWEI_API_CREDENTIALS` JSON 数组登记多个 credential，每个 credential 包含 `id`、`token` 和 `scopes`，并可选 `disabled`、`notBefore`、`expiresAt` 做禁用、生效时间和过期控制；`POST /v1/reports` 必须具备当前可用的 `reports:write`。该鉴权只保护 API 入口，不改变 agent 内部证据、报告规划和审计逻辑。

启动边界先经过 `runtimeEnv` 解析。`ZIWEI_MANAGED_SECRET_COMMAND` 可用无 shell 子进程从托管密钥平台 CLI 或内部 sidecar 拉取运行时 secret，输出支持运行时 JSON object、AWS `SecretString`、Azure `value` 或 GCP `payload.data`。`ZIWEI_RUNTIME_SECRETS_FILE` 可从 mounted JSON secret 中补齐 API credential、外部 LLM key 和 provider 配置；`ZIWEI_API_CREDENTIALS_FILE`、`ZIWEI_API_TOKEN_FILE`、`ZIWEI_LLM_API_KEY_FILE` 可从单项 secret 文件补齐对应环境变量。显式环境变量优先于托管密钥命令，托管密钥命令优先于文件内容；命令失败、文件读取或解析失败会进入运行时/部署校验问题列表，不会静默降级为匿名服务。

`NODE_ENV=production` 或 `ZIWEI_REQUIRE_API_AUTH=true` 时，服务启动前会执行运行时配置校验。没有 API credential、credential JSON 不合法、没有任一当前可用的 `reports:write` 或 `*` scope、生命周期字段非法、端口/限流/请求体上限非法、观测模式非法、secret 文件不合法，都会阻止服务启动。`npm run validate:runtime` 可在部署前单独执行同一套校验；`npm run smoke:api` 会启动临时 HTTP 服务并真实请求 `/health`、`/ready` 与 `/v1/reports`，用于验证入口到用户报告发布的链路；`npm run validate:deploy` 会进一步串联运行时门禁、知识库审计和 API smoke；`npm run validate:release` 会把测试、知识库、运行时、部署、示例环境和 diff 检查串成发布总门禁。`npm run validate:release:summary` 或 `node src/validateRelease.js --summary <path>` 会执行同一条门禁并输出机器可读 release summary，供 CI artifact、部署平台或人工审计留证。

生产发布、credential 轮换、健康检查、观测诊断和回滚流程记录在 `docs/OPERATIONS.md`。该文档属于工程运行边界，不改变排盘、解释、报告规划或发布门禁。

服务层默认给每个请求生成 `requestId`，并同时写入响应体和 `x-request-id` 响应头。`GET /health` 是轻量 liveness 探针，不读取请求体、不消耗业务限流配额，并返回 HTTP、agent 入口、release metadata 和已加载知识片段数量；Docker healthcheck 使用这条路径。`GET /ready` 是部署 readiness 探针，同样不消耗业务限流配额，并返回 release metadata、runtime、agent pipeline 入口、知识库加载状态和报告 provider 配置状态；如果外部大模型 provider 缺少 endpoint、API key 或 model，会返回 503，避免部署平台把不可生成报告的实例放入流量。服务收到 `SIGTERM` 或 `SIGINT` 后会进入 draining，`/ready` 立即返回 `not_ready`，`/health` 仍保持可用，然后 HTTP server 停止接收新连接并等待已有连接关闭。`ZIWEI_RELEASE_VERSION`、`ZIWEI_RELEASE_COMMIT`、`ZIWEI_RELEASE_SOURCE` 和 `ZIWEI_RELEASE_SUMMARY_PATH` 只用于运行实例追溯，不进入排盘、解释或用户报告。设置 `ZIWEI_API_OBSERVABILITY=stdout` 后，服务会输出 `api.request.started`、`api.request.completed`、`api.request.blocked` 和 `api.request.failed` 事件，事件只包含路由、状态码、耗时、鉴权 principal 摘要、报告生成状态和限流摘要，不记录完整请求体或密钥。`ZIWEI_API_RATE_LIMIT_WINDOW_MS` 和 `ZIWEI_API_RATE_LIMIT_MAX` 控制业务 API 限流窗口和配额，默认是 60 秒 60 次；bearer token 会先哈希再作为限流分桶 key。设置 `ZIWEI_API_QUOTA_STORE` 后，配额窗口会写入 JSON 文件，服务重启后仍沿用尚未过期的窗口；配额文件读取或写入失败时，限流器会阻断请求，避免异常状态下无限放行。

## 当前已支持的报告底稿

当前支持的是“结构性底稿”，不是完整断命：

- 综合结构：命宫三方四正、身宫、星曜类别、生年四化、大限骨架。
- 事业专题：官禄宫三方四正，保守描述职责承担、主体基础、资源承接和合作牵动。
- 财富专题：财帛宫三方四正，保守描述资源经营、主体基础、事业承接和内在取舍。
- 婚姻专题：夫妻宫三方四正，保守描述关系互动、外部相处、现实承担和内在感受。
- 阶段运势：在提供 `analysis_date` 后定位当前大限，合看大限四化、流年骨架、流年四化和流月骨架，并形成安全触发观察点、组合验证主题、组合主题解释、跨宫跨限运关系和当前阶段底稿。

当用户询问“今年运势”等问题时，系统会把当前日期作为分析日期；当用户只问“未来运势”但缺少分析日期时，系统会追问 `analysis_date`。

## 当前禁止输出的内容

在没有实现对应规则和资料来源前，agent 不能输出以下内容：

- 具体年份事件
- 具体应期
- 结婚时间、离婚结论或分合事件
- 伴侣具体身份
- 职位高低、升迁时间或确定职业结果
- 具体金额、投资结果、暴富或破财断语
- 吉凶定论
- “必然”“注定”“一定会”这类不可审计表达
- 把因果、前世今生等象征性主题写成事实判断

这些限制不是产品能力的终点，而是当前规则尚未实现时的工程边界。

## 全局审计结论

截至当前文档建立时，项目已经具备 agent 底座，而不是普通 CLI 排盘工具：

- 有输入采集和追问层。
- 有排盘计算层。
- 有用户查询意图层。
- 有 agent 分析上下文层。
- 有报告规划层。
- 有报告生成器合同层。
- 有正文草稿生成层。
- 有报告审计层。
- 有报告发布门禁。
- 有 CLI、HTTP API 和 Web UI 入口，UI 通过 HTTP API 进入同一条 pipeline。
- 有 API 请求大小限制、多凭证 scoped bearer 鉴权、credential 生命周期控制、托管密钥命令桥接、secret 文件载入、请求追踪、结构化观测、脱敏日志、release/build 元数据、liveness/readiness 探针、readiness draining、内存限流和可选文件持久化配额。
- 有运行时配置校验、部署校验、发布总门禁、机器可读 release summary、GitHub Actions CI、API smoke 校验、运维手册、Dockerfile、Compose/Kubernetes 部署模板、`.dockerignore` 和 `.env.example`，可以在容器中以同一 HTTP API 和 Web UI 入口启动。
- 有本地参考目录和解释目录。
- 有 `evidenceRefs`、`referenceRefs`、`sourceRefs`、`knowledgeSnippetRefs`、`interpretationRefs` 的追溯链。
- 有安全触发观察点、组合验证层、组合主题解释层、跨宫跨限运关系解释层和专题细分任务单，能把多层运限和四化重叠宫位列为待验证主题，筛出证据层数达标的合参主题，把已验证宫位转成阶段合参领域，整理当前大限、流年、流月之间的同宫或分宫关系，并把报告章节拆成可审计的专题角度，但不会输出事件断语。

当前底座仍需继续补强：

- 外部知识库片段 schema、检索和可用性审计已建立，示例库已有本地审校框架样本；书籍/PDF内容尚未全量结构化录入。
- 知识片段录入器和 JSON store 已建立，但尚未接入 OCR、PDF 解析或向量检索。
- 报告生成器合同、provider 选择边界、确定性 provider、异步 provider 链路、通用外部 HTTP provider 适配器、超时、重试、响应大小限制、脱敏诊断、CLI 入口、HTTP API 入口和轻量 Web UI 已建立；API 已有多凭证 scoped bearer 鉴权、credential 禁用/生效/过期控制、托管密钥命令桥接、secret 文件载入、请求大小限制、请求追踪、结构化观测、release/build 元数据、liveness/readiness 探针、readiness draining、内存限流、可选文件持久化配额、运行时配置校验、部署校验、发布总门禁、机器可读 release summary、CI 工作流、运维手册、Dockerfile 和 Compose/Kubernetes 模板，但真实环境部署尚未接入。
- 大限四化、流年骨架、流年四化、流月骨架、组合验证底座、组合主题解释、跨宫跨限运关系解释和专题细分任务单已接入，但细分组合规则和文献支撑仍然很少。
- 宫位、星曜、四化、运限之间的深层专题化解释仍然需要扩充。
- 因果、前世今生等主题只有目标登记，还不能生成深入报告。
- 当前报告仍偏底稿，需要后续加入分层章节、摘要、建议、引用说明和更细的风险边界。

## 下一步优先级

建议继续按“先底层、再能力、后表达”的顺序推进：

1. 扩充解释目录：为更多宫位、星曜类别和专题增加受控解释条目。
2. 建立知识库引用层：把文档、书籍、PDF 摘录映射为可审计、可检索的 verified snippet。
3. 扩充组合解释：把已有跨宫跨限运关系继续细分为更多专题、规则和文献支撑。
4. 补齐书籍/PDF/OCR 知识片段：把真实资料摘录映射为可审计、可检索的 verified snippet。
5. 产品化外部大模型 provider：为真实服务继续补齐正式密钥管理、持久化配额、模型响应质量审计和部署观测。
6. 扩展报告审计器：继续扫描是否存在无证据断言、越权断语和引用缺失。
