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
import { parseQueryIntentFromText } from "../src/agent/queryIntentParser.js";
import { runZiweiPipeline } from "../src/agent/ziweiPipeline.js";
import { buildChart } from "../src/chartBuilder.js";

test("buildKnowledgeSnippetStore accepts verified snippets", () => {
  const store = buildKnowledgeSnippetStore({
    snippets: [createVerifiedSnippet()]
  });

  assert.equal(store.status, "ready");
  assert.equal(store.snippets.length, 1);
  assert.equal(store.retrievalIndex.kind, "local-sparse-vector-index");
  assert.equal(store.memoryManifest.persistence, "json-store");
  assert.equal(store.memoryManifest.reviewPolicy, "verified-snippets-only");
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
  assert.equal(store.memoryManifest.retrieval.snippetCount, 1);
});

test("example knowledge store covers the default report pipeline", async () => {
  const store = await loadKnowledgeSnippetStore("data/knowledge-snippets.example.json");
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()), {
    knowledgeSnippets: store.snippets
  });

  assert.equal(store.status, "ready");
  assert.equal(pipelineResult.knowledgeCoverageAudit.status, "covered");
  assert.equal(pipelineResult.knowledgeMemory.retrieval.kind, "local-sparse-vector-index");
  assert.equal(pipelineResult.knowledgeMemory.retrieval.snippetCount, 20);
  assert.equal(pipelineResult.readinessAudit.percent >= 85, true);
  assert.deepEqual(pipelineResult.knowledgeCoverageAudit.missingSectionIds, []);
  assert.equal(
    pipelineResult.reportPlan.sections.every((section) => {
      return section.knowledgeSnippetRefs.length > 0;
    }),
    true
  );
});

test("example knowledge store provides layered topic snippets for focused reports", async () => {
  const store = await loadKnowledgeSnippetStore("data/knowledge-snippets.example.json");
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()), {
    knowledgeSnippets: store.snippets,
    queryIntent: parseQueryIntentFromText("我想看婚姻、财富、事业和当前运势。")
  });
  const sectionsById = new Map(
    pipelineResult.reportPlan.sections.map((section) => [section.id, section])
  );

  assert.equal(store.status, "ready");
  assert.equal(store.snippets.length, 20);
  assert.equal(pipelineResult.knowledgeCoverageAudit.status, "covered");
  assert.deepEqual(
    pipelineResult.knowledgeCoverageAudit.missingSectionIds,
    []
  );
  assert.ok(
    sectionsById
      .get("career-palace")
      .knowledgeSnippetRefs.includes("knowledge-snippet.local.career-responsibility-layer")
  );
  assert.ok(
    sectionsById
      .get("wealth-palace")
      .knowledgeSnippetRefs.includes("knowledge-snippet.local.wealth-resource-layer")
  );
  assert.ok(
    sectionsById
      .get("spouse-palace")
      .knowledgeSnippetRefs.includes("knowledge-snippet.local.spouse-interaction-layer")
  );
  assert.ok(
    sectionsById
      .get("current-stage")
      .knowledgeSnippetRefs.includes("knowledge-snippet.local.current-stage-layering")
  );
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

function createSampleProfile() {
  return {
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    analysis_date: "2026-06-30",
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  };
}
