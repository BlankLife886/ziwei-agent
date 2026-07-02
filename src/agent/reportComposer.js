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
    brief: composeReportBrief(reportPlan),
    sections: reportPlan.sections.map(composeSectionDraft),
    closing: composeClosing(reportPlan)
  };
}

function composeReportBrief(reportPlan) {
  const sectionSummaries = reportPlan.sections.map((section) => {
    return {
      id: section.id,
      title: section.title,
      evidenceCount: section.evidenceRefs?.length ?? 0,
      referenceCount: section.referenceRefs?.length ?? 0,
      interpretationCount: section.interpretationRefs?.length ?? 0,
      knowledgeSnippetCount: section.knowledgeSnippetRefs?.length ?? 0,
      topicTitles: (section.topicRefinements ?? []).map((item) => item.topicTitle)
    };
  });

  return {
    kind: "report-brief",
    mode: reportPlan.queryIntent?.hasIntent ? "focused" : "foundation",
    subject: reportPlan.subject,
    sectionSummaries,
    paragraphs: [
      createParagraph(
        "brief-scope",
        composeBriefScopeParagraph(reportPlan, sectionSummaries),
        [],
        []
      ),
      createParagraph(
        "chart-summary",
        composeChartSummaryParagraph(reportPlan.subject),
        [],
        []
      ),
      createParagraph(
        "report-path",
        composeReportPathParagraph(sectionSummaries),
        [],
        []
      ),
      createParagraph(
        "delivery-boundary",
        "【交付边界】本报告输出命盘结构、章节证据、解释依据和可继续咨询的线索；不能输出具体年份事件、婚姻结果、财富金额、职业结果或吉凶定论。",
        [],
        []
      )
    ]
  };
}

function composeBriefScopeParagraph(reportPlan, sectionSummaries) {
  if (reportPlan.queryIntent?.hasIntent) {
    return `【报告总览】本次按用户咨询的${reportPlan.queryIntent.topics.join("、")}聚焦分析，共生成${sectionSummaries.length}个专题章节；每个章节都必须回到本次命盘证据、解释目录和知识片段。`;
  }

  return `【报告总览】本次生成基础版命盘报告，共生成${sectionSummaries.length}个基础章节；先建立命宫、事业、财富、婚姻、身宫、星曜分布和运限骨架的结构底稿。`;
}

function composeChartSummaryParagraph(subject) {
  const analysisDate = subject.analysisDate
    ? `，分析日期为${subject.analysisDate}`
    : "";

  return `【命盘摘要】命主${subject.name}，出生资料使用${subject.calendar}历${subject.birthDate}${analysisDate}；当前换算到${subject.lunarYearStem}${subject.lunarYearBranch}年、农历${subject.lunarMonth}月${subject.lunarDay}日、${subject.chineseHour}时。`;
}

