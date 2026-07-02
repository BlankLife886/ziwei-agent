export function formatKnowledgeStoreValidation(store, filePath) {
  const header = [
    "知识库校验：",
    `- 文件：${filePath}`,
    `- 状态：${store.status}`,
    `- 可用片段：${store.snippets.length} 项`,
    `- 问题：${store.issues.length} 项`
  ];

  if (store.issues.length === 0) {
    return [
      ...header,
      "- 结果：通过"
    ];
  }

  return [
    ...header,
    "问题列表：",
    ...store.issues.map((issue) => {
      const snippetLabel = issue.snippetId ? `片段 ${issue.snippetId}` : "知识库文件";

      return `- [${issue.id}] ${snippetLabel}：${issue.message}`;
    })
  ];
}

export function formatKnowledgeStoreCoverage(coverageAudit) {
  const header = [
    "知识库全局覆盖审计：",
    `- 状态：${coverageAudit.status}`,
    `- store 状态：${coverageAudit.storeStatus}`,
    `- 可用片段：${coverageAudit.snippetCount} 项`,
    `- 缺口主题：${coverageAudit.missingTopicIds.length} 项`,
    `- 来源：${coverageAudit.sourceCoverage.length} 项`,
    `- 规则/框架引用：${coverageAudit.referenceCoverage.length} 项`
  ];

  const topicLines = [
    "主题覆盖：",
    ...coverageAudit.topicCoverage.map((topic) => {
      return `- ${topic.title}（${topic.topicId}）：${topic.status}，${topic.snippetCount}/${topic.requiredSnippetCount} 项`;
    })
  ];

  const sourceLines = [
    "来源覆盖：",
    ...coverageAudit.sourceCoverage.map((source) => {
      return `- ${source.title}（${source.sourceRef}）：${source.status}，${source.snippetCount} 项，来源状态 ${source.sourceStatus}`;
    })
  ];

  const issueLines = coverageAudit.issues.length > 0
    ? [
        "覆盖问题：",
        ...coverageAudit.issues.map((issue) => {
          const target = issue.topicId ?? issue.sourceRef ?? "global";
          return `- [${issue.id}] ${target}：${issue.message}`;
        })
      ]
    : ["覆盖问题：0 项"];

  const warningLines = coverageAudit.warnings.length > 0
    ? [
        "覆盖警告：",
        ...coverageAudit.warnings.map((warning) => {
          const target = warning.topicId ?? warning.sourceRef ?? "global";
          return `- [${warning.id}] ${target}：${warning.message}`;
        })
      ]
    : ["覆盖警告：0 项"];

  return [
    ...header,
    ...topicLines,
    ...sourceLines,
    ...issueLines,
    ...warningLines,
    "建议：",
    ...coverageAudit.recommendations.map((recommendation) => {
      return `- ${recommendation}`;
    })
  ];
}
