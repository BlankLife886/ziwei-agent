# Ziwei Agent

教学型紫微斗数命理师 agent 原型，使用 Node.js 构建。

当前阶段实现了出生资料采集、历法转换、命宫/身宫计算、五行局计算、十四主星基础落宫，左辅、右弼、天刑、天姚、天月、天巫等月系辅星，三台、八座等日系辅星，以及火星、铃星等基础煞曜。后续再逐步加入更多辅星煞曜、资料检索、命理分析和报告生成。

## 运行

```bash
npm start
```

## 当前模块

- `src/intake.js`: 校验用户出生资料，并把出生时间标准化为十二时辰。
- `src/calendarConverter.js`: 把公历生日转换为农历生日，供排盘模块使用。
- `src/chart.js`: 定义命盘数据结构，包括十二宫、主星、四化和命盘骨架。
- `src/palaceCalculator.js`: 根据农历月份和出生时辰计算命宫、身宫。
- `src/fiveElementClassCalculator.js`: 根据出生年干、命宫干支和纳音计算五行局。
- `src/mainStarCalculator.js`: 根据农历生日和五行局计算紫微星落宫，并按口诀安紫微星系、天府星系。
- `src/auxiliaryStarCalculator.js`: 根据农历月份计算左辅、右弼等辅星。
- `src/maleficStarCalculator.js`: 根据出生年支和出生时辰计算火星、铃星等煞曜。
- `src/cli.js`: 命令行入口，用于实战测试输入资料。

## 测试

```bash
npm test
```