function composeReportPathParagraph(sectionSummaries) {
  const sectionText = sectionSummaries.map((section) => {
    return `${section.title}（${section.evidenceCount}组证据、${section.interpretationCount}条解释、${section.knowledgeSnippetCount}条知识片段）`;
  }).join("；");

  return `【章节路径】${sectionText}。`;
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
    evidenceRefs: section.evidenceRefs,
    interpretationRefs: section.interpretationRefs,
    knowledgeSnippetRefs: section.knowledgeSnippetRefs,
    topicRefinements: section.topicRefinements ?? [],
    interpretations: section.interpretations,
    referenceRefs: section.referenceRefs,
    references: section.references,
    sourceRefs: section.sourceRefs,
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
        "section-synthesis",
        composeSectionSynthesisParagraph(section),
        section.evidenceRefs,
        section.referenceRefs,
        displayedInterpretationRefs
      ),
      createParagraph(
        "topic-refinement",
        composeTopicRefinementParagraph(section),
        section.evidenceRefs,
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

function composeSectionSynthesisParagraph(section) {
  const starRoleSynthesis = composeStarRoleSynthesis(section);
  const evidenceSummary = composeEvidenceSynthesis(section);
  const knowledgeSummary = composeKnowledgeSnippetSynthesis(section);

  if (starRoleSynthesis) {
    return `【组合归纳】${joinJudgmentParts([
      evidenceSummary,
      starRoleSynthesis,
      knowledgeSummary
    ])}`;
  }

  return `【组合归纳】${joinJudgmentParts([
    evidenceSummary,
    composeStructuralBoundary(section),
    knowledgeSummary
  ])}`;
}

function composeTopicRefinementParagraph(section) {
  const refinements = section.topicRefinements ?? [];

  if (refinements.length === 0) {
    return "【专题细分】本节尚未生成专题细分任务单，只按章节证据保守写作。";
  }

  const refinementText = refinements.map((refinement) => {
    return `${refinement.topicTitle}按${refinement.angles.join("、")}展开，禁区为${refinement.blockedClaims.join("、")}`;
  }).join("；");

  return `【专题细分】${refinementText}。`;
}

function composeEvidenceSynthesis(section) {
  const evidenceCount = section.evidenceItems?.length ?? section.evidence?.length ?? 0;
  const referenceCount = section.referenceRefs?.length ?? 0;
  const interpretationCount = section.interpretationRefs?.length ?? 0;

  return `本节先把${evidenceCount}组命盘证据、${referenceCount}类规则/框架引用和${interpretationCount}条受控解释放在同一章节中合看`;
}

function composeKnowledgeSnippetSynthesis(section) {
  const snippetCount = section.knowledgeSnippetRefs?.length ?? 0;

  if (snippetCount === 0) {
    return "本节尚无 verified 知识片段，组合归纳只能作为本地规则底稿";
  }

  return `本节已接入${snippetCount}条 verified 知识片段作为框架校验，但这些片段只支持结构归纳，不替代后续书籍/PDF原文细证和组合验证`;
}

function composeStructuralBoundary(section) {
  if (section.id === "birth-year-transformations") {
    return "生年四化目前用于标记本命盘牵引位置，适合进入结构合参，不适合单独推出事件";
  }

  if (section.id === "major-periods") {
    return "大限骨架目前用于确定十年阶段排列，适合做阶段索引，不适合单独写成阶段结果";
  }

  if (section.id === "current-major-period") {
    return "当前大限定位目前用于说明分析日期落入哪一个阶段，后续仍要结合四化、流年、流月和组合验证";
  }

  if (section.id === "current-stage") {
    return "当前阶段已能合看大限、流年和四化观察点，但仍保持待验证表述";
  }

  if (section.id === "star-balance") {
    return "星曜类别统计目前用于检查主星、辅星、煞曜和空曜的分布比例，不直接扩展为结论";
  }

  return "当前组合归纳仍以结构关系为主，后续需要更多规则和资料来源继续加深";
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

  if (section.id === "current-stage") {
    return composeCurrentStageParagraph(section);
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
    boundaryText,
    ...getFourTransformationTypeInterpretationTexts(section),
    ...getFourTransformationPairInterpretationTexts(section),
    ...getFourTransformationTargetPalaceInterpretationTexts(section)
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

function composeCurrentStageParagraph(section) {
  const boundaryText = getInterpretationText(
    section,
    INTERPRETATION_IDS.CURRENT_STAGE_STATIC_ONLY
  );
  const majorPeriodTransformationText = getInterpretationText(
    section,
    INTERPRETATION_IDS.MAJOR_PERIOD_FOUR_TRANSFORMATIONS_STAGE_ONLY
  );
  const annualPeriodText = getInterpretationText(
    section,
    INTERPRETATION_IDS.ANNUAL_PERIOD_STRUCTURE_ONLY
  );
  const annualTransformationText = getInterpretationText(
    section,
    INTERPRETATION_IDS.ANNUAL_FOUR_TRANSFORMATIONS_STRUCTURE_ONLY
  );
  const monthlyPeriodText = getInterpretationText(
    section,
    INTERPRETATION_IDS.MONTHLY_PERIOD_STRUCTURE_ONLY
  );
  const timingTriggerText = getInterpretationText(
    section,
    INTERPRETATION_IDS.TIMING_TRIGGER_CANDIDATE_ONLY
  );
  const timingCombinationText = getInterpretationText(
    section,
    INTERPRETATION_IDS.TIMING_COMBINATION_VERIFIED_ONLY
  );
  const timingCombinationThemeSynthesis = composeTimingCombinationThemeSynthesis(section);
  const timingCombinationThemeText = timingCombinationThemeSynthesis
    ? getInterpretationText(section, INTERPRETATION_IDS.TIMING_COMBINATION_THEME_ONLY)
    : "";
  const timingCrossLayerSynthesis = composeTimingCrossLayerSynthesis(section);
  const timingCrossLayerText = timingCrossLayerSynthesis
    ? getInterpretationText(section, INTERPRETATION_IDS.TIMING_CROSS_LAYER_STRUCTURE_ONLY)
    : "";
  const starRoleSynthesis = composeStarRoleSynthesis(section);

  return `【草稿判断】${joinJudgmentParts([
    ...section.evidence,
    boundaryText,
    majorPeriodTransformationText,
    annualPeriodText,
    annualTransformationText,
    ...getFourTransformationTypeInterpretationTexts(section),
    ...getFourTransformationPairInterpretationTexts(section),
    ...getFourTransformationTargetPalaceInterpretationTexts(section),
    monthlyPeriodText,
    composeTimingTriggerCandidateSynthesis(section),
    timingTriggerText,
    composeTimingCombinationVerificationSynthesis(section),
    timingCombinationText,
    timingCombinationThemeSynthesis,
    timingCombinationThemeText,
    timingCrossLayerSynthesis,
    timingCrossLayerText,
    starRoleSynthesis
  ])}`;
}

function getFourTransformationTypeInterpretationTexts(section) {
  return [
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_LU_STRUCTURE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_QUAN_STRUCTURE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_KE_STRUCTURE,
    INTERPRETATION_IDS.FOUR_TRANSFORMATION_JI_STRUCTURE
  ].flatMap((interpretationId) => {
    if (!section.interpretationRefs?.includes(interpretationId)) {
      return [];
    }

    return [getInterpretationText(section, interpretationId)];
  });
}

function getFourTransformationTargetPalaceInterpretationTexts(section) {
  return (section.interpretations ?? []).flatMap((interpretation) => {
    if (interpretation.topic !== "four-transformation-palace") {
      return [];
    }

    if (!section.interpretationRefs?.includes(interpretation.id)) {
      return [];
    }

    return [interpretation.text];
  });
}

function getFourTransformationPairInterpretationTexts(section) {
  return (section.interpretations ?? []).flatMap((interpretation) => {
    if (interpretation.topic !== "four-transformation-pair") {
      return [];
    }

    if (!section.interpretationRefs?.includes(interpretation.id)) {
      return [];
    }

    return [interpretation.text];
  });
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

function composeTimingTriggerCandidateSynthesis(section) {
  const evidenceItem = section.evidenceItems?.find((item) => {
    return item.metadata?.timingTriggerCandidates?.length > 0;
  });
  const candidates = evidenceItem?.metadata?.timingTriggerCandidates ?? [];

  if (candidates.length === 0) {
    return "";
  }

  const candidateText = candidates.map((candidate) => {
    const signalText = candidate.signals.map((signal) => signal.text).join("、");

    return `${candidate.palaceName}为${candidate.priorityLabel}观察点（${signalText}）`;
  }).join("；");

  return `安全触发候选只列观察点：${candidateText}`;
}

function composeTimingCombinationVerificationSynthesis(section) {
  const evidenceItem = section.evidenceItems?.find((item) => {
    return item.metadata?.timingCombinationVerifications?.length > 0;
  });
  const verifications = evidenceItem?.metadata?.timingCombinationVerifications ?? [];

  if (verifications.length === 0) {
    return "";
  }

  const verificationText = verifications.map((verification) => {
    return `${verification.palaceName}已通过${verification.signalGroups.join("、")}组合验证`;
  }).join("；");

  return `组合验证只把多层证据同时出现的宫位列为合参主题：${verificationText}`;
}

function composeTimingCombinationThemeSynthesis(section) {
  const evidenceItem = section.evidenceItems?.find((item) => {
    return item.metadata?.timingCombinationThemes?.length > 0;
  });
  const themes = evidenceItem?.metadata?.timingCombinationThemes ?? [];

  if (themes.length === 0) {
    return "";
  }

  const themeText = themes.map((theme) => {
    return `${theme.palaceName}归为${theme.title}`;
  }).join("；");

  return `组合主题解释只把已验证宫位转成阶段合参领域：${themeText}`;
}

function composeTimingCrossLayerSynthesis(section) {
  const evidenceItem = section.evidenceItems?.find((item) => {
    return item.metadata?.timingCrossLayerInteractions?.length > 0;
  });
  const interactions = evidenceItem?.metadata?.timingCrossLayerInteractions ?? [];

  if (interactions.length === 0) {
    return "";
  }

  const interactionText = interactions.map((interaction) => {
    return `${interaction.title}，${interaction.primaryPalaceName}与${interaction.secondaryPalaceName}合参`;
  }).join("；");

  return `跨宫跨限运解释只整理关系结构：${interactionText}`;
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
