import { INTERPRETATION_IDS } from "./interpretationCatalog.js";
import { REFERENCE_IDS } from "./referenceCatalog.js";

// 安全事件触发候选目录。
//
// 这里的“触发”不是断定事件，而是把当前大限、流年、四化之间的重叠点
// 标记成后续报告的观察点。它只消费已经算出的结构化证据：
// 1. 当前大限所在宫。
// 2. 生年四化、大限四化、流年四化的落宫。
// 3. 流年太岁定位宫和流月月建定位宫。
//
// 输出必须保持保守：只能说“可作为观察点/待验证主题”，不能生成应期、
// 具体事件、婚恋结果、财富金额或职业结果。

const TRANSFORMATION_WEIGHTS = {
  化禄: 2,
  化权: 2,
  化科: 1,
  化忌: 2
};

const HIGH_PRIORITY_SCORE = 5;
const MEDIUM_PRIORITY_SCORE = 3;

export function buildTimingTriggerCandidates(chart) {
  if (!chart?.currentMajorPeriod?.period) {
    return [];
  }

  const context = buildTimingContext(chart);
  const palaceNames = collectCandidatePalaceNames(context);

  return palaceNames
    .map((palaceName) => buildCandidateForPalace(palaceName, context))
    .filter((candidate) => candidate.signals.length > 0)
    .sort(compareCandidates)
    .map((candidate, index) => ({
      ...candidate,
      id: `timing-trigger.${index + 1}.${normalizePalaceName(candidate.palaceName)}`
    }));
}

export function formatTimingTriggerCandidate(candidate) {
  const signalText = candidate.signals.map((signal) => signal.text).join("、");

  return `${candidate.palaceName}可作为${candidate.priorityLabel}观察点：${signalText}；只用于提示待验证主题，不推具体事件或应期`;
}

function buildTimingContext(chart) {
  return {
    currentMajorPeriod: chart.currentMajorPeriod,
    annualPeriod: chart.annualPeriod ?? null,
    monthlyPeriod: chart.monthlyPeriod ?? null,
    birthYearTransformations: collectBirthYearTransformationEntries(chart),
    majorPeriodTransformations:
      chart.currentMajorPeriod?.transformations?.transformations ?? [],
    annualTransformations:
      chart.annualPeriod?.transformations?.transformations ?? []
  };
}

function collectCandidatePalaceNames(context) {
  return uniqueInOrder([
    context.currentMajorPeriod.period.palaceName,
    context.annualPeriod?.palaceName,
    context.monthlyPeriod?.palaceName,
    ...collectTransformationPalaceNames(context.birthYearTransformations),
    ...collectTransformationPalaceNames(context.majorPeriodTransformations),
    ...collectTransformationPalaceNames(context.annualTransformations)
  ]);
}

function collectTransformationPalaceNames(transformations) {
  return transformations.flatMap((transformation) => {
    return transformation.targetPalaceName ? [transformation.targetPalaceName] : [];
  });
}

function buildCandidateForPalace(palaceName, context) {
  const signals = [
    ...buildCurrentMajorPeriodSignals(palaceName, context),
    ...buildAnnualPeriodSignals(palaceName, context),
    ...buildMonthlyPeriodSignals(palaceName, context),
    ...buildTransformationSignals("birth-year", palaceName, context.birthYearTransformations),
    ...buildTransformationSignals("major-period", palaceName, context.majorPeriodTransformations),
    ...buildTransformationSignals("annual", palaceName, context.annualTransformations)
  ];
  const score = signals.reduce((sum, signal) => sum + signal.weight, 0);

  return {
    palaceName,
    priority: calculatePriority(score),
    priorityLabel: formatPriorityLabel(score),
    score,
    signals,
    evidenceRefs: uniqueInOrder(signals.flatMap((signal) => signal.evidenceRefs)),
    referenceRefs: uniqueInOrder([
      REFERENCE_IDS.TIMING_TRIGGER_CANDIDATE,
      ...signals.flatMap((signal) => signal.referenceRefs)
    ]),
    interpretationRefs: [INTERPRETATION_IDS.TIMING_TRIGGER_CANDIDATE_ONLY],
    riskLevel: "medium",
    blockedClaims: [
      "不推具体年份事件",
      "不推应期",
      "不推婚恋结果",
      "不推财富金额或投资结果",
      "不推职业结果或升迁时间"
    ]
  };
}

