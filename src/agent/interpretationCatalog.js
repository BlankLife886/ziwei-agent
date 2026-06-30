import { REFERENCE_IDS } from "./referenceCatalog.js";

// 命理解释条目目录。
//
// referenceCatalog 解决“这条规则/框架来自哪里”；这里解决
// “在当前 agent 能力边界内，可以怎样解释这些证据”。
// 报告正文应该优先引用这里的条目，而不是在 composer 里散写断语。

export const INTERPRETATION_IDS = {
  LIFE_TRIAD_STRUCTURE: "interpretation.life-triad.structure",
  LIFE_TRIAD_EMPTY_LIFE_PALACE: "interpretation.life-triad.empty-life-palace",
  PALACE_ROLE_LIFE: "interpretation.palace-role.life",
  PALACE_ROLE_WEALTH: "interpretation.palace-role.wealth",
  PALACE_ROLE_CAREER: "interpretation.palace-role.career",
  PALACE_ROLE_TRAVEL: "interpretation.palace-role.travel",
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
    id: INTERPRETATION_IDS.PALACE_ROLE_LIFE,
    title: "命宫的分析角色",
    topic: "palace-role",
    riskLevel: "low",
    sourceRefs: [REFERENCE_IDS.LIFE_TRIAD],
    text: "命宫优先用于观察命主的基础气质、主观倾向和命盘分析的中心点。"
  },
  {
    id: INTERPRETATION_IDS.PALACE_ROLE_WEALTH,
    title: "财帛宫的分析角色",
    topic: "palace-role",
    riskLevel: "low",
    sourceRefs: [REFERENCE_IDS.LIFE_TRIAD],
    text: "财帛宫用于观察资源经营、财务态度和现实层面的取用方式。"
  },
  {
    id: INTERPRETATION_IDS.PALACE_ROLE_CAREER,
    title: "官禄宫的分析角色",
    topic: "palace-role",
    riskLevel: "low",
    sourceRefs: [REFERENCE_IDS.LIFE_TRIAD],
    text: "官禄宫用于观察事业路径、职责承担和社会角色的展开方式。"
  },
  {
    id: INTERPRETATION_IDS.PALACE_ROLE_TRAVEL,
    title: "迁移宫的分析角色",
    topic: "palace-role",
    riskLevel: "low",
    sourceRefs: [REFERENCE_IDS.LIFE_TRIAD],
    text: "迁移宫用于观察外部环境、出行变动和命主面对外界时的表现。"
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
