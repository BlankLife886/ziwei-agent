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
  STAR_TIAN_XIANG_WEALTH: "interpretation.star.tian-xiang.wealth",
  STAR_TIAN_KUI_WEALTH: "interpretation.star.tian-kui.wealth",
  STAR_HUO_XING_WEALTH: "interpretation.star.huo-xing.wealth",
  STAR_TIAN_FU_CAREER: "interpretation.star.tian-fu.career",
  STAR_QING_YANG_CAREER: "interpretation.star.qing-yang.career",
  STAR_LIAN_ZHEN_TRAVEL: "interpretation.star.lian-zhen.travel",
  STAR_TAN_LANG_TRAVEL: "interpretation.star.tan-lang.travel",
  STAR_TIAN_GUAN_TRAVEL: "interpretation.star.tian-guan.travel",
  BODY_PALACE_SAME_AS_LIFE: "interpretation.body-palace.same-as-life",
  BODY_PALACE_DIFFERENT_FROM_LIFE: "interpretation.body-palace.different-from-life",
  STAR_BALANCE_STATIC_ONLY: "interpretation.star-balance.static-only"
};

const STAR_ROLE_INTERPRETATION_RULES = [
  {
    palaceName: "财帛宫",
    starName: "天相",
    interpretationId: INTERPRETATION_IDS.STAR_TIAN_XIANG_WEALTH
  },
  {
    palaceName: "财帛宫",
    starName: "天魁",
    interpretationId: INTERPRETATION_IDS.STAR_TIAN_KUI_WEALTH
  },
  {
    palaceName: "财帛宫",
    starName: "火星",
    interpretationId: INTERPRETATION_IDS.STAR_HUO_XING_WEALTH
  },
  {
    palaceName: "官禄宫",
    starName: "天府",
    interpretationId: INTERPRETATION_IDS.STAR_TIAN_FU_CAREER
  },
  {
    palaceName: "官禄宫",
    starName: "擎羊",
    interpretationId: INTERPRETATION_IDS.STAR_QING_YANG_CAREER
  },
  {
    palaceName: "迁移宫",
    starName: "廉贞",
    interpretationId: INTERPRETATION_IDS.STAR_LIAN_ZHEN_TRAVEL
  },
  {
    palaceName: "迁移宫",
    starName: "贪狼",
    interpretationId: INTERPRETATION_IDS.STAR_TAN_LANG_TRAVEL
  },
  {
    palaceName: "迁移宫",
    starName: "天官",
    interpretationId: INTERPRETATION_IDS.STAR_TIAN_GUAN_TRAVEL
  }
];

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
    id: INTERPRETATION_IDS.STAR_TIAN_XIANG_WEALTH,
    title: "天相在财帛宫的保守解释",
    topic: "star-role",
    palaceName: "财帛宫",
    starName: "天相",
    synthesis: "资源秩序与协调",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.LIFE_TRIAD, REFERENCE_IDS.STAR_PLACEMENT],
    text: "财帛宫见天相时，可把资源经营理解为偏重秩序、协调与制度感；但仍需结合同宫煞曜、四化和限运，不能直接断定财富结果。"
  },
  {
    id: INTERPRETATION_IDS.STAR_TIAN_KUI_WEALTH,
    title: "天魁在财帛宫的保守解释",
    topic: "star-role",
    palaceName: "财帛宫",
    starName: "天魁",
    synthesis: "资源助力或提携",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.LIFE_TRIAD, REFERENCE_IDS.STAR_PLACEMENT],
    text: "财帛宫见天魁时，可先作为资源获取中存在助力、提携或规则性支持的线索；当前不应扩大为必然得财。"
  },
  {
    id: INTERPRETATION_IDS.STAR_HUO_XING_WEALTH,
    title: "火星在财帛宫的保守解释",
    topic: "star-role",
    palaceName: "财帛宫",
    starName: "火星",
    synthesis: "资源波动与压力",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.LIFE_TRIAD, REFERENCE_IDS.STAR_PLACEMENT],
    text: "财帛宫见火星时，可提示资源使用上可能有急促、波动或压力；需要观察是否有稳定星曜调和，目前只能作为风险提醒。"
  },
  {
    id: INTERPRETATION_IDS.STAR_TIAN_FU_CAREER,
    title: "天府在官禄宫的保守解释",
    topic: "star-role",
    palaceName: "官禄宫",
    starName: "天府",
    synthesis: "管理守成与资源整合",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.LIFE_TRIAD, REFERENCE_IDS.STAR_PLACEMENT],
    text: "官禄宫见天府时，可把事业承担理解为偏重管理、守成、资源整合与稳定职责；具体职位高低仍不能脱离四化和运限判断。"
  },
  {
    id: INTERPRETATION_IDS.STAR_QING_YANG_CAREER,
    title: "擎羊在官禄宫的保守解释",
    topic: "star-role",
    palaceName: "官禄宫",
    starName: "擎羊",
    synthesis: "事业竞争与执行压力",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.LIFE_TRIAD, REFERENCE_IDS.STAR_PLACEMENT],
    text: "官禄宫见擎羊时，可提示事业路径中有竞争、压力、锋芒或阻力；它是需要管理的张力，不宜单独写成失败或灾厄。"
  },
  {
    id: INTERPRETATION_IDS.STAR_LIAN_ZHEN_TRAVEL,
    title: "廉贞在迁移宫的保守解释",
    topic: "star-role",
    palaceName: "迁移宫",
    starName: "廉贞",
    synthesis: "外界规则边界与关系张力",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.LIFE_TRIAD, REFERENCE_IDS.STAR_PLACEMENT],
    text: "迁移宫见廉贞时，可关注命主面对外界时的规则边界、选择判断和关系张力；具体吉凶仍需更多组合证据。"
  },
  {
    id: INTERPRETATION_IDS.STAR_TAN_LANG_TRAVEL,
    title: "贪狼在迁移宫的保守解释",
    topic: "star-role",
    palaceName: "迁移宫",
    starName: "贪狼",
    synthesis: "社交机会与环境变化",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.LIFE_TRIAD, REFERENCE_IDS.STAR_PLACEMENT],
    text: "迁移宫见贪狼时，可关注外部环境中的社交、欲望、机会变化和应酬互动；当前只适合描述外界牵引，不宜断具体事件。"
  },
  {
    id: INTERPRETATION_IDS.STAR_TIAN_GUAN_TRAVEL,
    title: "天官在迁移宫的保守解释",
    topic: "star-role",
    palaceName: "迁移宫",
    starName: "天官",
    synthesis: "名誉或制度性支持",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.LIFE_TRIAD, REFERENCE_IDS.STAR_PLACEMENT],
    text: "迁移宫见天官时，可作为外部环境中存在名誉、制度性支持或贵人助力的线索；仍需与主星和煞曜同看。"
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

export function findStarRoleInterpretationRefs(palaceName, starGroups = {}) {
  const starNames = new Set(Object.values(starGroups).flat());
  const refs = STAR_ROLE_INTERPRETATION_RULES.flatMap((rule) => {
    if (rule.palaceName !== palaceName || !starNames.has(rule.starName)) {
      return [];
    }

    return [rule.interpretationId];
  });

  return [...new Set(refs)];
}
