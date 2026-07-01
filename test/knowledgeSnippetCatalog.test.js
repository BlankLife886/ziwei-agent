import assert from "node:assert/strict";
import test from "node:test";
import {
  KNOWLEDGE_RISK_LEVELS,
  KNOWLEDGE_SOURCE_IDS,
  KNOWLEDGE_SNIPPET_STATUS,
  auditKnowledgeSnippet,
  findKnowledgeSnippets,
  findKnowledgeSources,
  isUsableKnowledgeSnippet,
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

test("verified knowledge snippets can be found by id and query", () => {
  const snippets = [createSnippet()];

  assert.deepEqual(
    findKnowledgeSnippets(["knowledge-snippet.career-structure"], { snippets })
      .map((snippet) => snippet.id),
    ["knowledge-snippet.career-structure"]
  );
  assert.deepEqual(
    searchKnowledgeSnippets({
      topicIds: ["career"],
      referenceRefs: ["framework.career-palace"]
    }, { snippets }).map((snippet) => snippet.id),
    ["knowledge-snippet.career-structure"]
  );
});

test("unverified or incomplete snippets are blocked from retrieval", () => {
  const draftSnippet = {
    ...createSnippet(),
    id: "knowledge-snippet.draft",
    status: KNOWLEDGE_SNIPPET_STATUS.DRAFT
  };
  const incompleteSnippet = {
    ...createSnippet(),
    id: "knowledge-snippet.incomplete",
    citation: ""
  };
  const snippets = [draftSnippet, incompleteSnippet];

  assert.equal(isUsableKnowledgeSnippet(draftSnippet), false);
  assert.equal(isUsableKnowledgeSnippet(incompleteSnippet), false);
  assert.deepEqual(findKnowledgeSnippets([
    "knowledge-snippet.draft",
    "knowledge-snippet.incomplete"
  ], { snippets }), []);
  assert.deepEqual(searchKnowledgeSnippets({
    topicIds: ["career"],
    referenceRefs: ["framework.career-palace"]
  }, { snippets }), []);
});

test("auditKnowledgeSnippet reports schema and status issues", () => {
  const audit = auditKnowledgeSnippet({
    ...createSnippet(),
    topicIds: [],
    status: KNOWLEDGE_SNIPPET_STATUS.RETIRED
  });

  assert.equal(audit.status, "failed");
  assert.ok(
    audit.issues.some((issue) => issue.id === "snippet.topicIds.required")
  );
  assert.ok(
    audit.issues.some((issue) => issue.id === "snippet.status-not-verified")
  );
});

function createSnippet() {
  return {
    id: "knowledge-snippet.career-structure",
    sourceRef: KNOWLEDGE_SOURCE_IDS.PENDING_ZIWEI_CORPUS,
    title: "官禄宫结构研读片段",
    topicIds: ["career"],
    referenceRefs: ["framework.career-palace"],
    excerpt: "官禄宫专题需要结合命宫、财帛宫与夫妻宫观察结构。",
    citation: "待录入紫微斗数资料库 / 官禄宫研读笔记",
    status: KNOWLEDGE_SNIPPET_STATUS.VERIFIED,
    riskLevel: KNOWLEDGE_RISK_LEVELS.LOW
  };
}
