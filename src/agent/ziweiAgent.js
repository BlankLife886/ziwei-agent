import { buildInputQuestions } from "./inputQuestionnaire.js";
import { normalizeQueryIntent } from "./queryIntentParser.js";
import { findReportDomains } from "./reportDomainCatalog.js";
import { REFERENCE_IDS } from "./referenceCatalog.js";
import {
  buildTimingTriggerCandidates,
  formatTimingTriggerCandidate
} from "./timingTriggerCatalog.js";
import {
  formatTimingCombinationVerification,
  verifyTimingCombinations
} from "./timingCombinationVerifier.js";
import {
  formatTimingCombinationTheme,
  interpretTimingCombinationThemes
} from "./timingCombinationThemeInterpreter.js";

// 命理师 agent 外壳。
//
// 这里先不接大模型，也不急着输出复杂断语。
// 一个稳定的 agent 应该先有结构化上下文：
// 1. 输入资料是否足够。
// 2. 命盘中哪些证据已经可用。
// 3. 哪些分析主题可以展开。
// 4. 哪些能力尚未实现，不能过度断言。

const LIFE_TRIAD_PALACE_NAMES = ["命宫", "财帛宫", "官禄宫", "迁移宫"];
const CAREER_TRIAD_PALACE_NAMES = ["官禄宫", "命宫", "财帛宫", "夫妻宫"];
const WEALTH_TRIAD_PALACE_NAMES = ["财帛宫", "命宫", "官禄宫", "福德宫"];
const SPOUSE_TRIAD_PALACE_NAMES = ["夫妻宫", "迁移宫", "官禄宫", "福德宫"];
const PALACE_EVIDENCE_IDS = {
  命宫: "life-palace",
  兄弟宫: "siblings-palace",
  夫妻宫: "spouse-palace",
  子女宫: "children-palace",
  财帛宫: "wealth-palace",
  疾厄宫: "health-palace",
  仆役宫: "friends-palace",
  官禄宫: "career-palace",
  田宅宫: "property-palace",
  迁移宫: "travel-palace",
  福德宫: "wellbeing-palace",
  父母宫: "parents-palace"
};

export function createZiweiAgentResponse(buildResult, options = {}) {
  const queryIntent = normalizeQueryIntent(options.queryIntent);
  const reportDomains = findReportDomains(queryIntent.reportDomainIds);

  if (buildResult.status === "invalid") {
    return {
      status: "invalid_input",
      role: "ziwei-fortune-analyst",
      queryIntent,
      reportDomains,
      messages: ["出生资料格式不正确，暂不能排盘。"],
      nextQuestions: [],
      questionItems: [],
      evidence: [],
      evidenceItems: [],
      focusAreas: [],
      limitations: []
    };
  }

  if (buildResult.status === "incomplete") {
    const questionItems = buildInputQuestions(buildResult.validation.missingFields);

    return {
      status: "needs_input",
      role: "ziwei-fortune-analyst",
      queryIntent,
      reportDomains,
      messages: ["出生资料还不完整，需要先补齐关键字段。"],
      nextQuestions: buildResult.validation.missingFields.map((field) => {
        return `请补充 ${field}`;
      }),
      questionItems,
      evidence: [],
      evidenceItems: [],
      focusAreas: [],
      limitations: []
    };
  }

  const chart = buildResult.chart;
  const palaceByName = new Map(chart.palaces.map((palace) => [palace.name, palace]));
  const evidenceItems = buildCoreEvidenceItems(chart, palaceByName);
  const focusAreas = buildFocusAreas(chart, palaceByName);
  const selectedFocusAreas = selectFocusAreasByQueryIntent(focusAreas, queryIntent);
  const unavailableFocusAreaIds = getUnavailableFocusAreaIds(focusAreas, queryIntent);
  const missingTopicFields = getMissingTopicFields(unavailableFocusAreaIds, chart);

  return {
    status: "ready",
    role: "ziwei-fortune-analyst",
    queryIntent,
    reportDomains,
    messages: [
      "命盘已经建立，可以进入命理分析。",
      "当前 agent 会先基于命盘证据组织分析重点，避免在规则未实现时过度断言。"
    ],
    nextQuestions: buildTopicNextQuestions(missingTopicFields),
    questionItems: buildInputQuestions(missingTopicFields),
    subject: buildSubjectSummary(buildResult),
    evidence: evidenceItems.map(formatEvidenceText),
    evidenceItems,
    focusAreas: selectedFocusAreas,
    allFocusAreas: focusAreas,
    unavailableFocusAreaIds,
    limitations: buildLimitations(chart, queryIntent, reportDomains, missingTopicFields)
  };
}

