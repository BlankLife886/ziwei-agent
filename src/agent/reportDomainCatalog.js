// 最终报告领域目录。
//
// queryIntentParser 负责识别“用户想问什么”，这里负责定义这些问题最终
// 应落到哪一类用户报告。它不计算命盘，也不写断语，只描述产品目标、
// 当前支持程度和后续必须补齐的能力边界。

export const REPORT_DOMAIN_IDS = {
  PERSONALITY: "personality",
  CAREER: "career",
  WEALTH: "wealth",
  MARRIAGE: "marriage",
  FORTUNE: "fortune",
  KARMA: "karma",
  PAST_AND_PRESENT: "past-and-present",
  LIFE_STRUCTURE: "life-structure"
};

const REPORT_DOMAINS = [
  {
    id: REPORT_DOMAIN_IDS.PERSONALITY,
    title: "性格画像报告",
    outputGoal: "根据命宫、身宫、三方四正和星曜结构，生成用户可读的性格、行为模式与人生发力方式分析。",
    currentSupport: "partial",
    supportedFocusAreaIds: ["life-triad", "body-palace", "star-balance"],
    missingCapabilities: [
      "更多星曜组合解释",
      "知识库引用",
      "LLM 归纳与个性化表达"
    ]
  },
  {
    id: REPORT_DOMAIN_IDS.CAREER,
    title: "事业发展报告",
    outputGoal: "围绕官禄宫、命宫三方四正和运限结构，分析职业倾向、职责承担、发展压力与阶段性机会。",
    currentSupport: "partial",
    supportedFocusAreaIds: ["life-triad", "major-periods", "current-major-period"],
    missingCapabilities: [
      "官禄宫专题解释目录",
      "大限四化",
      "流年规则",
      "行业与职业知识库映射"
    ]
  },
  {
    id: REPORT_DOMAIN_IDS.WEALTH,
    title: "财富资源报告",
    outputGoal: "围绕财帛宫、命宫三方四正和运限结构，分析资源经营方式、财富压力、助力与风险边界。",
    currentSupport: "partial",
    supportedFocusAreaIds: ["life-triad", "major-periods", "current-major-period"],
    missingCapabilities: [
      "财帛宫专题解释目录",
      "大限四化",
      "流年财务触发规则",
      "风险分级表达"
    ]
  },
  {
    id: REPORT_DOMAIN_IDS.MARRIAGE,
    title: "婚姻感情报告",
    outputGoal: "围绕夫妻宫、命宫三方四正和运限结构，分析关系模式、伴侣互动、婚恋压力与阶段性变化。",
    currentSupport: "planned",
    supportedFocusAreaIds: [],
    missingCapabilities: [
      "夫妻宫专题 focusArea",
      "夫妻宫星曜解释目录",
      "四化与运限触发规则",
      "关系议题的安全表达边界"
    ]
  },
  {
    id: REPORT_DOMAIN_IDS.FORTUNE,
    title: "阶段运势报告",
    outputGoal: "围绕大限、当前大限、流年和四化，生成阶段性趋势、重点宫位和可验证边界。",
    currentSupport: "partial",
    supportedFocusAreaIds: ["major-periods", "current-major-period"],
    missingCapabilities: [
      "大限四化",
      "流年命盘",
      "事件触发规则",
      "时间段风险分级"
    ]
  },
  {
    id: REPORT_DOMAIN_IDS.KARMA,
    title: "因果主题报告",
    outputGoal: "以传统命理和文化诠释角度整理因果主题，不把象征性解释写成事实断言。",
    currentSupport: "planned",
    supportedFocusAreaIds: [],
    missingCapabilities: [
      "因果主题知识库",
      "派别与信念边界",
      "非事实化表达策略",
      "用户知情提示"
    ]
  },
  {
    id: REPORT_DOMAIN_IDS.PAST_AND_PRESENT,
    title: "前世今生主题报告",
    outputGoal: "以象征性、叙事性和文化解释方式组织前世今生主题，不声称可事实验证。",
    currentSupport: "planned",
    supportedFocusAreaIds: [],
    missingCapabilities: [
      "前世今生主题知识库",
      "叙事生成边界",
      "非事实化免责声明",
      "与命盘证据的弱关联标注"
    ]
  },
  {
    id: REPORT_DOMAIN_IDS.LIFE_STRUCTURE,
    title: "综合命盘结构报告",
    outputGoal: "从命宫、身宫、星曜、四化和大限骨架建立完整命盘底稿，为专项报告提供基础。",
    currentSupport: "partial",
    supportedFocusAreaIds: [
      "life-triad",
      "body-palace",
      "star-balance",
      "birth-year-transformations",
      "major-periods"
    ],
    missingCapabilities: [
      "知识库引用",
      "组合规则",
      "大限四化",
      "流年规则"
    ]
  }
];

export function findReportDomains(reportDomainIds = []) {
  const idSet = new Set(reportDomainIds);

  return REPORT_DOMAINS.filter((domain) => idSet.has(domain.id));
}

export function getReportDomainById(reportDomainId) {
  return REPORT_DOMAINS.find((domain) => domain.id === reportDomainId) ?? null;
}
