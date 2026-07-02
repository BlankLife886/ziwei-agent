import assert from "node:assert/strict";
import test from "node:test";
import {
  INTERPRETATION_IDS,
  findFourTransformationPairInterpretationRefs,
  findFourTransformationStarPalaceInterpretationRefs,
  findFourTransformationStarRoleInterpretationRefs,
  findFourTransformationTargetPalaceInterpretationRefs,
  findFourTransformationTypeInterpretationRefs,
  findInterpretations,
  findStarRoleInterpretationRefs
} from "../src/agent/interpretationCatalog.js";

test("findInterpretations returns known interpretation items in catalog order", () => {
  const interpretations = findInterpretations([
    INTERPRETATION_IDS.STAR_BALANCE_STATIC_ONLY,
    INTERPRETATION_IDS.LIFE_TRIAD_EMPTY_LIFE_PALACE
  ]);

  assert.deepEqual(
    interpretations.map((item) => item.id),
    [
      INTERPRETATION_IDS.LIFE_TRIAD_EMPTY_LIFE_PALACE,
      INTERPRETATION_IDS.STAR_BALANCE_STATIC_ONLY
    ]
  );
  assert.ok(
    interpretations.every((item) => {
      return item.sourceRefs.length > 0 && item.text.length > 0;
    })
  );
});

test("findInterpretations includes palace role interpretation items", () => {
  const interpretations = findInterpretations([
    INTERPRETATION_IDS.PALACE_ROLE_WEALTH,
    INTERPRETATION_IDS.PALACE_ROLE_CAREER
  ]);

  assert.deepEqual(
    interpretations.map((item) => item.title),
    ["财帛宫的分析角色", "官禄宫的分析角色"]
  );
  assert.ok(interpretations[0].text.includes("资源经营"));
});

test("findInterpretations includes current major period boundary item", () => {
  const interpretations = findInterpretations([
    INTERPRETATION_IDS.CURRENT_MAJOR_PERIOD_LOCATOR_ONLY
  ]);

  assert.equal(interpretations[0].topic, "current-major-period");
  assert.ok(interpretations[0].text.includes("不能直接代表具体年份事件"));
});

test("findStarRoleInterpretationRefs maps palace stars to controlled items", () => {
  const interpretationRefs = findStarRoleInterpretationRefs("财帛宫", {
    mainStars: ["天相"],
    auxiliaryStars: ["天魁"],
    maleficStars: ["火星"],
    voidStars: []
  });

  assert.deepEqual(interpretationRefs, [
    INTERPRETATION_IDS.STAR_TIAN_XIANG_WEALTH,
    INTERPRETATION_IDS.STAR_TIAN_KUI_WEALTH,
    INTERPRETATION_IDS.STAR_HUO_XING_WEALTH
  ]);

  const interpretations = findInterpretations(interpretationRefs);

  assert.ok(
    interpretations.every((interpretation) => {
      return interpretation.topic === "star-role";
    })
  );
  assert.deepEqual(
    interpretations.map((interpretation) => interpretation.starName),
    ["天相", "天魁", "火星"]
  );
  assert.deepEqual(
    interpretations.map((interpretation) => interpretation.palaceName),
    ["财帛宫", "财帛宫", "财帛宫"]
  );
  assert.ok(interpretations[0].text.includes("不能直接断定财富结果"));
  assert.ok(interpretations[0].synthesis.includes("资源秩序"));
});

test("findFourTransformationTypeInterpretationRefs maps transformation names to controlled items", () => {
  const interpretationRefs = findFourTransformationTypeInterpretationRefs([
    { name: "化禄", star: "太阳" },
    { name: "化权", star: "武曲" },
    { name: "化科", star: "太阴" },
    { name: "化忌", star: "天同" }
  ]);

  assert.deepEqual(interpretationRefs, [
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_LU_STRUCTURE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_QUAN_STRUCTURE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_KE_STRUCTURE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_JI_STRUCTURE
  ]);

  const interpretations = findInterpretations(interpretationRefs);

  assert.deepEqual(
    interpretations.map((interpretation) => interpretation.transformationName),
    ["化禄", "化权", "化科", "化忌"]
  );
  assert.ok(interpretations[0].text.includes("不能单独写成得财"));
  assert.ok(interpretations[1].text.includes("不能单独写成掌权"));
  assert.ok(interpretations[2].text.includes("不能单独写成成名"));
  assert.ok(interpretations[3].text.includes("不能单独写成灾祸"));
});