function buildSubjectSummary(buildResult) {
  const profile = buildResult.validation.profile;
  const lunarProfile = buildResult.lunarResult.profile;

  return {
    name: profile.name,
    gender: profile.gender,
    calendar: profile.calendar,
    birthDate: profile.birth_date,
    analysisDate: profile.analysis_date || null,
    chineseHour: buildResult.validation.chineseHour,
    lunarYearStem: lunarProfile.lunar_year_stem,
    lunarYearBranch: lunarProfile.lunar_year_branch,
    lunarMonth: lunarProfile.lunar_month,
    lunarDay: lunarProfile.lunar_day
  };
}

function buildCoreEvidenceItems(chart, palaceByName) {
  const lifePalace = palaceByName.get("命宫");
  const bodyPalace = palaceByName.get(chart.bodyPalace?.name);

  const items = [
    createEvidenceItem(
      "core.life-palace-branch",
      `命宫在${chart.lifePalace.branch}`,
      "chart.lifePalace",
      [REFERENCE_IDS.LIFE_BODY_PALACE]
    ),
    createEvidenceItem(
      "core.body-palace-location",
      `身宫在${chart.bodyPalace.name}（${chart.bodyPalace.branch}）`,
      "chart.bodyPalace",
      [REFERENCE_IDS.LIFE_BODY_PALACE]
    ),
    createEvidenceItem(
      "core.five-element-class",
      `五行局为${chart.fiveElementClass.name}`,
      "chart.fiveElementClass",
      [REFERENCE_IDS.FIVE_ELEMENT_CLASS]
    ),
    createEvidenceItem(
      "core.life-palace-stars",
      `命宫星曜：${formatPalaceStars(lifePalace)}`,
      "chart.palaces.命宫",
      [REFERENCE_IDS.STAR_PLACEMENT]
    ),
    createEvidenceItem(
      "core.body-palace-stars",
      `身宫星曜：${formatPalaceStars(bodyPalace)}`,
      `chart.palaces.${chart.bodyPalace.name}`,
      [REFERENCE_IDS.STAR_PLACEMENT]
    ),
    createEvidenceItem(
      "core.birth-year-transformations",
      `生年四化：${formatBirthYearFourTransformations(chart)}`,
      "chart.starAnchors.birthYearTransformations",
      [REFERENCE_IDS.BIRTH_YEAR_FOUR_TRANSFORMATIONS]
    ),
    createEvidenceItem(
      "core.major-periods",
      `大限：${formatMajorPeriodSummary(chart)}`,
      "chart.majorPeriods",
      [REFERENCE_IDS.MAJOR_PERIODS]
    )
  ];

  if (chart.majorPeriodTransformations?.length > 0) {
    items.push(createEvidenceItem(
      "core.major-period-transformations",
      `大限四化骨架：${formatMajorPeriodTransformationCount(chart)}`,
      "chart.majorPeriodTransformations",
      [REFERENCE_IDS.MAJOR_PERIOD_FOUR_TRANSFORMATIONS, REFERENCE_IDS.MAJOR_PERIODS]
    ));
  }

  if (chart.currentMajorPeriod) {
    items.push(createEvidenceItem(
      "core.current-major-period",
      `当前大限：${formatCurrentMajorPeriodSummary(chart)}`,
      "chart.currentMajorPeriod",
      [REFERENCE_IDS.CURRENT_MAJOR_PERIOD, REFERENCE_IDS.MAJOR_PERIODS]
    ));
  }

  if (chart.annualPeriod) {
    items.push(createEvidenceItem(
      "core.annual-period",
      `流年骨架：${formatAnnualPeriodSummary(chart)}`,
      "chart.annualPeriod",
      [REFERENCE_IDS.ANNUAL_PERIOD]
    ));
  }

  return items;
}

