import assert from "node:assert/strict";
import test from "node:test";
import {
  buildKnowledgeRetrievalIndex,
  searchKnowledgeRetrievalIndex,
  summarizeKnowledgeRetrievalIndex
} from "../src/agent/knowledgeRetrievalIndex.js";
import {
  KNOWLEDGE_RISK_LEVELS,
  KNOWLEDGE_SOURCE_IDS,
  KNOWLEDGE_SNIPPET_STATUS
} from "../src/agent/knowledgeSnippetCatalog.js";

test("buildKnowledgeRetrievalIndex creates a local sparse vector manifest", () => {
  const index = buildKnowledgeRetrievalIndex([createCareerSnippet()]);
  const summary = summarizeKnowledgeRetrievalIndex(index);

  assert.equal(index.status, "ready");
  assert.equal(index.kind, "local-sparse-vector-index");
  assert.equal(index.persistence, "json-store");
  assert.equal(index.embeddingProvider, "none");
  assert.equal(summary.snippetCount, 1);
  assert.equal(summary.vocabularySize > 0, true);
});

test("searchKnowledgeRetrievalIndex ranks snippets by topic, reference, and text", () => {
  const index = buildKnowledgeRetrievalIndex([
    createCareerSnippet(),
    createWealthSnippet()
  ]);
  const results = searchKnowledgeRetrievalIndex({
    topicIds: ["career"],
    referenceRefs: ["framework.career-palace"],
    text: "事业 官禄宫 职责 结构"
  }, index);

  assert.equal(results[0].snippet.id, "knowledge-snippet.career-structure");
  assert.ok(results[0].score > 0);
  assert.deepEqual(results[0].matchedTopicIds, ["career"]);
  assert.deepEqual(results[0].matchedReferenceRefs, ["framework.career-palace"]);
});

test("searchKnowledgeRetrievalIndex respects topic and reference filters", () => {
  const index = buildKnowledgeRetrievalIndex([
    createCareerSnippet(),
    createWealthSnippet()
  ]);
  const results = searchKnowledgeRetrievalIndex({
    topicIds: ["wealth"],
    referenceRefs: ["framework.wealth-palace"],
    text: "事业 官禄宫"
  }, index);

  assert.deepEqual(
    results.map((result) => result.snippet.id),
    ["knowledge-snippet.wealth-structure"]
  );
});

test("buildKnowledgeRetrievalIndex keeps draft snippets out of the index", () => {
  const draftSnippet = {
    ...createCareerSnippet(),
    id: "knowledge-snippet.career-draft",
    status: KNOWLEDGE_SNIPPET_STATUS.DRAFT
  };
  const index = buildKnowledgeRetrievalIndex([
    createCareerSnippet(),
    draftSnippet
  ]);

  assert.deepEqual(
    index.entries.map((entry) => entry.snippetId),
    ["knowledge-snippet.career-structure"]
  );
});

function createCareerSnippet() {
  return {
    id: "knowledge-snippet.career-structure",
    sourceRef: KNOWLEDGE_SOURCE_IDS.PENDING_ZIWEI_CORPUS,
    title: "官禄宫结构研读片段",
    topicIds: ["career"],
    referenceRefs: ["framework.career-palace"],
    excerpt: "官禄宫专题需要结合命宫、财帛宫与夫妻宫观察职责结构。",
    citation: "待录入紫微斗数资料库 / 官禄宫研读笔记",
    status: KNOWLEDGE_SNIPPET_STATUS.VERIFIED,
    riskLevel: KNOWLEDGE_RISK_LEVELS.LOW
  };
}

function createWealthSnippet() {
  return {
    id: "knowledge-snippet.wealth-structure",
    sourceRef: KNOWLEDGE_SOURCE_IDS.PENDING_ZIWEI_CORPUS,
    title: "财帛宫结构研读片段",
    topicIds: ["wealth"],
    referenceRefs: ["framework.wealth-palace"],
    excerpt: "财帛宫专题需要结合命宫、官禄宫与福德宫观察资源结构。",
    citation: "待录入紫微斗数资料库 / 财帛宫研读笔记",
    status: KNOWLEDGE_SNIPPET_STATUS.VERIFIED,
    riskLevel: KNOWLEDGE_RISK_LEVELS.LOW
  };
}