test("findFourTransformationPairInterpretationRefs maps available transformation pairs", () => {
  const interpretationRefs = findFourTransformationPairInterpretationRefs([
    { name: "化禄", star: "太阳" },
    { name: "化权", star: "武曲" },
    { name: "化科", star: "太阴" },
    { name: "化忌", star: "天同" }
  ]);

  assert.deepEqual(interpretationRefs, [
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_LU_QUAN_PAIR,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_LU_KE_PAIR,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_LU_JI_PAIR,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_QUAN_KE_PAIR,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_QUAN_JI_PAIR,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_KE_JI_PAIR
  ]);

  const interpretations = findInterpretations(interpretationRefs);

  assert.deepEqual(
    interpretations.map((interpretation) => interpretation.topic),
    [
      "four-transformation-pair",
      "four-transformation-pair",
      "four-transformation-pair",
      "four-transformation-pair",
      "four-transformation-pair",
      "four-transformation-pair"
    ]
  );
  assert.ok(interpretations[0].text.includes("资源流动与推动责任需要同看"));
  assert.ok(interpretations[2].text.includes("不能写成先得后失"));
  assert.ok(interpretations[4].text.includes("不能写成冲突失败"));

  assert.deepEqual(findFourTransformationPairInterpretationRefs([
    { name: "化禄", star: "太阳" },
    { name: "化忌", star: "天同" }
  ]), [
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_LU_JI_PAIR
  ]);
});

test("findFourTransformationStarPalaceInterpretationRefs maps transformed stars with target palaces", () => {
  const interpretationRefs = findFourTransformationStarPalaceInterpretationRefs([
    { name: "化禄", star: "太阳", targetPalaceName: "兄弟宫" },
    { name: "化权", star: "武曲", targetPalaceName: "夫妻宫" },
    { name: "化科", star: "太阴", targetPalaceName: "财帛宫" },
    { name: "化忌", star: "天同", targetPalaceName: "子女宫" },
    { name: "化禄", star: "", targetPalaceName: "命宫" },
    { name: "化权", star: "紫微", targetPalaceName: null }
  ]);

  assert.deepEqual(interpretationRefs, [
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_STAR_LU_SAME_PALACE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_STAR_QUAN_SAME_PALACE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_STAR_KE_SAME_PALACE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_STAR_JI_SAME_PALACE
  ]);

  const interpretations = findInterpretations(interpretationRefs);

  assert.deepEqual(
    interpretations.map((interpretation) => interpretation.topic),
    [
      "four-transformation-star-palace",
      "four-transformation-star-palace",
      "four-transformation-star-palace",
      "four-transformation-star-palace"
    ]
  );
  assert.ok(interpretations[0].text.includes("先看该星曜在目标宫位承担的角色"));
  assert.ok(interpretations[1].text.includes("不能脱离星曜与宫位直接写成掌权"));
  assert.ok(interpretations[3].text.includes("不能脱离星曜与宫位直接写成灾祸"));

  assert.deepEqual(findFourTransformationStarPalaceInterpretationRefs([
    { name: "化禄", star: "太阳" },
    { name: "化忌", targetPalaceName: "子女宫" }
  ]), []);
});

test("findFourTransformationStarRoleInterpretationRefs maps transformed star roles", () => {
  const interpretationRefs = findFourTransformationStarRoleInterpretationRefs([
    { name: "化禄", star: "太阳", targetPalaceName: "兄弟宫" },
    { name: "化权", star: "武曲", targetPalaceName: "夫妻宫" },
    { name: "化科", star: "太阴", targetPalaceName: "财帛宫" },
    { name: "化忌", star: "天同", targetPalaceName: "子女宫" },
    { name: "化禄", star: "天府", targetPalaceName: "命宫" },
    { name: "化权", star: "紫微", targetPalaceName: null }
  ]);

  assert.deepEqual(interpretationRefs, [
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_STAR_ROLE_TAI_YANG,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_STAR_ROLE_WU_QU,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_STAR_ROLE_TIAN_TONG,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_STAR_ROLE_TAI_YIN
  ]);

  const interpretations = findInterpretations(interpretationRefs);

  assert.deepEqual(
    interpretations.map((interpretation) => interpretation.topic),
    [
      "four-transformation-star-role",
      "four-transformation-star-role",
      "four-transformation-star-role",
      "four-transformation-star-role"
    ]
  );
  assert.ok(interpretations[0].text.includes("太阳被四化标记时"));
  assert.ok(interpretations[1].text.includes("资源管理、执行纪律"));
  assert.ok(interpretations[2].text.includes("不宜直接写成享福"));
  assert.ok(interpretations[3].text.includes("内在感受、承载"));

  assert.deepEqual(findFourTransformationStarRoleInterpretationRefs([
    { name: "化禄", star: "太阳" },
    { name: "化忌", targetPalaceName: "子女宫" }
  ]), []);
});

