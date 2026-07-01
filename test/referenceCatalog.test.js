import assert from "node:assert/strict";
import test from "node:test";
import {
  findSources,
  findReferences,
  REFERENCE_IDS,
  SOURCE_IDS
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
      return reference.title && reference.type && reference.note && reference.sourceRefs;
    })
  );
});

test("findSources returns local source records in catalog order", () => {
  const sources = findSources([
    SOURCE_IDS.LOCAL_ANALYSIS_FRAMEWORKS,
    SOURCE_IDS.LOCAL_IMPLEMENTED_RULES,
    SOURCE_IDS.PENDING_ZIWEI_CORPUS
  ]);

  assert.deepEqual(
    sources.map((source) => source.id),
    [
      SOURCE_IDS.LOCAL_IMPLEMENTED_RULES,
      SOURCE_IDS.LOCAL_ANALYSIS_FRAMEWORKS,
      SOURCE_IDS.PENDING_ZIWEI_CORPUS
    ]
  );
  assert.ok(
    sources.every((source) => {
      return source.title && source.type && source.status && source.citation;
    })
  );
});