function buildFocusAreas(chart, palaceByName) {
  const lifeTriadPalaces = LIFE_TRIAD_PALACE_NAMES.map((name) => {
    return palaceByName.get(name);
  }).filter(Boolean);
  const careerTriadPalaces = CAREER_TRIAD_PALACE_NAMES.map((name) => {
    return palaceByName.get(name);
  }).filter(Boolean);
  const wealthTriadPalaces = WEALTH_TRIAD_PALACE_NAMES.map((name) => {
    return palaceByName.get(name);
  }).filter(Boolean);
  const spouseTriadPalaces = SPOUSE_TRIAD_PALACE_NAMES.map((name) => {
    return palaceByName.get(name);
  }).filter(Boolean);

  const focusAreas = [
    {
      id: "life-triad",
      title: "命宫与三方四正",
      reason: "先看命宫，再合看财帛、官禄、迁移，建立命主核心格局。",
      evidenceItems: lifeTriadPalaces.map((palace) => {
        return createPalaceEvidenceItem("life-triad", palace);
      })
    },
    {
      id: "career-palace",
      title: "官禄宫三方四正",
      reason: "官禄宫用于建立事业发展报告的静态职业线索；当前合看官禄、命宫、财帛、夫妻四宫，不推职位高低或升迁时间。",
      evidenceItems: careerTriadPalaces.map((palace) => {
        return createPalaceEvidenceItem("career-palace", palace);
      })
    },
    {
      id: "wealth-palace",
      title: "财帛宫三方四正",
      reason: "财帛宫用于建立财富资源报告的静态资源线索；当前合看财帛、命宫、官禄、福德四宫，不推具体金额或投资结果。",
      evidenceItems: wealthTriadPalaces.map((palace) => {
        return createPalaceEvidenceItem("wealth-palace", palace);
      })
    },
    {
      id: "spouse-palace",
      title: "夫妻宫三方四正",
      reason: "夫妻宫用于建立婚姻感情报告的静态关系线索；当前合看夫妻、迁移、官禄、福德四宫，不推具体婚恋事件。",
      evidenceItems: spouseTriadPalaces.map((palace) => {
        return createPalaceEvidenceItem("spouse-palace", palace);
      })
    },
    {
      id: "body-palace",
      title: "身宫落点",
      reason: "身宫提示后天行为重心，适合和命宫一起看人生发力方式。",
      evidenceItems: [
        createPalaceEvidenceItem(
          "body-palace",
          palaceByName.get(chart.bodyPalace.name)
        )
      ]
    },
    {
      id: "star-balance",
      title: "星曜类别平衡",
      reason: "先区分主星、辅星、煞曜、空曜，避免把助力、冲击和空亡混为一谈。",
      evidenceItems: buildStarBalanceEvidenceItems(chart)
    },
    {
      id: "birth-year-transformations",
      title: "生年四化",
      reason: "生年四化标记本命盘中的禄、权、科、忌牵引，是后续细断前必须先确认的结构证据。",
      evidenceItems: buildBirthYearTransformationEvidenceItems(chart)
    },
    {
      id: "major-periods",
      title: "大限骨架",
      reason: "大限用于定位人生阶段落在哪一宫；当前先建立年龄段骨架，避免在没有运限结构时直接谈事件。",
      evidenceItems: buildMajorPeriodEvidenceItems(chart)
    }
  ];

  if (chart.currentMajorPeriod) {
    focusAreas.push({
      id: "current-major-period",
      title: "当前大限定位",
      reason: "按分析日期定位命主当前处于哪一个大限，只用于确认阶段落宫，不直接推事件。",
      evidenceItems: buildCurrentMajorPeriodEvidenceItems(chart)
    }, {
      id: "current-stage",
      title: "当前阶段运势底稿",
      reason: "当前阶段分析用于把大限定位、阶段落宫星曜、生年四化、大限四化、流年四化、流月骨架、安全触发观察点、组合验证和主题解释放到同一节中合参；当前不推具体年份事件、月份事件或应期。",
      evidenceItems: buildCurrentStageEvidenceItems(chart, palaceByName)
    });
  }

  return focusAreas.map((focusArea) => {
    return {
      ...focusArea,
      evidence: focusArea.evidenceItems.map(formatEvidenceText)
    };
  });
}

