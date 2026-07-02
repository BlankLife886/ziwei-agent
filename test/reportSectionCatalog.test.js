import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSectionGuidingQuestions,
  buildSectionInterpretationRefs,
  buildSectionPurpose,
  buildSectionTitle,
  buildSectionWritingPrompt,
  getReportSectionDefinition
} from "../src/agent/reportSectionCatalog.js";

test("report section catalog defines the reusable marriage triad contract", () => {
  const focusArea = {
    id: "spouse-palace",
    title: "夫妻宫三方四正",
    reason: "默认婚姻分析说明"
  };
  const queryContext = {
    hasIntent: true,
    topics: ["婚姻"],
    primaryPalaceNames: ["夫妻宫"]
  };
  const evidenceItems = [
    createPalaceEvidence("夫妻宫", {
      mainStars: ["武曲", "七杀"],
      auxiliaryStars: [],
      maleficStars: ["铃星"],
      voidStars: []
    }),
    createPalaceEvidence("迁移宫", {
      mainStars: ["廉贞", "贪狼"],
      auxiliaryStars: ["天官"],
      maleficStars: [],
      voidStars: []
    }),
    createPalaceEvidence("官禄宫", {
      mainStars: ["天府"],
      auxiliaryStars: [],
      maleficStars: ["擎羊"],
      voidStars: []
    }),
    createPalaceEvidence("福德宫", {
      mainStars: ["紫微", "破军"],
      auxiliaryStars: ["左辅", "右弼", "天钺"],
      maleficStars: ["陀罗"],
      voidStars: []
    })
  ];

  assert.ok(getReportSectionDefinition("spouse-palace"));
  assert.equal(buildSectionTitle(focusArea, queryContext), "婚姻专题：夫妻宫三方四正");
  assert.ok(buildSectionPurpose(focusArea, queryContext).includes("迁移宫、官禄宫、福德宫"));
  assert.ok(buildSectionGuidingQuestions("spouse-palace", queryContext)[0].includes("夫妻宫、迁移宫、官禄宫、福德宫"));
  assert.ok(buildSectionWritingPrompt("spouse-palace", queryContext).includes("不推结婚时间"));
  assert.deepEqual(buildSectionInterpretationRefs("spouse-palace", evidenceItems), [
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

test("report section catalog uses life palace star interpretations for personality evidence", () => {
  const evidenceItems = [
    createPalaceEvidence("命宫", {
      mainStars: ["紫微", "破军"],
      auxiliaryStars: ["左辅", "右弼"],
      maleficStars: ["火星"],
      voidStars: []
    }),
    createPalaceEvidence("财帛宫", {
      mainStars: [],
      auxiliaryStars: [],
      maleficStars: [],
      voidStars: []
    }),
    createPalaceEvidence("官禄宫", {
      mainStars: [],
      auxiliaryStars: [],
      maleficStars: [],
      voidStars: []
    }),
    createPalaceEvidence("迁移宫", {
      mainStars: [],
      auxiliaryStars: [],
      maleficStars: [],
      voidStars: []
    })
  ];

  assert.deepEqual(buildSectionInterpretationRefs("life-triad", evidenceItems), [
    "interpretation.life-triad.structure",
    "interpretation.palace-role.life",
    "interpretation.palace-role.wealth",
    "interpretation.palace-role.career",
    "interpretation.palace-role.travel",
    "interpretation.star.zi-wei.life",
    "interpretation.star.po-jun.life",
    "interpretation.star.zuo-fu.life",
    "interpretation.star.you-bi.life",
    "interpretation.star.huo-xing.life"
  ]);
});

test("report section catalog defines dedicated career and wealth contracts", () => {
  const careerFocusArea = {
    id: "career-palace",
    title: "官禄宫三方四正",
    reason: "默认事业分析说明"
  };
  const wealthFocusArea = {
    id: "wealth-palace",
    title: "财帛宫三方四正",
    reason: "默认财富分析说明"
  };
  const careerContext = {
    hasIntent: true,
    topics: ["事业"],
    primaryPalaceNames: ["官禄宫"]
  };
  const wealthContext = {
    hasIntent: true,
    topics: ["财帛"],
    primaryPalaceNames: ["财帛宫"]
  };
  const careerEvidenceItems = [
    createPalaceEvidence("官禄宫", {
      mainStars: ["天府"],
      auxiliaryStars: [],
      maleficStars: ["擎羊"],
      voidStars: []
    }),
    createPalaceEvidence("命宫", {
      mainStars: [],
      auxiliaryStars: [],
      maleficStars: [],
      voidStars: []
    }),
    createPalaceEvidence("财帛宫", {
      mainStars: ["天相"],
      auxiliaryStars: ["天魁"],
      maleficStars: ["火星"],
      voidStars: []
    }),
    createPalaceEvidence("夫妻宫", {
      mainStars: ["武曲", "七杀"],
      auxiliaryStars: [],
      maleficStars: ["铃星"],
      voidStars: []
    })
  ];
  const wealthEvidenceItems = [
    createPalaceEvidence("财帛宫", {
      mainStars: ["天相"],
      auxiliaryStars: ["天魁"],
      maleficStars: ["火星"],
      voidStars: []
    }),
    createPalaceEvidence("命宫", {
      mainStars: [],
      auxiliaryStars: [],
      maleficStars: [],
      voidStars: []
    }),
    createPalaceEvidence("官禄宫", {
      mainStars: ["天府"],
      auxiliaryStars: [],
      maleficStars: ["擎羊"],
      voidStars: []
    }),
    createPalaceEvidence("福德宫", {
      mainStars: ["紫微", "破军"],
      auxiliaryStars: ["左辅", "右弼", "天钺"],
      maleficStars: ["陀罗"],
      voidStars: []
    })
  ];

  assert.equal(buildSectionTitle(careerFocusArea, careerContext), "事业专题：官禄宫三方四正");
  assert.equal(buildSectionTitle(wealthFocusArea, wealthContext), "财帛专题：财帛宫三方四正");
  assert.ok(buildSectionWritingPrompt("career-palace", careerContext).includes("不推职位高低"));
  assert.ok(buildSectionWritingPrompt("wealth-palace", wealthContext).includes("不推具体金额"));
  assert.deepEqual(buildSectionInterpretationRefs("career-palace", careerEvidenceItems), [
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
  ]);
  assert.deepEqual(buildSectionInterpretationRefs("wealth-palace", wealthEvidenceItems), [
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
  ]);
});

test("report section catalog keeps unknown sections conservative", () => {
  const focusArea = {
    id: "unknown-section",
    title: "未知章节",
    reason: "只保留证据"
  };
  const queryContext = {
    hasIntent: false,
    topics: [],
    primaryPalaceNames: []
  };

  assert.equal(getReportSectionDefinition("unknown-section"), null);
  assert.equal(buildSectionTitle(focusArea, queryContext), "未知章节");
  assert.equal(buildSectionPurpose(focusArea, queryContext), "只保留证据");
  assert.deepEqual(buildSectionInterpretationRefs("unknown-section", []), []);
  assert.ok(buildSectionGuidingQuestions("unknown-section", queryContext)[0].includes("可验证"));
  assert.ok(buildSectionWritingPrompt("unknown-section", queryContext).includes("明确未知项"));
});

test("current stage section includes timing trigger boundary only when candidates exist", () => {
  const evidenceItems = [
    {
      id: "current-stage.current-major-period",
      text: "当前阶段定位：测试",
      metadata: {}
    },
    {
      id: "current-stage.timing-trigger-candidates",
      text: "安全触发观察点：测试",
      metadata: {
        timingTriggerCandidates: [
          {
            palaceName: "子女宫"
          }
        ]
      }
    }
  ];

  assert.ok(
    buildSectionWritingPrompt("current-stage", {
      hasIntent: true,
      topics: ["运势"],
      primaryPalaceNames: []
    }).includes("安全触发观察点")
  );
  assert.ok(
    buildSectionInterpretationRefs("current-stage", evidenceItems).includes(
      "interpretation.timing-trigger.candidate-only"
    )
  );
  assert.ok(
    !buildSectionInterpretationRefs("current-stage", [evidenceItems[0]]).includes(
      "interpretation.timing-trigger.candidate-only"
    )
  );
});

test("transformation sections include four transformation type boundaries from metadata", () => {
  const transformationEvidenceItems = [
    {
      id: "birth-year-transformations.summary",
      text: "生年四化：太阳化禄在兄弟宫辰；武曲化权在夫妻宫卯；太阴化科在财帛宫丑；天同化忌在子女宫寅",
      metadata: {
        transformations: [
          { name: "化禄", star: "太阳", targetPalaceName: "兄弟宫" },
          { name: "化权", star: "武曲", targetPalaceName: "夫妻宫" },
          { name: "化科", star: "太阴", targetPalaceName: "财帛宫" },
          { name: "化忌", star: "天同", targetPalaceName: "子女宫" }
        ]
      }
    }
  ];
  const currentStageEvidenceItems = [
    {
      id: "current-stage.current-major-period",
      text: "当前阶段定位：测试",
      metadata: {}
    },
    ...transformationEvidenceItems
  ];

  assert.deepEqual(buildSectionInterpretationRefs(
    "birth-year-transformations",
    transformationEvidenceItems
  ), [
    "interpretation.four-transformations.birth-year-static-only",
    "interpretation.four-transformations.lu-structure",
    "interpretation.four-transformations.quan-structure",
    "interpretation.four-transformations.ke-structure",
    "interpretation.four-transformations.ji-structure",
    "interpretation.four-transformations.lu-quan-pair",
    "interpretation.four-transformations.lu-ke-pair",
    "interpretation.four-transformations.lu-ji-pair",
    "interpretation.four-transformations.quan-ke-pair",
    "interpretation.four-transformations.quan-ji-pair",
    "interpretation.four-transformations.ke-ji-pair",
    "interpretation.four-transformations.on-spouse-palace",
    "interpretation.four-transformations.on-wealth-palace",
    "interpretation.four-transformations.on-siblings-palace",
    "interpretation.four-transformations.on-children-palace"
  ]);
  assert.deepEqual(buildSectionInterpretationRefs(
    "current-stage",
    currentStageEvidenceItems
  ).slice(0, 18), [
    "interpretation.current-stage.static-only",
    "interpretation.four-transformations.major-period-stage-only",
    "interpretation.annual-period.structure-only",
    "interpretation.four-transformations.annual-structure-only",
    "interpretation.four-transformations.lu-structure",
    "interpretation.four-transformations.quan-structure",
    "interpretation.four-transformations.ke-structure",
    "interpretation.four-transformations.ji-structure",
    "interpretation.four-transformations.lu-quan-pair",
    "interpretation.four-transformations.lu-ke-pair",
    "interpretation.four-transformations.lu-ji-pair",
    "interpretation.four-transformations.quan-ke-pair",
    "interpretation.four-transformations.quan-ji-pair",
    "interpretation.four-transformations.ke-ji-pair",
    "interpretation.four-transformations.on-spouse-palace",
    "interpretation.four-transformations.on-wealth-palace",
    "interpretation.four-transformations.on-siblings-palace",
    "interpretation.four-transformations.on-children-palace"
  ]);
});

function createPalaceEvidence(palaceName, starGroups) {
  return {
    id: `test.${palaceName}`,
    text: `${palaceName}测试宫位`,
    metadata: {
      palaceName,
      starGroups
    }
  };
}
