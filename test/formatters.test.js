import assert from "node:assert/strict";
import test from "node:test";
import { createReportDraft } from "../src/agent/reportComposer.js";
import { createReportPlan } from "../src/agent/reportPlanner.js";
import { createZiweiAgentResponse } from "../src/agent/ziweiAgent.js";
import { buildChart } from "../src/chartBuilder.js";
import {
  formatAgentBriefing,
  formatBuildResult,
  formatReportDraft,
  formatReportPlan
} from "../src/formatters.js";

test("formatBuildResult renders the complete chart summary for CLI output", () => {
  const lines = formatBuildResult(buildChart(createSampleProfile()));

  assert.ok(lines.includes("资料校验通过"));
  assert.ok(lines.includes("命盘骨架已建立："));
  assert.ok(lines.includes("命宫：巳"));
  assert.ok(lines.includes("五行局：金四局（命宫辛巳，纳音白蜡金）"));
  assert.ok(lines.includes("天厨星曜：天厨寅"));
  assert.ok(lines.includes("截空星曜：正空午、副空未"));
  assert.ok(
    lines.includes(
      "12. 父母宫：午｜主星：天机｜辅星：三台、天福｜空曜：截空（正空）"
    )
  );
});

test("formatBuildResult renders validation errors", () => {
  const result = buildChart({
    ...createSampleProfile(),
    gender: "unknown"
  });

  assert.deepEqual(formatBuildResult(result), [
    "资料格式错误：",
    "- gender must be 'male' or 'female'"
  ]);
});

test("formatAgentBriefing renders evidence and focus areas", () => {
  const agentResult = createZiweiAgentResponse(buildChart(createSampleProfile()));
  const lines = formatAgentBriefing(agentResult);

  assert.ok(lines.includes("Agent 分析准备："));
  assert.ok(lines.includes("核心证据："));
  assert.ok(lines.includes("- 命宫在巳"));
  assert.ok(lines.includes("建议分析重点："));
  assert.ok(lines.some((line) => line.includes("命宫与三方四正")));
  assert.ok(lines.includes("当前限制："));
});

test("formatReportPlan renders report sections and guardrails", () => {
  const agentResult = createZiweiAgentResponse(buildChart(createSampleProfile()));
  const lines = formatReportPlan(createReportPlan(agentResult));

  assert.ok(lines.includes("Agent 报告草稿规划："));
  assert.ok(lines.includes("章节："));
  assert.ok(lines.some((line) => line.includes("写作提示")));
  assert.ok(lines.some((line) => line.includes("关键问题")));
  assert.ok(lines.some((line) => line.includes("[life-triad.life-palace]")));
  assert.ok(lines.includes("写作边界："));
});

test("formatReportDraft renders readable draft paragraphs", () => {
  const agentResult = createZiweiAgentResponse(buildChart(createSampleProfile()));
  const reportPlan = createReportPlan(agentResult);
  const lines = formatReportDraft(createReportDraft(reportPlan));

  assert.ok(lines.includes("Agent 报告正文草稿："));
  assert.ok(lines.includes("示例命主的紫微斗数本命盘分析草稿"));
  assert.ok(lines.includes("开篇："));
  assert.ok(lines.some((line) => line.includes("【草稿判断】")));
  assert.ok(lines.some((line) => line.includes("证据：life-triad.life-palace")));
  assert.ok(lines.includes("收束："));
});

function createSampleProfile() {
  return {
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  };
}