function buildLimitations(chart, queryIntent, reportDomains = [], missingTopicFields = []) {
  const hasMajorPeriodTransformations = Boolean(
    chart.currentMajorPeriod?.transformations
  );
  const hasAnnualPeriod = Boolean(chart.annualPeriod);
  const hasAnnualTransformations = Boolean(chart.annualPeriod?.transformations);
  const hasMonthlyPeriod = Boolean(chart.monthlyPeriod);
  const hasTimingTriggerCandidates = Boolean(
    chart.currentMajorPeriod?.period &&
      chart.annualPeriod?.transformations
  );
  const hasTimingCombinationVerifications = verifyTimingCombinations(
    buildTimingTriggerCandidates(chart)
  ).length > 0;
  const hasTimingCombinationThemes = hasTimingCombinationVerifications;
  const dynamicScopeItems = chart.currentMajorPeriod
    ? [
        "生年四化",
        "大限年龄段",
        "当前大限定位",
        hasMajorPeriodTransformations ? "大限四化骨架" : null,
        hasAnnualPeriod ? "流年骨架" : null,
        hasAnnualTransformations ? "流年四化骨架" : null,
        hasMonthlyPeriod ? "流月骨架" : null,
        hasTimingTriggerCandidates ? "安全触发观察点" : null,
        hasTimingCombinationVerifications ? "组合验证底座" : null,
        hasTimingCombinationThemes ? "组合主题解释" : null
      ]
    : [
        "生年四化",
        "大限年龄段",
        chart.majorPeriodTransformations?.length > 0 ? "大限四化骨架" : null
      ];
  const dynamicScope = dynamicScopeItems.filter(Boolean).join("、");
  const queryScope = queryIntent.hasIntent
    ? [`本轮已按查询意图收敛章节：${queryIntent.topics.join("、")}。`]
    : [];
  const reportGoalScope = reportDomains.length > 0
    ? [`最终报告目标：${reportDomains.map((domain) => domain.title).join("、")}。`]
    : [];
  const plannedDomains = reportDomains.filter((domain) => {
    return domain.currentSupport === "planned";
  });
  const plannedDomainScope = plannedDomains.length > 0
    ? [`以下报告领域只完成目标登记，尚不能输出深入断语：${plannedDomains.map((domain) => domain.title).join("、")}。`]
    : [];
  const missingTopicScope = missingTopicFields.length > 0
    ? [`当前查询还需要补充字段：${missingTopicFields.join("、")}。`]
    : [];

  return [
    ...queryScope,
    ...reportGoalScope,
    ...plannedDomainScope,
    ...missingTopicScope,
    `已接入${dynamicScope}，但尚未完成深层跨宫、跨限运解释，因此不能推具体年份事件、月份事件或应期。`,
    "尚未接入知识库检索与引用，因此解释应以已实现规则为边界。"
  ];
}

function selectFocusAreasByQueryIntent(focusAreas, queryIntent) {
  if (!queryIntent.hasIntent) {
    return focusAreas;
  }

  const requestedIds = new Set(queryIntent.focusAreaIds);
  return focusAreas.filter((focusArea) => requestedIds.has(focusArea.id));
}

