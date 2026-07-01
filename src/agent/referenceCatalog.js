// agent 本地引用目录。
//
// 这一层先不连接外部知识库，而是给“规则/分析框架”稳定编号。
// 后续把 PDF、书籍、笔记或向量检索接进来时，可以把这些 id 映射到
// 更具体的来源，例如书名、章节、页码、原文摘录或检索片段。

import {
  KNOWLEDGE_SOURCE_IDS,
  findKnowledgeSources
} from "./knowledgeSnippetCatalog.js";

export const REFERENCE_IDS = {
  LIFE_BODY_PALACE: "rule.life-body-palace",
  FIVE_ELEMENT_CLASS: "rule.five-element-class",
  STAR_PLACEMENT: "rule.star-placement",
  BIRTH_YEAR_FOUR_TRANSFORMATIONS: "rule.birth-year-four-transformations",
  MAJOR_PERIOD_FOUR_TRANSFORMATIONS: "rule.major-period-four-transformations",
  ANNUAL_PERIOD: "rule.annual-period",
  ANNUAL_FOUR_TRANSFORMATIONS: "rule.annual-four-transformations",
  MONTHLY_PERIOD: "rule.monthly-period",
  MAJOR_PERIODS: "rule.major-periods",
  CURRENT_MAJOR_PERIOD: "rule.current-major-period",
  TIMING_TRIGGER_CANDIDATE: "framework.timing-trigger-candidate",
  TIMING_COMBINATION_VERIFICATION: "framework.timing-combination-verification",
  CURRENT_STAGE: "framework.current-stage",
  PALACE_ROLE: "framework.palace-role",
  LIFE_TRIAD: "framework.life-triad",
  CAREER_PALACE: "framework.career-palace",
  WEALTH_PALACE: "framework.wealth-palace",
  SPOUSE_PALACE: "framework.spouse-palace",
  BODY_PALACE: "framework.body-palace",
  STAR_BALANCE: "framework.star-balance"
};

export const SOURCE_IDS = {
  LOCAL_IMPLEMENTED_RULES: "source.local.implemented-rules",
  LOCAL_ANALYSIS_FRAMEWORKS: "source.local.analysis-frameworks",
  PENDING_ZIWEI_CORPUS: KNOWLEDGE_SOURCE_IDS.PENDING_ZIWEI_CORPUS
};

const SOURCES = [
  {
    id: SOURCE_IDS.LOCAL_IMPLEMENTED_RULES,
    title: "本地已实现排盘规则",
    type: "local-rule-catalog",
    status: "implemented",
    citation: "当前代码库的排盘计算模块与对应测试。",
    note: "用于标记已经由代码实现并通过测试覆盖的排盘规则；不是外部书籍来源。"
  },
  {
    id: SOURCE_IDS.LOCAL_ANALYSIS_FRAMEWORKS,
    title: "本地分析框架目录",
    type: "local-framework-catalog",
    status: "draft",
    citation: "当前代码库的 referenceCatalog、reportSectionCatalog 与 interpretationCatalog。",
    note: "用于标记当前 agent 内部的保守分析框架；后续需要映射到书籍、PDF、笔记或知识库片段。"
  }
];

