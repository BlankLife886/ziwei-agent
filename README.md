# Ziwei Agent

教学型紫微斗数命理师 agent 原型，使用 Node.js 构建。

当前阶段实现了出生资料采集、历法转换、命宫/身宫计算、五行局计算、十四主星基础落宫，左辅、右弼、天刑、天姚、天月、天巫等月系辅星，三台、八座等日系辅星，禄存、擎羊、陀罗、天魁、天钺、天官、天福、天厨等年干星曜，截空等空曜，以及火星、铃星等基础煞曜。排盘流程已经抽成可复用的 `chartBuilder` 服务，并加入命理师 agent 外壳，用“分析上下文 -> 报告规划 -> 正文草稿”的流程组织命盘证据、分析重点和当前能力边界。后续会在此基础上加入资料检索、命理分析和报告生成。

## 运行

```bash
npm start
```

## 当前模块

- `src/intake.js`: 校验用户出生资料，并把出生时间标准化为十二时辰。
- `src/calendarConverter.js`: 把公历生日转换为农历生日，供排盘模块使用。
- `src/chart.js`: 定义命盘数据结构，包括十二宫、主星、辅星、煞曜、空曜、四化和命盘骨架。
- `src/chartBuilder.js`: 编排输入校验、历法转换和各类排盘规则，输出可供 CLI、API 或 agent 使用的结构化命盘。
- `src/agent/ziweiPipeline.js`: 统一编排 agent 主流程，把排盘结果转换为分析上下文、报告规划和正文草稿。
- `src/agent/referenceCatalog.js`: 定义本地规则与分析框架引用 id，后续可映射到书籍、PDF、笔记或知识库片段。
- `src/agent/inputQuestionnaire.js`: 把缺失字段转换为结构化追问，包括字段名、提问话术、示例和追问原因，方便后续接入聊天 UI 或多轮 agent。
- `src/agent/ziweiAgent.js`: 根据排盘结果生成 agent 分析上下文，包括核心证据、建议分析重点和当前限制；核心证据同时保留文本和结构化 `evidenceItems`。
- `src/agent/reportPlanner.js`: 把 agent 分析上下文转换为报告草稿章节，包括写作问题、可用证据、`evidenceRefs`、`referenceRefs` 和写作边界。
- `src/agent/reportComposer.js`: 根据报告规划生成保守的正文草稿，确保每段内容能通过 `evidenceRefs` 回指到已有证据，并通过 `referenceRefs` 回指到规则/分析框架。
- `src/formatters.js`: 把结构化排盘结果转换为 CLI 展示文本，避免展示逻辑混入排盘流程。
- `src/palaceCalculator.js`: 根据农历月份和出生时辰计算命宫、身宫。
- `src/fiveElementClassCalculator.js`: 根据出生年干、命宫干支和纳音计算五行局。
- `src/mainStarCalculator.js`: 根据农历生日和五行局计算紫微星落宫，并按口诀安紫微星系、天府星系。
- `src/auxiliaryStarCalculator.js`: 根据农历月份计算左辅、右弼等辅星。
- `src/yearStemStarCalculator.js`: 根据出生年干计算禄存、擎羊、陀罗、天魁、天钺、天官、天福、天厨、截空等星曜。
- `src/maleficStarCalculator.js`: 根据出生年支和出生时辰计算火星、铃星等煞曜。
- `src/cli.js`: 命令行入口，用于实战测试输入资料。

## 测试

```bash
npm test
```