function getUnavailableFocusAreaIds(focusAreas, queryIntent) {
  if (!queryIntent.hasIntent) {
    return [];
  }

  const availableIds = new Set(focusAreas.map((focusArea) => focusArea.id));
  return queryIntent.focusAreaIds.filter((id) => !availableIds.has(id));
}

function getMissingTopicFields(unavailableFocusAreaIds, chart) {
  const missingFields = [];

  if (unavailableFocusAreaIds.includes("current-stage") && !chart.currentMajorPeriod) {
    missingFields.push("analysis_date");
  }

  return missingFields;
}

function buildTopicNextQuestions(missingFields) {
  return missingFields.map((field) => {
    return `请补充 ${field}`;
  });
}

function buildStarBalanceEvidenceItems(chart) {
  const totals = chart.palaces.reduce(
    (sum, palace) => {
      return {
        mainStars: sum.mainStars + palace.mainStars.length,
        auxiliaryStars: sum.auxiliaryStars + palace.auxiliaryStars.length,
        maleficStars: sum.maleficStars + palace.maleficStars.length,
        voidStars: sum.voidStars + palace.voidStars.length
      };
    },
    {
      mainStars: 0,
      auxiliaryStars: 0,
      maleficStars: 0,
      voidStars: 0
    }
  );

  return [
    createEvidenceItem(
      "star-balance.main-stars",
      `主星 ${totals.mainStars} 颗`,
      "chart.palaces.mainStars",
      [REFERENCE_IDS.STAR_BALANCE]
    ),
    createEvidenceItem(
      "star-balance.auxiliary-stars",
      `辅星 ${totals.auxiliaryStars} 颗`,
      "chart.palaces.auxiliaryStars",
      [REFERENCE_IDS.STAR_BALANCE]
    ),
    createEvidenceItem(
      "star-balance.malefic-stars",
      `煞曜 ${totals.maleficStars} 颗`,
      "chart.palaces.maleficStars",
      [REFERENCE_IDS.STAR_BALANCE]
    ),
    createEvidenceItem(
      "star-balance.void-stars",
      `空曜 ${totals.voidStars} 颗`,
      "chart.palaces.voidStars",
      [REFERENCE_IDS.STAR_BALANCE]
    )
  ];
}

function buildBirthYearTransformationEvidenceItems(chart) {
  return [
    createEvidenceItem(
      "birth-year-transformations.summary",
      `生年四化：${formatBirthYearFourTransformations(chart)}`,
      "chart.starAnchors.birthYearTransformations",
      [REFERENCE_IDS.BIRTH_YEAR_FOUR_TRANSFORMATIONS]
    )
  ];
}

function buildMajorPeriodEvidenceItems(chart) {
  return [
    createEvidenceItem(
      "major-periods.summary",
      `大限：${formatMajorPeriodSummary(chart)}`,
      "chart.majorPeriods",
      [REFERENCE_IDS.MAJOR_PERIODS]
    )
  ];
}

function buildCurrentMajorPeriodEvidenceItems(chart) {
  return [
    createEvidenceItem(
      "current-major-period.summary",
      `当前大限：${formatCurrentMajorPeriodSummary(chart)}`,
      "chart.currentMajorPeriod",
      [REFERENCE_IDS.CURRENT_MAJOR_PERIOD, REFERENCE_IDS.MAJOR_PERIODS]
    )
  ];
}

