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
