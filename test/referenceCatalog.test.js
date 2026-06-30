import assert from "node:assert/strict";
import test from "node:test";
import {
  findReferences,
  REFERENCE_IDS
} from "../src/agent/referenceCatalog.js";

test("findReferences returns known references in catalog order", () => {
  const references = findReferences([
    REFERENCE_IDS.STAR_BALANCE,
    REFERENCE_IDS.BIRTH_YEAR_FOUR_TRANSFORMATIONS,
    REFERENCE_IDS.MAJOR_PERIODS,
    REFERENCE_IDS.CURRENT_MAJOR_PERIOD,
    REFERENCE_IDS.LIFE_TRIAD
  ]);

  assert.deepEqual(
    references.map((reference) => reference.id),
    [
      REFERENCE_IDS.BIRTH_YEAR_FOUR_TRANSFORMATIONS,
      REFERENCE_IDS.MAJOR_PERIODS,
      REFERENCE_IDS.CURRENT_MAJOR_PERIOD,
      REFERENCE_IDS.LIFE_TRIAD,
      REFERENCE_IDS.STAR_BALANCE
    ]
  );
  assert.ok(
    references.every((reference) => {
      return reference.title && reference.type && reference.note;
    })
  );
});
