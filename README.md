# Ziwei Agent

教学型紫微斗数命理师 agent 原型，使用 Node.js 构建。

最终产品目标不是只输出排盘或本命盘草稿，而是让用户输入出生资料和咨询主题后，先得到结构化命盘，再由 agent 按文献、知识库、规则计算和大模型归纳逐层生成用户报告。报告方向包括综合命盘、性格画像、婚姻感情、事业发展、财富资源、阶段运势，以及因果、前世今生等偏象征性和文化诠释的主题。当前代码仍处在底层建设阶段，已支持部分报告领域的证据链底稿；尚未支持的主题会先登记为最终报告目标，并明确标注不能输出深入断语。

当前阶段实现了出生资料采集、历法转换、命宫/身宫计算、五行局计算、十四主星基础落宫，左辅、右弼、天刑、天姚、天月、天巫等月系辅星，三台、八座等日系辅星，禄存、擎羊、陀罗、天魁、天钺、天官、天福、天厨等年干星曜，截空等空曜，火星、铃星等基础煞曜，生年四化，大限年龄段，按分析日期定位当前大限、流年和流月，并能基于大限、流年、流月和四化重叠生成安全触发观察点、组合验证主题和组合主题解释。排盘流程已经抽成可复用的 `chartBuilder` 服务，并加入命理师 agent 外壳，用“分析上下文 -> 报告规划 -> 报告生成器合同 -> 正文草稿 -> 报告审计 -> 用户报告发布”的流程组织命盘证据、分析重点、当前能力边界和输出安全检查。事业、财富、婚姻和当前阶段运势已支持结构性底稿，但仍不能推具体年份事件、月份事件、应期、吉凶、婚恋结果、职位结果或财富结果。后续会在此基础上加入资料检索、命理分析和完整报告生成。

## 架构文档

- [紫微斗数 Agent 架构与审计说明](docs/AGENT_ARCHITECTURE.md)

## 运行

```bash
npm start
node src/cli.js examples/profile.example.json
node src/cli.js examples/profile.example.json data/knowledge-snippets.example.json
npm run validate:knowledge
```

`npm start` 会加载 `data/knowledge-snippets.example.json`，用于演示“verified 知识片段 -> 报告规划 -> 知识覆盖审计 -> 用户报告引用”的闭环。这个示例知识库目前是本地审校分析框架样本，不代表用户提供的 PDF、书籍和扫描件已经完成全量结构化录入。

## 当前模块

- `src/intake.js`: 校验用户出生资料，并把出生时间标准化为十二时辰。
- `src/calendarConverter.js`: 把公历生日转换为农历生日，供排盘模块使用。
- `src/chart.js`: 定义命盘数据结构，包括十二宫、主星、辅星、煞曜、空曜、四化和命盘骨架。
- `src/chartBuilder.js`: 编排输入校验、历法转换和各类排盘规则，输出可供 CLI、API 或 agent 使用的结构化命盘。
- `src/agent/ziweiPipeline.js`: 统一编排 agent 主流程，把排盘结果转换为分析上下文、报告规划、正文草稿、报告审计和用户报告。
- `src/agent/agentReadinessAuditor.js`: 按工程能力项审计 agent 完整度，输出当前进度、阻塞项和下一步优先级；该进度不是命理准确率。
- `src/agent/intakeSession.js`: 维护多轮输入中的出生资料草稿，把用户新补充的字段合并后重新调用完整 agent 流程。
- `src/agent/profilePatchParser.js`: 把用户自然语言补充转换为可审计的结构化资料 patch，支持出生资料和分析日期，并保留字段来源片段。
- `src/agent/queryIntentParser.js`: 把“看当前大限 / 看事业 / 看财帛 / 看运势 / 看四化”等自然语言问题转换为可审计的查询意图，用于收敛本轮报告章节，并保留事业、财帛、迁移等专题上下文。
- `src/agent/reportDomainCatalog.js`: 定义最终用户报告领域，包括性格、事业、财富、婚姻、运势、因果、前世今生等，并标注当前支持程度和缺失能力。
- `src/agent/referenceCatalog.js`: 定义本地规则、分析框架引用 id 和本地来源目录，后续可映射到书籍、PDF、笔记或知识库片段。
- `src/agent/timingTriggerCatalog.js`: 基于当前大限、流年太岁、流月月建、生年四化、大限四化和流年四化生成安全触发观察点，只输出待验证主题，不生成事件断语。
- `src/agent/timingCombinationVerifier.js`: 对安全触发候选做多层信号验证，只把证据层数和强度达标的观察点交给报告合参。
- `src/agent/timingCombinationThemeInterpreter.js`: 把已通过组合验证的宫位转成当前阶段合参主题，例如关系、资源、外部环境或制度支持，仍不输出事件、应期或结果。
- `src/agent/knowledgeSnippetCatalog.js`: 定义外部书籍、PDF、笔记和知识库片段的 schema、审计和检索接口；只有字段完整、来源已登记且 `status` 为 `verified` 的片段才允许进入报告规划，当前示例只包含本地审校框架样本，不把未录入内容作为报告依据。
- `src/agent/knowledgeSnippetIngestor.js`: 把候选摘录或研读笔记标准化为 draft 知识片段，并提供晋升为 verified 的门禁，避免未复核材料直接进入报告依据。
- `src/agent/knowledgeSnippetStore.js`: 从 JSON 文件加载 verified 知识片段，逐条审计后只把通过的片段交给报告规划。
- `src/agent/interpretationCatalog.js`: 定义当前可用的命理解释条目，让报告正文引用受控解释，而不是直接散写断语。
- `src/agent/inputQuestionnaire.js`: 把缺失字段转换为结构化追问，包括字段名、提问话术、示例和追问原因，方便后续接入聊天 UI 或多轮 agent。
- `src/agent/ziweiAgent.js`: 根据排盘结果生成 agent 分析上下文，包括核心证据、建议分析重点和当前限制；核心证据同时保留文本和结构化 `evidenceItems`。
- `src/agent/reportSectionCatalog.js`: 集中定义各类报告章节的标题、目的、引导问题、写作提示和解释引用构造规则。
- `src/agent/reportPlanner.js`: 把 agent 分析上下文转换为报告草稿章节，包括写作问题、可用证据、`evidenceRefs`、`referenceRefs`、`interpretationRefs` 和写作边界。
- `src/agent/knowledgeCoverageAuditor.js`: 审计报告章节是否已有 verified 外部知识片段，防止把只有本地规则支撑的保守底稿包装成知识库充分支撑的深入报告。
- `src/agent/reportGenerator.js`: 定义报告生成器合同层，把 report plan、证据、引用、知识片段、解释条目和 guardrails 组织为 generation context；当前默认 provider 仍使用确定性模板，未来可替换为外部大模型 provider。
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

## 测试

```bash
npm test
```
