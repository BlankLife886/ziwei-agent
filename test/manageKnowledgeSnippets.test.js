import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  KNOWLEDGE_RISK_LEVELS,
  KNOWLEDGE_SOURCE_IDS,
  KNOWLEDGE_SNIPPET_STATUS
} from "../src/agent/knowledgeSnippetCatalog.js";
import {
  appendKnowledgeSnippetBatchFile,
  appendKnowledgeSnippetFile,
  auditKnowledgeSnippetCandidateFile,
  auditKnowledgeSnippetCandidatesFile,
  draftKnowledgeSnippetBatchFile,
  draftKnowledgeSnippetFile,
  promoteKnowledgeSnippetBatchFile,
  promoteKnowledgeSnippetFile,
  runKnowledgeSnippetCommand
} from "../src/manageKnowledgeSnippets.js";

test("draftKnowledgeSnippetFile normalizes candidate notes and writes draft snippets", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-command-"));
  const inputPath = join(dir, "candidate.json");
  const outputPath = join(dir, "draft.json");
  await writeJson(inputPath, {
    ...createCandidate(),
    title: "  官禄宫结构研读  ",
    topicIds: ["career", "career"]
  });

  const result = await draftKnowledgeSnippetFile({
    command: "draft",
    input: inputPath,
    output: outputPath
  });
  const output = JSON.parse(result.output);
  const draft = JSON.parse(await readFile(outputPath, "utf8"));

  assert.equal(result.exitCode, 0);
  assert.equal(output.status, "needs_review");
  assert.equal(output.audit.status, "failed");
  assert.equal(draft.status, KNOWLEDGE_SNIPPET_STATUS.DRAFT);
  assert.equal(draft.title, "官禄宫结构研读");
  assert.deepEqual(draft.topicIds, ["career"]);
});

test("auditKnowledgeSnippetCandidateFile reports candidate preflight quality", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-command-"));
  const inputPath = join(dir, "candidate.json");
  await writeJson(inputPath, createCandidate());

  const result = await auditKnowledgeSnippetCandidateFile({
    command: "audit-candidate",
    input: inputPath
  });
  const output = JSON.parse(result.output);

  assert.equal(result.exitCode, 0);
  assert.equal(output.status, "passed");
  assert.equal(output.audit.status, "passed");
});

test("auditKnowledgeSnippetCandidatesFile reports batch preflight failures", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-command-"));
  const inputPath = join(dir, "candidates.json");
  await writeJson(inputPath, {
    candidates: [
      createCandidate("knowledge-snippet.batch.good", "career"),
      {
        ...createCandidate("knowledge-snippet.batch.bad", "career"),
        excerpt: "太短。",
        citation: "笔记"
      }
    ]
  });

  const result = await auditKnowledgeSnippetCandidatesFile({
    command: "audit-candidates",
    input: inputPath
  });
  const output = JSON.parse(result.output);

  assert.equal(result.exitCode, 1);
  assert.equal(output.status, "failed");
  assert.equal(output.failedCount, 1);
  assert.ok(
    output.audit.issues.some((issue) => issue.id === "candidate.excerpt.too-short")
  );
});

test("draftKnowledgeSnippetFile blocks candidates that fail preflight", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-command-"));
  const inputPath = join(dir, "candidate.json");
  const outputPath = join(dir, "draft.json");
  await writeJson(inputPath, {
    ...createCandidate(),
    topicIds: ["wealth"],
    referenceRefs: ["framework.career-palace"]
  });

  const result = await draftKnowledgeSnippetFile({
    command: "draft",
    input: inputPath,
    output: outputPath
  });
  const output = JSON.parse(result.output);

  assert.equal(result.exitCode, 1);
  assert.equal(output.status, "blocked");
  assert.equal(output.candidateAudit.status, "failed");
  assert.equal(existsSync(outputPath), false);
});

