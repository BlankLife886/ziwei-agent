// Recovery Planner.
//
// 这一层不重新排盘、不重写报告，也不直接调用工具。它只把 pipeline 中
// 已经出现的阻断、审计失败或非阻断能力缺口整理成结构化恢复计划，
// 让调用方知道下一步应该由用户、运营者还是 agent 执行。

export function createRecoveryPlan(input = {}) {
  const actions = [
    ...buildInputRecoveryActions(input),
    ...buildReportPlanRecoveryActions(input),
    ...buildReportGenerationRecoveryActions(input),
    ...buildReportAuditRecoveryActions(input),
    ...buildReportApprovalRecoveryActions(input),
    ...buildReportOutputRecoveryActions(input)
  ];
  const advisoryActions = buildAdvisoryActions(input);
  const status = deriveRecoveryStatus({
    actions,
    advisoryActions
  });

  return {
    status,
    strategyId: deriveStrategyId({
      actions,
      advisoryActions
    }),
    canRetryAutomatically: actions.some((action) => action.canRetryAutomatically),
    requiresUserInput: actions.some((action) => action.owner === "user"),
    actions,
    advisoryActions,
    summary: buildRecoverySummary({
      status,
      actions,
      advisoryActions
    })
  };
}

function buildInputRecoveryActions({ buildResult, agentResult }) {
  if (buildResult?.status !== "invalid" && buildResult?.status !== "incomplete" &&
    agentResult?.status !== "needs_input") {
    return [];
  }

  const missingFields = buildResult?.validation?.missingFields ??
    agentResult?.questionItems?.map((item) => item.field) ??
    [];
  const reason = missingFields.length > 0
    ? `缺少字段：${missingFields.join("、")}。`
    : "出生资料不完整或格式不合法。";

  return [
    buildAction({
      id: "recover.input.collect-profile",
      title: "补齐出生资料",
      owner: "user",
      priority: "high",
      reason,
      nextStep: "向用户追问缺失字段，合并 profile 后重新执行 buildChart 和完整 pipeline。"
    })
  ];
}

function buildReportPlanRecoveryActions({ reportPlan }) {
  if (reportPlan?.status === "planned") {
    return [];
  }

  const questions = reportPlan?.nextQuestions ?? [];
  const message = reportPlan?.messages?.[0] ?? "报告规划尚未完成。";

  if (questions.length > 0) {
    return [
      buildAction({
        id: "recover.report-plan.collect-topic-input",
        title: "补充专题分析所需资料",
        owner: "user",
        priority: "high",
        reason: message,
        nextStep: questions.join("；")
      })
    ];
  }

  return [
    buildAction({
      id: "recover.report-plan.adjust-scope",
      title: "调整报告范围",
      owner: "agent",
      priority: "high",
      reason: message,
      nextStep: "把当前 queryIntent 收敛到已支持的报告章节，或提示该主题仅完成目标登记。"
    })
  ];
}

function buildReportGenerationRecoveryActions({ reportGeneration }) {
  if (reportGeneration?.status !== "blocked") {
    return [];
  }

  const providerResolution = reportGeneration.providerResolution;

  if (providerResolution?.mode === "external-llm") {
    return [
      buildAction({
        id: "recover.report-generation.configure-external-provider",
        title: "配置外部大模型 provider",
        owner: "operator",
        priority: "high",
        reason: reportGeneration.messages?.join("；") ?? "外部大模型 provider 未就绪。",
        nextStep: "配置 ZIWEI_LLM_ENDPOINT、ZIWEI_LLM_API_KEY、ZIWEI_LLM_MODEL，或切回 deterministic-template provider 后重试。"
      })
    ];
  }

  return [
    buildAction({
      id: "recover.report-generation.fix-provider",
      title: "修复报告生成 provider",
      owner: "operator",
      priority: "high",
      reason: reportGeneration.messages?.join("；") ?? "报告生成 provider 没有返回可审计草稿。",
      nextStep: "检查 provider 返回结构，确保返回 status=drafted 的 reportDraft。"
    })
  ];
}

