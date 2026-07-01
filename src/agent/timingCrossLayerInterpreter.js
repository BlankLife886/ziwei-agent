import { INTERPRETATION_IDS } from "./interpretationCatalog.js";
import { REFERENCE_IDS } from "./referenceCatalog.js";

// 跨宫、跨限运解释器。
//
// 前置模块已经完成三件事：
// 1. timingTriggerCatalog 找到安全观察点。
// 2. timingCombinationVerifier 确认哪些观察点具备多层证据。
// 3. timingCombinationThemeInterpreter 把已验证宫位转换为阶段主题。
//
// 本模块只再补一层“关系结构”：主题宫位和当前大限、流年、流月之间
// 是同宫聚焦，还是分层合参。它不解释事件、不给应期、不下结果断语。

export function interpretTimingCrossLayerInteractions({
  themes = [],
  currentMajorPalaceName,
  annualPalaceName,
  monthlyPalaceName
} = {}) {
  const interactions = [];

  themes.forEach((theme) => {
    if (!theme?.palaceName) {
      return;
    }

    if (theme.palaceName === currentMajorPalaceName) {
      interactions.push(createInteraction({
        type: "major-theme-same-palace",
        title: "大限落宫与组合主题同宫",
        primaryPalaceName: theme.palaceName,
        secondaryPalaceName: currentMajorPalaceName,
        text: `${theme.palaceName}同时是当前大限落宫和已验证组合主题，可作为本阶段报告的主轴领域合参`,
        theme
      }));
    } else if (currentMajorPalaceName) {
      interactions.push(createInteraction({
        type: "major-theme-cross-palace",
        title: "大限落宫与组合主题分宫",
        primaryPalaceName: theme.palaceName,
        secondaryPalaceName: currentMajorPalaceName,
        text: `${theme.palaceName}作为已验证组合主题，需要与当前大限落入的${currentMajorPalaceName}分层合参`,
        theme
      }));
    }

    if (annualPalaceName && annualPalaceName === monthlyPalaceName) {
      interactions.push(createInteraction({
        type: "annual-monthly-same-palace",
        title: "流年与流月定位同宫",
        primaryPalaceName: annualPalaceName,
        secondaryPalaceName: theme.palaceName,
        text: `流年与流月同落${annualPalaceName}，可作为观察${theme.palaceName}阶段主题时的年度/月度环境层`,
        theme,
        extraEvidenceRefs: [
          "current-stage.annual-period",
          "current-stage.monthly-period"
        ]
      }));
    } else {
      interactions.push(...createSeparatedTimingLayerInteractions({
        theme,
        annualPalaceName,
        monthlyPalaceName
      }));
    }
  });

  return dedupeInteractions(interactions).map((interaction, index) => {
    return {
      ...interaction,
      id: `timing-cross-layer.${index + 1}.${normalizePalaceName(interaction.primaryPalaceName)}`
    };
  });
}

export function formatTimingCrossLayerInteraction(interaction) {
  return `${interaction.title}：${interaction.text}；只说明跨宫、跨限运合参关系，不推事件、应期或结果`;
}

function createSeparatedTimingLayerInteractions({ theme, annualPalaceName, monthlyPalaceName }) {
  const interactions = [];

  if (annualPalaceName) {
    interactions.push(createInteraction({
      type: "annual-theme-cross-palace",
      title: "流年定位与组合主题分层",
      primaryPalaceName: theme.palaceName,
      secondaryPalaceName: annualPalaceName,
      text: `${theme.palaceName}阶段主题需要与流年定位到的${annualPalaceName}分层合参`,
      theme,
      extraEvidenceRefs: ["current-stage.annual-period"]
    }));
  }

  if (monthlyPalaceName) {
    interactions.push(createInteraction({
      type: "monthly-theme-cross-palace",
      title: "流月定位与组合主题分层",
      primaryPalaceName: theme.palaceName,
      secondaryPalaceName: monthlyPalaceName,
      text: `${theme.palaceName}阶段主题需要与流月定位到的${monthlyPalaceName}分层合参`,
      theme,
      extraEvidenceRefs: ["current-stage.monthly-period"]
    }));
  }

  return interactions;
}

function createInteraction({
  type,
  title,
  primaryPalaceName,
  secondaryPalaceName,
  text,
  theme,
  extraEvidenceRefs = []
}) {
  return {
    type,
    title,
    primaryPalaceName,
    secondaryPalaceName,
    sourceThemeId: theme.id,
    themeId: theme.themeId,
    themeTitle: theme.title,
    text,
    evidenceRefs: uniqueInOrder([
      ...(theme.evidenceRefs ?? []),
      ...extraEvidenceRefs
    ]),
    referenceRefs: uniqueInOrder([
      REFERENCE_IDS.TIMING_CROSS_LAYER_ANALYSIS,
      ...(theme.referenceRefs ?? [])
    ]),
    interpretationRefs: [INTERPRETATION_IDS.TIMING_CROSS_LAYER_STRUCTURE_ONLY],
    riskLevel: "medium",
    blockedClaims: [
      ...(theme.blockedClaims ?? []),
      "不把跨宫关系写成实际事件",
      "不把跨限运关系写成应期或结果"
    ]
  };
}

function dedupeInteractions(interactions) {
  const seenKeys = new Set();

  return interactions.filter((interaction) => {
    const key = [
      interaction.type,
      interaction.primaryPalaceName,
      interaction.secondaryPalaceName,
      interaction.sourceThemeId
    ].join("|");

    if (seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });
}

function normalizePalaceName(palaceName) {
  return palaceName.replace(/宫$/u, "");
}

function uniqueInOrder(values) {
  return [...new Set(values.filter(Boolean))];
}