test("promoteKnowledgeSnippetFile blocks incomplete draft snippets", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-command-"));
  const inputPath = join(dir, "draft.json");
  const outputPath = join(dir, "verified.json");
  await writeJson(inputPath, {
    ...createCandidate(),
    excerpt: "",
    status: KNOWLEDGE_SNIPPET_STATUS.DRAFT
  });

  const result = await promoteKnowledgeSnippetFile({
    command: "promote",
    input: inputPath,
    output: outputPath
  });
  const output = JSON.parse(result.output);

  assert.equal(result.exitCode, 1);
  assert.equal(output.status, "blocked");
  assert.equal(output.audit.status, "failed");
  assert.equal(existsSync(outputPath), false);
  assert.ok(
    output.audit.issues.some((issue) => issue.id === "snippet.excerpt.required")
  );
});

test("promoteKnowledgeSnippetFile writes verified snippets when review gates pass", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-command-"));
  const inputPath = join(dir, "draft.json");
  const outputPath = join(dir, "verified.json");
  await writeJson(inputPath, {
    ...createCandidate(),
    status: KNOWLEDGE_SNIPPET_STATUS.DRAFT
  });

  const result = await promoteKnowledgeSnippetFile({
    command: "promote",
    input: inputPath,
    output: outputPath
  });
  const output = JSON.parse(result.output);
  const verified = JSON.parse(await readFile(outputPath, "utf8"));

  assert.equal(result.exitCode, 0);
  assert.equal(output.status, "verified");
  assert.equal(verified.status, KNOWLEDGE_SNIPPET_STATUS.VERIFIED);
  assert.equal(output.audit.status, "passed");
});

test("appendKnowledgeSnippetFile appends only verified snippets and validates the full store", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-command-"));
  const inputPath = join(dir, "verified.json");
  const storePath = join(dir, "store.json");
  await writeJson(inputPath, {
    ...createCandidate(),
    status: KNOWLEDGE_SNIPPET_STATUS.VERIFIED
  });
  await writeJson(storePath, {
    snippets: []
  });

  const result = await appendKnowledgeSnippetFile({
    command: "append",
    input: inputPath,
    store: storePath
  });
  const output = JSON.parse(result.output);
  const store = JSON.parse(await readFile(storePath, "utf8"));

  assert.equal(result.exitCode, 0);
  assert.equal(output.status, "appended");
  assert.equal(output.storeStatus, "ready");
  assert.equal(output.snippetCount, 1);
  assert.deepEqual(store.snippets.map((snippet) => snippet.id), [
    "knowledge-snippet.career-structure-command"
  ]);
});

test("appendKnowledgeSnippetFile blocks draft snippets before touching the store", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-command-"));
  const inputPath = join(dir, "draft.json");
  const storePath = join(dir, "store.json");
  await writeJson(inputPath, {
    ...createCandidate(),
    status: KNOWLEDGE_SNIPPET_STATUS.DRAFT
  });
  await writeJson(storePath, {
    snippets: []
  });

  const result = await appendKnowledgeSnippetFile({
    command: "append",
    input: inputPath,
    store: storePath
  });
  const output = JSON.parse(result.output);
  const store = JSON.parse(await readFile(storePath, "utf8"));

  assert.equal(result.exitCode, 1);
  assert.equal(output.status, "blocked");
  assert.equal(output.audit.status, "failed");
  assert.deepEqual(store.snippets, []);
});

test("appendKnowledgeSnippetFile blocks duplicate snippet ids", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-command-"));
  const inputPath = join(dir, "verified.json");
  const storePath = join(dir, "store.json");
  const snippet = {
    ...createCandidate(),
    status: KNOWLEDGE_SNIPPET_STATUS.VERIFIED
  };
  await writeJson(inputPath, snippet);
  await writeJson(storePath, {
    snippets: [snippet]
  });

  const result = await appendKnowledgeSnippetFile({
    command: "append",
    input: inputPath,
    store: storePath
  });
  const output = JSON.parse(result.output);

  assert.equal(result.exitCode, 1);
  assert.equal(output.status, "blocked");
  assert.equal(output.issues[0].id, "knowledge-store.snippet.duplicate-id");
});

