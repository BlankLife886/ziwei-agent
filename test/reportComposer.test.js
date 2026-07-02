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
  assert.equal(reportDraft.brief.kind, "report-brief");
  assert.equal(reportDraft.brief.mode, "foundation");
  assert.ok(
    reportDraft.brief.paragraphs.some((paragraph) => {
      return paragraph.kind === "brief-scope" &&
        paragraph.text.includes("基础版命盘报告");
    })
  );
  assert.ok(
    reportDraft.brief.paragraphs.some((paragraph) => {
      return paragraph.kind === "chart-summary" &&
        paragraph.text.includes("农历");
    })
  );
  assert.ok(
    reportDraft.brief.paragraphs.some((paragraph) => {
      return paragraph.kind === "delivery-boundary" &&
        paragraph.text.includes("不能输出具体年份事件");
    })
  );
  assert.equal(reportDraft.brief.sectionSummaries.length, 8);
  assert.ok(
    reportDraft.brief.sectionSummaries.every((summary) => {
      return Number.isInteger(summary.referenceCount);
    })
  );
  assert.ok(
    reportDraft.brief.sectionSummaries.some((summary) => {
      return summary.id === "life-triad" && summary.referenceCount > 0;
    })
  );
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
      .paragraphs.find((paragraph) => paragraph.kind === "section-synthesis")
      .text.includes("【组合归纳】")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .paragraphs.find((paragraph) => paragraph.kind === "section-synthesis")
      .text.includes("组命盘证据")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .paragraphs.find((paragraph) => paragraph.kind === "section-synthesis")
      .text.includes("尚无 verified 知识片段")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .paragraphs.find((paragraph) => paragraph.kind === "section-synthesis")
      .text.includes("本地规则底稿")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .paragraphs.find((paragraph) => paragraph.kind === "topic-refinement")
      .text.includes("基础画像按基础气质、资源取用、事业承接、外部环境展开")
  );
  assert.ok(
    reportDraft.sections
      .find((section) => section.id === "life-triad")
      .topicRefinements[0].interpretationRefs.includes("interpretation.topic-refinement.structure-only")
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

test("createReportDraft keeps section synthesis inside the planned ref contract", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile())),
    {
      knowledgeSnippets: [
        {
          id: "knowledge-snippet.life-triad-test",
          sourceRef: "knowledge-source.local-reviewed-framework-notes",
          title: "命宫三方四正测试片段",
          topicIds: ["life"],
          referenceRefs: ["framework.life-triad"],
          excerpt: "命宫三方四正需要合看命宫、财帛、官禄和迁移。",
          citation: "测试知识库 / 命宫三方四正",
          status: "verified",
          riskLevel: "low"
        }
      ]
    }
  );
  const reportDraft = createReportDraft(reportPlan);
  const section = reportDraft.sections.find((item) => item.id === "life-triad");
  const synthesisParagraph = section.paragraphs.find((paragraph) => {
    return paragraph.kind === "section-synthesis";
  });

  assert.ok(synthesisParagraph.text.includes("1条 verified 知识片段"));
  assert.deepEqual(synthesisParagraph.evidenceRefs, section.evidenceRefs);
  assert.deepEqual(synthesisParagraph.referenceRefs, section.referenceRefs);
  assert.deepEqual(synthesisParagraph.interpretationRefs, [
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
  ]);
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

  assert.equal(reportDraft.brief.mode, "focused");
  assert.ok(reportDraft.brief.paragraphs[0].text.includes("婚姻"));
  assert.equal(reportDraft.brief.sectionSummaries.length, 1);
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
  assert.ok(paragraph.text.includes("流月骨架"));
  assert.ok(paragraph.text.includes("月份事件、应期或吉凶"));
  assert.ok(paragraph.text.includes("安全触发候选只列观察点"));
  assert.ok(paragraph.text.includes("子女宫为高优先级观察点"));
  assert.ok(paragraph.text.includes("组合验证只把多层证据同时出现的宫位列为合参主题"));
  assert.ok(paragraph.text.includes("子女宫已通过"));
  assert.ok(paragraph.text.includes("组合主题解释只把已验证宫位转成阶段合参领域"));
  assert.ok(paragraph.text.includes("子女宫归为延展事务与创作表达"));
  assert.ok(paragraph.text.includes("跨宫跨限运解释只整理关系结构"));
  assert.ok(paragraph.text.includes("大限落宫与组合主题同宫"));
  assert.ok(paragraph.text.includes("不是事件预测"));
  assert.ok(paragraph.text.includes("不能推今年具体事件"));
  assert.deepEqual(paragraph.interpretationRefs, [
    "interpretation.current-stage.static-only",
    "interpretation.four-transformations.major-period-stage-only",
    "interpretation.annual-period.structure-only",
    "interpretation.four-transformations.annual-structure-only",
    "interpretation.monthly-period.structure-only",
    "interpretation.timing-trigger.candidate-only",
    "interpretation.timing-combination.verified-only",
    "interpretation.timing-combination.theme-only",
    "interpretation.timing-cross-layer.structure-only"
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
