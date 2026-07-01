import { readFile } from "node:fs/promises";
import { auditKnowledgeSnippet } from "./knowledgeSnippetCatalog.js";

// 知识片段持久化加载层。
//
// 这里只负责读取 JSON 文件、做基础形状校验和逐条 schema 审计。
// 它不把失败片段静默丢进报告规划，避免“文件里有内容”被误认为
// “agent 已经可以引用这些内容”。

export async function loadKnowledgeSnippetStore(filePath) {
  const rawText = await readFile(filePath, "utf8");
  const payload = JSON.parse(rawText);

  return buildKnowledgeSnippetStore(payload);
}

export function buildKnowledgeSnippetStore(payload) {
  if (!Array.isArray(payload?.snippets)) {
    return {
      status: "invalid",
      snippets: [],
      audits: [],
      issues: [
        {
          id: "knowledge-store.snippets.required",
          message: "知识库文件必须包含 snippets 数组。"
        }
      ]
    };
  }

  const audits = payload.snippets.map((snippet) => {
    return {
      snippetId: snippet?.id ?? null,
      audit: auditKnowledgeSnippet(snippet)
    };
  });
  const validSnippets = payload.snippets.filter((snippet, index) => {
    return audits[index].audit.status === "passed";
  });
  const issues = audits.flatMap((item) => {
    return item.audit.issues.map((issue) => {
      return {
        ...issue,
        snippetId: item.snippetId
      };
    });
  });

  return {
    status: issues.length === 0 ? "ready" : "needs_review",
    snippets: validSnippets,
    audits,
    issues
  };
}
