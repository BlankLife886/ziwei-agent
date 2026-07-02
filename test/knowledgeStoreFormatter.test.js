import assert from "node:assert/strict";
import test from "node:test";
import {
  formatKnowledgeStoreCoverage,
  formatKnowledgeStoreValidation
} from "../src/agent/knowledgeStoreFormatter.js";

test("formatKnowledgeStoreValidation renders successful validation", () => {
  const lines = formatKnowledgeStoreValidation({
    status: "ready",
    snippets: [],
    issues: []
  }, "data/knowledge-snippets.example.json");

  assert.deepEqual(lines, [
    "知识库校验：",
    "- 文件：data/knowledge-snippets.example.json",
    "- 状态：ready",
    "- 可用片段：0 项",
    "- 问题：0 项",
    "- 结果：通过"
  ]);
});

test("formatKnowledgeStoreValidation renders issue details", () => {
  const lines = formatKnowledgeStoreValidation({
    status: "needs_review",
    snippets: [],
    issues: [
      {
        id: "snippet.status-not-verified",
        snippetId: "knowledge-snippet.draft",
        message: "知识片段只有 status 为 verified 时才允许进入报告规划。"
      }
    ]
  }, "data/knowledge-snippets.example.json");

  assert.ok(lines.includes("问题列表："));
  assert.ok(
    lines.some((line) => {
      return line.includes("[snippet.status-not-verified]") &&
        line.includes("knowledge-snippet.draft");
    })
  );
});

test("formatKnowledgeStoreCoverage renders global coverage details", () => {
  const lines = formatKnowledgeStoreCoverage({
    status: "insufficient",
    storeStatus: "ready",
    snippetCount: 1,
    missingTopicIds: ["wealth"],
    sourceCoverage: [
      {
        sourceRef: "knowledge-source.local-reviewed-topic-notes",
        title: "本地审校专题知识笔记",
        status: "used",
        snippetCount: 1,
        sourceStatus: "verified"
      }
    ],
    topicCoverage: [
      {
        topicId: "career",
        title: "事业",
        status: "covered",
        snippetCount: 1,
        requiredSnippetCount: 1
      },
      {
        topicId: "wealth",
        title: "财富",
        status: "missing",
        snippetCount: 0,
        requiredSnippetCount: 1
      }
    ],
    referenceCoverage: [
      {
        referenceRef: "framework.career-palace",
        snippetCount: 1
      }
    ],
    issues: [
      {
        id: "knowledge-store.coverage.topic-missing",
        topicId: "wealth",
        message: "核心主题 财富 缺少 verified 知识片段。"
      }
    ],
    warnings: [],
    recommendations: ["优先补齐主题：财富。"]
  });

  assert.ok(lines.includes("知识库全局覆盖审计："));
  assert.ok(lines.some((line) => line.includes("财富（wealth）：missing")));
  assert.ok(lines.some((line) => line.includes("[knowledge-store.coverage.topic-missing]")));
  assert.ok(lines.includes("- 优先补齐主题：财富。"));
});
