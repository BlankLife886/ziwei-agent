export const KNOWLEDGE_RETRIEVAL_INDEX_VERSION = "knowledge-retrieval-index.v1";

const DEFAULT_LIMIT = 8;
const DEFAULT_MIN_SCORE = 0.05;

// 本地知识检索索引。
//
// 这里使用可解释的稀疏向量，而不是外部 embedding 服务。它把 topic、
// reference、标题、摘录和 citation 都转成 token 权重，再用余弦相似度
// 排序。这样当前阶段已经具备“向量检索合同”，但不会伪装成已接入
// 外部向量数据库或语义 embedding。

export function buildKnowledgeRetrievalIndex(snippets = []) {
  const entries = snippets
    .filter(isIndexableKnowledgeSnippet)
    .map((snippet) => {
      const weightedTerms = buildSnippetTerms(snippet);
      const vector = buildSparseVector(weightedTerms);

      return {
        snippet,
        snippetId: snippet.id,
        topicIds: snippet.topicIds,
        referenceRefs: snippet.referenceRefs,
        sourceRef: snippet.sourceRef,
        riskLevel: snippet.riskLevel,
        vector,
        norm: vectorNorm(vector)
      };
    });

  return {
    status: "ready",
    version: KNOWLEDGE_RETRIEVAL_INDEX_VERSION,
    kind: "local-sparse-vector-index",
    persistence: "json-store",
    embeddingProvider: "none",
    snippetCount: entries.length,
    vocabularySize: countVocabulary(entries),
    entries
  };
}

export function searchKnowledgeRetrievalIndex(query = {}, index, options = {}) {
  if (!index || index.status !== "ready") {
    return [];
  }

  const limit = normalizePositiveInteger(options.limit, DEFAULT_LIMIT);
  const minScore = normalizeNonNegativeNumber(options.minScore, DEFAULT_MIN_SCORE);
  const topicIds = new Set(query.topicIds ?? []);
  const referenceRefs = new Set(query.referenceRefs ?? []);
  const queryVector = buildSparseVector(buildQueryTerms(query));
  const queryNorm = vectorNorm(queryVector);

  return index.entries
    .map((entry) => {
      const matchedTopicIds = entry.topicIds.filter((topicId) => topicIds.has(topicId));
      const matchedReferenceRefs = entry.referenceRefs.filter((referenceRef) => {
        return referenceRefs.has(referenceRef);
      });
      const cosineScore = queryNorm > 0 && entry.norm > 0
        ? dotProduct(queryVector, entry.vector) / (queryNorm * entry.norm)
        : 0;
      const topicBoost = matchedTopicIds.length > 0 ? 0.35 : 0;
      const referenceBoost = matchedReferenceRefs.length > 0 ? 0.45 : 0;
      const score = cosineScore + topicBoost + referenceBoost;

      return {
        snippet: entry.snippet,
        score,
        cosineScore,
        matchedTopicIds,
        matchedReferenceRefs,
        matchedTerms: findMatchedTerms(queryVector, entry.vector)
      };
    })
    .filter((result) => {
      if (topicIds.size > 0 && result.matchedTopicIds.length === 0) {
        return false;
      }

      if (referenceRefs.size > 0 && result.matchedReferenceRefs.length === 0) {
        return false;
      }

      return result.score >= minScore;
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.snippet.id.localeCompare(right.snippet.id);
    })
    .slice(0, limit);
}

export function summarizeKnowledgeRetrievalIndex(index) {
  if (!index) {
    return {
      status: "missing",
      version: KNOWLEDGE_RETRIEVAL_INDEX_VERSION,
      kind: "none",
      persistence: "none",
      snippetCount: 0,
      vocabularySize: 0
    };
  }

  return {
    status: index.status,
    version: index.version,
    kind: index.kind,
    persistence: index.persistence,
    embeddingProvider: index.embeddingProvider,
    snippetCount: index.snippetCount,
    vocabularySize: index.vocabularySize
  };
}

function isIndexableKnowledgeSnippet(snippet) {
  return Boolean(snippet) &&
    typeof snippet.id === "string" &&
    typeof snippet.sourceRef === "string" &&
    typeof snippet.title === "string" &&
    typeof snippet.excerpt === "string" &&
    typeof snippet.citation === "string" &&
    Array.isArray(snippet.topicIds) &&
    snippet.topicIds.length > 0 &&
    Array.isArray(snippet.referenceRefs) &&
    snippet.referenceRefs.length > 0 &&
    snippet.status === "verified" &&
    typeof snippet.riskLevel === "string";
}

function buildSnippetTerms(snippet) {
  return [
    ...weighted(snippet.topicIds, 3),
    ...weighted(snippet.referenceRefs, 4),
    ...weighted([snippet.title], 2),
    ...weighted([snippet.excerpt], 1),
    ...weighted([snippet.citation], 0.5)
  ];
}

function buildQueryTerms(query) {
  return [
    ...weighted(query.topicIds ?? [], 3),
    ...weighted(query.referenceRefs ?? [], 4),
    ...weighted(query.text ? [query.text] : [], 1.5)
  ];
}

function weighted(values, weight) {
  return values.flatMap((value) => {
    return tokenize(value).map((term) => ({
      term,
      weight
    }));
  });
}

function tokenize(value) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .toLowerCase()
    .replace(/[\u3000\s/|,.;:!?()[\]{}"'`，。；：！？（）【】《》、]+/gu, " ")
    .split(" ")
    .map((term) => term.trim())
    .filter(Boolean);
}

function buildSparseVector(weightedTerms) {
  const vector = new Map();

  for (const item of weightedTerms) {
    vector.set(item.term, (vector.get(item.term) ?? 0) + item.weight);
  }

  return vector;
}

function vectorNorm(vector) {
  let sum = 0;

  for (const value of vector.values()) {
    sum += value * value;
  }

  return Math.sqrt(sum);
}

function dotProduct(left, right) {
  let sum = 0;
  const [smaller, larger] = left.size < right.size
    ? [left, right]
    : [right, left];

  for (const [term, value] of smaller.entries()) {
    sum += value * (larger.get(term) ?? 0);
  }

  return sum;
}

function findMatchedTerms(left, right) {
  return [...left.keys()].filter((term) => right.has(term));
}

function countVocabulary(entries) {
  const terms = new Set();

  for (const entry of entries) {
    for (const term of entry.vector.keys()) {
      terms.add(term);
    }
  }

  return terms.size;
}

function normalizePositiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function normalizeNonNegativeNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}
