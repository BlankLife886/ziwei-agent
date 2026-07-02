import { auditAgentReadiness } from "./agentReadinessAuditor.js";
import {
  buildKnowledgeRetrievalIndex,
  summarizeKnowledgeRetrievalIndex
} from "./knowledgeRetrievalIndex.js";
import {
  generateReportDraft,
  generateReportDraftAsync
} from "./reportGenerator.js";
import { auditKnowledgeCoverage } from "./knowledgeCoverageAuditor.js";
import { auditReportOutput } from "./reportAuditor.js";
import { evaluateReportApproval } from "./reportApprovalGate.js";
import { createReportPlan } from "./reportPlanner.js";
import { publishReportOutput } from "./reportPublisher.js";
import { normalizeQueryIntent } from "./queryIntentParser.js";
import { createRecoveryPlan } from "./recoveryPlanner.js";
import { createZiweiAgentResponse } from "./ziweiAgent.js";

// agent 编排层。
//
// 这里是“真正 agent 流程”的主入口：它不排盘、不格式化文本，
// 只负责把 buildChart 的结果依次交给 agent context、report plan、
// report draft 三层。这样 CLI、未来 API、未来 Web 页面都只需要调用
// runZiweiPipeline，而不用各自复制一遍 agent 步骤。

export function runZiweiPipeline(buildResult, options = {}) {
  const preparedPipeline = preparePipeline(buildResult, options);
  const reportGeneration = generateReportDraft(preparedPipeline.reportPlan, buildReportGenerationOptions(options));

  return finalizePipeline({
    ...preparedPipeline,
    reportGeneration,
    reportApprovalOptions: buildReportApprovalOptions(options)
  });
}

export async function runZiweiPipelineAsync(buildResult, options = {}) {
  const preparedPipeline = preparePipeline(buildResult, options);
  const reportGeneration = await generateReportDraftAsync(
    preparedPipeline.reportPlan,
    buildReportGenerationOptions(options)
  );

  return finalizePipeline({
    ...preparedPipeline,
    reportGeneration,
    reportApprovalOptions: buildReportApprovalOptions(options)
  });
}

function preparePipeline(buildResult, options) {
  const queryIntent = normalizeQueryIntent(options.queryIntent);
  const knowledgeSnippets = options.knowledgeSnippets ?? [];
  const knowledgeRetrievalIndex = options.knowledgeRetrievalIndex ??
    buildKnowledgeRetrievalIndex(knowledgeSnippets);
  const agentResult = createZiweiAgentResponse(buildResult, { queryIntent });
  const reportPlan = createReportPlan(agentResult, {
    knowledgeSnippets,
    knowledgeRetrievalIndex
  });
  const knowledgeCoverageAudit = auditKnowledgeCoverage(reportPlan);

  return {
    queryIntent,
    buildResult,
    agentResult,
    reportPlan,
    knowledgeMemory: {
      status: knowledgeRetrievalIndex.status,
      type: "knowledge-memory",
      persistence: "json-store",
      reviewPolicy: "verified-snippets-only",
      retrieval: summarizeKnowledgeRetrievalIndex(knowledgeRetrievalIndex)
    },
    knowledgeCoverageAudit
  };
}

function buildReportGenerationOptions(options) {
  return {
    provider: options.reportDraftProvider,
    generatorId: options.reportGeneratorId,
    externalProvider: options.externalReportDraftProvider
  };
}

function buildReportApprovalOptions(options) {
  return {
    mode: options.reportApprovalMode,
    decision: options.reportApprovalDecision,
    reviewedAt: options.reportApprovalReviewedAt
  };
}

