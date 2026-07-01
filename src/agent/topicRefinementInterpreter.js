import { INTERPRETATION_IDS } from "./interpretationCatalog.js";
import { REFERENCE_IDS } from "./referenceCatalog.js";

// 专题细分解释器。
//
// reportSectionCatalog 已经决定“要写哪一节”，interpretationCatalog 已经决定
// “哪些解释条目可用”。本模块补的是中间层：把一个章节整理成可交给报告器
// 或未来大模型的专题任务单。它只描述分析角度、证据范围和禁区，不排盘、不
// 生成事件、不输出结果断语。

const SECTION_REFINEMENT_RULES = {
  "life-triad": {
    topicId: "life",
    topicTitle: "基础画像",
    title: "命宫三方四正专题细分",
    angles: ["基础气质", "资源取用", "事业承接", "外部环境"],
    blockedClaims: ["不能把基础画像写成具体事件", "不能脱离三方四正证据下结论"]
  },
  "career-palace": {
    topicId: "career",
    topicTitle: "事业",
    title: "事业专题细分",
    angles: ["职责承担", "主体基础", "资源承接", "合作牵动"],
    blockedClaims: ["不能推职位高低", "不能推升迁时间或具体职业结果"]
  },
  "wealth-palace": {
    topicId: "wealth",
    topicTitle: "财富",
    title: "财富专题细分",
    angles: ["资源经营", "主体基础", "事业承接", "内在取舍"],
    blockedClaims: ["不能推具体金额", "不能推投资结果或财富结果"]
  },
  "spouse-palace": {
    topicId: "marriage",
    topicTitle: "婚姻感情",
    title: "婚姻感情专题细分",
    angles: ["关系互动", "外部相处", "现实承担", "内在感受"],
    blockedClaims: ["不能推结婚时间", "不能推分合事件或伴侣具体身份"]
  },
  "body-palace": {
    topicId: "personality",
    topicTitle: "身宫落点",
    title: "身宫专题细分",
    angles: ["后天发力点", "身命关系", "行为重心"],
    blockedClaims: ["不能把身宫单点写成完整命运结论"]
  },
  "star-balance": {
    topicId: "personality",
    topicTitle: "星曜类别",
    title: "星曜类别专题细分",
    angles: ["主星分布", "辅星支持", "煞曜压力", "空曜留白"],
    blockedClaims: ["不能把星曜数量直接写成吉凶结论"]
  },
  "birth-year-transformations": {
    topicId: "transformation",
    topicTitle: "生年四化",
    title: "生年四化专题细分",
    angles: ["化禄位置", "化权位置", "化科位置", "化忌位置"],
    blockedClaims: ["不能把生年四化单独写成具体年份事件"]
  },
  "major-periods": {
    topicId: "timing",
    topicTitle: "大限骨架",
    title: "大限骨架专题细分",
    angles: ["起限年龄", "顺逆方向", "十年阶段索引"],
    blockedClaims: ["不能把大限列表写成阶段结果"]
  },
  "current-major-period": {
    topicId: "timing",
    topicTitle: "当前大限",
    title: "当前大限专题细分",
    angles: ["分析日期", "虚岁定位", "当前大限落宫"],
    blockedClaims: ["不能把当前大限定位写成具体事件"]
  },
  "current-stage": {
    topicId: "fortune",
    topicTitle: "当前阶段运势",
    title: "当前阶段专题细分",
    angles: ["当前大限", "流年骨架", "流月骨架", "组合验证", "跨层关系"],
    blockedClaims: ["不能推今年具体事件", "不能推月份事件、应期或吉凶"]
  }
};

export function interpretTopicRefinements(section) {
  const rule = SECTION_REFINEMENT_RULES[section?.id];

  if (!rule) {
    return [];
  }

  const queryTopics = section.queryContext?.topics ?? [];
  const queryTopicIds = section.queryContext?.topicIds ?? [];
  const topicTitle = queryTopics.length > 0 ? queryTopics.join("、") : rule.topicTitle;
  const topicId = queryTopicIds[0] ?? rule.topicId;
  const evidenceItems = selectRefinementEvidenceItems(section);

  return [{
    id: `topic-refinement.${section.id}.${topicId}`,
    sectionId: section.id,
    topicId,
    topicTitle,
    title: rule.title,
    angles: rule.angles,
    text: `${topicTitle}按${rule.angles.join("、")}分层组织，只使用本节证据和受控解释，不扩展为未验证断语`,
    evidenceRefs: evidenceItems.map((item) => item.id),
    referenceRefs: uniqueInOrder([
      REFERENCE_IDS.TOPIC_REFINEMENT,
      ...(section.referenceRefs ?? [])
    ]),
    sourceRefs: section.sourceRefs ?? [],
    knowledgeSnippetRefs: section.knowledgeSnippetRefs ?? [],
    interpretationRefs: uniqueInOrder([
      INTERPRETATION_IDS.TOPIC_REFINEMENT_STRUCTURE_ONLY,
      ...(section.interpretationRefs ?? [])
    ]),
    riskLevel: "medium",
    blockedClaims: rule.blockedClaims
  }];
}

export function getTopicRefinementInterpretationRefs(sectionId) {
  return SECTION_REFINEMENT_RULES[sectionId]
    ? [INTERPRETATION_IDS.TOPIC_REFINEMENT_STRUCTURE_ONLY]
    : [];
}

export function formatTopicRefinement(refinement) {
  return `${refinement.title}：${refinement.text}；禁区：${refinement.blockedClaims.join("、")}`;
}

function selectRefinementEvidenceItems(section) {
  const evidenceItems = section.evidenceItems ?? [];
  const primaryPalaceNames = section.queryContext?.primaryPalaceNames ?? [];

  if (primaryPalaceNames.length === 0) {
    return evidenceItems;
  }

  const selectedItems = evidenceItems.filter((item) => {
    return primaryPalaceNames.includes(item.metadata?.palaceName) ||
      primaryPalaceNames.some((palaceName) => item.text?.startsWith(palaceName));
  });

  return selectedItems.length > 0 ? selectedItems : evidenceItems;
}

function uniqueInOrder(values) {
  return [...new Set(values.filter(Boolean))];
}
