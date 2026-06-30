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
