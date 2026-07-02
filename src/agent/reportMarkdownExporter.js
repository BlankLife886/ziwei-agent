// 用户报告 Markdown 导出器。
//
// 这一层只把已经发布的 reportOutput 转成可交付文档格式。
// 它不重新生成命理内容，也不放宽报告审计；如果 reportOutput 没有发布，
// 这里最多输出阻断说明，不能伪装成最终报告。

export function formatReportOutputMarkdown(reportOutput, options = {}) {
  if (reportOutput?.status !== "published") {
    return formatBlockedReportMarkdown(reportOutput);
  }

  return [
    `# ${reportOutput.title}`,
    "",
    ...formatMetadata(reportOutput),
    "",
    ...formatBrief(reportOutput.brief),
    "",
    "## 开篇",
    "",
    ...formatTextList(reportOutput.introduction),
    "",
    ...formatChartSnapshot(options.chart),
    "",
    "## 正文章节",
    "",
    ...reportOutput.sections.flatMap(formatSection),
    ...formatAppendix(reportOutput.appendix),
    "",
    "## 收束",
    "",
    ...formatTextList(reportOutput.closing),
    "",
    "## 发布门禁",
    "",
    `- 报告审计：${reportOutput.audit?.status === "passed" ? "通过" : "未通过"}`,
    `- 发布确认：${reportOutput.approval?.status ?? "unknown"}`,
    ""
  ].join("\n");
}

function formatBlockedReportMarkdown(reportOutput) {
  const messages = reportOutput?.messages ?? ["报告尚未发布。"];

  return [
    "# 用户报告暂不能发布",
    "",
    "当前 reportOutput 没有通过发布门禁，因此不能导出为最终用户报告。",
    "",
    "## 阻断原因",
    "",
    ...messages.map((message) => `- ${message}`),
    ""
  ].join("\n");
}

function formatMetadata(reportOutput) {
  const metadata = reportOutput.metadata ?? {};
  const queryIntent = metadata.queryIntent ?? {};

  return [
    "## 报告元信息",
    "",
    `- 输出类型：${metadata.outputType ?? "unknown"}`,
    `- 报告状态：${metadata.reportStatus ?? reportOutput.status}`,
    `- 审计状态：${metadata.auditStatus ?? reportOutput.audit?.status ?? "unknown"}`,
    `- 发布确认：${metadata.approvalStatus ?? reportOutput.approval?.status ?? "unknown"}`,
    `- 咨询主题：${(queryIntent.topics ?? []).join("、") || "基础命盘"}`,
    `- 章节数：${metadata.sectionIds?.length ?? reportOutput.sections?.length ?? 0}`,
    `- 证据引用：${metadata.evidenceRefs?.length ?? 0} 项`,
    `- 规则引用：${metadata.referenceRefs?.length ?? 0} 项`,
    `- 来源引用：${metadata.sourceRefs?.length ?? 0} 项`,
    `- 知识片段引用：${metadata.knowledgeSnippetRefs?.length ?? 0} 项`,
    `- 解释引用：${metadata.interpretationRefs?.length ?? 0} 项`
  ];
}

function formatBrief(brief) {
  if (!brief) {
    return [];
  }

  return [
    "## 报告摘要",
    "",
    `- 模式：${brief.mode}`,
    "",
    ...formatParagraphs(brief.paragraphs ?? []),
    "### 章节概览",
    "",
    ...(brief.sectionSummaries ?? []).map((section) => {
      return `- ${section.title}：证据 ${section.evidenceCount} / 规则 ${section.referenceCount} / 知识片段 ${section.knowledgeSnippetCount} / 解释 ${section.interpretationCount}`;
    })
  ];
}

function formatSection(section) {
  return [
    `### ${section.title}`,
    "",
    ...formatSectionTrace(section),
    "",
    ...formatParagraphs(section.paragraphs ?? []),
    ""
  ];
}

function formatChartSnapshot(chart) {
  if (!chart) {
    return [];
  }

  return [
    "## 命盘图",
    "",
    ...formatChartProfile(chart),
    "",
    "| 宫位 | 地支 | 宫干 | 主星 | 辅星 | 煞曜 | 空曜 | 四化 |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...(chart.palaces ?? []).map(formatPalaceRow)
  ];
}

function formatChartProfile(chart) {
  const profile = chart.profileSummary ?? {};

  return [
    `- 命主：${profile.name ?? "未命名"}`,
    `- 出生资料：${profile.calendar ?? "未提供"} ${profile.birthDate ?? "未提供"} ${profile.birthTime ?? ""}`.trim(),
    `- 农历换算：${profile.lunarYear ?? "未提供"}年 ${profile.lunarMonth ?? "未提供"}月 ${profile.lunarDay ?? "未提供"}日`,
    `- 命宫：${formatPalaceLabel(chart.lifePalace)}`,
    `- 身宫：${formatPalaceLabel(chart.bodyPalace)}`,
    `- 五行局：${chart.fiveElementClass?.name ?? "未计算"}`,
    `- 当前大限：${formatCurrentMajorPeriod(chart.currentMajorPeriod)}`,
    `- 当前流年：${formatAnnualPeriod(chart.annualPeriod)}`,
    `- 当前流月：${formatMonthlyPeriod(chart.monthlyPeriod)}`
  ];
}

function formatPalaceRow(palace) {
  return [
    palace.name,
    palace.branch ?? "未排",
    palace.stem ?? "未排",
    formatList(palace.mainStars),
    formatList(palace.auxiliaryStars),
    formatList(palace.maleficStars),
    formatList(palace.voidStars),
    formatTransformations(palace.transformations)
  ].map(formatTableCell).join(" | ").replace(/^/u, "| ").replace(/$/u, " |");
}

