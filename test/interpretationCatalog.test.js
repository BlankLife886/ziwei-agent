import assert from "node:assert/strict";
import test from "node:test";
import {
  INTERPRETATION_IDS,
  findInterpretations
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
