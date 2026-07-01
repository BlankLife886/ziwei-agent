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
  PALACE_ROLE_SPOUSE: "interpretation.palace-role.spouse",
  PALACE_ROLE_WEALTH: "interpretation.palace-role.wealth",
  PALACE_ROLE_CAREER: "interpretation.palace-role.career",
  PALACE_ROLE_TRAVEL: "interpretation.palace-role.travel",
  PALACE_ROLE_WELLBEING: "interpretation.palace-role.wellbeing",
  CAREER_TRIAD_STRUCTURE: "interpretation.career-triad.structure",
  CAREER_PALACE_STATIC_ONLY: "interpretation.career-palace.static-only",
  WEALTH_TRIAD_STRUCTURE: "interpretation.wealth-triad.structure",
  WEALTH_PALACE_STATIC_ONLY: "interpretation.wealth-palace.static-only",
  SPOUSE_TRIAD_STRUCTURE: "interpretation.spouse-triad.structure",
  SPOUSE_PALACE_STATIC_ONLY: "interpretation.spouse-palace.static-only",
  STAR_WU_QU_SPOUSE: "interpretation.star.wu-qu.spouse",
  STAR_QI_SHA_SPOUSE: "interpretation.star.qi-sha.spouse",
  STAR_LING_XING_SPOUSE: "interpretation.star.ling-xing.spouse",
  STAR_ZI_WEI_WELLBEING: "interpretation.star.zi-wei.wellbeing",
  STAR_PO_JUN_WELLBEING: "interpretation.star.po-jun.wellbeing",
  STAR_ZUO_FU_WELLBEING: "interpretation.star.zuo-fu.wellbeing",
  STAR_YOU_BI_WELLBEING: "interpretation.star.you-bi.wellbeing",
  STAR_TIAN_YUE_WELLBEING: "interpretation.star.tian-yue.wellbeing",
  STAR_TUO_LUO_WELLBEING: "interpretation.star.tuo-luo.wellbeing",
  STAR_TIAN_XIANG_WEALTH: "interpretation.star.tian-xiang.wealth",
  STAR_TIAN_KUI_WEALTH: "interpretation.star.tian-kui.wealth",
  STAR_HUO_XING_WEALTH: "interpretation.star.huo-xing.wealth",
  STAR_TIAN_FU_CAREER: "interpretation.star.tian-fu.career",
  STAR_QING_YANG_CAREER: "interpretation.star.qing-yang.career",
  STAR_LIAN_ZHEN_TRAVEL: "interpretation.star.lian-zhen.travel",
  STAR_TAN_LANG_TRAVEL: "interpretation.star.tan-lang.travel",
  STAR_TIAN_GUAN_TRAVEL: "interpretation.star.tian-guan.travel",
  BIRTH_YEAR_FOUR_TRANSFORMATIONS_STATIC_ONLY: "interpretation.four-transformations.birth-year-static-only",
  MAJOR_PERIOD_FOUR_TRANSFORMATIONS_STAGE_ONLY: "interpretation.four-transformations.major-period-stage-only",
  MAJOR_PERIODS_STRUCTURE_ONLY: "interpretation.major-periods.structure-only",
  CURRENT_MAJOR_PERIOD_LOCATOR_ONLY: "interpretation.current-major-period.locator-only",
  CURRENT_STAGE_STATIC_ONLY: "interpretation.current-stage.static-only",
  BODY_PALACE_SAME_AS_LIFE: "interpretation.body-palace.same-as-life",
  BODY_PALACE_DIFFERENT_FROM_LIFE: "interpretation.body-palace.different-from-life",
  STAR_BALANCE_STATIC_ONLY: "interpretation.star-balance.static-only"
};

