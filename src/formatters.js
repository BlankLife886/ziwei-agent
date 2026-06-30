import { summarizeChartSkeleton } from "./chart.js";

// 展示层：把结构化 buildResult 转成 CLI 文本。
//
// 注意这里不做任何排盘计算，也不修改 chart。
// 未来如果要输出 Markdown、JSON 报告或网页文本，可以在这里扩展不同 formatter。

export function formatBuildResult(buildResult) {
  if (buildResult.status === "invalid") {
    return [
      "资料格式错误：",
      ...buildResult.validation.errors.map((error) => `- ${error}`)
    ];
  }

  if (buildResult.status === "incomplete") {
    return [
      "资料不完整，需要补充：",
      ...buildResult.validation.missingFields.map((field) => `- ${field}`)
    ];
  }

  return [
    ...formatProfileSummary(buildResult),
    "",
    "历法转换：",
    ...buildResult.lunarResult.notes.map((note) => `- ${note}`),
    "",
    "命盘骨架已建立：",
    ...summarizeChartSkeleton(buildResult.chart),
    "",
    ...formatChartDetails(buildResult.chart)
  ];
}

export function formatAgentBriefing(agentResult) {
  if (agentResult.status !== "ready") {
    return [
      "Agent 状态：暂不能分析",
      ...agentResult.messages,
      ...formatQuestionItems(agentResult)
    ];
  }

  return [
    "Agent 分析准备：",
    ...agentResult.messages.map((message) => `- ${message}`),
    "",
    "核心证据：",
    ...agentResult.evidence.map((item) => `- ${item}`),
    "",
    "建议分析重点：",
    ...agentResult.focusAreas.flatMap((area) => {
      return [
        `- ${area.title}：${area.reason}`,
        ...area.evidence.map((item) => `  - ${item}`)
      ];
    }),
    "",
    "当前限制：",
    ...agentResult.limitations.map((item) => `- ${item}`)
  ];
}

function formatQuestionItems(agentResult) {
  if (!agentResult.questionItems || agentResult.questionItems.length === 0) {
    return agentResult.nextQuestions.map((question) => `- ${question}`);
  }

  return [
    "需要追问：",
    ...agentResult.questionItems.flatMap((question) => {
      return [
        `- ${question.prompt}`,
        `  字段：${question.field}`,
        `  示例：${question.example}`,
        `  原因：${question.reason}`
      ];
    })
  ];
}

export function formatReportPlan(reportPlan) {
  if (reportPlan.status !== "planned") {
    return [
      "Agent 报告草稿：暂不能生成",
      ...reportPlan.messages,
      ...reportPlan.blockers.map((blocker) => `- ${blocker}`)
    ];
  }

  return [
    "Agent 报告草稿规划：",
    ...reportPlan.opening.map((line) => `- ${line}`),
    "",
    "章节：",
    ...reportPlan.sections.flatMap((section) => {
      return [
        `- ${section.title}：${section.purpose}`,
        `  写作提示：${section.writingPrompt}`,
        `  关键问题：${section.guidingQuestions.join(" / ")}`,
        "  可用证据：",
        ...formatEvidenceItems(section),
        ...formatReferences(section),
        ...formatInterpretations(section)
      ];
    }),
    "",
    "写作边界：",
    ...reportPlan.guardrails.map((item) => `- ${item}`)
  ];
}

export function formatReportDraft(reportDraft) {
  if (reportDraft.status !== "drafted") {
    return [
      "Agent 报告正文：暂不能生成",
      ...reportDraft.messages
    ];
  }

  return [
    "Agent 报告正文草稿：",
    reportDraft.title,
    "",
    "开篇：",
    ...reportDraft.introduction.map((line) => `- ${line}`),
    "",
    ...reportDraft.sections.flatMap((section) => {
      return [
        section.title,
        ...section.paragraphs.map((paragraph) => {
          return `- ${formatParagraph(paragraph)}`;
        }),
        ""
      ];
    }),
    "收束：",
    ...reportDraft.closing.map((line) => `- ${line}`)
  ];
}

function formatEvidenceItems(section) {
  if (!section.evidenceItems) {
    return section.evidence.map((item) => `    - ${item}`);
  }

  return section.evidenceItems.map((item) => {
    return `    - [${item.id}] ${item.text}`;
  });
}

function formatReferences(section) {
  if (!section.references || section.references.length === 0) {
    return [];
  }

  return [
    "  参考依据：",
    ...section.references.map((reference) => {
      return `    - [${reference.id}] ${reference.title}`;
    })
  ];
}

function formatInterpretations(section) {
  if (!section.interpretations || section.interpretations.length === 0) {
    return [];
  }

  return [
    "  解释条目：",
    ...section.interpretations.map((interpretation) => {
      return `    - [${interpretation.id}] ${interpretation.title}（风险：${interpretation.riskLevel}）`;
    })
  ];
}

