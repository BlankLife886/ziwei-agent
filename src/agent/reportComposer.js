// 命理报告草稿生成器。
//
// reportPlanner 负责“应该写哪些章节”，这里负责把章节计划写成可读草稿。
// 目前先用确定性模板，原因是：
// 1. 教学阶段更容易看清 agent 的每一步输入和输出。
// 2. 每句话都能追溯到 section.evidence，避免凭空生成命理结论。
// 3. 后续接大模型时，可以保持 createReportDraft 这个接口不变。

export function createReportDraft(reportPlan) {
  if (reportPlan.status !== "planned") {
    return {
      status: "blocked",
      messages: ["报告规划尚未完成，不能生成报告草稿。"],
      sections: [],
      closing: []
    };
  }

  return {
    status: "drafted",
    title: `${reportPlan.subject.name}的紫微斗数本命盘分析草稿`,
    subject: reportPlan.subject,
    introduction: reportPlan.opening,
    sections: reportPlan.sections.map(composeSectionDraft),
    closing: composeClosing(reportPlan)
  };
}

function composeSectionDraft(section) {
  return {
    id: section.id,
    title: section.title,
    paragraphs: [
      composePurposeParagraph(section),
      composeEvidenceParagraph(section),
      composeInterpretationParagraph(section)
    ]
  };
}

function composePurposeParagraph(section) {
  return `【分析目的】${section.purpose}`;
}

function composeEvidenceParagraph(section) {
  return `【可用证据】${section.evidence.join("；")}。`;
}

function composeInterpretationParagraph(section) {
  if (section.id === "life-triad") {
    return composeLifeTriadParagraph(section);
  }

  if (section.id === "body-palace") {
    return composeBodyPalaceParagraph(section);
  }

  if (section.id === "star-balance") {
    return composeStarBalanceParagraph(section);
  }

  return `【草稿判断】本节应围绕“${section.guidingQuestions[0]}”展开，并严格使用本节列出的证据。`;
}

function composeLifeTriadParagraph(section) {
  const emptyLifePalace = section.evidence.some((item) => {
    return item.includes("命宫") && item.includes("无已安星曜");
  });

  if (emptyLifePalace) {
    return "【草稿判断】命宫本身目前没有已安入的星曜，因此不宜只凭命宫下结论；应把财帛宫、官禄宫、迁移宫作为主要参照，先看三方四正如何补足命宫信息。";
  }

  return "【草稿判断】命宫已有星曜证据，可以先描述命宫呈现的基础气质，再用财帛宫、官禄宫、迁移宫校正和补充。";
}

function composeBodyPalaceParagraph(section) {
  const sameAsLifePalace = section.evidence.some((item) => item.startsWith("命宫"));

  if (sameAsLifePalace) {
    return "【草稿判断】身宫与命宫同宫时，可以把先天气质和后天发力点放在一起观察；但仍需结合三方四正，不能只靠单宫完成判断。";
  }

  return "【草稿判断】身宫与命宫分宫时，可把身宫视为后天行动重心，再回头检查它是否强化或修正命宫信息。";
}

function composeStarBalanceParagraph(section) {
  return "【草稿判断】当前已能统计主星、辅星、煞曜与空曜的分布，但尚未纳入四化和限运，所以这一节适合描述结构倾向，不适合直接推到具体年份或事件。";
}

function composeClosing(reportPlan) {
  return [
    "以上草稿只使用当前排盘已经生成的证据。",
    "写作时必须遵守以下边界：",
    ...reportPlan.guardrails
  ];
}
