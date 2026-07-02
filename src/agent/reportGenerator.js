import { createReportDraft } from "./reportComposer.js";
import {
  createToolDefinition,
  createToolRegistry,
  executeTool,
  executeToolAsync,
  summarizeToolExecution
} from "./toolRuntime.js";

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
  const preparedGeneration = prepareReportGeneration(reportPlan, options);

  if (preparedGeneration.blockedResult) {
    return preparedGeneration.blockedResult;
  }

  const toolRun = runReportDraftProviderTool(preparedGeneration.providerResolution, {
    reportPlan,
    generationContext: preparedGeneration.generationContext
  });

  return finalizeReportGeneration({
    generationContext: preparedGeneration.generationContext,
    providerResolution: preparedGeneration.providerResolution,
    providerResult: toolRun.providerResult,
    toolRuntime: toolRun.toolRuntime,
    toolExecution: toolRun.toolExecution
  });
}

export async function generateReportDraftAsync(reportPlan, options = {}) {
  const preparedGeneration = prepareReportGeneration(reportPlan, options);

  if (preparedGeneration.blockedResult) {
    return preparedGeneration.blockedResult;
  }

  const toolRun = await runReportDraftProviderToolAsync(preparedGeneration.providerResolution, {
    reportPlan,
    generationContext: preparedGeneration.generationContext
  });

  return finalizeReportGeneration({
    generationContext: preparedGeneration.generationContext,
    providerResolution: preparedGeneration.providerResolution,
    providerResult: toolRun.providerResult,
    toolRuntime: toolRun.toolRuntime,
    toolExecution: toolRun.toolExecution
  });
}

function prepareReportGeneration(reportPlan, options) {
  const generationContext = createReportGenerationContext(reportPlan, options);

  if (generationContext.status !== "ready") {
    return {
      blockedResult: {
        status: "blocked",
        providerId: "none",
        contextVersion: GENERATION_CONTEXT_VERSION,
        messages: generationContext.messages,
        generationContext,
        reportDraft: createReportDraft(reportPlan)
      }
    };
  }

  const providerResolution = resolveReportDraftProvider(options);

  if (providerResolution.status !== "ready") {
    return {
      blockedResult: {
        status: "blocked",
        providerId: providerResolution.providerId,
        contextVersion: generationContext.version,
        messages: providerResolution.messages,
        generationContext,
        providerResolution,
        reportDraft: {
          status: "blocked",
          messages: providerResolution.messages,
          sections: [],
          closing: []
        }
      }
    };
  }

  return {
    generationContext,
    providerResolution
  };
}