test("runKnowledgeSnippetCommand exposes help text", async () => {
  const result = await runKnowledgeSnippetCommand(["--help"]);

  assert.equal(result.exitCode, 0);
  assert.ok(result.output.includes("audit-candidate --input"));
  assert.ok(result.output.includes("audit-candidates --input"));
  assert.ok(result.output.includes("draft --input"));
  assert.ok(result.output.includes("draft-batch --input"));
  assert.ok(result.output.includes("promote --input"));
  assert.ok(result.output.includes("promote-batch --input"));
  assert.ok(result.output.includes("append --input"));
  assert.ok(result.output.includes("append-batch --input"));
});

test("draftKnowledgeSnippetBatchFile blocks failing candidate queues", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-command-"));
  const inputPath = join(dir, "candidates.json");
  const outputPath = join(dir, "drafts.json");
  await writeJson(inputPath, {
    candidates: [
      createCandidate("knowledge-snippet.batch.good", "career"),
      {
        ...createCandidate("knowledge-snippet.batch.bad", "wealth"),
        referenceRefs: ["framework.career-palace"]
      }
    ]
  });

  const result = await draftKnowledgeSnippetBatchFile({
    command: "draft-batch",
    input: inputPath,
    output: outputPath
  });
  const output = JSON.parse(result.output);

  assert.equal(result.exitCode, 1);
  assert.equal(output.status, "blocked");
  assert.equal(output.candidateAudit.status, "failed");
  assert.equal(existsSync(outputPath), false);
});

test("draftKnowledgeSnippetBatchFile writes a review queue from candidates", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-command-"));
  const inputPath = join(dir, "candidates.json");
  const outputPath = join(dir, "drafts.json");
  await writeJson(inputPath, {
    candidates: [
      createCandidate("knowledge-snippet.batch.career", "career"),
      createCandidate("knowledge-snippet.batch.wealth", "wealth")
    ]
  });

  const result = await draftKnowledgeSnippetBatchFile({
    command: "draft-batch",
    input: inputPath,
    output: outputPath
  });
  const output = JSON.parse(result.output);
  const drafts = JSON.parse(await readFile(outputPath, "utf8"));

  assert.equal(result.exitCode, 0);
  assert.equal(output.status, "needs_review");
  assert.equal(output.count, 2);
  assert.equal(output.needsReviewCount, 2);
  assert.deepEqual(drafts.snippets.map((snippet) => snippet.status), [
    KNOWLEDGE_SNIPPET_STATUS.DRAFT,
    KNOWLEDGE_SNIPPET_STATUS.DRAFT
  ]);
  assert.equal(drafts.review.items.length, 2);
});

test("promoteKnowledgeSnippetBatchFile uses all-or-nothing writes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-command-"));
  const inputPath = join(dir, "drafts.json");
  const outputPath = join(dir, "verified.json");
  await writeJson(inputPath, {
    snippets: [
      {
        ...createCandidate("knowledge-snippet.batch.career", "career"),
        status: KNOWLEDGE_SNIPPET_STATUS.DRAFT
      },
      {
        ...createCandidate("knowledge-snippet.batch.incomplete", "wealth"),
        excerpt: "",
        status: KNOWLEDGE_SNIPPET_STATUS.DRAFT
      }
    ]
  });

  const result = await promoteKnowledgeSnippetBatchFile({
    command: "promote-batch",
    input: inputPath,
    output: outputPath
  });
  const output = JSON.parse(result.output);

  assert.equal(result.exitCode, 1);
  assert.equal(output.status, "blocked");
  assert.equal(output.verifiedCount, 1);
  assert.equal(output.blockedCount, 1);
  assert.equal(existsSync(outputPath), false);
});

