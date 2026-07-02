// 产品侧人工确认门禁。
//
// reportAuditor 负责机器审计：证据链、引用链和高风险断语。
// 本模块负责产品侧发布确认：在需要人工复核的运行策略下，只有明确
// approved 的决策才能进入 reportPublisher。默认 auto 策略用于本地
// CLI、测试和低风险自动化链路，不代表已经有人工审阅。

export const REPORT_APPROVAL_MODES = {
  AUTO: "auto",
  REQUIRE_REVIEW: "require-review"
};

export const REPORT_APPROVAL_DECISIONS = {
  APPROVED: "approved",
  REJECTED: "rejected",
  CHANGES_REQUESTED: "changes_requested"
};

export function evaluateReportApproval(input = {}, options = {}) {
  const mode = normalizeApprovalMode(options.mode);
  const reportDraft = input.reportDraft;
  const reportAudit = input.reportAudit;

  if (reportDraft?.status !== "drafted") {
    return skippedApproval("报告草稿尚未生成，跳过人工确认门禁。", mode);
  }

  if (reportAudit?.status !== "passed") {
    return skippedApproval("报告审计尚未通过，跳过人工确认门禁。", mode);
  }

  if (mode === REPORT_APPROVAL_MODES.AUTO) {
    return {
      status: "approved",
      mode,
      required: false,
      decision: {
        status: REPORT_APPROVAL_DECISIONS.APPROVED,
        reviewerId: "system:auto-approval",
        reason: "当前运行策略允许审计通过的报告自动发布。",
        reviewedAt: options.reviewedAt ?? new Date(0).toISOString()
      },
      messages: ["报告已通过自动发布确认。"]
    };
  }

  const normalizedDecision = normalizeApprovalDecision(options.decision);

  if (!normalizedDecision) {
    return blockedApproval({
      mode,
      decision: null,
      message: "当前运行策略要求人工确认，但尚未提供审批决策。"
    });
  }

  if (normalizedDecision.status === REPORT_APPROVAL_DECISIONS.APPROVED) {
    return {
      status: "approved",
      mode,
      required: true,
      decision: normalizedDecision,
      messages: ["报告已通过人工发布确认。"]
    };
  }

  return blockedApproval({
    mode,
    decision: normalizedDecision,
    message: normalizedDecision.status === REPORT_APPROVAL_DECISIONS.CHANGES_REQUESTED
      ? "人工确认要求修改报告，暂不发布。"
      : "人工确认拒绝发布报告。"
  });
}

function skippedApproval(message, mode) {
  return {
    status: "skipped",
    mode,
    required: mode === REPORT_APPROVAL_MODES.REQUIRE_REVIEW,
    decision: null,
    messages: [message]
  };
}

function blockedApproval({
  mode,
  decision,
  message
}) {
  return {
    status: "blocked",
    mode,
    required: true,
    decision,
    messages: [message]
  };
}

function normalizeApprovalMode(mode) {
  return Object.values(REPORT_APPROVAL_MODES).includes(mode)
    ? mode
    : REPORT_APPROVAL_MODES.AUTO;
}

function normalizeApprovalDecision(decision) {
  if (!decision || typeof decision !== "object") {
    return null;
  }

  if (!Object.values(REPORT_APPROVAL_DECISIONS).includes(decision.status)) {
    return null;
  }

  return {
    status: decision.status,
    reviewerId: typeof decision.reviewerId === "string" && decision.reviewerId.trim()
      ? decision.reviewerId
      : "unknown-reviewer",
    reason: typeof decision.reason === "string" ? decision.reason : "",
    reviewedAt: typeof decision.reviewedAt === "string" && decision.reviewedAt.trim()
      ? decision.reviewedAt
      : new Date(0).toISOString()
  };
}
