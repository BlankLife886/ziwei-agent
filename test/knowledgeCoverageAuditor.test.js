import assert from "node:assert/strict";
import test from "node:test";
import { auditKnowledgeCoverage } from "../src/agent/knowledgeCoverageAuditor.js";

test("auditKnowledgeCoverage skips unplanned reports", () => {
  const audit = auditKnowledgeCoverage({
    status: "blocked",
    sections: []
  });

  assert.equal(audit.status, "skipped");
  assert.deepEqual(audit.sections, []);
  assert.ok(audit.summary.includes("尚未完成"));
});

test("auditKnowledgeCoverage reports missing verified snippets per section", () => {
  const audit = auditKnowledgeCoverage({
    status: "planned",
    sections: [
      {
        id: "career-palace",
        title: "事业专题",
        referenceRefs: ["framework.career-palace"],
        knowledgeSnippetRefs: []
      }
    ]
  });

  assert.equal(audit.status, "insufficient");
  assert.deepEqual(audit.missingSectionIds, ["career-palace"]);
  assert.equal(audit.sections[0].status, "missing_verified_snippets");
  assert.ok(audit.sections[0].message.includes("本地规则"));
  assert.ok(audit.recommendations.some((item) => item.includes("verified")));
});

test("auditKnowledgeCoverage passes sections with verified snippet refs", () => {
  const audit = auditKnowledgeCoverage({
    status: "planned",
    sections: [
      {
        id: "career-palace",
        title: "事业专题",
        referenceRefs: ["framework.career-palace"],
        knowledgeSnippetRefs: ["knowledge-snippet.career-structure"]
      }
    ]
  });

  assert.equal(audit.status, "covered");
  assert.deepEqual(audit.missingSectionIds, []);
  assert.equal(audit.sections[0].status, "covered");
  assert.deepEqual(audit.recommendations, []);
});
