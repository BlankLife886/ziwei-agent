import { REFERENCE_IDS } from "./referenceCatalog.js";

// 命理解释条目目录。
//
// referenceCatalog 解决“这条规则/框架来自哪里”；这里解决
// “在当前 agent 能力边界内，可以怎样解释这些证据”。
// 报告正文应该优先引用这里的条目，而不是在 composer 里散写断语。

export const INTERPRETATION_IDS = {
  LIFE_TRIAD_STRUCTURE: "interpretation.life-triad.structure",
  LIFE_TRIAD_EMPTY_LIFE_PALACE: "interpretation.life-triad.empty-life-palace",
  BODY_PALACE_SAME_AS_LIFE: "interpretation.body-palace.same-as-life",
  BODY_PALACE_DIFFERENT_FROM_LIFE: "interpretation.body-palace.different-from-life",
  STAR_BALANCE_STATIC_ONLY: "interpretation.star-balance.static-only"
};

const INTERPRETATIONS = [
  {
    id: INTERPRETATION_IDS.LIFE_TRIAD_STRUCTURE,
    title: "命宫三方四正结构观察",
    topic: "life-triad",
    riskLevel: "low",
    sourceRefs: [REFERENCE_IDS.LIFE_TRIAD, REFERENCE_IDS.STAR_PLACEMENT],
    text: "命宫用于建立基础气质，财帛宫、官禄宫、迁移宫用于补充资源、事业和外部环境的结构关系。"
  },
  {
    id: INTERPRETATION_IDS.LIFE_TRIAD_EMPTY_LIFE_PALACE,
    title: "命宫无已安星曜时的写作边界",
    topic: "life-triad",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.LIFE_TRIAD, REFERENCE_IDS.STAR_PLACEMENT],
    text: "命宫本身目前没有已安入的星曜，因此不宜只凭命宫下结论；应把财帛宫、官禄宫、迁移宫作为主要参照，先看三方四正如何补足命宫信息。"
  },
  {
    id: INTERPRETATION_IDS.BODY_PALACE_SAME_AS_LIFE,
    title: "身命同宫的观察方式",
    topic: "body-palace",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.BODY_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "身宫与命宫同宫时，可以把先天气质和后天发力点放在一起观察；但仍需结合三方四正，不能只靠单宫完成判断。"
  },
  {
    id: INTERPRETATION_IDS.BODY_PALACE_DIFFERENT_FROM_LIFE,
    title: "身命分宫的观察方式",
    topic: "body-palace",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.BODY_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "身宫与命宫分宫时，可把身宫视为后天行动重心，再回头检查它是否强化或修正命宫信息。"
  },
  {
    id: INTERPRETATION_IDS.STAR_BALANCE_STATIC_ONLY,
    title: "星曜类别统计的静态边界",
    topic: "star-balance",
    riskLevel: "low",
    sourceRefs: [REFERENCE_IDS.STAR_BALANCE],
    text: "当前已能统计主星、辅星、煞曜与空曜的分布，但尚未纳入四化和限运，所以这一节适合描述结构倾向，不适合直接推到具体年份或事件。"
  }
];

export function findInterpretations(interpretationRefs) {
  const refSet = new Set(interpretationRefs);

  return INTERPRETATIONS.filter((interpretation) => refSet.has(interpretation.id));
}
