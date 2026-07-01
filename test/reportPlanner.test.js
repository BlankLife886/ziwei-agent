import assert from "node:assert/strict";
import test from "node:test";
import { parseQueryIntentFromText } from "../src/agent/queryIntentParser.js";
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
      "career-palace",
      "wealth-palace",
      "spouse-palace",
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
    ["framework.life-triad", "rule.star-placement", "framework.palace-role"]
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
    reportPlan.sections.find((section) => section.id === "life-triad")
      .sourceRefs,
    ["source.local.implemented-rules", "source.local.analysis-frameworks"]
  );
  assert.ok(
    reportPlan.sections
      .find((section) => section.id === "life-triad")
      .sources.some((source) => source.title.includes("本地分析框架"))
  );
  assert.deepEqual(
    reportPlan.sections.find((section) => section.id === "life-triad")
      .knowledgeSnippetRefs,
    []
  );
  assert.deepEqual(
    reportPlan.sections.find((section) => section.id === "life-triad")
      .knowledgeSnippets,
    []
  );
  assert.deepEqual(
    reportPlan.sections.find((section) => section.id === "career-palace")
      .referenceRefs,
    ["framework.career-palace", "rule.star-placement", "framework.palace-role"]
  );
  assert.deepEqual(
    reportPlan.sections.find((section) => section.id === "career-palace")
      .interpretationRefs,
    [
      "interpretation.career-triad.structure",
      "interpretation.palace-role.career",
      "interpretation.palace-role.life",
      "interpretation.palace-role.wealth",
      "interpretation.palace-role.spouse",
      "interpretation.career-palace.static-only",
      "interpretation.star.tian-fu.career",
      "interpretation.star.qing-yang.career",
      "interpretation.star.tian-xiang.wealth",
      "interpretation.star.tian-kui.wealth",
      "interpretation.star.huo-xing.wealth"
    ]
  );
  assert.deepEqual(
    reportPlan.sections.find((section) => section.id === "career-palace")
      .evidenceRefs,
    [
      "career-palace.career-palace",
      "career-palace.life-palace",
      "career-palace.wealth-palace",
      "career-palace.spouse-palace"
    ]
  );
  assert.deepEqual(
    reportPlan.sections.find((section) => section.id === "wealth-palace")
      .referenceRefs,
    ["framework.wealth-palace", "rule.star-placement", "framework.palace-role"]
  );
  assert.deepEqual(
    reportPlan.sections.find((section) => section.id === "wealth-palace")
      .interpretationRefs,
    [
      "interpretation.wealth-triad.structure",
      "interpretation.palace-role.wealth",
      "interpretation.palace-role.life",
      "interpretation.palace-role.career",
      "interpretation.palace-role.wellbeing",
      "interpretation.wealth-palace.static-only",
      "interpretation.star.tian-xiang.wealth",
      "interpretation.star.tian-kui.wealth",
      "interpretation.star.huo-xing.wealth",
      "interpretation.star.tian-fu.career",
      "interpretation.star.qing-yang.career"
    ]
  );
  assert.deepEqual(
    reportPlan.sections.find((section) => section.id === "wealth-palace")
      .evidenceRefs,
    [
      "wealth-palace.wealth-palace",
      "wealth-palace.life-palace",
      "wealth-palace.career-palace",
      "wealth-palace.wellbeing-palace"
    ]
  );
  assert.deepEqual(
    reportPlan.sections.find((section) => section.id === "spouse-palace")
      .referenceRefs,
    ["framework.spouse-palace", "rule.star-placement", "framework.palace-role"]
  );
  assert.deepEqual(
    reportPlan.sections.find((section) => section.id === "spouse-palace")
      .interpretationRefs,
    [
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
    ]
  );
  assert.ok(
    reportPlan.sections
      .find((section) => section.id === "spouse-palace")
      .evidence.some((item) => item.includes("夫妻宫卯"))
  );
  assert.deepEqual(
    reportPlan.sections.find((section) => section.id === "spouse-palace")
      .evidenceRefs,
    [
      "spouse-palace.spouse-palace",
      "spouse-palace.travel-palace",
      "spouse-palace.career-palace",
      "spouse-palace.wellbeing-palace"
    ]
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

test("createReportPlan blocks report-only domains without supported sections", () => {
  const agentResult = createZiweiAgentResponse(buildChart(createSampleProfile()), {
    queryIntent: parseQueryIntentFromText("我想看因果和前世今生。")
  });
  const reportPlan = createReportPlan(agentResult);

  assert.equal(reportPlan.status, "blocked");
  assert.deepEqual(reportPlan.sections, []);
  assert.ok(
    reportPlan.messages.some((message) => {
      return message.includes("没有可用报告章节");
    })
  );
  assert.ok(
    reportPlan.blockers.some((blocker) => {
      return blocker.includes("只完成目标登记");
    })
  );
});

test("createReportPlan creates spouse palace section for marriage intent", () => {
  const agentResult = createZiweiAgentResponse(buildChart(createSampleProfile()), {
    queryIntent: parseQueryIntentFromText("我想看婚姻感情。")
  });
  const reportPlan = createReportPlan(agentResult);
  const section = reportPlan.sections[0];

  assert.equal(reportPlan.status, "planned");
  assert.deepEqual(
    reportPlan.sections.map((item) => item.id),
    ["spouse-palace"]
  );
  assert.equal(section.title, "婚姻专题：夫妻宫三方四正");
  assert.ok(section.purpose.includes("迁移宫、官禄宫、福德宫"));
  assert.deepEqual(section.queryContext.primaryPalaceNames, ["夫妻宫"]);
  assert.ok(section.writingPrompt.includes("不推结婚时间"));
  assert.ok(section.guidingQuestions[0].includes("夫妻宫、迁移宫、官禄宫、福德宫"));
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

test("createReportPlan includes current stage synthesis when available", () => {
  const agentResult = createZiweiAgentResponse(buildChart({
    ...createSampleProfile(),
    analysis_date: "2026-06-30"
  }), {
    queryIntent: parseQueryIntentFromText("我想看今年运势。")
  });
  const reportPlan = createReportPlan(agentResult);
  const section = reportPlan.sections[0];

  assert.equal(reportPlan.status, "planned");
  assert.deepEqual(reportPlan.sections.map((item) => item.id), ["current-stage"]);
  assert.equal(section.title, "当前阶段运势底稿");
  assert.deepEqual(section.referenceRefs, [
    "framework.current-stage",
    "rule.current-major-period",
    "rule.major-periods",
    "rule.star-placement",
    "rule.birth-year-four-transformations"
  ]);
  assert.deepEqual(section.interpretationRefs, [
    "interpretation.current-stage.static-only"
  ]);
  assert.ok(section.evidence.some((item) => item.includes("当前阶段定位")));
  assert.ok(section.evidence.some((item) => item.includes("阶段大限宫位：34-43岁子女宫寅")));
  assert.ok(section.evidence.some((item) => item.includes("子女宫寅")));
  assert.ok(section.writingPrompt.includes("不推今年具体事件"));
});

test("createReportPlan asks for analysis date when current stage is unavailable", () => {
  const agentResult = createZiweiAgentResponse(buildChart(createSampleProfile()), {
    queryIntent: parseQueryIntentFromText("我想看未来运势。")
  });
  const reportPlan = createReportPlan(agentResult);

  assert.equal(reportPlan.status, "blocked");
  assert.deepEqual(reportPlan.sections, []);
  assert.deepEqual(reportPlan.missingTopicFields, ["analysis_date"]);
  assert.deepEqual(reportPlan.nextQuestions, ["请补充 analysis_date"]);
  assert.deepEqual(reportPlan.questionItems.map((item) => item.field), [
    "analysis_date"
  ]);
});

test("createReportPlan creates dedicated career and wealth sections for matching intent", () => {
  const agentResult = createZiweiAgentResponse(buildChart(createSampleProfile()), {
    queryIntent: parseQueryIntentFromText("我想先看事业和财帛。")
  });
  const reportPlan = createReportPlan(agentResult);
  const careerSection = reportPlan.sections[0];
  const wealthSection = reportPlan.sections[1];

  assert.deepEqual(
    reportPlan.sections.map((item) => item.id),
    ["career-palace", "wealth-palace"]
  );
  assert.equal(careerSection.title, "事业专题：官禄宫三方四正");
  assert.equal(wealthSection.title, "财帛专题：财帛宫三方四正");
  assert.ok(careerSection.purpose.includes("官禄宫用于建立事业发展报告"));
  assert.ok(wealthSection.purpose.includes("财帛宫用于建立财富资源报告"));
  assert.deepEqual(careerSection.queryContext.topicIds, ["career"]);
  assert.deepEqual(wealthSection.queryContext.topicIds, ["wealth"]);
  assert.deepEqual(careerSection.queryContext.primaryPalaceNames, ["官禄宫"]);
  assert.deepEqual(wealthSection.queryContext.primaryPalaceNames, ["财帛宫"]);
  assert.ok(careerSection.guidingQuestions[0].includes("官禄宫、命宫、财帛宫、夫妻宫"));
  assert.ok(wealthSection.guidingQuestions[0].includes("财帛宫、命宫、官禄宫、福德宫"));
  assert.ok(careerSection.writingPrompt.includes("不推职位高低"));
  assert.ok(wealthSection.writingPrompt.includes("不推具体金额"));
});

test("createReportPlan accepts external topic context without matched items", () => {
  const agentResult = createZiweiAgentResponse(buildChart(createSampleProfile()), {
    queryIntent: {
      hasIntent: true,
      focusAreaIds: ["life-triad"],
      topics: ["财帛"],
      topicIds: ["wealth"],
      primaryPalaceNames: ["财帛宫"]
    }
  });
  const reportPlan = createReportPlan(agentResult);
  const section = reportPlan.sections[0];

  assert.equal(section.title, "财帛专题：命宫与三方四正");
  assert.deepEqual(section.queryContext.primaryPalaceNames, ["财帛宫"]);
  assert.ok(section.writingPrompt.includes("财帛宫"));
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