function buildCurrentStageEvidenceItems(chart, palaceByName) {
  const currentPeriod = chart.currentMajorPeriod?.period;
  const currentPalace = currentPeriod
    ? palaceByName.get(currentPeriod.palaceName)
    : null;
  const currentPeriodText = currentPeriod
    ? `${currentPeriod.startAge}-${currentPeriod.endAge}岁${currentPeriod.palaceName}${currentPeriod.branch}`
    : "未落入已排出的大限年龄段";
  const items = [
    createEvidenceItem(
      "current-stage.current-major-period",
      `当前阶段定位：${formatCurrentMajorPeriodSummary(chart)}`,
      "chart.currentMajorPeriod",
      [REFERENCE_IDS.CURRENT_STAGE, REFERENCE_IDS.CURRENT_MAJOR_PERIOD, REFERENCE_IDS.MAJOR_PERIODS]
    ),
    createEvidenceItem(
      "current-stage.major-period-anchor",
      `阶段大限宫位：${currentPeriodText}`,
      "chart.currentMajorPeriod.period",
      [REFERENCE_IDS.CURRENT_STAGE, REFERENCE_IDS.MAJOR_PERIODS]
    ),
    createEvidenceItem(
      "current-stage.birth-year-transformations",
      `生年四化参照：${formatBirthYearFourTransformations(chart)}`,
      "chart.starAnchors.birthYearTransformations",
      [REFERENCE_IDS.CURRENT_STAGE, REFERENCE_IDS.BIRTH_YEAR_FOUR_TRANSFORMATIONS]
    )
  ];

  if (currentPalace) {
    items.splice(2, 0, createPalaceEvidenceItem("current-stage", currentPalace));
  }

  if (chart.currentMajorPeriod?.transformations) {
    items.push(createEvidenceItem(
      "current-stage.major-period-transformations",
      `当前大限四化骨架：${formatCurrentMajorPeriodTransformations(chart)}`,
      "chart.currentMajorPeriod.transformations",
      [REFERENCE_IDS.CURRENT_STAGE, REFERENCE_IDS.MAJOR_PERIOD_FOUR_TRANSFORMATIONS]
    ));
  }

  if (chart.annualPeriod) {
    items.push(createEvidenceItem(
      "current-stage.annual-period",
      `流年骨架：${formatAnnualPeriodSummary(chart)}`,
      "chart.annualPeriod",
      [REFERENCE_IDS.CURRENT_STAGE, REFERENCE_IDS.ANNUAL_PERIOD]
    ));
  }

  if (chart.annualPeriod?.transformations) {
    items.push(createEvidenceItem(
      "current-stage.annual-transformations",
      `流年四化骨架：${formatAnnualTransformations(chart)}`,
      "chart.annualPeriod.transformations",
      [REFERENCE_IDS.CURRENT_STAGE, REFERENCE_IDS.ANNUAL_FOUR_TRANSFORMATIONS]
    ));
  }

  if (chart.monthlyPeriod) {
    items.push(createEvidenceItem(
      "current-stage.monthly-period",
      `流月骨架：${formatMonthlyPeriodSummary(chart)}`,
      "chart.monthlyPeriod",
      [REFERENCE_IDS.CURRENT_STAGE, REFERENCE_IDS.MONTHLY_PERIOD]
    ));
  }

  const timingTriggerCandidates = buildTimingTriggerCandidates(chart);

  if (timingTriggerCandidates.length > 0) {
    items.push(createEvidenceItem(
      "current-stage.timing-trigger-candidates",
      `安全触发观察点：${timingTriggerCandidates.map(formatTimingTriggerCandidate).join("；")}`,
      "agent.timingTriggerCandidates",
      uniqueInOrder(timingTriggerCandidates.flatMap((candidate) => candidate.referenceRefs)),
      {
        timingTriggerCandidates
      }
    ));
  }

  const timingCombinationVerifications = verifyTimingCombinations(timingTriggerCandidates);

  if (timingCombinationVerifications.length > 0) {
    items.push(createEvidenceItem(
      "current-stage.timing-combination-verifications",
      `运限组合验证：${timingCombinationVerifications.map(formatTimingCombinationVerification).join("；")}`,
      "agent.timingCombinationVerifications",
      uniqueInOrder(timingCombinationVerifications.flatMap((verification) => {
        return verification.referenceRefs;
      })),
      {
        timingCombinationVerifications
      }
    ));
  }

  const timingCombinationThemes = interpretTimingCombinationThemes(timingCombinationVerifications);

  if (timingCombinationThemes.length > 0) {
    items.push(createEvidenceItem(
      "current-stage.timing-combination-themes",
      `组合验证主题解释：${timingCombinationThemes.map(formatTimingCombinationTheme).join("；")}`,
      "agent.timingCombinationThemes",
      uniqueInOrder(timingCombinationThemes.flatMap((theme) => {
        return theme.referenceRefs;
      })),
      {
        timingCombinationThemes
      }
    ));
  }

  return items;
}