function buildCurrentMajorPeriodSignals(palaceName, context) {
  if (context.currentMajorPeriod.period.palaceName !== palaceName) {
    return [];
  }

  return [{
    type: "current-major-period-palace",
    text: `当前大限落${palaceName}`,
    weight: 2,
    evidenceRefs: ["current-stage.current-major-period", "current-stage.major-period-anchor"],
    referenceRefs: [REFERENCE_IDS.CURRENT_MAJOR_PERIOD, REFERENCE_IDS.MAJOR_PERIODS]
  }];
}

function buildAnnualPeriodSignals(palaceName, context) {
  if (!context.annualPeriod || context.annualPeriod.palaceName !== palaceName) {
    return [];
  }

  return [{
    type: "annual-period-palace",
    text: `流年太岁地支定位到${palaceName}`,
    weight: 1,
    evidenceRefs: ["current-stage.annual-period"],
    referenceRefs: [REFERENCE_IDS.ANNUAL_PERIOD]
  }];
}

function buildMonthlyPeriodSignals(palaceName, context) {
  if (!context.monthlyPeriod || context.monthlyPeriod.palaceName !== palaceName) {
    return [];
  }

  return [{
    type: "monthly-period-palace",
    text: `流月月建定位到${palaceName}`,
    weight: 0.5,
    evidenceRefs: ["current-stage.monthly-period"],
    referenceRefs: [REFERENCE_IDS.MONTHLY_PERIOD]
  }];
}

function buildTransformationSignals(scope, palaceName, transformations) {
  if (!transformations) {
    return [];
  }

  return transformations.flatMap((transformation) => {
    if (transformation.targetPalaceName !== palaceName) {
      return [];
    }

    return [{
      type: `${scope}-transformation`,
      text: `${formatScopeLabel(scope)}${transformation.star}${transformation.name}落${palaceName}`,
      weight: TRANSFORMATION_WEIGHTS[transformation.name] ?? 1,
      evidenceRefs: [getTransformationEvidenceRef(scope)],
      referenceRefs: [getTransformationReferenceRef(scope)]
    }];
  });
}

function collectBirthYearTransformationEntries(chart) {
  return chart.palaces.flatMap((palace) => {
    return palace.transformations
      .filter((transformation) => transformation.source === "birth-year-stem")
      .map((transformation) => ({
        ...transformation,
        targetPalaceName: palace.name
      }));
  });
}

function calculatePriority(score) {
  if (score >= HIGH_PRIORITY_SCORE) {
    return "high";
  }

  if (score >= MEDIUM_PRIORITY_SCORE) {
    return "medium";
  }

  return "low";
}

function formatPriorityLabel(score) {
  const priority = calculatePriority(score);

  if (priority === "high") {
    return "高优先级";
  }

  if (priority === "medium") {
    return "中优先级";
  }

  return "低优先级";
}

function compareCandidates(left, right) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return left.palaceName.localeCompare(right.palaceName, "zh-Hans-CN");
}

function formatScopeLabel(scope) {
  if (scope === "major-period") {
    return "大限";
  }

  if (scope === "annual") {
    return "流年";
  }

  return "生年";
}

function getTransformationEvidenceRef(scope) {
  if (scope === "major-period") {
    return "current-stage.major-period-transformations";
  }

  if (scope === "annual") {
    return "current-stage.annual-transformations";
  }

  return "current-stage.birth-year-transformations";
}

function getTransformationReferenceRef(scope) {
  if (scope === "major-period") {
    return REFERENCE_IDS.MAJOR_PERIOD_FOUR_TRANSFORMATIONS;
  }

  if (scope === "annual") {
    return REFERENCE_IDS.ANNUAL_FOUR_TRANSFORMATIONS;
  }

  return REFERENCE_IDS.BIRTH_YEAR_FOUR_TRANSFORMATIONS;
}

function normalizePalaceName(palaceName) {
  return palaceName.replace(/宫$/u, "");
}

function uniqueInOrder(values) {
  return [...new Set(values.filter(Boolean))];
}
