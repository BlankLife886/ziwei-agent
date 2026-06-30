import { createReportDraft } from "./reportComposer.js";
import { auditReportOutput } from "./reportAuditor.js";
import { createReportPlan } from "./reportPlanner.js";
import { normalizeQueryIntent } from "./queryIntentParser.js";
import { createZiweiAgentResponse } from "./ziweiAgent.js";

// agent 编排层。
//
// 这里是“真正 agent 流程”的主入口：它不排盘、不格式化文本，
// 只负责把 buildChart 的结果依次交给 agent context、report plan、
// report draft 三层。这样 CLI、未来 API、未来 Web 页面都只需要调用
// runZiweiPipeline，而不用各自复制一遍 agent 步骤。

export function runZiweiPipeline(buildResult, options = {}) {
  const queryIntent = normalizeQueryIntent(options.queryIntent);
  const agentResult = createZiweiAgentResponse(buildResult, { queryIntent });
  const reportPlan = createReportPlan(agentResult);
  const reportDraft = createReportDraft(reportPlan);
  const reportAudit = auditReportOutput(reportPlan, reportDraft);

  return {
    status: derivePipelineStatus({ agentResult, reportPlan, reportDraft, reportAudit }),
    nextAction: deriveNextAction({ agentResult, reportPlan, reportDraft, reportAudit }),
    queryIntent,
    buildResult,
    agentResult,
    reportPlan,
    reportDraft,
    reportAudit,
    steps: [
      buildStep("query-intent", queryIntent.status),
      buildStep("agent-context", agentResult.status),
      buildStep("report-plan", reportPlan.status),
      buildStep("report-draft", reportDraft.status),
      buildStep("report-audit", reportAudit.status)
    ]
  };
}

function derivePipelineStatus({ agentResult, reportPlan, reportDraft, reportAudit }) {
  if (reportAudit.status === "failed") {
    return "audit_failed";
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

function deriveNextAction({ agentResult, reportPlan, reportDraft, reportAudit }) {
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

  return "可以审阅报告草稿，或继续接入知识库与更细的命理规则。";
}

function buildStep(id, status) {
  return {
    id,
    status
  };
}