function createPalaceEvidenceItem(scope, palace) {
  const palaceId = PALACE_EVIDENCE_IDS[palace.name] ?? palace.name;

  return createEvidenceItem(
    `${scope}.${palaceId}`,
    formatPalaceSnapshot(palace),
    `chart.palaces.${palace.name}`,
    getPalaceEvidenceReferenceRefs(scope),
    buildPalaceEvidenceMetadata(palace)
  );
}

function buildPalaceEvidenceMetadata(palace) {
  return {
    palaceName: palace.name,
    branch: palace.branch,
    // 保留分组后的星曜，后续解释层可以按“宫位 + 星曜类别”挂接条目，
    // 不需要再从展示文本里拆字符串。
    starGroups: {
      mainStars: [...palace.mainStars],
      auxiliaryStars: [...palace.auxiliaryStars],
      maleficStars: [...palace.maleficStars],
      voidStars: [...palace.voidStars]
    }
  };
}

function createEvidenceItem(id, text, source, referenceRefs = [], metadata) {
  return {
    id,
    text,
    source,
    referenceRefs,
    ...(metadata ? { metadata } : {})
  };
}

function getPalaceEvidenceReferenceRefs(scope) {
  if (scope === "life-triad") {
    return [REFERENCE_IDS.LIFE_TRIAD, REFERENCE_IDS.STAR_PLACEMENT];
  }

  if (scope === "career-palace") {
    return [REFERENCE_IDS.CAREER_PALACE, REFERENCE_IDS.STAR_PLACEMENT];
  }

  if (scope === "wealth-palace") {
    return [REFERENCE_IDS.WEALTH_PALACE, REFERENCE_IDS.STAR_PLACEMENT];
  }

  if (scope === "spouse-palace") {
    return [REFERENCE_IDS.SPOUSE_PALACE, REFERENCE_IDS.STAR_PLACEMENT];
  }

  if (scope === "body-palace") {
    return [REFERENCE_IDS.BODY_PALACE, REFERENCE_IDS.STAR_PLACEMENT];
  }

  if (scope === "current-stage") {
    return [REFERENCE_IDS.CURRENT_STAGE, REFERENCE_IDS.STAR_PLACEMENT];
  }

  return [REFERENCE_IDS.STAR_PLACEMENT];
}

function formatEvidenceText(evidenceItem) {
  return evidenceItem.text;
}

function formatPalaceSnapshot(palace) {
  return `${palace.name}${palace.branch}：${formatPalaceStars(palace)}`;
}

function formatPalaceStars(palace) {
  if (!palace) {
    return "未找到宫位";
  }

  const groups = [
    ["主星", palace.mainStars],
    ["辅星", palace.auxiliaryStars],
    ["煞曜", palace.maleficStars],
    ["空曜", palace.voidStars]
  ]
    .filter(([, stars]) => stars.length > 0)
    .map(([label, stars]) => `${label}${stars.join("、")}`);

  if (groups.length === 0) {
    return "无已安星曜";
  }

  return groups.join("；");
}

function formatBirthYearFourTransformations(chart) {
  const anchor = chart.starAnchors.birthYearTransformations;

  if (!anchor) {
    return "未计算";
  }

  return Object.entries(anchor)
    .filter(([key]) => key !== "yearStem")
    .map(([name, star]) => {
      const palace = findPalaceContainingStar(chart, star);
      const palaceText = palace ? `在${palace.name}${palace.branch}` : "未落入已安星曜宫位";

      return `${star}${name}${palaceText}`;
    })
    .join("；");
}

