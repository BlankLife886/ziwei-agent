import { createReportDraft } from "./reportComposer.js";

// 报告生成器抽象层。
//
// 这一层是未来接入大模型的边界：pipeline 不应该直接把 reportPlan
// 丢给某个模型，也不应该让模型绕过证据链和审计门禁。
// 当前默认 provider 仍然调用确定性模板生成器，但会先产出一份稳定的
// generationContext，明确告诉未来的大模型：
// 1. 只能使用哪些章节、证据、引用和解释条目。
// 2. 必须遵守哪些 guardrails。
// 3. 输出必须继续满足 reportAuditor 可以审计的结构契约。

export const REPORT_GENERATOR_IDS = {
  DETERMINISTIC_TEMPLATE: "deterministic-template",
  EXTERNAL_LLM: "external-llm"
};

const GENERATION_CONTEXT_VERSION = "report-generation-context.v1";

export function generateReportDraft(reportPlan, options = {}) {
  const generationContext = createReportGenerationContext(reportPlan, options);

  if (generationContext.status !== "ready") {
    return {
      status: "blocked",
      providerId: "none",
      contextVersion: GENERATION_CONTEXT_VERSION,
      messages: generationContext.messages,
      generationContext,
      reportDraft: createReportDraft(reportPlan)
    };
  }

  const provider = options.provider ?? createDeterministicDraftProvider();
  const providerResult = provider({
    reportPlan,
    generationContext
  });

  if (!providerResult?.reportDraft) {
    return {
      status: "blocked",
      providerId: providerResult?.providerId ?? "unknown-provider",
      contextVersion: generationContext.version,
      messages: ["报告生成 provider 未返回 reportDraft，已阻断后续发布。"],
      generationContext,
      reportDraft: {
        status: "blocked",
        messages: ["报告生成 provider 未返回 reportDraft。"],
        sections: [],
        closing: []
      }
    };
  }

  const reportDraft = attachGenerationMetadata(providerResult.reportDraft, {
    providerId: providerResult.providerId ?? "unknown-provider",
    contextVersion: generationContext.version,
    outputContract: generationContext.outputContract
  });

  return {
    status: reportDraft.status === "drafted" ? "generated" : "blocked",
    providerId: providerResult.providerId,
    contextVersion: generationContext.version,
    messages: providerResult.messages ?? [],
    generationContext,
    reportDraft
  };
}

export function createReportGenerationContext(reportPlan, options = {}) {
  if (reportPlan.status !== "planned") {
    return {
      status: "blocked",
      version: GENERATION_CONTEXT_VERSION,
      generatorId: options.generatorId ?? REPORT_GENERATOR_IDS.DETERMINISTIC_TEMPLATE,
      messages: ["报告规划尚未完成，不能进入报告生成器。"],
      sections: [],
      guardrails: reportPlan.guardrails ?? [],
      outputContract: buildOutputContract()
    };
  }

  return {
    status: "ready",
    version: GENERATION_CONTEXT_VERSION,
    generatorId: options.generatorId ?? REPORT_GENERATOR_IDS.DETERMINISTIC_TEMPLATE,
    subject: reportPlan.subject,
    queryIntent: reportPlan.queryIntent,
    opening: reportPlan.opening,
    guardrails: reportPlan.guardrails,
    sections: reportPlan.sections.map(buildGenerationSectionInput),
    outputContract: buildOutputContract()
  };
}

function createDeterministicDraftProvider() {
  return ({ reportPlan }) => {
    return {
      providerId: REPORT_GENERATOR_IDS.DETERMINISTIC_TEMPLATE,
      messages: ["已使用确定性模板生成器生成报告草稿。"],
      reportDraft: createReportDraft(reportPlan)
    };
  };
}

function buildGenerationSectionInput(section) {
  return {
    id: section.id,
    title: section.title,
    purpose: section.purpose,
    writingPrompt: section.writingPrompt,
    guidingQuestions: section.guidingQuestions,
    queryContext: section.queryContext,
    evidenceItems: (section.evidenceItems ?? []).map((item) => {
      return {
        id: item.id,
        text: item.text,
        source: item.source,
        referenceRefs: item.referenceRefs ?? [],
        metadata: item.metadata ?? {}
      };
    }),
    refs: {
      evidenceRefs: section.evidenceRefs ?? [],
      referenceRefs: section.referenceRefs ?? [],
      sourceRefs: section.sourceRefs ?? [],
      knowledgeSnippetRefs: section.knowledgeSnippetRefs ?? [],
      interpretationRefs: section.interpretationRefs ?? []
    },
    knowledgeSnippets: (section.knowledgeSnippets ?? []).map((snippet) => {
      return {
        id: snippet.id,
        sourceRef: snippet.sourceRef,
        title: snippet.title,
        excerpt: snippet.excerpt,
        citation: snippet.citation,
        riskLevel: snippet.riskLevel
      };
    }),
    interpretations: (section.interpretations ?? []).map((interpretation) => {
      return {
        id: interpretation.id,
        title: interpretation.title,
        text: interpretation.text,
        riskLevel: interpretation.riskLevel,
        sourceRefs: interpretation.sourceRefs
      };
    })
  };
}

function buildOutputContract() {
  return {
    draftStatus: "drafted",
    requiredSectionRefFields: [
      "evidenceRefs",
      "referenceRefs",
      "sourceRefs",
      "knowledgeSnippetRefs",
      "interpretationRefs"
    ],
    requiredParagraphRefFields: [
      "evidenceRefs",
      "referenceRefs",
      "interpretationRefs"
    ],
    auditGate: "reportAuditor",
    publishGate: "reportPublisher"
  };
}

function attachGenerationMetadata(reportDraft, metadata) {
  return {
    ...reportDraft,
    generation: {
      providerId: metadata.providerId,
      contextVersion: metadata.contextVersion,
      outputContract: metadata.outputContract
    }
  };
}
