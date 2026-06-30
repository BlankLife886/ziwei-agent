import assert from "node:assert/strict";
import test from "node:test";
import {
  INTERPRETATION_IDS,
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
  assert.ok(interpretations[0].text.includes("不能代表该阶段的具体吉凶"));
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