function findPalaceContainingStar(chart, starName) {
  return chart.palaces.find((palace) => {
    return [
      palace.mainStars,
      palace.auxiliaryStars,
      palace.maleficStars,
      palace.voidStars
    ].some((stars) => stars.includes(starName));
  });
}

function formatMajorPeriodSummary(chart) {
  if (!chart.majorPeriods || chart.majorPeriods.length === 0) {
    return "未计算";
  }

  const direction = chart.majorPeriods[0];
  const periods = chart.majorPeriods.map((period) => {
    return `${period.startAge}-${period.endAge}岁${period.palaceName}${period.branch}`;
  });

  return `${direction.genderLabel}${direction.directionLabel}；${periods.join("；")}`;
}

function formatMajorPeriodTransformationCount(chart) {
  const count = chart.majorPeriodTransformations?.length ?? 0;

  if (count === 0) {
    return "未计算";
  }

  return `已按${count}个大限宫干建立四化骨架`;
}

function formatCurrentMajorPeriodTransformations(chart) {
  const currentTransformations = chart.currentMajorPeriod?.transformations;

  if (!currentTransformations) {
    return "未计算";
  }

  const periodText = `${currentTransformations.startAge}-${currentTransformations.endAge}岁${currentTransformations.palaceName}${currentTransformations.branch}`;
  const transformationText = currentTransformations.transformations.map((item) => {
    const targetText = item.targetPalaceName
      ? `在本命${item.targetPalaceName}`
      : "未落入已安星曜宫位";

    return `${item.star}${item.name}${targetText}`;
  }).join("；");

  return `${periodText}，${currentTransformations.palaceStem}干：${transformationText}`;
}

function formatAnnualPeriodSummary(chart) {
  const annual = chart.annualPeriod;

  if (!annual) {
    return "未计算";
  }

  const palaceText = annual.palaceName
    ? `${annual.palaceName}${annual.branch}`
    : `${annual.yearBranch}支未匹配到本命宫位`;

  return `${annual.analysisDate}对应农历${annual.lunarYear}年${annual.yearStem}${annual.yearBranch}，流年命宫暂按太岁地支定位到${palaceText}`;
}

function formatAnnualTransformations(chart) {
  const annualTransformations = chart.annualPeriod?.transformations;

  if (!annualTransformations) {
    return "未计算";
  }

  const transformationText = annualTransformations.transformations.map((item) => {
    const targetText = item.targetPalaceName
      ? `在本命${item.targetPalaceName}`
      : "未落入已安星曜宫位";

    return `${item.star}${item.name}${targetText}`;
  }).join("；");

  return `${annualTransformations.lunarYear}年${annualTransformations.yearStem}${annualTransformations.yearBranch}：${transformationText}`;
}

function formatMonthlyPeriodSummary(chart) {
  const monthly = chart.monthlyPeriod;

  if (!monthly) {
    return "未计算";
  }

  const palaceText = monthly.palaceName
    ? `${monthly.palaceName}${monthly.branch}`
    : `${monthly.monthBranch}支未匹配到本命宫位`;
  const leapText = monthly.isLeapMonth ? "闰" : "";

  return `${monthly.analysisDate}对应农历${monthly.lunarYear}年${leapText}${monthly.lunarMonth}月${monthly.lunarDay}日，流月月建暂按${monthly.monthBranch}支定位到${palaceText}`;
}

function formatCurrentMajorPeriodSummary(chart) {
  const current = chart.currentMajorPeriod;

  if (!current) {
    return "未计算";
  }

  const period = current.period;
  const periodText = period
    ? `${period.startAge}-${period.endAge}岁${period.palaceName}${period.branch}`
    : "未落入已排出的大限年龄段";

  return `${current.analysisDate}按${current.ageLabel}${current.age}岁定位，${periodText}`;
}

function uniqueInOrder(values) {
  return [...new Set(values.filter(Boolean))];
}
