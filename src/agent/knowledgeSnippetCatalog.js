// 外部知识片段目录。
//
// 这里是后续接入书籍、PDF、笔记和向量检索的边界层。
// 当前先建立可审计的数据结构和检索函数，不把尚未录入的资料伪装成
// 已经可引用的命理依据。

export const KNOWLEDGE_SOURCE_IDS = {
  PENDING_ZIWEI_CORPUS: "knowledge-source.pending-ziwei-corpus"
};

export const KNOWLEDGE_SNIPPET_STATUS = {
  DRAFT: "draft",
  VERIFIED: "verified",
  RETIRED: "retired"
};

export const KNOWLEDGE_RISK_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
};

const KNOWLEDGE_SOURCES = [
  {
    id: KNOWLEDGE_SOURCE_IDS.PENDING_ZIWEI_CORPUS,
    title: "待录入紫微斗数资料库",
    type: "pending-corpus",
    status: "planned",
    citation: "用户提供的文章、PDF、书籍和研读笔记尚未结构化录入。",
    note: "占位来源只用于标记后续知识库接入目标，不能作为报告断语依据。"
  }
];

// 知识片段 schema：
// {
//   id: "knowledge-snippet.xxx",
//   sourceRef: "knowledge-source.xxx",
//   title: "片段标题",
//   topicIds: ["career"],
//   referenceRefs: ["framework.career-palace"],
//   excerpt: "可复核的原文摘录或研读笔记摘录",
//   citation: "书名/篇名/页码/文件名/段落定位",
//   status: "verified",
//   riskLevel: "low"
// }
//
// 这里先保持空数组，避免把尚未结构化录入的资料伪装成可引用依据。
const KNOWLEDGE_SNIPPETS = [];

export function findKnowledgeSources(sourceRefs = []) {
  const refSet = new Set(sourceRefs);

  return KNOWLEDGE_SOURCES.filter((source) => refSet.has(source.id));
}

export function findKnowledgeSnippets(snippetRefs = [], options = {}) {
  const refSet = new Set(snippetRefs);
  const snippets = options.snippets ?? KNOWLEDGE_SNIPPETS;

  return snippets.filter((snippet) => {
    return refSet.has(snippet.id) && isUsableKnowledgeSnippet(snippet);
  });
}

export function searchKnowledgeSnippets(query = {}, options = {}) {
  const topicIds = new Set(query.topicIds ?? []);
  const referenceRefs = new Set(query.referenceRefs ?? []);
  const snippets = options.snippets ?? KNOWLEDGE_SNIPPETS;

  return snippets.filter((snippet) => {
    if (!isUsableKnowledgeSnippet(snippet)) {
      return false;
    }

    const topicMatched = topicIds.size === 0 ||
      snippet.topicIds.some((topicId) => topicIds.has(topicId));
    const referenceMatched = referenceRefs.size === 0 ||
      snippet.referenceRefs.some((referenceRef) => referenceRefs.has(referenceRef));

    return topicMatched && referenceMatched;
  });
}

export function isUsableKnowledgeSnippet(snippet) {
  return auditKnowledgeSnippet(snippet).status === "passed";
}

export function auditKnowledgeSnippet(snippet) {
  const issues = [];

  if (!isPlainObject(snippet)) {
    return {
      status: "failed",
      issues: [
        buildIssue("snippet.invalid", "知识片段必须是一个普通对象。")
      ],
      warnings: []
    };
  }

  requireString(snippet, "id", issues);
  requireString(snippet, "sourceRef", issues);
  requireString(snippet, "title", issues);
  requireString(snippet, "excerpt", issues);
  requireString(snippet, "citation", issues);
  requireStringArray(snippet, "topicIds", issues);
  requireStringArray(snippet, "referenceRefs", issues);
  requireEnum(snippet, "status", Object.values(KNOWLEDGE_SNIPPET_STATUS), issues);
  requireEnum(snippet, "riskLevel", Object.values(KNOWLEDGE_RISK_LEVELS), issues);

  if (snippet.status && snippet.status !== KNOWLEDGE_SNIPPET_STATUS.VERIFIED) {
    issues.push(buildIssue(
      "snippet.status-not-verified",
      "知识片段只有 status 为 verified 时才允许进入报告规划。"
    ));
  }

  return {
    status: issues.length === 0 ? "passed" : "failed",
    issues,
    warnings: []
  };
}

function requireString(record, field, issues) {
  if (typeof record[field] !== "string" || record[field].trim() === "") {
    issues.push(buildIssue(
      `snippet.${field}.required`,
      `知识片段缺少必填字符串字段 ${field}。`
    ));
  }
}

function requireStringArray(record, field, issues) {
  const value = record[field];

  if (!Array.isArray(value) || value.length === 0) {
    issues.push(buildIssue(
      `snippet.${field}.required`,
      `知识片段字段 ${field} 必须是非空字符串数组。`
    ));
    return;
  }

  if (value.some((item) => typeof item !== "string" || item.trim() === "")) {
    issues.push(buildIssue(
      `snippet.${field}.invalid-item`,
      `知识片段字段 ${field} 只能包含非空字符串。`
    ));
  }
}

function requireEnum(record, field, allowedValues, issues) {
  if (!allowedValues.includes(record[field])) {
    issues.push(buildIssue(
      `snippet.${field}.invalid`,
      `知识片段字段 ${field} 必须是以下值之一：${allowedValues.join("、")}。`
    ));
  }
}

function buildIssue(id, message) {
  return { id, message };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
