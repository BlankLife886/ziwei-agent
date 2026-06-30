import {
  INTERPRETATION_IDS,
  findStarRoleInterpretationRefs
} from "./interpretationCatalog.js";

// 报告章节目录。
//
// reportPlanner 负责把 agent 的 focusArea 组装成 section；本文件负责定义
// “不同 section 应该怎么被规划”。把这些规则集中起来后，后续新增事业、
// 财富、运势、因果等专题时，可以先加章节定义，再补解释目录和证据来源。
//
// 这一层仍然只做 agent 规划，不做排盘计算，也不直接写断语。

const SECTION_DEFINITIONS = {
  "life-triad": {
    titleWhenQueried: ({ focusArea, queryContext }) => {
      return `${queryContext.topics.join("与")}专题：${focusArea.title}`;
    },
    purposeWhenQueried: ({ queryContext }) => {
      return `本轮按用户问题聚焦${queryContext.topics.join("、")}，在命宫三方四正中优先查看${queryContext.primaryPalaceNames.join("、")}，并保留其余三方四正宫位作为结构参照。`;
    },
    guidingQuestionsWhenQueried: ({ queryContext }) => [
      `${queryContext.primaryPalaceNames.join("、")}分别提供了哪些已排出的宫位和星曜证据？`,
      "命宫与其余三方四正宫位如何作为本轮专题的结构参照？",
      "当前哪些判断仍需等待大限四化、流年和更多组合规则？"
    ],
    guidingQuestions: [
      "命宫本身呈现什么样的基础气质？",
      "财帛宫、官禄宫、迁移宫对命宫形成什么补充？",
      "三方四正里哪些星曜是当前最明确的证据？"
    ],
    writingPromptWhenQueried: ({ queryContext }) => {
      return `围绕用户指定的${queryContext.topics.join("、")}主题写保守分析，优先引用${queryContext.primaryPalaceNames.join("、")}证据，并明确不能推具体事件。`;
    },
    writingPrompt: "用谨慎语气说明命宫与三方四正的结构关系，只引用已经排出的宫位和星曜。",
    buildInterpretationRefs: buildLifeTriadInterpretationRefs
  },
  "career-palace": {
    titleWhenQueried: ({ focusArea, queryContext }) => {
      return `${queryContext.topics.join("与")}专题：${focusArea.title}`;
    },
    guidingQuestions: [
      "官禄宫、命宫、财帛宫、夫妻宫分别提供了哪些已排出的宫位和星曜证据？",
      "这些证据如何分别指向职责承担、主体基础、资源承接和合作牵动？",
      "哪些事业判断必须等待四化、限运、流年和职业知识库？"
    ],
    writingPrompt: "围绕官禄宫三方四正写事业发展的保守结构分析，只描述职责承担、主体基础、资源承接和合作牵动，不推职位高低、升迁时间或具体职业结果。",
    buildInterpretationRefs: buildCareerTriadInterpretationRefs
  },
  "wealth-palace": {
    titleWhenQueried: ({ focusArea, queryContext }) => {
      return `${queryContext.topics.join("与")}专题：${focusArea.title}`;
    },
    guidingQuestions: [
      "财帛宫、命宫、官禄宫、福德宫分别提供了哪些已排出的宫位和星曜证据？",
      "这些证据如何分别指向资源经营、主体基础、事业承接和内在取舍？",
      "哪些财富判断必须等待四化、限运、流年和风险分级规则？"
    ],
    writingPrompt: "围绕财帛宫三方四正写财富资源的保守结构分析，只描述资源经营、主体基础、事业承接和内在取舍，不推具体金额、投资结果或特定年份。",
    buildInterpretationRefs: buildWealthTriadInterpretationRefs
  },
  "spouse-palace": {
    titleWhenQueried: ({ focusArea, queryContext }) => {
      return `${queryContext.topics.join("与")}专题：${focusArea.title}`;
    },
    purposeWhenQueried: ({ queryContext }) => {
      return `本轮按用户问题聚焦${queryContext.topics.join("、")}，以${queryContext.primaryPalaceNames.join("、")}为本宫，并合看迁移宫、官禄宫、福德宫建立婚姻感情结构底稿。`;
    },
    guidingQuestions: [
      "夫妻宫、迁移宫、官禄宫、福德宫分别提供了哪些已排出的宫位和星曜证据？",
      "这些证据如何分别指向关系互动、外部相处、现实承担和内在感受？",
      "哪些婚恋判断必须等待四化、限运、流年和合参规则？"
    ],
    writingPrompt: "围绕夫妻宫三方四正写婚姻感情的保守结构分析，只描述关系互动、外部相处、现实承担和内在感受，不推结婚时间、分合事件或伴侣具体身份。",
    buildInterpretationRefs: buildSpouseTriadInterpretationRefs
  },
  "body-palace": {
    guidingQuestions: [
      "身宫落在哪一宫，提示后天重心偏向哪里？",
      "身宫与命宫是同宫还是分宫？",
      "身宫证据是否支持命宫给出的基础判断？"
    ],
    writingPrompt: "说明身宫代表后天发力点，不要把身宫单独当成完整结论。",
    buildInterpretationRefs: buildBodyPalaceInterpretationRefs
  },
  "star-balance": {
    guidingQuestions: [
      "主星、辅星、煞曜、空曜数量是否均衡？",
      "哪些宫位已经有较强星曜证据，哪些宫位仍然偏空？",
      "当前能说的是结构倾向，还是已经足以形成具体判断？"
    ],
    writingPrompt: "先做星曜类别统计，再提醒读者当前缺少大限四化和流年，不能过度推演。",
    interpretationRefs: [INTERPRETATION_IDS.STAR_BALANCE_STATIC_ONLY]
  },
  "birth-year-transformations": {
    guidingQuestions: [
      "化禄、化权、化科、化忌分别落在哪些星曜和宫位？",
      "这些四化能补充命宫三方四正的哪些结构线索？",
      "哪些内容仍需等待大限四化、流年后才能判断？"
    ],
    writingPrompt: "只说明生年四化在本命盘中的结构牵引，不推具体年份和事件。",
    interpretationRefs: [INTERPRETATION_IDS.BIRTH_YEAR_FOUR_TRANSFORMATIONS_STATIC_ONLY]
  },
  "major-periods": {
    guidingQuestions: [
      "第一大限从几岁开始，落在哪一宫？",
      "大限顺逆方向是什么？",
      "当前只排出年龄段，哪些判断必须等大限四化和流年？"
    ],
    writingPrompt: "只说明大限年龄段和顺逆方向，不把大限骨架写成具体事件判断。",
    interpretationRefs: [INTERPRETATION_IDS.MAJOR_PERIODS_STRUCTURE_ONLY]
  },
  "current-major-period": {
    guidingQuestions: [
      "分析日期是哪一天？",
      "按虚岁定位时命主处于哪一个大限？",
      "这一定位目前只能支持什么层级的判断？"
    ],
    writingPrompt: "只说明分析日期对应的当前大限，不把阶段定位写成事件断语。",
    interpretationRefs: [INTERPRETATION_IDS.CURRENT_MAJOR_PERIOD_LOCATOR_ONLY]
  }
};