const STAR_ROLE_INTERPRETATION_RULES = [
  {
    palaceName: "夫妻宫",
    starName: "武曲",
    interpretationId: INTERPRETATION_IDS.STAR_WU_QU_SPOUSE
  },
  {
    palaceName: "夫妻宫",
    starName: "七杀",
    interpretationId: INTERPRETATION_IDS.STAR_QI_SHA_SPOUSE
  },
  {
    palaceName: "夫妻宫",
    starName: "铃星",
    interpretationId: INTERPRETATION_IDS.STAR_LING_XING_SPOUSE
  },
  {
    palaceName: "福德宫",
    starName: "紫微",
    interpretationId: INTERPRETATION_IDS.STAR_ZI_WEI_WELLBEING
  },
  {
    palaceName: "福德宫",
    starName: "破军",
    interpretationId: INTERPRETATION_IDS.STAR_PO_JUN_WELLBEING
  },
  {
    palaceName: "福德宫",
    starName: "左辅",
    interpretationId: INTERPRETATION_IDS.STAR_ZUO_FU_WELLBEING
  },
  {
    palaceName: "福德宫",
    starName: "右弼",
    interpretationId: INTERPRETATION_IDS.STAR_YOU_BI_WELLBEING
  },
  {
    palaceName: "福德宫",
    starName: "天钺",
    interpretationId: INTERPRETATION_IDS.STAR_TIAN_YUE_WELLBEING
  },
  {
    palaceName: "福德宫",
    starName: "陀罗",
    interpretationId: INTERPRETATION_IDS.STAR_TUO_LUO_WELLBEING
  },
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
    palaceName: "命宫",
    riskLevel: "low",
    sourceRefs: [REFERENCE_IDS.PALACE_ROLE],
    text: "命宫优先用于观察命主的基础气质、主观倾向和命盘分析的中心点。"
  },
  {
    id: INTERPRETATION_IDS.PALACE_ROLE_SPOUSE,
    title: "夫妻宫的分析角色",
    topic: "palace-role",
    palaceName: "夫妻宫",
    riskLevel: "low",
    sourceRefs: [REFERENCE_IDS.PALACE_ROLE],
    text: "夫妻宫用于观察关系模式、伴侣互动和合作牵动；在婚恋专题中可作为关系线索，在事业专题中也只能作为关系与合作参照，不能单独判定结果。"
  },
  {
    id: INTERPRETATION_IDS.CAREER_TRIAD_STRUCTURE,
    title: "官禄宫三方四正结构观察",
    topic: "career-triad",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.CAREER_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "事业发展报告不应只看官禄宫单点；官禄宫先看职责承担与职业路径，再合看命宫的主体基础、财帛宫的资源承接、夫妻宫的合作与关系牵动。"
  },
  {
    id: INTERPRETATION_IDS.CAREER_PALACE_STATIC_ONLY,
    title: "官禄宫静态解释边界",
    topic: "career-palace",
    palaceName: "官禄宫",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.CAREER_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "当前事业专题只使用本命盘静态宫位和星曜，适合描述职业结构、职责压力、资源配合与合作参照；尚未接入大限四化、流年和职业知识库，因此不能推职位高低、升迁时间或具体职业结果。"
  },
  {
    id: INTERPRETATION_IDS.WEALTH_TRIAD_STRUCTURE,
    title: "财帛宫三方四正结构观察",
    topic: "wealth-triad",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.WEALTH_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "财富资源报告不应只看财帛宫单点；财帛宫先看资源经营与取用方式，再合看命宫的主体基础、官禄宫的事业承接、福德宫的内在满足与承压方式。"
  },
  {
    id: INTERPRETATION_IDS.WEALTH_PALACE_STATIC_ONLY,
    title: "财帛宫静态解释边界",
    topic: "wealth-palace",
    palaceName: "财帛宫",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.WEALTH_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "当前财富专题只使用本命盘静态宫位和星曜，适合描述资源经营方式、助力、压力与内在取舍；尚未接入大限四化、流年和风险分级规则，因此不能推具体金额、投资结果或特定年份。"
  },
  {
    id: INTERPRETATION_IDS.SPOUSE_TRIAD_STRUCTURE,
    title: "夫妻宫三方四正结构观察",
    topic: "spouse-triad",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.SPOUSE_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "婚姻感情报告不应只看夫妻宫单点；夫妻宫先看关系互动本宫，再合看迁移宫的外部互动、官禄宫的现实承担、福德宫的内在感受与情绪底色。"
  },
  {
    id: INTERPRETATION_IDS.SPOUSE_PALACE_STATIC_ONLY,
    title: "夫妻宫静态解释边界",
    topic: "spouse-palace",
    palaceName: "夫妻宫",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.SPOUSE_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "当前婚姻专题只使用本命盘静态宫位和星曜，适合描述关系互动倾向与结构参照；尚未接入大限四化、流年和触发规则，因此不能推结婚时间、分合事件或伴侣具体身份。"
  },
  {
    id: INTERPRETATION_IDS.STAR_WU_QU_SPOUSE,
    title: "武曲在夫妻宫的保守解释",
    topic: "star-role",
    palaceName: "夫妻宫",
    starName: "武曲",
    synthesis: "关系中的现实责任和边界感",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.SPOUSE_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "夫妻宫见武曲时，可先关注关系中的现实责任、边界感、资源安排和原则性；不宜直接断定感情冷淡或婚姻结果。"
  },
  {
    id: INTERPRETATION_IDS.STAR_QI_SHA_SPOUSE,
    title: "七杀在夫妻宫的保守解释",
    topic: "star-role",
    palaceName: "夫妻宫",
    starName: "七杀",
    synthesis: "关系节奏中的决断和变化压力",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.SPOUSE_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "夫妻宫见七杀时，可提示关系互动里有决断、变化、强度或压力，需要结合辅煞、四化和限运判断，不应单独写成分离结论。"
  },
  {
    id: INTERPRETATION_IDS.STAR_LING_XING_SPOUSE,
    title: "铃星在夫妻宫的保守解释",
    topic: "star-role",
    palaceName: "夫妻宫",
    starName: "铃星",
    synthesis: "互动中的敏感张力和情绪触发",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.SPOUSE_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "夫妻宫见铃星时，可作为互动中存在敏感张力、急促反应或情绪触发点的提醒；它只能提示需要管理的关系压力，不能单独定吉凶。"
  },
  {
    id: INTERPRETATION_IDS.PALACE_ROLE_WELLBEING,
    title: "福德宫的分析角色",
    topic: "palace-role",
    palaceName: "福德宫",
    riskLevel: "low",
    sourceRefs: [REFERENCE_IDS.PALACE_ROLE],
    text: "福德宫用于观察内在感受、精神满足、情绪恢复力和承压方式；放入不同专题时，只能作为心理与取舍层面的参照。"
  },
  {
    id: INTERPRETATION_IDS.STAR_ZI_WEI_WELLBEING,
    title: "紫微在福德宫的保守解释",
    topic: "star-role",
    palaceName: "福德宫",
    starName: "紫微",
    synthesis: "内在秩序和自我调节需求",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.SPOUSE_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "福德宫见紫微时，可把关系中的心理底色理解为重视内在秩序、自尊和自我调节；不宜直接推成情感优劣。"
  },
  {
    id: INTERPRETATION_IDS.STAR_PO_JUN_WELLBEING,
    title: "破军在福德宫的保守解释",
    topic: "star-role",
    palaceName: "福德宫",
    starName: "破军",
    synthesis: "内在变化感和重整需求",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.SPOUSE_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "福德宫见破军时，可提示内在感受中有变化、重整或不易长期停在单一状态的倾向；需要合看辅星和限运，不能直接断关系破裂。"
  },
  {
    id: INTERPRETATION_IDS.STAR_ZUO_FU_WELLBEING,
    title: "左辅在福德宫的保守解释",
    topic: "star-role",
    palaceName: "福德宫",
    starName: "左辅",
    synthesis: "情绪支持和自我修复资源",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.SPOUSE_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "福德宫见左辅时，可作为内在恢复力、旁人支持或自我调适资源的线索；仍需与主星和煞曜同看。"
  },
  {
    id: INTERPRETATION_IDS.STAR_YOU_BI_WELLBEING,
    title: "右弼在福德宫的保守解释",
    topic: "star-role",
    palaceName: "福德宫",
    starName: "右弼",
    synthesis: "关系缓冲和辅助支持",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.SPOUSE_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "福德宫见右弼时，可作为关系压力中存在缓冲、辅助或调和资源的线索；不能单独扩大为必然稳定。"
  },
  {
    id: INTERPRETATION_IDS.STAR_TIAN_YUE_WELLBEING,
    title: "天钺在福德宫的保守解释",
    topic: "star-role",
    palaceName: "福德宫",
    starName: "天钺",
    synthesis: "精神层面的助力和认可需求",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.SPOUSE_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "福德宫见天钺时，可提示精神层面有助力、认可需求或较重视关系中的尊重感；仍不能直接断定感情结果。"
  },
  {
    id: INTERPRETATION_IDS.STAR_TUO_LUO_WELLBEING,
    title: "陀罗在福德宫的保守解释",
    topic: "star-role",
    palaceName: "福德宫",
    starName: "陀罗",
    synthesis: "内在迟滞和反复消化压力",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.SPOUSE_PALACE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "福德宫见陀罗时，可提示内在感受里有迟滞、牵挂或反复消化压力的可能；它是心理层面的压力线索，不应单独写成婚姻灾断。"
  },
  {
    id: INTERPRETATION_IDS.PALACE_ROLE_WEALTH,
    title: "财帛宫的分析角色",
    topic: "palace-role",
    palaceName: "财帛宫",
    riskLevel: "low",
    sourceRefs: [REFERENCE_IDS.PALACE_ROLE],
    text: "财帛宫用于观察资源经营、财务态度和现实层面的取用方式。"
  },
  {
    id: INTERPRETATION_IDS.PALACE_ROLE_CAREER,
    title: "官禄宫的分析角色",
    topic: "palace-role",
    palaceName: "官禄宫",
    riskLevel: "low",
    sourceRefs: [REFERENCE_IDS.PALACE_ROLE],
    text: "官禄宫用于观察事业路径、职责承担和社会角色的展开方式。"
  },
  {
    id: INTERPRETATION_IDS.PALACE_ROLE_TRAVEL,
    title: "迁移宫的分析角色",
    topic: "palace-role",
    palaceName: "迁移宫",
    riskLevel: "low",
    sourceRefs: [REFERENCE_IDS.PALACE_ROLE],
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
    sourceRefs: [REFERENCE_IDS.PALACE_ROLE, REFERENCE_IDS.STAR_PLACEMENT],
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
    sourceRefs: [REFERENCE_IDS.PALACE_ROLE, REFERENCE_IDS.STAR_PLACEMENT],
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
    sourceRefs: [REFERENCE_IDS.PALACE_ROLE, REFERENCE_IDS.STAR_PLACEMENT],
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
    sourceRefs: [REFERENCE_IDS.PALACE_ROLE, REFERENCE_IDS.STAR_PLACEMENT],
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
    sourceRefs: [REFERENCE_IDS.PALACE_ROLE, REFERENCE_IDS.STAR_PLACEMENT],
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
    sourceRefs: [REFERENCE_IDS.PALACE_ROLE, REFERENCE_IDS.STAR_PLACEMENT],
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
    sourceRefs: [REFERENCE_IDS.PALACE_ROLE, REFERENCE_IDS.STAR_PLACEMENT],
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
    sourceRefs: [REFERENCE_IDS.PALACE_ROLE, REFERENCE_IDS.STAR_PLACEMENT],
    text: "迁移宫见天官时，可作为外部环境中存在名誉、制度性支持或贵人助力的线索；仍需与主星和煞曜同看。"
  },
  {
    id: INTERPRETATION_IDS.BIRTH_YEAR_FOUR_TRANSFORMATIONS_STATIC_ONLY,
    title: "生年四化的静态解释边界",
    topic: "four-transformations",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.BIRTH_YEAR_FOUR_TRANSFORMATIONS],
    text: "生年四化可用于标记本命盘中禄、权、科、忌的本命牵引位置；它适合先写本命结构，不宜单独推具体年份事件。"
  },
  {
    id: INTERPRETATION_IDS.MAJOR_PERIOD_FOUR_TRANSFORMATIONS_STAGE_ONLY,
    title: "大限四化的阶段解释边界",
    topic: "four-transformations",
    riskLevel: "medium",
    sourceRefs: [
      REFERENCE_IDS.MAJOR_PERIOD_FOUR_TRANSFORMATIONS,
      REFERENCE_IDS.MAJOR_PERIODS
    ],
    text: "大限四化可作为当前十年阶段的禄、权、科、忌牵引骨架；当前只用于补强阶段观察方向，尚不能替代流年盘、触发规则或组合验证来推具体年份事件。"
  },
  {
    id: INTERPRETATION_IDS.MAJOR_PERIODS_STRUCTURE_ONLY,
    title: "大限骨架的解释边界",
    topic: "major-periods",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.MAJOR_PERIODS],
    text: "当前大限已排出各宫对应的十年年龄段和顺逆方向，适合定位人生阶段落在哪一宫；具体年份与事件仍需等待流年盘和触发规则。"
  },
  {
    id: INTERPRETATION_IDS.CURRENT_MAJOR_PERIOD_LOCATOR_ONLY,
    title: "当前大限定位的解释边界",
    topic: "current-major-period",
    riskLevel: "medium",
    sourceRefs: [REFERENCE_IDS.CURRENT_MAJOR_PERIOD, REFERENCE_IDS.MAJOR_PERIODS],
    text: "当前大限定位只说明分析日期按虚岁落入哪一个十年大限；即使接入大限四化，它也仍是阶段骨架，不能直接代表具体年份事件。"
  },
  {
    id: INTERPRETATION_IDS.CURRENT_STAGE_STATIC_ONLY,
    title: "当前阶段底稿的解释边界",
    topic: "current-stage",
    riskLevel: "medium",
    sourceRefs: [
      REFERENCE_IDS.CURRENT_STAGE,
      REFERENCE_IDS.CURRENT_MAJOR_PERIOD,
      REFERENCE_IDS.MAJOR_PERIODS,
      REFERENCE_IDS.MAJOR_PERIOD_FOUR_TRANSFORMATIONS,
      REFERENCE_IDS.BIRTH_YEAR_FOUR_TRANSFORMATIONS,
      REFERENCE_IDS.STAR_PLACEMENT
    ],
    text: "当前阶段底稿可以把分析日期、当前大限落宫、该宫星曜、生年四化和大限四化骨架放在同一节中观察阶段主题；但尚未接入流年盘和事件触发规则，因此只能写阶段观察方向，不能推今年具体事件、应期或吉凶。"
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
    text: "当前已能统计主星、辅星、煞曜与空曜的分布，并已接入生年四化、大限年龄段和大限四化骨架；但尚未纳入流年，所以这一节适合描述结构倾向，不适合直接推到具体年份或事件。"
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