function finalizePipeline({
  queryIntent,
  buildResult,
  agentResult,
  reportPlan,
  knowledgeMemory,
  knowledgeCoverageAudit,
  reportGeneration,
  reportApprovalOptions
}) {
  const reportDraft = reportGeneration.reportDraft;
  const reportAudit = auditReportOutput(reportPlan, reportDraft);
  const reportApproval = evaluateReportApproval({
    reportPlan,
    reportDraft,
    reportAudit
  }, reportApprovalOptions);
  const reportOutput = publishReportOutput(reportPlan, reportDraft, reportAudit, reportApproval);
  const readinessAudit = auditAgentReadiness({
    queryIntent,
    buildResult,
    agentResult,
    reportPlan,
    knowledgeMemory,
    knowledgeCoverageAudit,
    reportGeneration,
    reportDraft,
    reportAudit,
    reportApproval,
    reportOutput
  });
  const recoveryPlan = createRecoveryPlan({
    queryIntent,
    buildResult,
    agentResult,
    reportPlan,
    knowledgeMemory,
    knowledgeCoverageAudit,
    reportGeneration,
    reportDraft,
    reportAudit,
    reportApproval,
    reportOutput,
    readinessAudit
  });

  return {
    status: derivePipelineStatus({
      agentResult,
      reportPlan,
      reportDraft,
      reportAudit,
      reportApproval,
      reportOutput
    }),
    nextAction: deriveNextAction({
      agentResult,
      reportPlan,
      reportDraft,
      reportAudit,
      reportApproval,
      reportOutput
    }),
    queryIntent,
    buildResult,
    agentResult,
    reportPlan,
    knowledgeMemory,
    knowledgeCoverageAudit,
    reportGeneration,
    reportDraft,
    reportAudit,
    reportApproval,
    reportOutput,
    readinessAudit,
    recoveryPlan,
    steps: [
      buildStep("query-intent", queryIntent.status),
      buildStep("agent-context", agentResult.status),
      buildStep("report-plan", reportPlan.status),
      buildStep("knowledge-coverage", knowledgeCoverageAudit.status),
      buildStep("report-generation", reportGeneration.status),
      buildStep("report-draft", reportDraft.status),
      buildStep("report-audit", reportAudit.status),
      buildStep("report-approval", reportApproval.status),
      buildStep("report-output", reportOutput.status),
      buildStep("agent-readiness", readinessAudit.status)
    ]
  };
}

function derivePipelineStatus({
  agentResult,
  reportPlan,
  reportDraft,
  reportAudit,
  reportApproval,
  reportOutput
}) {
  if (reportOutput.status === "published") {
    return "published";
  }

  if (reportAudit.status === "failed") {
    return "audit_failed";
  }

  if (reportApproval.status === "blocked") {
    return "approval_blocked";
  }

  if (reportDraft.status === "drafted") {
    return "drafted";
  }

  if (reportPlan.status === "planned") {
    return "planned";
  }

  if (agentResult.status === "ready") {
    return reportPlan.status;
  }

  return agentResult.status;
}

function deriveNextAction({
  agentResult,
  reportPlan,
  reportDraft,
  reportAudit,
  reportApproval,
  reportOutput
}) {
  if (agentResult.status === "invalid_input") {
    return "请先修正出生资料格式，再重新排盘。";
  }

  if (agentResult.status === "needs_input") {
    return "请先补齐出生资料，再进入命盘分析。";
  }

  if (reportPlan.status !== "planned") {
    if (reportPlan.nextQuestions?.length > 0) {
      return "请先补充本轮专题所需资料，再生成报告正文草稿。";
    }

    return reportPlan.messages?.[0] ?? "请先完成报告规划，再生成正文草稿。";
  }

  if (reportDraft.status !== "drafted") {
    return "请先生成报告正文草稿。";
  }

  if (reportAudit.status === "failed") {
    return "报告审计未通过，请先修复证据链、引用链或越界断语。";
  }

  if (reportApproval.status === "blocked") {
    return "请先完成报告发布人工确认，再输出用户报告。";
  }

  if (reportOutput.status !== "published") {
    return "请先通过报告发布门禁，再输出用户报告。";
  }

  return "可以审阅已发布的用户报告，或继续接入知识库与更细的命理规则。";
}

function buildStep(id, status) {
  return {
    id,
    status
  };
}
