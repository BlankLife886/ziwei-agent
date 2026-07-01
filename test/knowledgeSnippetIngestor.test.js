import assert from "node:assert/strict";
import test from "node:test";
import {
  KNOWLEDGE_RISK_LEVELS,
  KNOWLEDGE_SOURCE_IDS,
  KNOWLEDGE_SNIPPET_STATUS
} from "../src/agent/knowledgeSnippetCatalog.js";
import {
  ingestKnowledgeSnippetCandidate,
  promoteKnowledgeSnippet
} from "../src/agent/knowledgeSnippetIngestor.js";

test("ingestKnowledgeSnippetCandidate normalizes candidate snippets as draft", () => {
  const result = ingestKnowledgeSnippetCandidate({
    sourceRef: KNOWLEDGE_SOURCE_IDS.PENDING_ZIWEI_CORPUS,
    title: "  官禄宫结构研读  ",
    topicIds: ["career", "career", ""],
    referenceRefs: ["framework.career-palace", " "],
    excerpt: "  官禄宫专题需要合看命宫和财帛宫。  ",
    citation: "  研读笔记 / 官禄宫  ",
    riskLevel: KNOWLEDGE_RISK_LEVELS.LOW
  });

  assert.equal(result.status, "needs_review");
  assert.equal(result.snippet.status, KNOWLEDGE_SNIPPET_STATUS.DRAFT);
  assert.equal(result.snippet.title, "官禄宫结构研读");
  assert.deepEqual(result.snippet.topicIds, ["career"]);
  assert.deepEqual(result.snippet.referenceRefs, ["framework.career-palace"]);
  assert.ok(result.snippet.id.startsWith("knowledge-snippet."));
  assert.ok(
    result.audit.issues.some((issue) => {
      return issue.id === "snippet.status-not-verified";
    })
  );
});

test("promoteKnowledgeSnippet verifies complete reviewed snippets", () => {
  const draftResult = ingestKnowledgeSnippetCandidate(createCompleteCandidate());
  const promoted = promoteKnowledgeSnippet(draftResult.snippet);

  assert.equal(promoted.status, "verified");
  assert.equal(promoted.snippet.status, KNOWLEDGE_SNIPPET_STATUS.VERIFIED);
  assert.equal(promoted.audit.status, "passed");
  assert.ok(promoted.nextAction.includes("通过 schema 审计"));
});

test("promoteKnowledgeSnippet blocks incomplete snippets", () => {
  const promoted = promoteKnowledgeSnippet({
    ...createCompleteCandidate(),
    excerpt: ""
  });

  assert.equal(promoted.status, "blocked");
  assert.equal(promoted.audit.status, "failed");
  assert.ok(
    promoted.audit.issues.some((issue) => issue.id === "snippet.excerpt.required")
  );
});

test("ingestKnowledgeSnippetCandidate keeps invalid risk levels conservative", () => {
  const result = ingestKnowledgeSnippetCandidate({
    ...createCompleteCandidate(),
    riskLevel: "unsupported"
  });

  assert.equal(result.snippet.riskLevel, KNOWLEDGE_RISK_LEVELS.MEDIUM);
});

function createCompleteCandidate() {
  return {
    id: "knowledge-snippet.career-structure-note",
    sourceRef: KNOWLEDGE_SOURCE_IDS.PENDING_ZIWEI_CORPUS,
    title: "官禄宫结构研读",
    topicIds: ["career"],
    referenceRefs: ["framework.career-palace"],
    excerpt: "官禄宫专题需要合看命宫和财帛宫。",
    citation: "研读笔记 / 官禄宫",
    riskLevel: KNOWLEDGE_RISK_LEVELS.LOW
  };
}
