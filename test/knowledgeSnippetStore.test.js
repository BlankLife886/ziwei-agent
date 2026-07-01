import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  KNOWLEDGE_RISK_LEVELS,
  KNOWLEDGE_SOURCE_IDS,
  KNOWLEDGE_SNIPPET_STATUS
} from "../src/agent/knowledgeSnippetCatalog.js";
import {
  buildKnowledgeSnippetStore,
  loadKnowledgeSnippetStore
} from "../src/agent/knowledgeSnippetStore.js";

test("buildKnowledgeSnippetStore accepts verified snippets", () => {
  const store = buildKnowledgeSnippetStore({
    snippets: [createVerifiedSnippet()]
  });

  assert.equal(store.status, "ready");
  assert.equal(store.snippets.length, 1);
  assert.deepEqual(store.issues, []);
});

test("buildKnowledgeSnippetStore keeps invalid snippets out of usable store", () => {
  const store = buildKnowledgeSnippetStore({
    snippets: [
      createVerifiedSnippet(),
      {
        ...createVerifiedSnippet(),
        id: "knowledge-snippet.invalid",
        status: KNOWLEDGE_SNIPPET_STATUS.DRAFT
      }
    ]
  });

  assert.equal(store.status, "needs_review");
  assert.deepEqual(
    store.snippets.map((snippet) => snippet.id),
    ["knowledge-snippet.career-structure-store"]
  );
  assert.ok(
    store.issues.some((issue) => issue.id === "snippet.status-not-verified")
  );
});

test("buildKnowledgeSnippetStore rejects files without snippets array", () => {
  const store = buildKnowledgeSnippetStore({});

  assert.equal(store.status, "invalid");
  assert.deepEqual(store.snippets, []);
  assert.equal(store.issues[0].id, "knowledge-store.snippets.required");
});

test("loadKnowledgeSnippetStore reads a JSON knowledge store file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-"));
  const filePath = join(dir, "snippets.json");

  await writeFile(filePath, JSON.stringify({
    snippets: [createVerifiedSnippet()]
  }), "utf8");

  const store = await loadKnowledgeSnippetStore(filePath);

  assert.equal(store.status, "ready");
  assert.equal(store.snippets[0].id, "knowledge-snippet.career-structure-store");
});

function createVerifiedSnippet() {
  return {
    id: "knowledge-snippet.career-structure-store",
    sourceRef: KNOWLEDGE_SOURCE_IDS.PENDING_ZIWEI_CORPUS,
    title: "官禄宫结构片段",
    topicIds: ["career"],
    referenceRefs: ["framework.career-palace"],
    excerpt: "官禄宫专题需要合看命宫、财帛宫与夫妻宫。",
    citation: "示例知识库 / 官禄宫结构",
    status: KNOWLEDGE_SNIPPET_STATUS.VERIFIED,
    riskLevel: KNOWLEDGE_RISK_LEVELS.LOW
  };
}
