// 知识覆盖审计器。
//
// reportAuditor 检查“草稿是否越过证据链和引用链”；本文件检查的是
// “报告规划是否已经接入 verified 外部知识片段”。这两个审计目标不同：
// - 没有知识片段时，保守报告仍然可以发布；
// - 但它不能被包装成文献/知识库充分支撑的深入命运报告。

export function auditKnowledgeCoverage(reportPlan) {
  if (reportPlan.status !== "planned") {
    return {
      status: "skipped",
      summary: "报告规划尚未完成，暂不审计知识覆盖。",
      sections: [],
      missingSectionIds: [],
      recommendations: []
    };
  }

  const sections = reportPlan.sections.map(auditSectionCoverage);
  const missingSections = sections.filter((section) => {
    return section.status === "missing_verified_snippets";
  });

  return {
    status: missingSections.length === 0 ? "covered" : "insufficient",
    summary: buildSummary(sections.length, missingSections.length),
    sections,
    missingSectionIds: missingSections.map((section) => section.sectionId),
    recommendations: buildRecommendations(missingSections)
  };
}

function auditSectionCoverage(section) {
  const knowledgeSnippetRefs = section.knowledgeSnippetRefs ?? [];

  return {
    sectionId: section.id,
    title: section.title,
    topicIds: section.queryContext?.topicIds ?? [],
    referenceRefs: section.referenceRefs ?? [],
    knowledgeSnippetRefs,
    status: knowledgeSnippetRefs.length > 0
      ? "covered"
      : "missing_verified_snippets",
    message: knowledgeSnippetRefs.length > 0
      ? "本章节已有 verified 外部知识片段可供后续报告器引用。"
      : "本章节尚无 verified 外部知识片段，目前只能使用本地规则、证据和受控解释。"
  };
}

function buildSummary(sectionCount, missingCount) {
  if (sectionCount === 0) {
    return "没有可审计的报告章节。";
  }

  if (missingCount === 0) {
    return "所有报告章节均已有 verified 外部知识片段。";
  }

  return `${sectionCount} 个报告章节中有 ${missingCount} 个尚无 verified 外部知识片段。`;
}

function buildRecommendations(missingSections) {
  if (missingSections.length === 0) {
    return [];
  }

  return [
    "优先从已研读的书籍、PDF或笔记中录入可复核摘录。",
    "每个知识片段必须包含 sourceRef、citation、excerpt、topicIds 和 referenceRefs。",
    "只有通过 schema 审计并标记为 verified 的片段，才能进入报告规划。",
    `优先补齐章节：${missingSections.map((section) => section.title).join("、")}。`
  ];
}
