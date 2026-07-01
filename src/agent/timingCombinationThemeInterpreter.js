import { INTERPRETATION_IDS } from "./interpretationCatalog.js";
import { REFERENCE_IDS } from "./referenceCatalog.js";

// 运限组合主题解释器。
//
// timingCombinationVerifier 只回答“哪些宫位有多层证据重叠”。
// 本模块再往前走一小步：把已经验证的宫位转换成报告可用的阶段主题。
// 它仍然属于 agent 解释层，不进入排盘计算层，也不生成事件、应期或结果。

const PALACE_THEME_RULES = {
  命宫: {
    themeId: "self-orientation",
    title: "主体状态与阶段发力",
    text: "可作为观察命主当前阶段自我定位、行动重心和主体选择方式的合参主题"
  },
  兄弟宫: {
    themeId: "peer-resource",
    title: "同辈互动与资源交换",
    text: "可作为观察同辈关系、平行协作和资源互通方式的合参主题"
  },
  夫妻宫: {
    themeId: "relationship-boundary",
    title: "关系互动与合作边界",
    text: "可作为观察亲密关系、合作边界和互动压力的合参主题"
  },
  子女宫: {
    themeId: "creation-extension",
    title: "延展事务与创作表达",
    text: "可作为观察创作表达、后续延展、照顾责任或阶段性投入对象的合参主题"
  },
  财帛宫: {
    themeId: "resource-management",
    title: "资源经营与取用方式",
    text: "可作为观察资源经营、收支取舍和现实承接压力的合参主题"
  },
  疾厄宫: {
    themeId: "body-rhythm",
    title: "身心节律与压力管理",
    text: "可作为观察身心节律、承压方式和日常管理议题的合参主题"
  },
  迁移宫: {
    themeId: "external-environment",
    title: "外部环境与行动场景",
    text: "可作为观察外部环境、移动变化、对外互动和场景切换的合参主题"
  },
  仆役宫: {
    themeId: "network-collaboration",
    title: "人际网络与协作关系",
    text: "可作为观察朋友、团队、人际网络和协作资源的合参主题"
  },
  官禄宫: {
    themeId: "career-responsibility",
    title: "职责承担与事业结构",
    text: "可作为观察职责承担、事业结构和现实任务压力的合参主题"
  },
  田宅宫: {
    themeId: "home-foundation",
    title: "居所基础与长期承接",
    text: "可作为观察居所、家庭基础、长期承接和稳定资源的合参主题"
  },
  福德宫: {
    themeId: "inner-adjustment",
    title: "内在取舍与精神承压",
    text: "可作为观察内在感受、精神恢复、取舍方式和承压节奏的合参主题"
  },
  父母宫: {
    themeId: "support-framework",
    title: "长辈支持与制度框架",
    text: "可作为观察长辈缘分、制度框架、文书规则和上层支持的合参主题"
  }
};

export function interpretTimingCombinationThemes(verifications = []) {
  return verifications.map((verification, index) => {
    const rule = PALACE_THEME_RULES[verification.palaceName] ?? buildFallbackRule(verification);

    return {
      id: `timing-combination-theme.${index + 1}.${normalizePalaceName(verification.palaceName)}`,
      palaceName: verification.palaceName,
      themeId: rule.themeId,
      title: rule.title,
      text: rule.text,
      signalGroups: verification.signalGroups,
      sourceVerificationId: verification.id,
      evidenceRefs: verification.evidenceRefs ?? [],
      referenceRefs: uniqueInOrder([
        REFERENCE_IDS.TIMING_COMBINATION_THEME,
        ...(verification.referenceRefs ?? [])
      ]),
      interpretationRefs: [INTERPRETATION_IDS.TIMING_COMBINATION_THEME_ONLY],
      riskLevel: "medium",
      blockedClaims: [
        ...(verification.blockedClaims ?? []),
        "不把阶段主题写成实际发生事件",
        "不把主题解释写成结果断语"
      ]
    };
  });
}

export function formatTimingCombinationTheme(theme) {
  const groupText = theme.signalGroups.join("、");

  return `${theme.palaceName}阶段主题：${theme.title}，${theme.text}；证据来自${groupText}，只作为报告合参方向，不推事件或结果`;
}

function buildFallbackRule(verification) {
  return {
    themeId: "palace-theme",
    title: `${verification.palaceName}阶段主题`,
    text: `可作为观察${verification.palaceName}相关人生领域的合参主题`
  };
}

function normalizePalaceName(palaceName) {
  return palaceName.replace(/宫$/u, "");
}

function uniqueInOrder(values) {
  return [...new Set(values.filter(Boolean))];
}
