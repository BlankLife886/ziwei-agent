import {
  KNOWLEDGE_RISK_LEVELS,
  KNOWLEDGE_SNIPPET_STATUS,
  auditKnowledgeSnippet
} from "./knowledgeSnippetCatalog.js";

// 知识片段录入器。
//
// 这一层处理“候选片段”到“知识片段”的标准化。它不读取 PDF，也不做 OCR；
// 只负责把已经抽出来的摘录/笔记整理成统一结构，并先以 draft 状态保存。
// 这样可以避免把尚未复核的扫描件内容直接当成报告依据。

export function ingestKnowledgeSnippetCandidate(candidate) {
  const normalizedSnippet = normalizeSnippetCandidate(candidate);
  const audit = auditKnowledgeSnippet(normalizedSnippet);

  return {
    status: audit.status === "passed" ? "ready" : "needs_review",
    snippet: normalizedSnippet,
    audit,
    nextAction: buildNextAction(audit)
  };
}

export function promoteKnowledgeSnippet(snippet) {
  const verifiedSnippet = {
    ...snippet,
    status: KNOWLEDGE_SNIPPET_STATUS.VERIFIED
  };
  const audit = auditKnowledgeSnippet(verifiedSnippet);

  return {
    status: audit.status === "passed" ? "verified" : "blocked",
    snippet: verifiedSnippet,
    audit,
    nextAction: buildNextAction(audit)
  };
}

function normalizeSnippetCandidate(candidate = {}) {
  const sourceRef = normalizeString(candidate.sourceRef);
  const title = normalizeString(candidate.title);
  const excerpt = normalizeString(candidate.excerpt);
  const citation = normalizeString(candidate.citation);
  const topicIds = normalizeStringArray(candidate.topicIds);
  const referenceRefs = normalizeStringArray(candidate.referenceRefs);
  const riskLevel = normalizeRiskLevel(candidate.riskLevel);

  return {
    id: normalizeString(candidate.id) || buildSnippetId(sourceRef, title, citation),
    sourceRef,
    title,
    topicIds,
    referenceRefs,
    excerpt,
    citation,
    status: normalizeString(candidate.status) || KNOWLEDGE_SNIPPET_STATUS.DRAFT,
    riskLevel
  };
}

function buildNextAction(audit) {
  if (audit.status === "passed") {
    return "知识片段已通过 schema 审计，可以进入后续人工复核或报告规划。";
  }

  return "请先补齐知识片段字段，并确认来源、摘录、主题和规则引用后再使用。";
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(normalizeString).filter(Boolean))];
}

function normalizeRiskLevel(value) {
  const normalized = normalizeString(value);

  if (Object.values(KNOWLEDGE_RISK_LEVELS).includes(normalized)) {
    return normalized;
  }

  return KNOWLEDGE_RISK_LEVELS.MEDIUM;
}

function buildSnippetId(sourceRef, title, citation) {
  const rawId = [sourceRef, title, citation]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return rawId ? `knowledge-snippet.${rawId}` : "";
}
