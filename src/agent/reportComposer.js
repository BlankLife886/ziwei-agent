import { INTERPRETATION_IDS } from "./interpretationCatalog.js";

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
  const displayedInterpretations = getDisplayedInterpretations(section);
  const displayedInterpretationRefs = displayedInterpretations.map((item) => {
    return item.id;
  });

  return {
    id: section.id,
    title: section.title,
    queryContext: section.queryContext,
    interpretationRefs: section.interpretationRefs,
    interpretations: section.interpretations,
    referenceRefs: section.referenceRefs,
    references: section.references,
    paragraphs: [
      createParagraph(
        "purpose",
        composePurposeParagraph(section),
        [],
        section.referenceRefs
      ),
      createParagraph(
        "evidence",
        composeEvidenceParagraph(section),
        section.evidenceRefs,
        section.referenceRefs
      ),
      createParagraph(
        "interpretation-basis",
        composeInterpretationBasisParagraph(displayedInterpretations),
        [],
        section.referenceRefs,
        displayedInterpretationRefs
      ),
      createParagraph(
        "interpretation",
        composeInterpretationParagraph(section),
        section.evidenceRefs,
        section.referenceRefs,
        displayedInterpretationRefs
      )
    ]
  };
}

function composePurposeParagraph(section) {
  return `【分析目的】${section.purpose}`;
}

function composeEvidenceParagraph(section) {
  return `【可用证据】${section.evidence.join("；")}。`;
}

function composeInterpretationBasisParagraph(interpretations) {
  if (!interpretations || interpretations.length === 0) {
    return "【解释依据】本节尚未挂接解释条目，只保留证据描述。";
  }

  const interpretationSummaries = interpretations.map((interpretation) => {
    return `${interpretation.title}：${trimSentenceEnd(interpretation.text)}`;
  });

  return `【解释依据】${interpretationSummaries.join("；")}。`;
}

function composeInterpretationParagraph(section) {
  if (section.id === "life-triad") {
    return composeLifeTriadParagraph(section);
  }

  if (section.id === "body-palace") {
    return composeBodyPalaceParagraph(section);
  }

  if (section.id === "career-palace") {
    return composeCareerPalaceParagraph(section);
  }

  if (section.id === "wealth-palace") {
    return composeWealthPalaceParagraph(section);
  }

  if (section.id === "spouse-palace") {
    return composeSpousePalaceParagraph(section);
  }

  if (section.id === "star-balance") {
    return composeStarBalanceParagraph(section);
  }

  if (section.id === "birth-year-transformations") {
    return composeBirthYearTransformationsParagraph(section);
  }

  if (section.id === "major-periods") {
    return composeMajorPeriodsParagraph(section);
  }

  if (section.id === "current-major-period") {
    return composeCurrentMajorPeriodParagraph(section);
  }

  return `【草稿判断】本节应围绕“${section.guidingQuestions[0]}”展开，并严格使用本节列出的证据。`;
}

function composeLifeTriadParagraph(section) {
  const emptyLifePalace = section.evidence.some((item) => {
    return item.includes("命宫") && item.includes("无已安星曜");
  });
  const starRoleSynthesis = composeStarRoleSynthesis(section);
  const lifePalaceBoundary = composeLifePalaceBoundary(section);

  if (emptyLifePalace) {
    return `【草稿判断】${joinJudgmentParts([
      lifePalaceBoundary,
      starRoleSynthesis
    ])}`;
  }

  return `【草稿判断】${joinJudgmentParts([
    getInterpretationText(section, INTERPRETATION_IDS.LIFE_TRIAD_STRUCTURE),
    starRoleSynthesis
  ])}`;
}

function composeBodyPalaceParagraph(section) {
  const sameAsLifePalace = section.evidence.some((item) => item.startsWith("命宫"));

  if (sameAsLifePalace) {
    return `【草稿判断】${getInterpretationText(section, INTERPRETATION_IDS.BODY_PALACE_SAME_AS_LIFE)}`;
  }

  return `【草稿判断】${getInterpretationText(section, INTERPRETATION_IDS.BODY_PALACE_DIFFERENT_FROM_LIFE)}`;
}

function composeSpousePalaceParagraph(section) {
  return `【草稿判断】${joinJudgmentParts([
    getInterpretationText(section, INTERPRETATION_IDS.SPOUSE_TRIAD_STRUCTURE),
    getInterpretationText(section, INTERPRETATION_IDS.SPOUSE_PALACE_STATIC_ONLY),
    composeStarRoleSynthesis(section)
  ])}`;
}

function composeCareerPalaceParagraph(section) {
  return `【草稿判断】${joinJudgmentParts([
    getInterpretationText(section, INTERPRETATION_IDS.CAREER_TRIAD_STRUCTURE),
    getInterpretationText(section, INTERPRETATION_IDS.CAREER_PALACE_STATIC_ONLY),
    composeStarRoleSynthesis(section)
  ])}`;
}

function composeWealthPalaceParagraph(section) {
  return `【草稿判断】${joinJudgmentParts([
    getInterpretationText(section, INTERPRETATION_IDS.WEALTH_TRIAD_STRUCTURE),
    getInterpretationText(section, INTERPRETATION_IDS.WEALTH_PALACE_STATIC_ONLY),
    composeStarRoleSynthesis(section)
  ])}`;
}

function composeStarBalanceParagraph(section) {
  return `【草稿判断】${getInterpretationText(section, INTERPRETATION_IDS.STAR_BALANCE_STATIC_ONLY)}`;
}

