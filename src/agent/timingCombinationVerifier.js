import { INTERPRETATION_IDS } from "./interpretationCatalog.js";
import { REFERENCE_IDS } from "./referenceCatalog.js";

// 运限组合验证器。
//
// timingTriggerCatalog 负责列出候选观察点；本模块进一步检查候选是否同时
// 具备多层证据。它仍然只输出“可进入报告合参的观察主题”，不把观察点
// 写成事件、应期、吉凶、婚恋结果、财富金额或职业结果。

const MINIMUM_SIGNAL_GROUPS = 2;
const MINIMUM_SCORE = 3;

export function verifyTimingCombinations(candidates) {
  return (candidates ?? [])
    .map(buildVerification)
    .filter((verification) => verification.status === "verified")
    .sort(compareVerifications)
    .map((verification, index) => ({
      ...verification,
      id: `timing-combination.${index + 1}.${normalizePalaceName(verification.palaceName)}`
    }));
}

export function formatTimingCombinationVerification(verification) {
  const groupText = verification.signalGroups.join("、");
  const signalText = verification.supportingSignals.map((signal) => signal.text).join("、");

  return `${verification.palaceName}通过${groupText}形成组合观察：${signalText}；只代表多层证据需要合参，不推事件、应期或结果`;
}

function buildVerification(candidate) {
  const signalGroups = collectSignalGroups(candidate.signals);
  const isVerified =
    signalGroups.length >= MINIMUM_SIGNAL_GROUPS &&
    candidate.score >= MINIMUM_SCORE;

  return {
    palaceName: candidate.palaceName,
    status: isVerified ? "verified" : "insufficient",
    priority: candidate.priority,
    priorityLabel: candidate.priorityLabel,
    score: candidate.score,
    signalGroups,
    supportingSignals: candidate.signals,
    sourceCandidateId: candidate.id,
    evidenceRefs: uniqueInOrder(candidate.evidenceRefs),
    referenceRefs: uniqueInOrder([
      REFERENCE_IDS.TIMING_COMBINATION_VERIFICATION,
      ...candidate.referenceRefs
    ]),
    interpretationRefs: [INTERPRETATION_IDS.TIMING_COMBINATION_VERIFIED_ONLY],
    riskLevel: "medium",
    blockedClaims: [
      "不推具体年份事件",
      "不推月份事件",
      "不推应期",
      "不推婚恋结果",
      "不推财富金额或投资结果",
      "不推职业结果或升迁时间"
    ]
  };
}

function collectSignalGroups(signals) {
  return uniqueInOrder((signals ?? []).map((signal) => {
    if (signal.type === "current-major-period-palace") {
      return "大限定位";
    }

    if (signal.type === "annual-period-palace") {
      return "流年太岁";
    }

    if (signal.type === "monthly-period-palace") {
      return "流月月建";
    }

    if (signal.type === "birth-year-transformation") {
      return "生年四化";
    }

    if (signal.type === "major-period-transformation") {
      return "大限四化";
    }

    if (signal.type === "annual-transformation") {
      return "流年四化";
    }

    return null;
  }));
}

function compareVerifications(left, right) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if (right.signalGroups.length !== left.signalGroups.length) {
    return right.signalGroups.length - left.signalGroups.length;
  }

  return left.palaceName.localeCompare(right.palaceName, "zh-Hans-CN");
}

function normalizePalaceName(palaceName) {
  return palaceName.replace(/宫$/u, "");
}

function uniqueInOrder(values) {
  return [...new Set(values.filter(Boolean))];
}