test("promoteKnowledgeSnippetBatchFile writes verified review queues", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-command-"));
  const inputPath = join(dir, "drafts.json");
  const outputPath = join(dir, "verified.json");
  await writeJson(inputPath, {
    snippets: [
      {
        ...createCandidate("knowledge-snippet.batch.career", "career"),
        status: KNOWLEDGE_SNIPPET_STATUS.DRAFT
      },
      {
        ...createCandidate("knowledge-snippet.batch.wealth", "wealth"),
        status: KNOWLEDGE_SNIPPET_STATUS.DRAFT
      }
    ]
  });

  const result = await promoteKnowledgeSnippetBatchFile({
    command: "promote-batch",
    input: inputPath,
    output: outputPath
  });
  const output = JSON.parse(result.output);
  const verified = JSON.parse(await readFile(outputPath, "utf8"));

  assert.equal(result.exitCode, 0);
  assert.equal(output.status, "verified");
  assert.equal(output.verifiedCount, 2);
  assert.deepEqual(verified.snippets.map((snippet) => snippet.status), [
    KNOWLEDGE_SNIPPET_STATUS.VERIFIED,
    KNOWLEDGE_SNIPPET_STATUS.VERIFIED
  ]);
});

test("appendKnowledgeSnippetBatchFile appends verified queues atomically", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-command-"));
  const inputPath = join(dir, "verified.json");
  const storePath = join(dir, "store.json");
  await writeJson(inputPath, {
    snippets: [
      {
        ...createCandidate("knowledge-snippet.batch.career", "career"),
        status: KNOWLEDGE_SNIPPET_STATUS.VERIFIED
      },
      {
        ...createCandidate("knowledge-snippet.batch.wealth", "wealth"),
        status: KNOWLEDGE_SNIPPET_STATUS.VERIFIED
      }
    ]
  });
  await writeJson(storePath, {
    snippets: []
  });

  const result = await appendKnowledgeSnippetBatchFile({
    command: "append-batch",
    input: inputPath,
    store: storePath
  });
  const output = JSON.parse(result.output);
  const store = JSON.parse(await readFile(storePath, "utf8"));

  assert.equal(result.exitCode, 0);
  assert.equal(output.status, "appended");
  assert.equal(output.appendedCount, 2);
  assert.equal(output.snippetCount, 2);
  assert.deepEqual(store.snippets.map((snippet) => snippet.id), [
    "knowledge-snippet.batch.career",
    "knowledge-snippet.batch.wealth"
  ]);
});

test("appendKnowledgeSnippetBatchFile blocks duplicate batch ids before writing", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-knowledge-command-"));
  const inputPath = join(dir, "verified.json");
  const storePath = join(dir, "store.json");
  await writeJson(inputPath, {
    snippets: [
      {
        ...createCandidate("knowledge-snippet.batch.duplicate", "career"),
        status: KNOWLEDGE_SNIPPET_STATUS.VERIFIED
      },
      {
        ...createCandidate("knowledge-snippet.batch.duplicate", "wealth"),
        status: KNOWLEDGE_SNIPPET_STATUS.VERIFIED
      }
    ]
  });
  await writeJson(storePath, {
    snippets: []
  });

  const result = await appendKnowledgeSnippetBatchFile({
    command: "append-batch",
    input: inputPath,
    store: storePath
  });
  const output = JSON.parse(result.output);
  const store = JSON.parse(await readFile(storePath, "utf8"));

  assert.equal(result.exitCode, 1);
  assert.equal(output.status, "blocked");
  assert.equal(output.issues[0].id, "knowledge-store.batch.duplicate-id");
  assert.deepEqual(store.snippets, []);
});

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function createCandidate(
  id = "knowledge-snippet.career-structure-command",
  topicId = "career"
) {
  return {
    id,
    sourceRef: KNOWLEDGE_SOURCE_IDS.PENDING_ZIWEI_CORPUS,
    title: "官禄宫结构研读",
    topicIds: [topicId],
    referenceRefs: [topicId === "wealth"
      ? "framework.wealth-palace"
      : "framework.career-palace"],
    excerpt: "官禄宫专题需要先观察职责结构，再合看命宫主体承载、财帛宫资源承接与夫妻宫合作牵动。",
    citation: "研读笔记 / 官禄宫结构",
    riskLevel: KNOWLEDGE_RISK_LEVELS.LOW
  };
}
