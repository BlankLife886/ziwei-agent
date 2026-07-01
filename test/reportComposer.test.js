import assert from "node:assert/strict";
import test from "node:test";
import { parseQueryIntentFromText } from "../src/agent/queryIntentParser.js";
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
    [
      "life-triad",
      "career-palace",
      "wealth-palace",
      "spouse-palace",
      "body-palace",
      "star-balance",
      "birth-year-transformations",
      "major-periods"
    ]
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
    ["framework.life-triad", "rule.star-placement", "framework.palace-role"]
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
      .find((section) => section.id === "career-palace")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("不应只看官禄宫单点")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "career-palace")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("不能推职位高低")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "wealth-palace")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("不应只看财帛宫单点")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "wealth-palace")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("不能推具体金额")
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
      .text.includes("本命结构")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "major-periods")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("4-13岁命宫巳")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "major-periods")
      .paragraphs.find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("具体年份与事件仍需等待流年盘")
  );
  assert.ok(reportDraft.closing.some((line) => line.includes("已经生成的证据")));
});

test("createReportDraft writes spouse palace as conservative marriage draft", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()), {
      queryIntent: parseQueryIntentFromText("我想看婚姻感情。")
    })
  );
  const reportDraft = createReportDraft(reportPlan);
  const section = reportDraft.sections[0];
  const paragraph = section.paragraphs.find((item) => {
    return item.kind === "interpretation";
  });
  const basisParagraph = section.paragraphs.find((item) => {
    return item.kind === "interpretation-basis";
  });

  assert.equal(section.id, "spouse-palace");
  assert.equal(section.title, "婚姻专题：夫妻宫三方四正");
  assert.ok(paragraph.text.includes("不应只看夫妻宫单点"));
  assert.ok(paragraph.text.includes("迁移宫的外部互动"));
  assert.ok(paragraph.text.includes("官禄宫的现实承担"));
  assert.ok(paragraph.text.includes("福德宫的内在感受"));
  assert.ok(paragraph.text.includes("关系互动倾向"));
  assert.ok(paragraph.text.includes("不能推结婚时间"));
  assert.ok(paragraph.text.includes("夫妻宫见武曲、七杀、铃星"));
  assert.ok(paragraph.text.includes("迁移宫见廉贞、贪狼、天官"));
  assert.ok(paragraph.text.includes("官禄宫见天府、擎羊"));
  assert.ok(paragraph.text.includes("福德宫见紫微、破军、左辅、右弼、天钺、陀罗"));
  assert.ok(paragraph.text.includes("关系中的现实责任和边界感"));
  assert.ok(basisParagraph.text.includes("夫妻宫的分析角色"));
  assert.ok(basisParagraph.text.includes("福德宫的分析角色"));
  assert.ok(basisParagraph.text.includes("武曲在夫妻宫的保守解释"));
  assert.deepEqual(paragraph.evidenceRefs, [
    "spouse-palace.spouse-palace",
    "spouse-palace.travel-palace",
    "spouse-palace.career-palace",
    "spouse-palace.wellbeing-palace"
  ]);
  assert.deepEqual(paragraph.referenceRefs, [
    "framework.spouse-palace",
    "rule.star-placement",
    "framework.palace-role"
  ]);
  assert.deepEqual(paragraph.interpretationRefs, [
    "interpretation.spouse-triad.structure",
    "interpretation.palace-role.spouse",
    "interpretation.palace-role.travel",
    "interpretation.palace-role.career",
    "interpretation.palace-role.wellbeing",
    "interpretation.spouse-palace.static-only",
    "interpretation.star.wu-qu.spouse",
    "interpretation.star.qi-sha.spouse",
    "interpretation.star.ling-xing.spouse",
    "interpretation.star.lian-zhen.travel",
    "interpretation.star.tan-lang.travel",
    "interpretation.star.tian-guan.travel",
    "interpretation.star.tian-fu.career",
    "interpretation.star.qing-yang.career",
    "interpretation.star.zi-wei.wellbeing",
    "interpretation.star.po-jun.wellbeing",
    "interpretation.star.zuo-fu.wellbeing",
    "interpretation.star.you-bi.wellbeing",
    "interpretation.star.tian-yue.wellbeing",
    "interpretation.star.tuo-luo.wellbeing"
  ]);
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

