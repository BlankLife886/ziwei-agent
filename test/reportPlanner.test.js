import assert from "node:assert/strict";
import test from "node:test";
import { createReportPlan } from "../src/agent/reportPlanner.js";
import { createZiweiAgentResponse } from "../src/agent/ziweiAgent.js";
import { buildChart } from "../src/chartBuilder.js";

test("createReportPlan turns ready agent context into report sections", () => {
  const agentResult = createZiweiAgentResponse(buildChart(createSampleProfile()));
  const reportPlan = createReportPlan(agentResult);

  assert.equal(reportPlan.status, "planned");
  assert.equal(reportPlan.subject.name, "示例命主");
  assert.deepEqual(
    reportPlan.sections.map((section) => section.id),
    ["life-triad", "body-palace", "star-balance"]
  );
  assert.ok(reportPlan.opening.some((line) => line.includes("本命盘")));
  assert.ok(
    reportPlan.sections
      .find((section) => section.id === "life-triad")
      .guidingQuestions.some((question) => question.includes("三方四正"))
  );
  assert.deepEqual(
    reportPlan.sections.find((section) => section.id === "life-triad")
      .evidenceRefs,
    [
      "life-triad.life-palace",
      "life-triad.wealth-palace",
      "life-triad.career-palace",
      "life-triad.travel-palace"
    ]
  );
  assert.ok(
    reportPlan.guardrails.some((guardrail) => guardrail.includes("不得伪装"))
  );
});

test("createReportPlan blocks report sections until required input exists", () => {
  const profile = createSampleProfile();
  delete profile.birth_time;

  const agentResult = createZiweiAgentResponse(buildChart(profile));
  const reportPlan = createReportPlan(agentResult);

  assert.equal(reportPlan.status, "blocked");
  assert.deepEqual(reportPlan.sections, []);
  assert.ok(reportPlan.blockers.includes("请补充 birth_time"));
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
