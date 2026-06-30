import assert from "node:assert/strict";
import test from "node:test";
import { createReportDraft } from "../src/agent/reportComposer.js";
import { createReportPlan } from "../src/agent/reportPlanner.js";
import { createZiweiAgentResponse } from "../src/agent/ziweiAgent.js";
import { buildChart } from "../src/chartBuilder.js";

test("createReportDraft writes cautious draft sections from a report plan", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()))
  );
  const reportDraft = createReportDraft(reportPlan);

  assert.equal(reportDraft.status, "drafted");
  assert.equal(reportDraft.title, "示例命主的紫微斗数本命盘分析草稿");
  assert.deepEqual(
    reportDraft.sections.map((section) => section.id),
    ["life-triad", "body-palace", "star-balance"]
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .paragraphs.some((paragraph) => {
        return paragraph.text.includes("不宜只凭命宫下结论");
      })
  );
  assert.deepEqual(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation")
      .evidenceRefs,
    [
      "life-triad.life-palace",
      "life-triad.wealth-palace",
      "life-triad.career-palace",
      "life-triad.travel-palace"
    ]
  );
  assert.deepEqual(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation")
      .referenceRefs,
    ["framework.life-triad", "rule.star-placement"]
  );
  assert.ok(reportDraft.closing.some((line) => line.includes("已经生成的证据")));
});

test("createReportDraft stays blocked when the report plan is blocked", () => {
  const profile = createSampleProfile();
  delete profile.birth_time;

  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(profile))
  );
  const reportDraft = createReportDraft(reportPlan);

  assert.equal(reportDraft.status, "blocked");
  assert.deepEqual(reportDraft.sections, []);
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
