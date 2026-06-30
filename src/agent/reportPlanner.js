import {
  INTERPRETATION_IDS,
  findInterpretations,
  findStarRoleInterpretationRefs
} from "./interpretationCatalog.js";
import { findReferences } from "./referenceCatalog.js";

// 命理报告草稿规划器。
//
// 这一层仍然不负责“断命”，而是把 agent 已经整理好的 focusAreas
// 转成更接近报告写作的章节结构。这样做有两个好处：
// 1. 后续接 LLM 时，可以把这些 section 当成稳定 prompt 输入。
// 2. 当前规则还没实现完整时，可以明确告诉使用者哪些内容只能浅谈。

export function createReportPlan(agentResult) {
  if (agentResult.status !== "ready") {
    return {
      status: "blocked",
      role: agentResult.role,
      messages: ["命盘证据尚未准备好，暂不能生成报告草稿。"],
      blockers: [
        ...agentResult.messages,
        ...agentResult.nextQuestions
      ],
      sections: [],
      guardrails: []
    };
  }

  const sections = agentResult.focusAreas.map((focusArea) => {
    return buildSectionFromFocusArea(focusArea, agentResult.queryIntent);
  });

  if (sections.length === 0) {
    return {
      status: "blocked",
      role: agentResult.role,
      subject: agentResult.subject,
      queryIntent: agentResult.queryIntent,
      opening: buildOpening(agentResult),
      messages: [
        "当前查询目标已识别，但还没有可用报告章节，暂不能生成正文草稿。"
      ],
      blockers: agentResult.limitations,
      sections: [],
      guardrails: buildGuardrails(agentResult)
    };
  }

  return {
    status: "planned",
    role: agentResult.role,
    subject: agentResult.subject,
    queryIntent: agentResult.queryIntent,
    opening: buildOpening(agentResult),
    sections,
    guardrails: buildGuardrails(agentResult)
  };
}

function buildOpening(agentResult) {
  if (agentResult.queryIntent?.hasIntent) {
    return [
      `本报告以${agentResult.subject.name}的本命盘为分析对象。`,
      `本轮按用户查询意图聚焦${agentResult.queryIntent.topics.join("、")}，只展开匹配章节和对应证据。`
    ];
  }

  return [
    `本报告以${agentResult.subject.name}的本命盘为分析对象。`,
    "先从命宫、身宫和星曜分布建立基础画像，再标注目前不能展开的分析边界。"
  ];
}

function buildSectionFromFocusArea(focusArea, queryIntent) {
  const evidenceItems = normalizeEvidenceItems(focusArea);
  const interpretationRefs = getInterpretationRefs(focusArea.id, evidenceItems);
  const interpretations = findInterpretations(interpretationRefs);
  const referenceRefs = collectReferenceRefs(evidenceItems, interpretations);
  const queryContext = buildSectionQueryContext(focusArea.id, queryIntent);

  return {
    id: focusArea.id,
    title: getSectionTitle(focusArea, queryContext),
    purpose: getSectionPurpose(focusArea, queryContext),
    queryContext,
    guidingQuestions: getGuidingQuestions(focusArea.id, queryContext),
    evidence: evidenceItems.map((item) => item.text),
    evidenceItems,
    evidenceRefs: evidenceItems.map((item) => item.id),
    interpretationRefs,
    interpretations,
    referenceRefs,
    references: findReferences(referenceRefs),
    writingPrompt: getWritingPrompt(focusArea.id, queryContext)
  };
}

function normalizeEvidenceItems(focusArea) {
  if (focusArea.evidenceItems) {
    return focusArea.evidenceItems;
  }

  return focusArea.evidence.map((text, index) => {
    return {
      id: `${focusArea.id}.evidence-${index + 1}`,
      text,
      source: "agent.focusArea.evidence",
      referenceRefs: []
    };
  });
}