function buildReportAuditRecoveryActions({ reportAudit }) {
  if (reportAudit?.status !== "failed") {
    return [];
  }

  const issueIds = (reportAudit.issues ?? []).map((issue) => issue.id);

  return [
    buildAction({
      id: "recover.report-audit.revise-draft",
      title: "修复报告草稿审计问题",
      owner: "agent",
      priority: "high",
      reason: issueIds.length > 0
        ? `报告审计失败：${issueIds.join("、")}。`
        : "报告审计失败。",
      nextStep: "按 reportPlan 重新生成或修订草稿，补齐 evidenceRefs、referenceRefs、sourceRefs、knowledgeSnippetRefs、interpretationRefs，并移除越界断语。"
    })
  ];
}

function buildReportApprovalRecoveryActions({ reportApproval }) {
  if (reportApproval?.status !== "blocked") {
    return [];
  }

  return [
    buildAction({
      id: "recover.report-approval.collect-human-decision",
      title: "补齐报告发布人工确认",
      owner: "operator",
      priority: "high",
      reason: reportApproval.messages?.join("；") ?? "报告尚未通过人工确认。",
      nextStep: "由具备发布权限的复核人审阅 reportDraft、reportAudit、knowledgeMemory 和 guardrails，提交 approved、rejected 或 changes_requested 决策后重新执行发布链路。"
    })
  ];
}

function buildReportOutputRecoveryActions({ reportOutput, reportAudit }) {
  if (reportOutput?.status !== "blocked" || reportAudit?.status === "failed") {
    return [];
  }

  return [
    buildAction({
      id: "recover.report-output.publish-gate",
      title: "检查发布门禁阻断原因",
      owner: "agent",
      priority: "medium",
      reason: reportOutput?.messages?.join("；") ?? "报告未发布。",
      nextStep: "检查 reportDraft 与 reportAudit 状态，确认草稿已通过审计后再进入 reportPublisher。"
    })
  ];
}

function buildAdvisoryActions({ knowledgeCoverageAudit, readinessAudit }) {
  const actions = [];

  if (knowledgeCoverageAudit?.status === "insufficient") {
    actions.push(buildAction({
      id: "advise.knowledge.ingest-verified-snippets",
      title: "补齐 verified 知识片段",
      owner: "operator",
      priority: "medium",
      reason: knowledgeCoverageAudit.summary,
      nextStep: "把书籍、PDF、OCR 或研读笔记整理为候选片段，经人工复核晋升为 verified 后再进入报告规划。"
    }));
  }

  if (readinessAudit?.status === "in_progress") {
    const priority = readinessAudit.nextPriorities?.[0];

    if (priority) {
      actions.push(buildAction({
        id: "advise.readiness.next-priority",
        title: "继续补强 agent 能力缺口",
        owner: "operator",
        priority: "low",
        reason: priority,
        nextStep: "按 readiness audit 的优先级继续补齐底层能力，而不是在报告中伪装能力已完成。"
      }));
    }
  }

  return actions;
}

function deriveRecoveryStatus({ actions, advisoryActions }) {
  if (actions.length > 0) {
    return "recoverable";
  }

  if (advisoryActions.length > 0) {
    return "advisory";
  }

  return "not_needed";
}

function deriveStrategyId({ actions, advisoryActions }) {
  if (actions.length > 0) {
    return actions[0].id;
  }

  if (advisoryActions.length > 0) {
    return advisoryActions[0].id;
  }

  return "recovery.not-needed";
}

function buildRecoverySummary({ status, actions, advisoryActions }) {
  if (status === "recoverable") {
    return `需要恢复处理：${actions.map((action) => action.title).join("、")}。`;
  }

  if (status === "advisory") {
    return `无发布阻断；建议继续补强：${advisoryActions.map((action) => action.title).join("、")}。`;
  }

  return "当前 pipeline 无需恢复处理。";
}

function buildAction({
  id,
  title,
  owner,
  priority,
  reason,
  nextStep,
  canRetryAutomatically = false
}) {
  return {
    id,
    title,
    owner,
    priority,
    reason,
    nextStep,
    canRetryAutomatically
  };
}