test("findFourTransformationTargetPalaceInterpretationRefs maps supported target palaces", () => {
  const interpretationRefs = findFourTransformationTargetPalaceInterpretationRefs([
    { name: "化禄", star: "紫微", targetPalaceName: "命宫" },
    { name: "化权", star: "武曲", targetPalaceName: "夫妻宫" },
    { name: "化科", star: "太阴", targetPalaceName: "财帛宫" },
    { name: "化忌", star: "天机", targetPalaceName: "官禄宫" },
    { name: "化禄", star: "贪狼", targetPalaceName: "迁移宫" },
    { name: "化科", star: "天梁", targetPalaceName: "福德宫" },
    { name: "化忌", star: "天同", targetPalaceName: "兄弟宫" },
    { name: "化禄", star: "天同", targetPalaceName: "子女宫" },
    { name: "化权", star: "廉贞", targetPalaceName: "疾厄宫" },
    { name: "化科", star: "天府", targetPalaceName: "田宅宫" },
    { name: "化忌", star: "巨门", targetPalaceName: "仆役宫" },
    { name: "化禄", star: "太阳", targetPalaceName: "父母宫" }
  ]);

  assert.deepEqual(interpretationRefs, [
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_ON_LIFE_PALACE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_ON_SPOUSE_PALACE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_ON_WEALTH_PALACE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_ON_CAREER_PALACE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_ON_TRAVEL_PALACE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_ON_WELLBEING_PALACE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_ON_SIBLINGS_PALACE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_ON_CHILDREN_PALACE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_ON_HEALTH_PALACE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_ON_PROPERTY_PALACE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_ON_FRIENDS_PALACE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_ON_PARENTS_PALACE
  ]);

  const interpretations = findInterpretations(interpretationRefs);

  assert.deepEqual(
    interpretations.map((interpretation) => interpretation.palaceName),
    [
      "命宫",
      "夫妻宫",
      "财帛宫",
      "官禄宫",
      "迁移宫",
      "福德宫",
      "兄弟宫",
      "子女宫",
      "疾厄宫",
      "田宅宫",
      "仆役宫",
      "父母宫"
    ]
  );
  assert.ok(interpretations[1].text.includes("不是婚姻结果判断"));
  assert.ok(interpretations[2].text.includes("不是财富结果判断"));
  assert.ok(interpretations[3].text.includes("不是事业结果判断"));
  assert.ok(interpretations[7].text.includes("不能直接写成生育结果"));
  assert.ok(interpretations[8].text.includes("不能直接写成疾病诊断"));
  assert.ok(interpretations[9].text.includes("不能直接写成置业结果"));
});

test("findStarRoleInterpretationRefs maps life palace stars for personality analysis", () => {
  const interpretationRefs = findStarRoleInterpretationRefs("命宫", {
    mainStars: ["紫微", "天机", "破军"],
    auxiliaryStars: ["左辅", "右弼"],
    maleficStars: ["火星", "铃星"],
    voidStars: []
  });

  assert.deepEqual(interpretationRefs, [
    INTERPRETATION_IDS.STAR_ZI_WEI_LIFE,
    INTERPRETATION_IDS.STAR_TIAN_JI_LIFE,
    INTERPRETATION_IDS.STAR_PO_JUN_LIFE,
    INTERPRETATION_IDS.STAR_ZUO_FU_LIFE,
    INTERPRETATION_IDS.STAR_YOU_BI_LIFE,
    INTERPRETATION_IDS.STAR_HUO_XING_LIFE,
    INTERPRETATION_IDS.STAR_LING_XING_LIFE
  ]);

  const interpretations = findInterpretations(interpretationRefs);

  assert.deepEqual(
    interpretations.map((interpretation) => interpretation.palaceName),
    ["命宫", "命宫", "命宫", "命宫", "命宫", "命宫", "命宫"]
  );
  assert.ok(interpretations[0].text.includes("自我秩序"));
  assert.ok(interpretations[2].text.includes("重整意识"));
  assert.ok(interpretations[5].text.includes("不能单独定吉凶"));
});

test("findStarRoleInterpretationRefs maps spouse palace stars", () => {
  const interpretationRefs = findStarRoleInterpretationRefs("夫妻宫", {
    mainStars: ["武曲", "七杀"],
    auxiliaryStars: [],
    maleficStars: ["铃星"],
    voidStars: []
  });

  assert.deepEqual(interpretationRefs, [
    INTERPRETATION_IDS.STAR_WU_QU_SPOUSE,
    INTERPRETATION_IDS.STAR_QI_SHA_SPOUSE,
    INTERPRETATION_IDS.STAR_LING_XING_SPOUSE
  ]);

  const interpretations = findInterpretations(interpretationRefs);

  assert.deepEqual(
    interpretations.map((interpretation) => interpretation.starName),
    ["武曲", "七杀", "铃星"]
  );
  assert.ok(interpretations[0].text.includes("不宜直接断定"));
  assert.ok(interpretations[1].text.includes("不应单独写成分离结论"));
});