function collectReferenceRefs(evidenceItems, interpretations) {
  const referenceRefs = evidenceItems.flatMap((item) => {
    return item.referenceRefs ?? [];
  });
  const interpretationSourceRefs = interpretations.flatMap((interpretation) => {
    return interpretation.sourceRefs;
  });

  return [...new Set([...referenceRefs, ...interpretationSourceRefs])];
}

function getInterpretationRefs(focusAreaId, evidenceItems) {
  if (focusAreaId === "life-triad") {
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

  if (focusAreaId === "body-palace") {
    const sameAsLifePalace = evidenceItems.some((item) => {
      return item.text.startsWith("命宫");
    });

    return [
      sameAsLifePalace
        ? INTERPRETATION_IDS.BODY_PALACE_SAME_AS_LIFE
        : INTERPRETATION_IDS.BODY_PALACE_DIFFERENT_FROM_LIFE
    ];
  }

  if (focusAreaId === "star-balance") {
    return [INTERPRETATION_IDS.STAR_BALANCE_STATIC_ONLY];
  }

  if (focusAreaId === "birth-year-transformations") {
    return [INTERPRETATION_IDS.BIRTH_YEAR_FOUR_TRANSFORMATIONS_STATIC_ONLY];
  }

  if (focusAreaId === "major-periods") {
    return [INTERPRETATION_IDS.MAJOR_PERIODS_STRUCTURE_ONLY];
  }

  if (focusAreaId === "current-major-period") {
    return [INTERPRETATION_IDS.CURRENT_MAJOR_PERIOD_LOCATOR_ONLY];
  }

  return [];
}

function getPalaceRoleInterpretationRefs(evidenceItems) {
  const refsByPalaceName = {
    命宫: INTERPRETATION_IDS.PALACE_ROLE_LIFE,
    财帛宫: INTERPRETATION_IDS.PALACE_ROLE_WEALTH,
    官禄宫: INTERPRETATION_IDS.PALACE_ROLE_CAREER,
    迁移宫: INTERPRETATION_IDS.PALACE_ROLE_TRAVEL
  };

  const refs = evidenceItems.flatMap((item) => {
    const palaceName = Object.keys(refsByPalaceName).find((name) => {
      return item.text.startsWith(name);
    });

    return palaceName ? [refsByPalaceName[palaceName]] : [];
  });

  return [...new Set(refs)];
}

function getStarRoleInterpretationRefs(evidenceItems) {
  const refs = evidenceItems.flatMap((item) => {
    if (!item.metadata?.palaceName || !item.metadata?.starGroups) {
      return [];
    }

    return findStarRoleInterpretationRefs(
      item.metadata.palaceName,
      item.metadata.starGroups
    );
  });

  return [...new Set(refs)];
}

function buildSectionQueryContext(focusAreaId, queryIntent) {
  if (!queryIntent?.hasIntent) {
    return {
      hasIntent: false,
      topics: [],
      topicIds: [],
      primaryPalaceNames: []
    };
  }

  const matchedItems = (queryIntent.matchedItems ?? []).filter((item) => {
    return item.focusAreaId === focusAreaId;
  });

  if (matchedItems.length === 0 && queryIntent.focusAreaIds?.includes(focusAreaId)) {
    return {
      hasIntent: true,
      topics: queryIntent.topics ?? [],
      topicIds: queryIntent.topicIds ?? [],
      primaryPalaceNames: queryIntent.primaryPalaceNames ?? [],
      matchedItems: []
    };
  }

  const topicIds = uniqueInOrder(matchedItems.map((item) => item.topicId));
  const topics = uniqueInOrder(matchedItems.map((item) => item.topic));
  const primaryPalaceNames = uniqueInOrder(
    matchedItems.flatMap((item) => item.palaceNames ?? [])
  );

  return {
    hasIntent: topicIds.length > 0,
    topics,
    topicIds,
    primaryPalaceNames,
    matchedItems
  };
}

function getSectionTitle(focusArea, queryContext) {
  if (focusArea.id === "life-triad" && queryContext.hasIntent) {
    return `${queryContext.topics.join("与")}专题：${focusArea.title}`;
  }

  return focusArea.title;
}

function getSectionPurpose(focusArea, queryContext) {
  if (focusArea.id === "life-triad" && queryContext.primaryPalaceNames.length > 0) {
    return `本轮按用户问题聚焦${queryContext.topics.join("、")}，在命宫三方四正中优先查看${queryContext.primaryPalaceNames.join("、")}，并保留其余三方四正宫位作为结构参照。`;
  }

  return focusArea.reason;
}

function getGuidingQuestions(focusAreaId, queryContext) {
  if (focusAreaId === "life-triad" && queryContext.primaryPalaceNames.length > 0) {
    return [
      `${queryContext.primaryPalaceNames.join("、")}分别提供了哪些已排出的宫位和星曜证据？`,
      "命宫与其余三方四正宫位如何作为本轮专题的结构参照？",
      "当前哪些判断仍需等待大限四化、流年和更多组合规则？"
    ];
  }

  const questionsByArea = {
    "life-triad": [
      "命宫本身呈现什么样的基础气质？",
      "财帛宫、官禄宫、迁移宫对命宫形成什么补充？",
      "三方四正里哪些星曜是当前最明确的证据？"
    ],
    "body-palace": [
      "身宫落在哪一宫，提示后天重心偏向哪里？",
      "身宫与命宫是同宫还是分宫？",
      "身宫证据是否支持命宫给出的基础判断？"
    ],
    "star-balance": [
      "主星、辅星、煞曜、空曜数量是否均衡？",
      "哪些宫位已经有较强星曜证据，哪些宫位仍然偏空？",
      "当前能说的是结构倾向，还是已经足以形成具体判断？"
    ],
    "birth-year-transformations": [
      "化禄、化权、化科、化忌分别落在哪些星曜和宫位？",
      "这些四化能补充命宫三方四正的哪些结构线索？",
      "哪些内容仍需等待大限四化、流年后才能判断？"
    ],
    "major-periods": [
      "第一大限从几岁开始，落在哪一宫？",
      "大限顺逆方向是什么？",
      "当前只排出年龄段，哪些判断必须等大限四化和流年？"
    ],
    "current-major-period": [
      "分析日期是哪一天？",
      "按虚岁定位时命主处于哪一个大限？",
      "这一定位目前只能支持什么层级的判断？"
    ]
  };

  return questionsByArea[focusAreaId] ?? [
    "这一节有哪些可验证的命盘证据？",
    "这些证据能支持什么层级的分析？"
  ];
}

function getWritingPrompt(focusAreaId, queryContext) {
  if (focusAreaId === "life-triad" && queryContext.primaryPalaceNames.length > 0) {
    return `围绕用户指定的${queryContext.topics.join("、")}主题写保守分析，优先引用${queryContext.primaryPalaceNames.join("、")}证据，并明确不能推具体事件。`;
  }

  const promptsByArea = {
    "life-triad": "用谨慎语气说明命宫与三方四正的结构关系，只引用已经排出的宫位和星曜。",
    "body-palace": "说明身宫代表后天发力点，不要把身宫单独当成完整结论。",
    "star-balance": "先做星曜类别统计，再提醒读者当前缺少大限四化和流年，不能过度推演。",
    "birth-year-transformations": "只说明生年四化在本命盘中的结构牵引，不推具体年份和事件。",
    "major-periods": "只说明大限年龄段和顺逆方向，不把大限骨架写成具体事件判断。",
    "current-major-period": "只说明分析日期对应的当前大限，不把阶段定位写成事件断语。"
  };

  return promptsByArea[focusAreaId] ?? "围绕证据写一段保守分析，并明确未知项。";
}

function buildGuardrails(agentResult) {
  return [
    "所有结论必须能回指到本次排盘已经生成的证据。",
    "没有实现的规则不得伪装成已经计算过的结果。",
    ...agentResult.limitations
  ];
}

function uniqueInOrder(values) {
  return [...new Set(values.filter(Boolean))];
}
