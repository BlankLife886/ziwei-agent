import assert from "node:assert/strict";
import test from "node:test";
import { runZiweiPipeline } from "../src/agent/ziweiPipeline.js";
import { buildChart } from "../src/chartBuilder.js";

test("runZiweiPipeline produces the complete agent output chain", () => {
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()));

  assert.equal(pipelineResult.status, "drafted");
  assert.equal(pipelineResult.agentResult.status, "ready");
  assert.equal(pipelineResult.reportPlan.status, "planned");
  assert.equal(pipelineResult.reportDraft.status, "drafted");
  assert.deepEqual(
    pipelineResult.steps.map((step) => step.id),
    ["agent-context", "report-plan", "report-draft"]
  );
  assert.ok(pipelineResult.nextAction.includes("审阅报告草稿"));
});

test("runZiweiPipeline keeps the chain blocked when input is incomplete", () => {
  const profile = createSampleProfile();
  delete profile.birth_time;

  const pipelineResult = runZiweiPipeline(buildChart(profile));

  assert.equal(pipelineResult.status, "needs_input");
  assert.equal(pipelineResult.agentResult.status, "needs_input");
  assert.equal(pipelineResult.reportPlan.status, "blocked");
  assert.equal(pipelineResult.reportDraft.status, "blocked");
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
