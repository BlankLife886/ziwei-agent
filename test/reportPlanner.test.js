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
    [
      "life-triad",
      "body-palace",
      "star-balance",
      "birth-year-transformations",
      "major-periods"
    ]
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
  assert.deepEqual(
    reportPlan.sections.find((section) => section.id === "life-triad")
      .referenceRefs,
    ["framework.life-triad", "rule.star-placement"]
  );
  assert.deepEqual(
    reportPlan.sections.find((section) => section.id === "life-triad")
      .interpretationRefs,
    [
      "interpretation.life-triad.structure",
      "interpretation.palace-role.life",
      "interpretation.palace-role.wealth",
      "interpretation.palace-role.career",
      "interpretation.palace-role.travel",
      "interpretation.life-triad.empty-life-palace",
      "interpretation.star.tian-xiang.wealth",
      "interpretation.star.tian-kui.wealth",
      "interpretation.star.huo-xing.wealth",
      "interpretation.star.tian-fu.career",
      "interpretation.star.qing-yang.career",
      "interpretation.star.lian-zhen.travel",
      "interpretation.star.tan-lang.travel",
      "interpretation.star.tian-guan.travel"
    ]
  );
  assert.deepEqual(
    reportPlan.sections
      .find((section) => section.id === "life-triad")
      .evidenceItems.find((item) => item.id === "life-triad.wealth-palace")
      .metadata.starGroups,
    {
      mainStars: ["天相"],
      auxiliaryStars: ["天魁"],
      maleficStars: ["火星"],
      voidStars: []
    }
  );
  assert.ok(
    reportPlan.sections
      .find((section) => section.id === "life-triad")
      .interpretations.some((interpretation) => {
        return interpretation.title.includes("财帛宫的分析角色");
      })
  );
  assert.ok(
    reportPlan.sections
      .find((section) => section.id === "life-triad")
      .interpretations.some((interpretation) => {
        return interpretation.title.includes("天府在官禄宫");
      })
  );
  assert.ok(
    reportPlan.sections
      .find((section) => section.id === "life-triad")
      .references.some((reference) => reference.title.includes("三方四正"))
  );
  assert.deepEqual(
    reportPlan.sections
      .find((section) => section.id === "birth-year-transformations")
      .referenceRefs,
    ["rule.birth-year-four-transformations"]
  );
  assert.deepEqual(
    reportPlan.sections
      .find((section) => section.id === "birth-year-transformations")
      .interpretationRefs,
    ["interpretation.four-transformations.birth-year-static-only"]
  );
  assert.ok(
    reportPlan.sections
      .find((section) => section.id === "birth-year-transformations")
      .evidence.some((item) => item.includes("天同化忌在子女宫寅"))
  );
  assert.deepEqual(
    reportPlan.sections
      .find((section) => section.id === "major-periods")
      .referenceRefs,
    ["rule.major-periods"]
  );
  assert.deepEqual(
    reportPlan.sections
      .find((section) => section.id === "major-periods")
      .interpretationRefs,
    ["interpretation.major-periods.structure-only"]
  );
  assert.ok(
    reportPlan.sections
      .find((section) => section.id === "major-periods")
      .evidence.some((item) => item.includes("阳女逆行"))
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

test("createReportPlan includes current major period section when available", () => {
  const agentResult = createZiweiAgentResponse(buildChart({
    ...createSampleProfile(),
    analysis_date: "2026-06-30"
  }));
  const reportPlan = createReportPlan(agentResult);
  const section = reportPlan.sections.find((item) => {
    return item.id === "current-major-period";
  });

  assert.ok(section);
  assert.deepEqual(section.referenceRefs, [
    "rule.current-major-period",
    "rule.major-periods"
  ]);
  assert.deepEqual(section.interpretationRefs, [
    "interpretation.current-major-period.locator-only"
  ]);
  assert.ok(section.evidence.some((item) => item.includes("虚岁37岁")));
  assert.ok(section.writingPrompt.includes("不把阶段定位写成事件断语"));
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