function finalizeReportGeneration({
  generationContext,
  providerResolution,
  providerResult,
  toolRuntime,
  toolExecution
}) {
  if (!providerResult?.reportDraft) {
    const failureMessages = [
      ...(providerResult?.messages ?? []),
      "报告生成 provider 未返回 reportDraft，已阻断后续发布。"
    ];

    return {
      status: "blocked",
      providerId: providerResult?.providerId ?? "unknown-provider",
      contextVersion: generationContext.version,
      messages: failureMessages,
      generationContext,
      providerResolution,
      toolRuntime,
      toolExecution,
      reportDraft: {
        status: "blocked",
        messages: failureMessages,
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
    providerResolution,
    toolRuntime,
    toolExecution,
    reportDraft
  };
}

export function createReportGenerationContext(reportPlan, options = {}) {
  if (reportPlan.status !== "planned") {
    return {
      status: "blocked",
      version: GENERATION_CONTEXT_VERSION,
      generatorId: options.generatorId ?? REPORT_GENERATOR_IDS.DETERMINISTIC_TEMPLATE,
      providerMode: deriveProviderMode(options),
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
    providerMode: deriveProviderMode(options),
    subject: reportPlan.subject,
    queryIntent: reportPlan.queryIntent,
    opening: reportPlan.opening,
    guardrails: reportPlan.guardrails,
    sections: reportPlan.sections.map(buildGenerationSectionInput),
    outputContract: buildOutputContract()
  };
}

export function resolveReportDraftProvider(options = {}) {
  if (options.provider && typeof options.provider !== "function") {
    return {
      status: "blocked",
      providerId: options.providerId ?? options.generatorId ?? "custom-provider",
      mode: "custom",
      messages: ["调用方传入的报告 provider 不是函数，已阻断报告生成。"]
    };
  }

  if (typeof options.provider === "function") {
    return {
      status: "ready",
      providerId: options.providerId ?? options.generatorId ?? "custom-provider",
      mode: "custom",
      messages: ["已使用调用方传入的报告 provider。"],
      provider: options.provider
    };
  }

  const generatorId = options.generatorId ?? REPORT_GENERATOR_IDS.DETERMINISTIC_TEMPLATE;

  if (generatorId === REPORT_GENERATOR_IDS.DETERMINISTIC_TEMPLATE) {
    return {
      status: "ready",
      providerId: REPORT_GENERATOR_IDS.DETERMINISTIC_TEMPLATE,
      mode: "deterministic",
      messages: ["已选择确定性模板 provider。"],
      provider: createDeterministicDraftProvider()
    };
  }

  if (generatorId === REPORT_GENERATOR_IDS.EXTERNAL_LLM) {
    if (typeof options.externalProvider === "function") {
      return {
        status: "ready",
        providerId: REPORT_GENERATOR_IDS.EXTERNAL_LLM,
        mode: "external-llm",
        messages: ["已选择外部大模型 provider。"],
        provider: options.externalProvider
      };
    }

    return {
      status: "blocked",
      providerId: REPORT_GENERATOR_IDS.EXTERNAL_LLM,
      mode: "external-llm",
      messages: ["已选择外部大模型报告器，但尚未配置可调用的 externalProvider。"]
    };
  }

  return {
    status: "blocked",
    providerId: generatorId,
    mode: "unknown",
    messages: [`未知报告生成器：${generatorId}。`]
  };
}

export function createDeterministicDraftProvider() {
  return ({ reportPlan }) => {
    return {
      providerId: REPORT_GENERATOR_IDS.DETERMINISTIC_TEMPLATE,
      messages: ["已使用确定性模板生成器生成报告草稿。"],
      reportDraft: createReportDraft(reportPlan)
    };
  };
}

function runReportDraftProviderTool(providerResolution, input) {
  const preparedTool = createReportDraftProviderTool(providerResolution);
  const execution = executeTool(preparedTool.registry, preparedTool.toolId, input);

  return {
    toolRuntime: preparedTool.summary,
    toolExecution: summarizeToolExecution(execution),
    providerResult: normalizeToolExecutionProviderResult(execution)
  };
}

async function runReportDraftProviderToolAsync(providerResolution, input) {
  const preparedTool = createReportDraftProviderTool(providerResolution);
  const execution = await executeToolAsync(preparedTool.registry, preparedTool.toolId, input);

  return {
    toolRuntime: preparedTool.summary,
    toolExecution: summarizeToolExecution(execution),
    providerResult: normalizeToolExecutionProviderResult(execution)
  };
}

function createReportDraftProviderTool(providerResolution) {
  const toolId = `report-draft-provider:${providerResolution.providerId}`;
  const registry = createToolRegistry([
    createToolDefinition({
      id: toolId,
      kind: "report-draft-provider",
      owner: "agent",
      description: "执行受控报告草稿 provider。",
      inputContract: {
        requiredFields: ["reportPlan", "generationContext"]
      },
      outputContract: {
        requiredFields: ["providerId", "reportDraft"],
        auditGate: "reportAuditor",
        publishGate: "reportPublisher"
      },
      handler: providerResolution.provider
    })
  ]);

  return {
    toolId,
    registry,
    summary: {
      status: registry.status,
      version: registry.version,
      toolIds: registry.toolIds,
      issues: registry.issues,
      selectedToolId: toolId
    }
  };
}

function normalizeToolExecutionProviderResult(execution) {
  if (execution.status === "succeeded") {
    return execution.output;
  }

  if (execution.reason === "async-handler-on-sync-path") {
    return {
      providerId: "async-provider",
      messages: ["报告生成 provider 是 async function；同步 pipeline 已阻断，请使用 generateReportDraftAsync 或 runZiweiPipelineAsync。"]
    };
  }

  if (execution.reason === "promise-output-on-sync-path") {
    return {
      providerId: "async-provider",
      messages: ["报告生成 provider 返回 Promise；同步 pipeline 已阻断，请使用 generateReportDraftAsync 或 runZiweiPipelineAsync。"]
    };
  }

  if (execution.reason === "tool-execution-error") {
    return {
      providerId: "provider-error",
      messages: execution.messages.map((message) => {
        return message.replace("工具执行失败", "报告生成 provider 执行失败");
      })
    };
  }

  return {
    providerId: "tool-runtime-blocked",
    messages: execution.messages
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
    topicRefinements: (section.topicRefinements ?? []).map((refinement) => {
      return {
        id: refinement.id,
        topicId: refinement.topicId,
        topicTitle: refinement.topicTitle,
        title: refinement.title,
        angles: refinement.angles,
        text: refinement.text,
        evidenceRefs: refinement.evidenceRefs,
        referenceRefs: refinement.referenceRefs,
        sourceRefs: refinement.sourceRefs,
        knowledgeSnippetRefs: refinement.knowledgeSnippetRefs,
        interpretationRefs: refinement.interpretationRefs,
        riskLevel: refinement.riskLevel,
        blockedClaims: refinement.blockedClaims
      };
    }),
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

function deriveProviderMode(options) {
  if (options.provider) {
    return "custom";
  }

  if (options.generatorId === REPORT_GENERATOR_IDS.EXTERNAL_LLM) {
    return "external-llm";
  }

  return "deterministic";
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