function formatPalaceLabel(palace) {
  if (!palace) {
    return "未计算";
  }

  return `${palace.name}${palace.branch ? `（${palace.branch}）` : ""}`;
}

function formatCurrentMajorPeriod(currentMajorPeriod) {
  const period = currentMajorPeriod?.period;

  if (!period) {
    return "未定位";
  }

  return `${period.startAge}-${period.endAge}岁 ${period.palaceName}${period.branch ? `（${period.branch}）` : ""}`;
}

function formatAnnualPeriod(annualPeriod) {
  if (!annualPeriod) {
    return "未定位";
  }

  return `${annualPeriod.yearStem}${annualPeriod.yearBranch}年 ${annualPeriod.palaceName}`;
}

function formatMonthlyPeriod(monthlyPeriod) {
  if (!monthlyPeriod) {
    return "未定位";
  }

  return `${monthlyPeriod.lunarMonth}月 ${monthlyPeriod.monthBranch}月建 ${monthlyPeriod.palaceName}`;
}

function formatTransformations(transformations = []) {
  if (transformations.length === 0) {
    return "无";
  }

  return transformations.map((transformation) => {
    if (typeof transformation === "string") {
      return transformation;
    }

    return `${transformation.star}${transformation.name}`;
  }).join("、");
}

function formatList(items = []) {
  return items.length > 0 ? items.join("、") : "无";
}

function formatTableCell(value) {
  return String(value).replaceAll("|", "\\|");
}

function formatSectionTrace(section) {
  return [
    `- 章节 ID：${section.id ?? "unknown"}`,
    `- 证据：${formatRefs(section.evidenceRefs)}`,
    `- 规则：${formatRefs(section.referenceRefs)}`,
    `- 来源：${formatRefs(section.sourceRefs)}`,
    `- 知识片段：${formatRefs(section.knowledgeSnippetRefs)}`,
    `- 解释：${formatRefs(section.interpretationRefs)}`
  ];
}

function formatParagraphs(paragraphs) {
  if (paragraphs.length === 0) {
    return [];
  }

  return paragraphs.flatMap((paragraph) => {
    return [
      paragraph.text,
      ...formatParagraphTrace(paragraph),
      ""
    ];
  });
}

function formatParagraphTrace(paragraph) {
  const trace = [];

  if (paragraph.evidenceRefs?.length > 0) {
    trace.push(`证据：${formatRefs(paragraph.evidenceRefs)}`);
  }

  if (paragraph.referenceRefs?.length > 0) {
    trace.push(`规则：${formatRefs(paragraph.referenceRefs)}`);
  }

  if (paragraph.interpretationRefs?.length > 0) {
    trace.push(`解释：${formatRefs(paragraph.interpretationRefs)}`);
  }

  if (trace.length === 0) {
    return [];
  }

  return [`> 引用链：${trace.join("；")}`];
}

function formatAppendix(appendix) {
  if (!appendix) {
    return [];
  }

  return [
    "## 可追溯附录",
    "",
    ...formatAppendixGroup("证据清单", appendix.evidence, formatEvidenceItem),
    ...formatAppendixGroup("规则/框架清单", appendix.references, formatReferenceItem),
    ...formatAppendixGroup("来源清单", appendix.sources, formatSourceItem),
    ...formatAppendixGroup("知识片段清单", appendix.knowledgeSnippets, formatKnowledgeSnippetItem),
    ...formatAppendixGroup("解释条目清单", appendix.interpretations, formatInterpretationItem),
    ...formatTraceabilitySummary(appendix.traceability)
  ];
}

function formatAppendixGroup(title, items = [], formatter) {
  if (items.length === 0) {
    return [
      `### ${title}`,
      "",
      "- 无",
      ""
    ];
  }

  return [
    `### ${title}`,
    "",
    ...items.map(formatter),
    ""
  ];
}

function formatEvidenceItem(item) {
  return `- ${formatCode(item.id)}：${item.text}${formatSectionIds(item.sectionIds)}`;
}

function formatReferenceItem(item) {
  return `- ${formatCode(item.id)}：${item.title}${formatSectionIds(item.sectionIds)}`;
}

function formatSourceItem(item) {
  return `- ${formatCode(item.id)}：${item.title}（${item.status}）${formatSectionIds(item.sectionIds)}`;
}

function formatKnowledgeSnippetItem(item) {
  return `- ${formatCode(item.id)}：${item.title}；citation：${item.citation}${formatSectionIds(item.sectionIds)}`;
}

function formatInterpretationItem(item) {
  return `- ${formatCode(item.id)}：${item.title}（风险：${item.riskLevel}）${formatSectionIds(item.sectionIds)}`;
}

function formatTraceabilitySummary(traceability) {
  if (!traceability) {
    return [];
  }

  return [
    "### Traceability 汇总",
    "",
    `- evidenceRefs：${formatRefs(traceability.evidenceRefs)}`,
    `- referenceRefs：${formatRefs(traceability.referenceRefs)}`,
    `- sourceRefs：${formatRefs(traceability.sourceRefs)}`,
    `- knowledgeSnippetRefs：${formatRefs(traceability.knowledgeSnippetRefs)}`,
    `- interpretationRefs：${formatRefs(traceability.interpretationRefs)}`,
    ""
  ];
}

function formatTextList(items = []) {
  return items.map((item) => `- ${item}`);
}

function formatRefs(refs = []) {
  return refs.length > 0 ? refs.map(formatCode).join("、") : "无";
}

function formatCode(value) {
  return `\`${String(value).replaceAll("`", "\\`")}\``;
}

function formatSectionIds(sectionIds = []) {
  return sectionIds.length > 0
    ? `（章节：${sectionIds.map(formatCode).join("、")}）`
    : "";
}