const FALLBACK_GUIDING_QUESTIONS = [
  "这一节有哪些可验证的命盘证据？",
  "这些证据能支持什么层级的分析？"
];

const PALACE_ROLE_INTERPRETATION_REFS = {
  命宫: INTERPRETATION_IDS.PALACE_ROLE_LIFE,
  夫妻宫: INTERPRETATION_IDS.PALACE_ROLE_SPOUSE,
  财帛宫: INTERPRETATION_IDS.PALACE_ROLE_WEALTH,
  官禄宫: INTERPRETATION_IDS.PALACE_ROLE_CAREER,
  迁移宫: INTERPRETATION_IDS.PALACE_ROLE_TRAVEL,
  福德宫: INTERPRETATION_IDS.PALACE_ROLE_WELLBEING
};

export function getReportSectionDefinition(focusAreaId) {
  return SECTION_DEFINITIONS[focusAreaId] ?? null;
}

export function buildSectionInterpretationRefs(focusAreaId, evidenceItems) {
  const definition = getReportSectionDefinition(focusAreaId);

  if (!definition) {
    return [];
  }

  if (definition.buildInterpretationRefs) {
    return definition.buildInterpretationRefs(evidenceItems);
  }

  return definition.interpretationRefs ?? [];
}

export function buildSectionTitle(focusArea, queryContext) {
  const definition = getReportSectionDefinition(focusArea.id);

  if (definition?.titleWhenQueried && queryContext.hasIntent) {
    return definition.titleWhenQueried({ focusArea, queryContext });
  }

  return focusArea.title;
}

export function buildSectionPurpose(focusArea, queryContext) {
  const definition = getReportSectionDefinition(focusArea.id);
  const canUseQueriedPurpose = definition?.purposeWhenQueried
    && queryContext.primaryPalaceNames.length > 0;

  if (canUseQueriedPurpose) {
    return definition.purposeWhenQueried({ focusArea, queryContext });
  }

  return focusArea.reason;
}

