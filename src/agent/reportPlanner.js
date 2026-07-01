import {
  findInterpretations
} from "./interpretationCatalog.js";
import { searchKnowledgeSnippets } from "./knowledgeSnippetCatalog.js";
import { findReferences, findSources } from "./referenceCatalog.js";
import {
  buildSectionGuidingQuestions,
  buildSectionInterpretationRefs,
  buildSectionPurpose,
  buildSectionTitle,
  buildSectionWritingPrompt
} from "./reportSectionCatalog.js";

// 命理报告草稿规划器。
//
// 这一层仍然不负责“断命”，而是把 agent 已经整理好的 focusAreas
// 转成更接近报告写作的章节结构。这样做有两个好处：
// 1. 后续接 LLM 时，可以把这些 section 当成稳定 prompt 输入。
// 2. 当前规则还没实现完整时，可以明确告诉使用者哪些内容只能浅谈。

export function createReportPlan(agentResult, options = {}) {
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
    return buildSectionFromFocusArea(focusArea, agentResult.queryIntent, options);
  });

  if (sections.length === 0) {
    const missingTopicFields = getMissingTopicFields(agentResult);

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
      questionItems: agentResult.questionItems,
      nextQuestions: agentResult.nextQuestions,
      missingTopicFields,
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
    "先从命宫、事业、财富、婚姻、身宫和星曜分布建立基础画像，再标注目前不能展开的分析边界。"
  ];
}

function buildSectionFromFocusArea(focusArea, queryIntent, options) {
  const evidenceItems = normalizeEvidenceItems(focusArea);
  const interpretationRefs = buildSectionInterpretationRefs(focusArea.id, evidenceItems);
  const interpretations = findInterpretations(interpretationRefs);
  const referenceRefs = collectReferenceRefs(evidenceItems, interpretations);
  const references = findReferences(referenceRefs);
  const queryContext = buildSectionQueryContext(focusArea.id, queryIntent);
  const knowledgeSnippets = searchKnowledgeSnippets({
    topicIds: queryContext.topicIds,
    referenceRefs
  }, {
    snippets: options.knowledgeSnippets
  });
  const sourceRefs = collectSectionSourceRefs(references, knowledgeSnippets);

  return {
    id: focusArea.id,
    title: buildSectionTitle(focusArea, queryContext),
    purpose: buildSectionPurpose(focusArea, queryContext),
    queryContext,
    guidingQuestions: buildSectionGuidingQuestions(focusArea.id, queryContext),
    evidence: evidenceItems.map((item) => item.text),
    evidenceItems,
    evidenceRefs: evidenceItems.map((item) => item.id),
    interpretationRefs,
    interpretations,
    referenceRefs,
    references,
    sourceRefs,
    sources: findSources(sourceRefs),
    knowledgeSnippetRefs: knowledgeSnippets.map((snippet) => snippet.id),
    knowledgeSnippets,
    writingPrompt: buildSectionWritingPrompt(focusArea.id, queryContext)
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

function collectSectionSourceRefs(references, knowledgeSnippets) {
  const referenceSourceRefs = references.flatMap((reference) => {
    return reference.sourceRefs ?? [];
  });
  const knowledgeSourceRefs = knowledgeSnippets.map((snippet) => snippet.sourceRef);

  return [...new Set([...referenceSourceRefs, ...knowledgeSourceRefs].filter(Boolean))];
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

function buildGuardrails(agentResult) {
  return [
    "所有结论必须能回指到本次排盘已经生成的证据。",
    "没有实现的规则不得伪装成已经计算过的结果。",
    ...agentResult.limitations
  ];
}

function getMissingTopicFields(agentResult) {
  return (agentResult.questionItems ?? []).map((item) => item.field);
}

function uniqueInOrder(values) {
  return [...new Set(values.filter(Boolean))];
}
