import assert from "node:assert/strict";
import test from "node:test";
import { parseQueryIntentFromText } from "../src/agent/queryIntentParser.js";
import { runZiweiPipeline } from "../src/agent/ziweiPipeline.js";
import { buildChart } from "../src/chartBuilder.js";

test("runZiweiPipeline produces the complete agent output chain", () => {
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()));

  assert.equal(pipelineResult.status, "published");
  assert.equal(pipelineResult.agentResult.status, "ready");
  assert.equal(pipelineResult.reportPlan.status, "planned");
  assert.equal(pipelineResult.reportDraft.status, "drafted");
  assert.equal(pipelineResult.reportOutput.status, "published");
  assert.deepEqual(
    pipelineResult.steps.map((step) => step.id),
    [
      "query-intent",
      "agent-context",
      "report-plan",
      "knowledge-coverage",
      "report-draft",
      "report-audit",
      "report-output"
    ]
  );
  assert.equal(pipelineResult.steps[0].status, "none");
  assert.equal(pipelineResult.knowledgeCoverageAudit.status, "insufficient");
  assert.ok(
    pipelineResult.knowledgeCoverageAudit.summary.includes("verified 外部知识片段")
  );
  assert.equal(pipelineResult.reportAudit.status, "passed");
  assert.deepEqual(pipelineResult.reportAudit.issues, []);
  assert.ok(pipelineResult.nextAction.includes("审阅已发布的用户报告"));
});

test("runZiweiPipeline narrows report sections by query intent", () => {
  const queryIntent = parseQueryIntentFromText("现在看当前大限。");
  const pipelineResult = runZiweiPipeline(
    buildChart({
      ...createSampleProfile(),
      analysis_date: "2026-06-30"
    }),
    { queryIntent }
  );

  assert.equal(pipelineResult.queryIntent.status, "matched");
  assert.deepEqual(pipelineResult.queryIntent.focusAreaIds, [
    "current-major-period"
  ]);
  assert.deepEqual(
    pipelineResult.reportPlan.sections.map((section) => section.id),
    ["current-major-period"]
  );
  assert.ok(
    pipelineResult.reportPlan.opening.some((line) => {
      return line.includes("聚焦当前大限");
    })
  );
  assert.deepEqual(
    pipelineResult.reportDraft.sections.map((section) => section.id),
    ["current-major-period"]
  );
});

test("runZiweiPipeline drafts current stage for fortune intent", () => {
  const queryIntent = parseQueryIntentFromText("我想看今年运势。");
  const pipelineResult = runZiweiPipeline(
    buildChart({
      ...createSampleProfile(),
      analysis_date: "2026-06-30"
    }),
    { queryIntent }
  );

  assert.equal(pipelineResult.status, "published");
  assert.deepEqual(pipelineResult.queryIntent.focusAreaIds, ["current-stage"]);
  assert.deepEqual(
    pipelineResult.reportPlan.sections.map((section) => section.id),
    ["current-stage"]
  );
  assert.ok(
    pipelineResult.reportDraft.sections[0].paragraphs
      .find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("不能推今年具体事件")
  );
});

test("runZiweiPipeline asks for analysis date when current stage is unavailable", () => {
  const queryIntent = parseQueryIntentFromText("我想看未来运势。");
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()), {
    queryIntent
  });

  assert.equal(pipelineResult.status, "blocked");
  assert.deepEqual(pipelineResult.reportPlan.missingTopicFields, [
    "analysis_date"
  ]);
  assert.ok(pipelineResult.nextAction.includes("补充本轮专题所需资料"));
});

test("runZiweiPipeline blocks report-only domains without supported sections", () => {
  const queryIntent = parseQueryIntentFromText("我想看因果和前世今生。");
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()), {
    queryIntent
  });

  assert.equal(pipelineResult.status, "blocked");
  assert.equal(pipelineResult.agentResult.status, "ready");
  assert.equal(pipelineResult.reportPlan.status, "blocked");
  assert.equal(pipelineResult.reportDraft.status, "blocked");
  assert.ok(pipelineResult.nextAction.includes("没有可用报告章节"));
  assert.deepEqual(pipelineResult.reportPlan.sections, []);
});

test("runZiweiPipeline drafts a conservative marriage report section", () => {
  const queryIntent = parseQueryIntentFromText("我想看婚姻感情。");
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()), {
    queryIntent
  });

  assert.equal(pipelineResult.status, "published");
  assert.equal(pipelineResult.reportPlan.status, "planned");
  assert.equal(pipelineResult.reportOutput.status, "published");
  assert.deepEqual(
    pipelineResult.reportPlan.sections.map((section) => section.id),
    ["spouse-palace"]
  );
  assert.ok(
    pipelineResult.reportDraft.sections[0].paragraphs
      .find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("不能推结婚时间")
  );
});

test("runZiweiPipeline keeps the chain blocked when input is incomplete", () => {
  const profile = createSampleProfile();
  delete profile.birth_time;

  const pipelineResult = runZiweiPipeline(buildChart(profile));

  assert.equal(pipelineResult.status, "needs_input");
  assert.equal(pipelineResult.agentResult.status, "needs_input");
  assert.equal(pipelineResult.reportPlan.status, "blocked");
  assert.equal(pipelineResult.reportDraft.status, "blocked");
  assert.equal(pipelineResult.reportAudit.status, "skipped");
  assert.equal(pipelineResult.reportOutput.status, "blocked");
  assert.ok(pipelineResult.nextAction.includes("补齐出生资料"));
});

test("runZiweiPipeline keeps invalid input out of report generation", () => {
  const pipelineResult = runZiweiPipeline(
    buildChart({
      ...createSampleProfile(),
      birth_time: "99:99"
    })
  );

  assert.equal(pipelineResult.status, "invalid_input");
  assert.equal(pipelineResult.agentResult.status, "invalid_input");
  assert.deepEqual(pipelineResult.reportPlan.sections, []);
  assert.deepEqual(pipelineResult.reportDraft.sections, []);
  assert.equal(pipelineResult.reportOutput.status, "blocked");
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