const REFERENCES = [
  {
    id: REFERENCE_IDS.LIFE_BODY_PALACE,
    title: "命宫/身宫排定规则",
    type: "implemented-rule",
    sourceRefs: [SOURCE_IDS.LOCAL_IMPLEMENTED_RULES],
    note: "根据农历月份与出生时辰排定命宫、身宫。"
  },
  {
    id: REFERENCE_IDS.FIVE_ELEMENT_CLASS,
    title: "五行局计算规则",
    type: "implemented-rule",
    sourceRefs: [SOURCE_IDS.LOCAL_IMPLEMENTED_RULES],
    note: "根据年干、命宫干支与纳音推定五行局。"
  },
  {
    id: REFERENCE_IDS.STAR_PLACEMENT,
    title: "已实现星曜安星规则",
    type: "implemented-rule",
    sourceRefs: [SOURCE_IDS.LOCAL_IMPLEMENTED_RULES],
    note: "引用当前排盘模块已经完成的主星、辅星、煞曜和空曜安星结果。"
  },
  {
    id: REFERENCE_IDS.BIRTH_YEAR_FOUR_TRANSFORMATIONS,
    title: "生年四化计算规则",
    type: "implemented-rule",
    sourceRefs: [SOURCE_IDS.LOCAL_IMPLEMENTED_RULES],
    note: "根据出生年干查表取得化禄、化权、化科、化忌，并挂回已安星曜所在宫位。"
  },
  {
    id: REFERENCE_IDS.MAJOR_PERIOD_FOUR_TRANSFORMATIONS,
    title: "大限四化计算规则",
    type: "implemented-rule",
    sourceRefs: [SOURCE_IDS.LOCAL_IMPLEMENTED_RULES],
    note: "根据每个大限所在宫位的宫干查表取得大限化禄、化权、化科、化忌，并标记四化星曜在本命盘中的目标宫位。"
  },
  {
    id: REFERENCE_IDS.ANNUAL_PERIOD,
    title: "流年骨架定位规则",
    type: "implemented-rule",
    sourceRefs: [SOURCE_IDS.LOCAL_IMPLEMENTED_RULES],
    note: "根据分析日期换算农历年份，取得流年天干地支，并暂按太岁地支定位流年命宫所在本命宫位。"
  },
  {
    id: REFERENCE_IDS.ANNUAL_FOUR_TRANSFORMATIONS,
    title: "流年四化计算规则",
    type: "implemented-rule",
    sourceRefs: [SOURCE_IDS.LOCAL_IMPLEMENTED_RULES],
    note: "根据分析日期对应的流年天干查表取得流年化禄、化权、化科、化忌，并标记四化星曜在本命盘中的目标宫位。"
  },
  {
    id: REFERENCE_IDS.MONTHLY_PERIOD,
    title: "流月骨架定位规则",
    type: "implemented-rule",
    sourceRefs: [SOURCE_IDS.LOCAL_IMPLEMENTED_RULES],
    note: "根据分析日期换算农历月份，并按正月建寅、逐月顺行的月建地支定位流月所在本命宫位。"
  },
  {
    id: REFERENCE_IDS.MAJOR_PERIODS,
    title: "大限年龄段计算规则",
    type: "implemented-rule",
    sourceRefs: [SOURCE_IDS.LOCAL_IMPLEMENTED_RULES],
    note: "根据五行局数确定起限年龄，并按阳男阴女顺行、阴男阳女逆行排布十二宫大限。"
  },
  {
    id: REFERENCE_IDS.CURRENT_MAJOR_PERIOD,
    title: "当前大限定位规则",
    type: "implemented-rule",
    sourceRefs: [SOURCE_IDS.LOCAL_IMPLEMENTED_RULES],
    note: "根据分析日期按虚岁定位当前年龄，再匹配已排出的大限年龄段。"
  },
  {
    id: REFERENCE_IDS.CURRENT_STAGE,
    title: "当前阶段分析框架",
    type: "analysis-framework",
    sourceRefs: [SOURCE_IDS.LOCAL_ANALYSIS_FRAMEWORKS],
    note: "把当前大限定位、阶段落宫星曜、生年四化、大限骨架、大限四化骨架、流年骨架、流月骨架和安全触发观察点放在同一节中合参；当前仍不含深层组合验证。"
  },
  {
    id: REFERENCE_IDS.TIMING_TRIGGER_CANDIDATE,
    title: "安全事件触发候选框架",
    type: "analysis-framework",
    sourceRefs: [SOURCE_IDS.LOCAL_ANALYSIS_FRAMEWORKS],
    note: "把当前大限、流年太岁、流月月建、生年四化、大限四化和流年四化的重叠宫位标记为观察点；只用于提示待验证主题，不输出具体事件或应期。"
  },
  {
    id: REFERENCE_IDS.TIMING_COMBINATION_VERIFICATION,
    title: "运限组合验证框架",
    type: "analysis-framework",
    sourceRefs: [SOURCE_IDS.LOCAL_ANALYSIS_FRAMEWORKS],
    note: "只把同时具备多层运限或四化信号、且达到最低证据强度的观察点列为组合验证主题；仍不输出事件、应期或结果断语。"
  },
  {
    id: REFERENCE_IDS.PALACE_ROLE,
    title: "十二宫角色分析框架",
    type: "analysis-framework",
    sourceRefs: [SOURCE_IDS.LOCAL_ANALYSIS_FRAMEWORKS],
    note: "为命宫、夫妻宫、财帛宫、官禄宫、迁移宫、福德宫等宫位提供基础语义，供不同专题复用。"
  },
  {
    id: REFERENCE_IDS.LIFE_TRIAD,
    title: "命宫与三方四正分析框架",
    type: "analysis-framework",
    sourceRefs: [SOURCE_IDS.LOCAL_ANALYSIS_FRAMEWORKS],
    note: "先看命宫，再合看财帛、官禄、迁移以建立基础格局。"
  },
  {
    id: REFERENCE_IDS.CAREER_PALACE,
    title: "官禄宫三方四正分析框架",
    type: "analysis-framework",
    sourceRefs: [SOURCE_IDS.LOCAL_ANALYSIS_FRAMEWORKS],
    note: "以官禄宫为本宫，合看命宫、财帛宫、夫妻宫作为事业发展的静态结构参照，再等待四化、限运、流年和职业知识库补足细断。"
  },
  {
    id: REFERENCE_IDS.WEALTH_PALACE,
    title: "财帛宫三方四正分析框架",
    type: "analysis-framework",
    sourceRefs: [SOURCE_IDS.LOCAL_ANALYSIS_FRAMEWORKS],
    note: "以财帛宫为本宫，合看命宫、官禄宫、福德宫作为财富资源的静态结构参照，再等待四化、限运、流年和风险规则补足细断。"
  },
  {
    id: REFERENCE_IDS.SPOUSE_PALACE,
    title: "夫妻宫三方四正分析框架",
    type: "analysis-framework",
    sourceRefs: [SOURCE_IDS.LOCAL_ANALYSIS_FRAMEWORKS],
    note: "以夫妻宫为本宫，合看迁移、官禄、福德作为婚姻感情的静态结构参照，再等待四化、限运和流年补足细断。"
  },
  {
    id: REFERENCE_IDS.BODY_PALACE,
    title: "身宫落点分析框架",
    type: "analysis-framework",
    sourceRefs: [SOURCE_IDS.LOCAL_ANALYSIS_FRAMEWORKS],
    note: "把身宫作为后天行为重心，与命宫和三方四正合参。"
  },
  {
    id: REFERENCE_IDS.STAR_BALANCE,
    title: "星曜类别平衡分析框架",
    type: "analysis-framework",
    sourceRefs: [SOURCE_IDS.LOCAL_ANALYSIS_FRAMEWORKS],
    note: "区分主星、辅星、煞曜和空曜，避免把不同性质的星曜混为一谈。"
  }
];

export function findReferences(referenceRefs) {
  const refSet = new Set(referenceRefs);

  return REFERENCES.filter((reference) => refSet.has(reference.id));
}

export function findSources(sourceRefs) {
  const refSet = new Set(sourceRefs);
  const localSources = SOURCES.filter((source) => refSet.has(source.id));
  const knowledgeSources = findKnowledgeSources(sourceRefs);

  return [...localSources, ...knowledgeSources];
}
