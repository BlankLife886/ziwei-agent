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
    ["life-triad", "body-palace", "star-balance", "birth-year-transformations"]
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .paragraphs.some((paragraph) => {
        return paragraph.text.includes("不宜只凭命宫下结论");
      })
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("财帛宫见天相、天魁、火星")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("官禄宫见天府、擎羊")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("迁移宫见廉贞、贪狼、天官")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("仍属于本命盘静态结构")
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
  assert.deepEqual(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation")
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
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation-basis")
      .text.includes("财帛宫的分析角色")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation-basis")
      .text.includes("天相在财帛宫的保守解释")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "birth-year-transformations")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("太阳化禄在兄弟宫辰")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "birth-year-transformations")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("只能写本命盘结构")
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

test("createReportDraft stays conservative when a section has no interpretation item", () => {
  const reportDraft = createReportDraft({
    status: "planned",
    subject: {
      name: "示例命主"
    },
    opening: [],
    guardrails: [],
    sections: [
      {
        id: "star-balance",
        title: "星曜类别平衡",
        purpose: "检查星曜类别。",
        evidence: ["主星 14 颗"],
        evidenceRefs: ["star-balance.main-stars"],
        referenceRefs: [],
        references: [],
        interpretationRefs: [],
        interpretations: [],
        guidingQuestions: ["当前能说什么？"]
      }
    ]
  });

  assert.equal(reportDraft.status, "drafted");
  assert.ok(
    reportDraft.sections[0].paragraphs
      .find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("缺少对应解释条目")
  );
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
