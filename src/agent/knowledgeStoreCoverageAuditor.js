import { listKnowledgeSources } from "./knowledgeSnippetCatalog.js";

// 知识库全局覆盖审计器。
//
// validateKnowledgeStore 负责判断 JSON store 里的片段能不能进入 agent；
// 这个模块负责回答另一个问题：这些 verified 片段是否已经覆盖用户最终
// 会咨询的主要报告领域。它只做覆盖度统计和缺口提示，不生成命理解释。

const CORE_TOPIC_DEFINITIONS = [
  { id: "life", title: "命盘基础" },
  { id: "personality", title: "性格画像" },
  { id: "career", title: "事业" },
  { id: "wealth", title: "财富" },
  { id: "marriage", title: "婚姻感情" },
  { id: "fortune", title: "阶段运势" },
  { id: "timing", title: "限运时间层" },
  { id: "transformation", title: "四化" }
];

const MIN_SNIPPETS_PER_CORE_TOPIC = 1;

export function auditKnowledgeStoreCoverage(store, options = {}) {
  const snippets = Array.isArray(store?.snippets) ? store.snippets : [];
  const topicDefinitions = options.topicDefinitions ?? CORE_TOPIC_DEFINITIONS;
  const minSnippetsPerTopic = options.minSnippetsPerTopic ?? MIN_SNIPPETS_PER_CORE_TOPIC;
  const topicCoverage = topicDefinitions.map((topic) => {
    return summarizeTopicCoverage(topic, snippets, minSnippetsPerTopic);
  });
  const missingTopics = topicCoverage.filter((topic) => topic.status !== "covered");
  const sourceCoverage = summarizeSourceCoverage(snippets);
  const referenceCoverage = summarizeReferenceCoverage(snippets);
  const riskLevelCoverage = summarizeCountByField(snippets, "riskLevel");
  const issues = buildCoverageIssues(store, snippets, missingTopics);
  const warnings = buildCoverageWarnings(sourceCoverage);

  return {
    status: issues.length === 0 ? "covered" : "insufficient",
    storeStatus: store?.status ?? "unknown",
    snippetCount: snippets.length,
    sourceCoverage,
    topicCoverage,
    referenceCoverage,
    riskLevelCoverage,
    missingTopicIds: missingTopics.map((topic) => topic.topicId),
    issues,
    warnings,
    recommendations: buildCoverageRecommendations(missingTopics, warnings)
  };
}

function summarizeTopicCoverage(topic, snippets, minSnippetsPerTopic) {
  const matchedSnippets = snippets.filter((snippet) => {
    return snippet.topicIds?.includes(topic.id);
  });
  const referenceRefs = uniqueInOrder(
    matchedSnippets.flatMap((snippet) => snippet.referenceRefs ?? [])
  );
  const sourceRefs = uniqueInOrder(matchedSnippets.map((snippet) => snippet.sourceRef));

  return {
    topicId: topic.id,
    title: topic.title,
    status: matchedSnippets.length >= minSnippetsPerTopic ? "covered" : "missing",
    snippetCount: matchedSnippets.length,
    requiredSnippetCount: minSnippetsPerTopic,
    snippetRefs: matchedSnippets.map((snippet) => snippet.id),
    sourceRefs,
    referenceRefs
  };
}

function summarizeSourceCoverage(snippets) {
  const knownSources = listKnowledgeSources();
  const sourceCounts = summarizeCountByField(snippets, "sourceRef");

  return knownSources.map((source) => {
    const snippetCount = sourceCounts[source.id] ?? 0;

    return {
      sourceRef: source.id,
      title: source.title,
      sourceStatus: source.status,
      sourceType: source.type,
      snippetCount,
      status: snippetCount > 0 ? "used" : "unused"
    };
  });
}

function summarizeReferenceCoverage(snippets) {
  const referenceCounts = new Map();

  snippets.forEach((snippet) => {
    (snippet.referenceRefs ?? []).forEach((referenceRef) => {
      referenceCounts.set(referenceRef, (referenceCounts.get(referenceRef) ?? 0) + 1);
    });
  });

  return [...referenceCounts.entries()]
    .sort((a, b) => {
      return b[1] - a[1] || a[0].localeCompare(b[0]);
    })
    .map(([referenceRef, snippetCount]) => {
      return {
        referenceRef,
        snippetCount
      };
    });
}

function buildCoverageIssues(store, snippets, missingTopics) {
  const issues = [];

  if (store?.status && store.status !== "ready") {
    issues.push(buildIssue(
      "knowledge-store.coverage.store-not-ready",
      "知识库 schema 校验尚未 ready，不能视为全局覆盖完成。"
    ));
  }

  if (snippets.length === 0) {
    issues.push(buildIssue(
      "knowledge-store.coverage.no-verified-snippets",
      "知识库没有可用 verified 片段。"
    ));
  }

  missingTopics.forEach((topic) => {
    issues.push(buildIssue(
      "knowledge-store.coverage.topic-missing",
      `核心主题 ${topic.title} 缺少 verified 知识片段。`,
      { topicId: topic.topicId }
    ));
  });

  return issues;
}

function buildCoverageWarnings(sourceCoverage) {
  return sourceCoverage
    .filter((source) => {
      return source.sourceStatus === "planned" && source.snippetCount > 0;
    })
    .map((source) => {
      return buildIssue(
        "knowledge-store.coverage.planned-source-used",
        `来源 ${source.title} 仍标记为 planned，但已有 verified 片段引用；建议复核来源状态。`,
        { sourceRef: source.sourceRef }
      );
    });
}

function buildCoverageRecommendations(missingTopics, warnings) {
  const recommendations = [
    "优先补充 verified 知识片段不足的核心主题，再扩展细分流派和案例库。",
    "每个新增片段先通过 candidate audit，再进入 draft、人工复核和 verified 晋升。"
  ];

  if (missingTopics.length > 0) {
    recommendations.push(
      `优先补齐主题：${missingTopics.map((topic) => topic.title).join("、")}。`
    );
  }

  if (warnings.length > 0) {
    recommendations.push("复核 planned 来源是否应该拆分为真实书籍、PDF、OCR 或人工笔记来源。");
  }

  return recommendations;
}

function summarizeCountByField(snippets, fieldName) {
  return snippets.reduce((counts, snippet) => {
    const value = snippet?.[fieldName] ?? "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function uniqueInOrder(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildIssue(id, message, extra = {}) {
  return { id, message, ...extra };
}