test("createReportDraft writes current major period as locator-only", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart({
      ...createSampleProfile(),
      analysis_date: "2026-06-30"
    }))
  );
  const reportDraft = createReportDraft(reportPlan);
  const section = reportDraft.sections.find((item) => {
    return item.id === "current-major-period";
  });
  const paragraph = section.paragraphs.find((item) => {
    return item.kind === "interpretation";
  });

  assert.ok(paragraph.text.includes("2026-06-30按虚岁37岁定位"));
  assert.ok(paragraph.text.includes("34-43岁子女宫寅"));
  assert.ok(paragraph.text.includes("不能直接代表具体年份事件"));
  assert.deepEqual(paragraph.interpretationRefs, [
    "interpretation.current-major-period.locator-only"
  ]);
});

test("createReportDraft writes current stage as conservative stage synthesis", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart({
      ...createSampleProfile(),
      analysis_date: "2026-06-30"
    }), {
      queryIntent: parseQueryIntentFromText("我想看今年运势。")
    })
  );
  const reportDraft = createReportDraft(reportPlan);
  const section = reportDraft.sections[0];
  const paragraph = section.paragraphs.find((item) => {
    return item.kind === "interpretation";
  });

  assert.equal(section.id, "current-stage");
  assert.ok(paragraph.text.includes("当前阶段定位：2026-06-30按虚岁37岁定位"));
  assert.ok(paragraph.text.includes("阶段大限宫位：34-43岁子女宫寅"));
  assert.ok(paragraph.text.includes("生年四化参照"));
  assert.ok(paragraph.text.includes("当前大限四化骨架"));
  assert.ok(paragraph.text.includes("贪狼化禄在本命迁移宫"));
  assert.ok(paragraph.text.includes("阶段的禄、权、科、忌牵引骨架"));
  assert.ok(paragraph.text.includes("流年骨架"));
  assert.ok(paragraph.text.includes("流年四化骨架"));
  assert.ok(paragraph.text.includes("天同化禄在本命子女宫"));
  assert.ok(paragraph.text.includes("年度观察方向"));
  assert.ok(paragraph.text.includes("不能推今年具体事件"));
  assert.deepEqual(paragraph.interpretationRefs, [
    "interpretation.current-stage.static-only",
    "interpretation.four-transformations.major-period-stage-only",
    "interpretation.annual-period.structure-only",
    "interpretation.four-transformations.annual-structure-only"
  ]);
});

test("createReportDraft writes dedicated career and wealth drafts for requested topics", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()), {
      queryIntent: parseQueryIntentFromText("我想先看事业和财帛。")
    })
  );
  const reportDraft = createReportDraft(reportPlan);
  const careerSection = reportDraft.sections[0];
  const wealthSection = reportDraft.sections[1];
  const careerParagraph = careerSection.paragraphs.find((item) => {
    return item.kind === "interpretation";
  });
  const wealthParagraph = wealthSection.paragraphs.find((item) => {
    return item.kind === "interpretation";
  });
  const careerBasisParagraph = careerSection.paragraphs.find((item) => {
    return item.kind === "interpretation-basis";
  });

  assert.equal(careerSection.title, "事业专题：官禄宫三方四正");
  assert.equal(wealthSection.title, "财帛专题：财帛宫三方四正");
  assert.ok(careerParagraph.text.includes("官禄宫见天府、擎羊"));
  assert.ok(careerParagraph.text.includes("财帛宫见天相、天魁、火星"));
  assert.ok(careerParagraph.text.includes("不能推职位高低"));
  assert.ok(wealthParagraph.text.includes("财帛宫见天相、天魁、火星"));
  assert.ok(wealthParagraph.text.includes("官禄宫见天府、擎羊"));
  assert.ok(wealthParagraph.text.includes("不能推具体金额"));
  assert.ok(!careerParagraph.text.includes("迁移宫见廉贞"));
  assert.ok(!wealthParagraph.text.includes("夫妻宫见武曲"));
  assert.ok(careerBasisParagraph.text.includes("官禄宫的分析角色"));
  assert.ok(!careerBasisParagraph.text.includes("廉贞在迁移宫"));
  assert.ok(!careerParagraph.interpretationRefs.includes(
    "interpretation.star.lian-zhen.travel"
  ));
  assert.deepEqual(careerSection.queryContext.primaryPalaceNames, ["官禄宫"]);
  assert.deepEqual(wealthSection.queryContext.primaryPalaceNames, ["财帛宫"]);
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