function formatParagraph(paragraph) {
  if (typeof paragraph === "string") {
    return paragraph;
  }

  const evidenceRefs = paragraph.evidenceRefs ?? [];
  const referenceRefs = paragraph.referenceRefs ?? [];
  const notes = [];

  if (evidenceRefs.length > 0) {
    notes.push(`证据：${evidenceRefs.join("、")}`);
  }

  if (referenceRefs.length > 0) {
    notes.push(`参考：${referenceRefs.join("、")}`);
  }

  if (paragraph.interpretationRefs?.length > 0) {
    notes.push(`解释：${paragraph.interpretationRefs.join("、")}`);
  }

  if (notes.length === 0) {
    return paragraph.text;
  }

  return `${paragraph.text}（${notes.join("；")}）`;
}

function formatProfileSummary(buildResult) {
  const profile = buildResult.validation.profile;

  return [
    "资料校验通过",
    `命主：${profile.name}`,
    `性别：${profile.gender}`,
    `历法：${profile.calendar}`,
    `出生日期：${profile.birth_date}`,
    `出生时间：${profile.birth_time} (${buildResult.validation.chineseHour})`,
    `出生地：${profile.birth_place}`,
    `时区：${profile.timezone}`,
    `真太阳时：${Boolean(profile.use_true_solar_time)}`,
    `闰月：${Boolean(profile.is_leap_month)}`
  ];
}

function formatChartDetails(chart) {
  if (!chart.lifePalace || !chart.bodyPalace) {
    return ["暂未计算命宫/身宫：需要提供 lunar_month。"];
  }

  const lines = [
    `命宫：${chart.lifePalace.branch}`,
    `身宫：${chart.bodyPalace.name}（${chart.bodyPalace.branch}）`
  ];

  if (chart.fiveElementClass) {
    lines.push(
      `五行局：${chart.fiveElementClass.name}（命宫${chart.fiveElementClass.palaceGanZhi}，纳音${chart.fiveElementClass.naYin}）`
    );
  }

  lines.push(...formatStarAnchorLines(chart));
  lines.push("");
  lines.push("计算说明：");
  lines.push(...chart.calculationNotes.map((note) => `- ${note}`));

  return lines;
}

function formatStarAnchorLines(chart) {
  const lines = [];

  if (chart.starAnchors?.ziWei) {
    lines.push(`紫微星：${chart.starAnchors.ziWei.branch}`);
  }

  appendAnchorLine(lines, {
    label: "紫微星系",
    anchor: chart.starAnchors?.ziWeiGroup
  });
  appendAnchorLine(lines, {
    label: "天府星系",
    anchor: chart.starAnchors?.tianFuGroup
  });
  appendAnchorLine(lines, {
    label: "月系辅星",
    anchor: chart.starAnchors?.monthlyAuxiliaries,
    excludedKeys: ["lunarMonth"]
  });
  appendAnchorLine(lines, {
    label: "日系辅星",
    anchor: chart.starAnchors?.dailyAuxiliaries,
    excludedKeys: ["lunarMonth", "lunarDay"]
  });
  appendAnchorLine(lines, {
    label: "年干星曜",
    anchor: chart.starAnchors?.luYangTuo,
    excludedKeys: ["yearStem"]
  });
  appendAnchorLine(lines, {
    label: "魁钺星曜",
    anchor: chart.starAnchors?.kuiYue,
    excludedKeys: ["yearStem"]
  });
  appendAnchorLine(lines, {
    label: "官福星曜",
    anchor: chart.starAnchors?.tianGuanFu,
    excludedKeys: ["yearStem"]
  });
  appendAnchorLine(lines, {
    label: "天厨星曜",
    anchor: chart.starAnchors?.tianChu,
    excludedKeys: ["yearStem"]
  });
  appendAnchorLine(lines, {
    label: "截空星曜",
    anchor: chart.starAnchors?.jieKong,
    excludedKeys: ["yearStem"]
  });
  appendAnchorLine(lines, {
    label: "生年四化",
    anchor: chart.starAnchors?.birthYearTransformations,
    excludedKeys: ["yearStem"]
  });
  appendAnchorLine(lines, {
    label: "火铃煞曜",
    anchor: chart.starAnchors?.fireBell,
    excludedKeys: ["yearBranch", "chineseHour"]
  });
  lines.push(...formatMajorPeriodLines(chart));

  return lines;
}

function formatMajorPeriodLines(chart) {
  if (!chart.majorPeriods || chart.majorPeriods.length === 0) {
    return [];
  }

  return [
    "大限：",
    ...chart.majorPeriods.map((period) => {
      return `- ${period.startAge}-${period.endAge}岁：${period.palaceName}${period.branch}（${period.directionLabel}）`;
    })
  ];
}

function appendAnchorLine(lines, { label, anchor, excludedKeys = [] }) {
  if (!anchor) {
    return;
  }

  const excludedKeySet = new Set(excludedKeys);
  const text = Object.entries(anchor)
    .filter(([key]) => !excludedKeySet.has(key))
    .map(([star, branch]) => `${star}${branch}`)
    .join("、");

  lines.push(`${label}：${text}`);
}
