import assert from "node:assert/strict";
import test from "node:test";
import {
  KNOWLEDGE_RISK_LEVELS,
  KNOWLEDGE_SOURCE_IDS,
  KNOWLEDGE_SNIPPET_STATUS
} from "../src/agent/knowledgeSnippetCatalog.js";
import { auditKnowledgeStoreCoverage } from "../src/agent/knowledgeStoreCoverageAuditor.js";
import { loadKnowledgeSnippetStore } from "../src/agent/knowledgeSnippetStore.js";

test("auditKnowledgeStoreCoverage marks the example store as globally covered", async () => {
  const store = await loadKnowledgeSnippetStore("data/knowledge-snippets.example.json");
  const audit = auditKnowledgeStoreCoverage(store);

  assert.equal(audit.status, "covered");
  assert.equal(audit.storeStatus, "ready");
  assert.equal(audit.snippetCount, 20);
  assert.deepEqual(audit.missingTopicIds, []);
  assert.equal(
    audit.topicCoverage.every((topic) => topic.status === "covered"),
    true
  );
  assert.ok(
    audit.sourceCoverage.some((source) => {
      return source.sourceRef === KNOWLEDGE_SOURCE_IDS.LOCAL_REVIEWED_TOPIC_NOTES &&
        source.snippetCount > 0;
    })
  );
});

test("auditKnowledgeStoreCoverage reports global topic gaps", () => {
  const audit = auditKnowledgeStoreCoverage({
    status: "ready",
    snippets: [createSnippet()]
  });

  assert.equal(audit.status, "insufficient");
  assert.ok(audit.missingTopicIds.includes("wealth"));
  assert.ok(audit.missingTopicIds.includes("marriage"));
  assert.ok(
    audit.issues.some((issue) => {
      return issue.id === "knowledge-store.coverage.topic-missing" &&
        issue.topicId === "wealth";
    })
  );
  assert.ok(audit.riskLevelCoverage.low > 0);
});

test("auditKnowledgeStoreCoverage warns when planned sources are used as verified snippets", () => {
  const audit = auditKnowledgeStoreCoverage({
    status: "ready",
    snippets: [
      {
        ...createSnippet(),
        sourceRef: KNOWLEDGE_SOURCE_IDS.PENDING_ZIWEI_CORPUS
      }
    ]
  });

  assert.ok(
    audit.warnings.some((warning) => {
      return warning.id === "knowledge-store.coverage.planned-source-used";
    })
  );
});

function createSnippet() {
  return {
    id: "knowledge-snippet.coverage.career",
    sourceRef: KNOWLEDGE_SOURCE_IDS.LOCAL_REVIEWED_TOPIC_NOTES,
    title: "事业结构覆盖片段",
    topicIds: ["career"],
    referenceRefs: ["framework.career-palace"],
    excerpt: "事业专题先观察官禄宫责任结构，再合看命宫主体承载和财帛宫资源承接。",
    citation: "覆盖审计测试 / 事业结构 / 段落 1",
    status: KNOWLEDGE_SNIPPET_STATUS.VERIFIED,
    riskLevel: KNOWLEDGE_RISK_LEVELS.LOW
  };
}
