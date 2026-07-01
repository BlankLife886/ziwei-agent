import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTopicRefinement,
  interpretTopicRefinements
} from "../src/agent/topicRefinementInterpreter.js";

test("interpretTopicRefinements builds traceable topic tasks for report sections", () => {
  const refinements = interpretTopicRefinements({
    id: "wealth-palace",
    queryContext: {
      hasIntent: true,
      topics: ["财帛"],
      topicIds: ["wealth"],
      primaryPalaceNames: ["财帛宫"]
    },
    evidenceItems: [
      {
        id: "wealth-palace.wealth-palace",
        text: "财帛宫酉：天相",
        metadata: { palaceName: "财帛宫" }
      },
      {
        id: "wealth-palace.career-palace",
        text: "官禄宫亥：天府",
        metadata: { palaceName: "官禄宫" }
      }
    ],
    referenceRefs: ["framework.wealth-palace"],
    sourceRefs: ["source.local.analysis-frameworks"],
    knowledgeSnippetRefs: ["knowledge-snippet.local.wealth-palace-framework"],
    interpretationRefs: ["interpretation.wealth-triad.structure"]
  });

  assert.equal(refinements.length, 1);
  assert.equal(refinements[0].title, "财富专题细分");
  assert.deepEqual(refinements[0].evidenceRefs, ["wealth-palace.wealth-palace"]);
  assert.deepEqual(refinements[0].referenceRefs, [
    "framework.topic-refinement",
    "framework.wealth-palace"
  ]);
  assert.deepEqual(refinements[0].sourceRefs, ["source.local.analysis-frameworks"]);
  assert.deepEqual(refinements[0].knowledgeSnippetRefs, [
    "knowledge-snippet.local.wealth-palace-framework"
  ]);
  assert.ok(
    refinements[0].interpretationRefs.includes("interpretation.topic-refinement.structure-only")
  );
  assert.ok(formatTopicRefinement(refinements[0]).includes("不能推具体金额"));
});

test("interpretTopicRefinements returns no task for unsupported sections", () => {
  assert.deepEqual(interpretTopicRefinements({ id: "unknown-section" }), []);
});
