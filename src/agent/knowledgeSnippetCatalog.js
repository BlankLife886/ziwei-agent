// 外部知识片段目录。
//
// 这里是后续接入书籍、PDF、笔记和向量检索的边界层。
// 当前先建立可审计的数据结构和检索函数，不把尚未录入的资料伪装成
// 已经可引用的命理依据。

export const KNOWLEDGE_SOURCE_IDS = {
  PENDING_ZIWEI_CORPUS: "knowledge-source.pending-ziwei-corpus"
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

const KNOWLEDGE_SNIPPETS = [];

export function findKnowledgeSources(sourceRefs = []) {
  const refSet = new Set(sourceRefs);

  return KNOWLEDGE_SOURCES.filter((source) => refSet.has(source.id));
}

export function findKnowledgeSnippets(snippetRefs = []) {
  const refSet = new Set(snippetRefs);

  return KNOWLEDGE_SNIPPETS.filter((snippet) => refSet.has(snippet.id));
}

export function searchKnowledgeSnippets(query = {}) {
  const topicIds = new Set(query.topicIds ?? []);
  const referenceRefs = new Set(query.referenceRefs ?? []);

  return KNOWLEDGE_SNIPPETS.filter((snippet) => {
    const topicMatched = topicIds.size === 0 ||
      snippet.topicIds.some((topicId) => topicIds.has(topicId));
    const referenceMatched = referenceRefs.size === 0 ||
      snippet.referenceRefs.some((referenceRef) => referenceRefs.has(referenceRef));

    return topicMatched && referenceMatched;
  });
}
