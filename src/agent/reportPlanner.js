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

  return {
    status: "planned",
    role: agentResult.role,
    subject: agentResult.subject,
    opening: buildOpening(agentResult),
    sections: agentResult.focusAreas.map(buildSectionFromFocusArea),
    guardrails: buildGuardrails(agentResult)
  };
}

function buildOpening(agentResult) {
  return [
    `本报告以${agentResult.subject.name}的本命盘为分析对象。`,
    "先从命宫、身宫和星曜分布建立基础画像，再标注目前不能展开的分析边界。"
  ];
}

function buildSectionFromFocusArea(focusArea) {
  const evidenceItems = normalizeEvidenceItems(focusArea);
  const referenceRefs = collectReferenceRefs(evidenceItems);

  return {
    id: focusArea.id,
    title: focusArea.title,
    purpose: focusArea.reason,
    guidingQuestions: getGuidingQuestions(focusArea.id),
    evidence: evidenceItems.map((item) => item.text),
    evidenceItems,
    evidenceRefs: evidenceItems.map((item) => item.id),
    referenceRefs,
    references: findReferences(referenceRefs),
    writingPrompt: getWritingPrompt(focusArea.id)
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

function collectReferenceRefs(evidenceItems) {
  const referenceRefs = evidenceItems.flatMap((item) => {
    return item.referenceRefs ?? [];
  });

  return [...new Set(referenceRefs)];
}

function getGuidingQuestions(focusAreaId) {
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
    ]
  };

  return questionsByArea[focusAreaId] ?? [
    "这一节有哪些可验证的命盘证据？",
    "这些证据能支持什么层级的分析？"
  ];
}

function getWritingPrompt(focusAreaId) {
  const promptsByArea = {
    "life-triad": "用谨慎语气说明命宫与三方四正的结构关系，只引用已经排出的宫位和星曜。",
    "body-palace": "说明身宫代表后天发力点，不要把身宫单独当成完整结论。",
    "star-balance": "先做星曜类别统计，再提醒读者当前缺少四化和限运，不能过度推演。"
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