function composeBirthYearTransformationsParagraph(section) {
  const boundaryText = getInterpretationText(
    section,
    INTERPRETATION_IDS.BIRTH_YEAR_FOUR_TRANSFORMATIONS_STATIC_ONLY
  );

  return `【草稿判断】${joinJudgmentParts([
    section.evidence[0],
    boundaryText
  ])}`;
}

function composeMajorPeriodsParagraph(section) {
  const boundaryText = getInterpretationText(
    section,
    INTERPRETATION_IDS.MAJOR_PERIODS_STRUCTURE_ONLY
  );

  return `【草稿判断】${joinJudgmentParts([
    section.evidence[0],
    boundaryText
  ])}`;
}

function composeCurrentMajorPeriodParagraph(section) {
  const boundaryText = getInterpretationText(
    section,
    INTERPRETATION_IDS.CURRENT_MAJOR_PERIOD_LOCATOR_ONLY
  );

  return `【草稿判断】${joinJudgmentParts([
    section.evidence[0],
    boundaryText
  ])}`;
}

function composeClosing(reportPlan) {
  return [
    "以上草稿只使用当前排盘已经生成的证据。",
    "写作时必须遵守以下边界：",
    ...reportPlan.guardrails
  ];
}

function getInterpretationText(section, interpretationId) {
  const interpretation = section.interpretations?.find((item) => {
    return item.id === interpretationId;
  });

  return interpretation?.text ?? "本节缺少对应解释条目，暂只保留证据描述，不扩展判断。";
}

function composeLifePalaceBoundary(section) {
  const primaryPalaceNames = section.queryContext?.primaryPalaceNames ?? [];

  if (primaryPalaceNames.length === 0) {
    return getInterpretationText(
      section,
      INTERPRETATION_IDS.LIFE_TRIAD_EMPTY_LIFE_PALACE
    );
  }

  return `命宫本身目前没有已安入的星曜，因此不宜只凭命宫下结论；本轮按用户主题优先查看${primaryPalaceNames.join("、")}，其余三方四正宫位只作为结构参照`;
}

function getDisplayedInterpretations(section) {
  const interpretations = section.interpretations ?? [];
  const primaryPalaceNames = section.queryContext?.primaryPalaceNames ?? [];

  if (section.id !== "life-triad" || primaryPalaceNames.length === 0) {
    return orderInterpretationsByRefs(interpretations, section.interpretationRefs);
  }

  const displayedPalaceNames = new Set(["命宫", ...primaryPalaceNames]);

  const filteredInterpretations = interpretations.filter((interpretation) => {
    if (interpretation.topic === "palace-role" || interpretation.topic === "star-role") {
      return displayedPalaceNames.has(interpretation.palaceName);
    }

    return true;
  });

  return orderInterpretationsByRefs(filteredInterpretations, section.interpretationRefs);
}

function orderInterpretationsByRefs(interpretations, interpretationRefs = []) {
  const interpretationsById = new Map(interpretations.map((item) => {
    return [item.id, item];
  }));

  return interpretationRefs.flatMap((id) => {
    const interpretation = interpretationsById.get(id);

    return interpretation ? [interpretation] : [];
  });
}

function composeStarRoleSynthesis(section) {
  let starRoleInterpretations = section.interpretations?.filter((item) => {
    return item.topic === "star-role";
  }) ?? [];
  const primaryPalaceNames = section.queryContext?.primaryPalaceNames ?? [];

  if (section.id === "life-triad" && primaryPalaceNames.length > 0) {
    starRoleInterpretations = starRoleInterpretations.filter((item) => {
      return primaryPalaceNames.includes(item.palaceName);
    });
  }

  if (starRoleInterpretations.length === 0) {
    return "";
  }

  const palaceOrder = section.evidenceItems?.map((item) => {
    return item.metadata?.palaceName;
  }).filter(Boolean) ?? [];
  const groups = groupStarRoleInterpretations(starRoleInterpretations, palaceOrder).map(
    ([palaceName, interpretations]) => {
      const starNames = interpretations.map((item) => item.starName).join("、");
      const summaries = interpretations.map((item) => item.synthesis).join("、");

      return `${palaceName}见${starNames}，可先归纳为${summaries}`;
    }
  );

  return `${groups.join("；")}。这些线索仍属于本命盘静态结构，需再结合生年四化、限运和更多组合验证。`;
}

function groupStarRoleInterpretations(interpretations, palaceOrder = []) {
  const groupsByPalace = new Map();

  interpretations.forEach((interpretation) => {
    if (!interpretation.palaceName) {
      return;
    }

    const currentGroup = groupsByPalace.get(interpretation.palaceName) ?? [];
    groupsByPalace.set(interpretation.palaceName, [
      ...currentGroup,
      interpretation
    ]);
  });

  const orderedEntries = palaceOrder.flatMap((palaceName) => {
    const interpretationsForPalace = groupsByPalace.get(palaceName);

    return interpretationsForPalace ? [[palaceName, interpretationsForPalace]] : [];
  });
  const orderedPalaces = new Set(palaceOrder);
  const remainingEntries = [...groupsByPalace.entries()].filter(([palaceName]) => {
    return !orderedPalaces.has(palaceName);
  });

  return [...orderedEntries, ...remainingEntries];
}

function joinJudgmentParts(parts) {
  return parts
    .filter((part) => typeof part === "string" && part.length > 0)
    .map(trimSentenceEnd)
    .join("；") + "。";
}

function trimSentenceEnd(text) {
  return text.replace(/[。；;]+$/u, "");
}

function createParagraph(kind, text, evidenceRefs, referenceRefs, interpretationRefs = []) {
  return {
    kind,
    text,
    evidenceRefs,
    referenceRefs,
    interpretationRefs
  };
}