export function buildSectionGuidingQuestions(focusAreaId, queryContext) {
  const definition = getReportSectionDefinition(focusAreaId);
  const canUseQueriedQuestions = definition?.guidingQuestionsWhenQueried
    && queryContext.primaryPalaceNames.length > 0;

  if (canUseQueriedQuestions) {
    return definition.guidingQuestionsWhenQueried({ queryContext });
  }

  return definition?.guidingQuestions ?? FALLBACK_GUIDING_QUESTIONS;
}

export function buildSectionWritingPrompt(focusAreaId, queryContext) {
  const definition = getReportSectionDefinition(focusAreaId);
  const canUseQueriedPrompt = definition?.writingPromptWhenQueried
    && queryContext.primaryPalaceNames.length > 0;

  if (canUseQueriedPrompt) {
    return definition.writingPromptWhenQueried({ queryContext });
  }

  return definition?.writingPrompt ?? "围绕证据写一段保守分析，并明确未知项。";
}

function buildLifeTriadInterpretationRefs(evidenceItems) {
  const refs = [
    INTERPRETATION_IDS.LIFE_TRIAD_STRUCTURE,
    ...getPalaceRoleInterpretationRefs(evidenceItems)
  ];
  const emptyLifePalace = evidenceItems.some((item) => {
    return item.text.includes("命宫") && item.text.includes("无已安星曜");
  });

  if (emptyLifePalace) {
    refs.push(INTERPRETATION_IDS.LIFE_TRIAD_EMPTY_LIFE_PALACE);
  }

  return [
    ...refs,
    ...getStarRoleInterpretationRefs(evidenceItems)
  ];
}

function buildSpouseTriadInterpretationRefs(evidenceItems) {
  return [
    INTERPRETATION_IDS.SPOUSE_TRIAD_STRUCTURE,
    ...getPalaceRoleInterpretationRefs(evidenceItems),
    INTERPRETATION_IDS.SPOUSE_PALACE_STATIC_ONLY,
    ...getStarRoleInterpretationRefs(evidenceItems)
  ];
}

function buildCareerTriadInterpretationRefs(evidenceItems) {
  return [
    INTERPRETATION_IDS.CAREER_TRIAD_STRUCTURE,
    ...getPalaceRoleInterpretationRefs(evidenceItems),
    INTERPRETATION_IDS.CAREER_PALACE_STATIC_ONLY,
    ...getStarRoleInterpretationRefsForPalaces(evidenceItems, [
      "官禄宫",
      "财帛宫"
    ])
  ];
}

function buildWealthTriadInterpretationRefs(evidenceItems) {
  return [
    INTERPRETATION_IDS.WEALTH_TRIAD_STRUCTURE,
    ...getPalaceRoleInterpretationRefs(evidenceItems),
    INTERPRETATION_IDS.WEALTH_PALACE_STATIC_ONLY,
    ...getStarRoleInterpretationRefsForPalaces(evidenceItems, [
      "财帛宫",
      "官禄宫"
    ])
  ];
}

function buildBodyPalaceInterpretationRefs(evidenceItems) {
  const sameAsLifePalace = evidenceItems.some((item) => {
    return item.text.startsWith("命宫");
  });

  return [
    sameAsLifePalace
      ? INTERPRETATION_IDS.BODY_PALACE_SAME_AS_LIFE
      : INTERPRETATION_IDS.BODY_PALACE_DIFFERENT_FROM_LIFE
  ];
}

function getPalaceRoleInterpretationRefs(evidenceItems) {
  const refs = evidenceItems.flatMap((item) => {
    const palaceName = Object.keys(PALACE_ROLE_INTERPRETATION_REFS).find((name) => {
      return item.text.startsWith(name);
    });

    return palaceName ? [PALACE_ROLE_INTERPRETATION_REFS[palaceName]] : [];
  });

  return uniqueInOrder(refs);
}

function getStarRoleInterpretationRefs(evidenceItems) {
  return getStarRoleInterpretationRefsForPalaces(evidenceItems);
}

function getStarRoleInterpretationRefsForPalaces(evidenceItems, palaceNames) {
  const allowedPalaceNames = palaceNames ? new Set(palaceNames) : null;
  const refs = evidenceItems.flatMap((item) => {
    if (!item.metadata?.palaceName || !item.metadata?.starGroups) {
      return [];
    }

    if (allowedPalaceNames && !allowedPalaceNames.has(item.metadata.palaceName)) {
      return [];
    }

    return findStarRoleInterpretationRefs(
      item.metadata.palaceName,
      item.metadata.starGroups
    );
  });

  return uniqueInOrder(refs);
}

function uniqueInOrder(values) {
  return [...new Set(values.filter(Boolean))];
}
