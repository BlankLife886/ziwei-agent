import assert from "node:assert/strict";
import test from "node:test";
import {
  KNOWLEDGE_SOURCE_IDS,
  findKnowledgeSnippets,
  findKnowledgeSources,
  searchKnowledgeSnippets
} from "../src/agent/knowledgeSnippetCatalog.js";

test("findKnowledgeSources exposes the pending external corpus source", () => {
  const sources = findKnowledgeSources([
    KNOWLEDGE_SOURCE_IDS.PENDING_ZIWEI_CORPUS
  ]);

  assert.deepEqual(
    sources.map((source) => source.id),
    [KNOWLEDGE_SOURCE_IDS.PENDING_ZIWEI_CORPUS]
  );
  assert.equal(sources[0].status, "planned");
  assert.ok(sources[0].note.includes("不能作为报告断语依据"));
});

test("knowledge snippet lookup stays empty until external material is recorded", () => {
  assert.deepEqual(findKnowledgeSnippets(["missing-snippet"]), []);
  assert.deepEqual(searchKnowledgeSnippets({
    topicIds: ["career"],
    referenceRefs: ["framework.career-palace"]
  }), []);
});
