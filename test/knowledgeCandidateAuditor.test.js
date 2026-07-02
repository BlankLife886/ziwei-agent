import assert from "node:assert/strict";
import test from "node:test";
import {
  KNOWLEDGE_RISK_LEVELS,
  KNOWLEDGE_SOURCE_IDS
} from "../src/agent/knowledgeSnippetCatalog.js";
import {
  auditKnowledgeSnippetCandidate,
  auditKnowledgeSnippetCandidates
} from "../src/agent/knowledgeCandidateAuditor.js";

test("auditKnowledgeSnippetCandidate passes traceable candidate notes", () => {
  const audit = auditKnowledgeSnippetCandidate(createCandidate());

  assert.equal(audit.status, "passed");
  assert.deepEqual(audit.issues, []);
});

test("auditKnowledgeSnippetCandidate blocks weak source locators and short excerpts", () => {
  const audit = auditKnowledgeSnippetCandidate({
    ...createCandidate(),
    excerpt: "官禄合看命财。",
    citation: "笔记"
  });

  assert.equal(audit.status, "failed");
  assert.ok(
    audit.issues.some((issue) => issue.id === "candidate.excerpt.too-short")
  );
  assert.ok(
    audit.issues.some((issue) => issue.id === "candidate.citation.too-short")
  );
  assert.ok(
    audit.issues.some((issue) => issue.id === "candidate.citation.locator-missing")
  );
});

test("auditKnowledgeSnippetCandidate blocks topic and reference mismatches", () => {
  const audit = auditKnowledgeSnippetCandidate({
    ...createCandidate(),
    topicIds: ["wealth"],
    referenceRefs: ["framework.career-palace"]
  });

  assert.equal(audit.status, "failed");
  assert.ok(
    audit.issues.some((issue) => issue.id === "candidate.topic-reference.mismatch")
  );
});

test("auditKnowledgeSnippetCandidate blocks unsupported references", () => {
  const audit = auditKnowledgeSnippetCandidate({
    ...createCandidate(),
    referenceRefs: ["framework.unknown"]
  });

  assert.equal(audit.status, "failed");
  assert.ok(
    audit.issues.some((issue) => issue.id === "candidate.referenceRefs.unknown")
  );
});

test("auditKnowledgeSnippetCandidate blocks unbounded high risk claims", () => {
  const audit = auditKnowledgeSnippetCandidate({
    ...createCandidate(),
    excerpt: "此组合一定会在具体年份发生财富结果，需要直接断出投资结果。"
  });

  assert.equal(audit.status, "failed");
  assert.ok(
    audit.issues.some((issue) => {
      return issue.id === "candidate.risk-language.absolute-claim";
    })
  );
  assert.ok(
    audit.issues.some((issue) => {
      return issue.id === "candidate.risk-language.wealth-outcome-claim";
    })
  );
});

test("auditKnowledgeSnippetCandidate allows risk words inside boundary language", () => {
  const audit = auditKnowledgeSnippetCandidate({
    ...createCandidate(),
    excerpt: "财富专题不能写成具体金额、投资结果或暴富判断，只能整理资源结构和风险边界。"
  });

  assert.equal(audit.status, "passed");
});

test("auditKnowledgeSnippetCandidate still blocks mixed boundary and outcome claims", () => {
  const audit = auditKnowledgeSnippetCandidate({
    ...createCandidate(),
    excerpt: "财富专题不能写成具体金额，但是此组合一定会带来财富结果。"
  });

  assert.equal(audit.status, "failed");
  assert.ok(
    audit.issues.some((issue) => {
      return issue.id === "candidate.risk-language.absolute-claim";
    })
  );
  assert.ok(
    audit.issues.some((issue) => {
      return issue.id === "candidate.risk-language.wealth-outcome-claim";
    })
  );
});

test("auditKnowledgeSnippetCandidates summarizes batch failures", () => {
  const audit = auditKnowledgeSnippetCandidates([
    createCandidate("knowledge-snippet.batch.good"),
    {
      ...createCandidate("knowledge-snippet.batch.bad"),
      citation: "笔记",
      excerpt: "太短。"
    }
  ]);

  assert.equal(audit.status, "failed");
  assert.equal(audit.items.length, 2);
  assert.equal(audit.issues.some((issue) => issue.index === 1), true);
});

function createCandidate(id = "knowledge-snippet.candidate.audit") {
  return {
    id,
    sourceRef: KNOWLEDGE_SOURCE_IDS.PENDING_ZIWEI_CORPUS,
    title: "官禄宫结构研读",
    topicIds: ["career"],
    referenceRefs: ["framework.career-palace"],
    excerpt: "官禄宫专题需要先观察职责结构，再合看命宫的主体承载和财帛宫的资源承接。",
    citation: "研读笔记示例 / 官禄宫结构 / 段落 1",
    riskLevel: KNOWLEDGE_RISK_LEVELS.LOW
  };
}
