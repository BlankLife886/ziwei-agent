// 报告发布器。
//
// reportComposer 产出的是“草稿”，reportAuditor 负责审计草稿。
// 这一层负责最后一道门禁：只有审计通过的草稿，才会被包装成可交付
// 给用户的 reportOutput。这样未来接入大模型后，也不会把未审计内容
// 直接当作最终报告输出。

export function publishReportOutput(reportPlan, reportDraft, reportAudit, reportApproval = createDefaultApproval()) {
  if (reportDraft.status !== "drafted") {
    return {
      status: "blocked",
      messages: ["报告正文草稿尚未生成，不能发布用户报告。"],
      sections: []
    };
  }

  if (reportAudit.status !== "passed") {
    return {
      status: "blocked",
      messages: buildAuditBlockedMessages(reportAudit),
      sections: []
    };
  }

  if (reportApproval.status !== "approved") {
    return {
      status: "blocked",
      messages: buildApprovalBlockedMessages(reportApproval),
      approval: summarizeApproval(reportApproval),
      sections: []
    };
  }

  return {
    status: "published",
    title: reportDraft.title,
    subject: reportDraft.subject,
    metadata: buildReportMetadata(reportPlan, reportDraft, reportAudit, reportApproval),
    introduction: reportDraft.introduction,
    brief: publishBrief(reportDraft.brief),
    sections: reportDraft.sections.map(publishSection),
    closing: reportDraft.closing,
    approval: summarizeApproval(reportApproval),
    audit: {
      status: reportAudit.status,
      issues: reportAudit.issues,
      warnings: reportAudit.warnings
    }
  };
}

function buildReportMetadata(reportPlan, reportDraft, reportAudit, reportApproval) {
  const sections = reportPlan.sections ?? [];
  const queryIntent = reportPlan.queryIntent ?? {};

  return {
    outputType: "ziwei-user-report",
    reportStatus: "published",
    draftStatus: reportDraft.status,
    auditStatus: reportAudit.status,
    approvalStatus: reportApproval.status,
    approvalMode: reportApproval.mode,
    queryIntent: {
      status: queryIntent.status ?? "none",
      topics: queryIntent.topics ?? [],
      topicIds: queryIntent.topicIds ?? [],
      focusAreaIds: queryIntent.focusAreaIds ?? [],
      reportDomainIds: queryIntent.reportDomainIds ?? []
    },
    sectionIds: sections.map((section) => section.id),
    evidenceRefs: uniqueInOrder(sections.flatMap((section) => section.evidenceRefs ?? [])),
    referenceRefs: uniqueInOrder(sections.flatMap((section) => section.referenceRefs ?? [])),
    sourceRefs: uniqueInOrder(sections.flatMap((section) => section.sourceRefs ?? [])),
    knowledgeSnippetRefs: uniqueInOrder(
      sections.flatMap((section) => section.knowledgeSnippetRefs ?? [])
    ),
    interpretationRefs: uniqueInOrder(
      sections.flatMap((section) => section.interpretationRefs ?? [])
    ),
    generation: reportDraft.generation ?? null,
    guardrails: reportPlan.guardrails ?? []
  };
}

function publishBrief(brief) {
  if (!brief) {
    return null;
  }

  return {
    kind: brief.kind,
    mode: brief.mode,
    subject: brief.subject,
    sectionSummaries: brief.sectionSummaries ?? [],
    paragraphs: (brief.paragraphs ?? []).map((paragraph) => {
      return {
        kind: paragraph.kind,
        text: paragraph.text,
        evidenceRefs: paragraph.evidenceRefs ?? [],
        referenceRefs: paragraph.referenceRefs ?? [],
        interpretationRefs: paragraph.interpretationRefs ?? []
      };
    })
  };
}

function publishSection(section) {
  return {
    id: section.id,
    title: section.title,
    evidenceRefs: section.evidenceRefs ?? [],
    referenceRefs: section.referenceRefs ?? [],
    sourceRefs: section.sourceRefs ?? [],
    knowledgeSnippetRefs: section.knowledgeSnippetRefs ?? [],
    interpretationRefs: section.interpretationRefs ?? [],
    topicRefinements: section.topicRefinements ?? [],
    paragraphs: section.paragraphs.map((paragraph) => {
      return {
        kind: paragraph.kind,
        text: paragraph.text,
        evidenceRefs: paragraph.evidenceRefs ?? [],
        referenceRefs: paragraph.referenceRefs ?? [],
        interpretationRefs: paragraph.interpretationRefs ?? []
      };
    })
  };
}

function buildAuditBlockedMessages(reportAudit) {
  if (reportAudit.status === "skipped") {
    return ["报告审计尚未执行，不能发布用户报告。"];
  }

  if (reportAudit.status === "failed") {
    return [
      "报告审计未通过，不能发布用户报告。",
      ...reportAudit.issues.map((issue) => issue.message)
    ];
  }

  return ["报告审计状态不明确，不能发布用户报告。"];
}

function buildApprovalBlockedMessages(reportApproval) {
  if (reportApproval.status === "skipped") {
    return ["报告发布确认尚未执行，不能发布用户报告。"];
  }

  if (reportApproval.status === "blocked") {
    return [
      "报告未通过发布确认，不能发布用户报告。",
      ...(reportApproval.messages ?? [])
    ];
  }

  return ["报告发布确认状态不明确，不能发布用户报告。"];
}

function summarizeApproval(reportApproval) {
  return {
    status: reportApproval.status,
    mode: reportApproval.mode,
    required: reportApproval.required,
    decision: reportApproval.decision,
    messages: reportApproval.messages ?? []
  };
}

function createDefaultApproval() {
  return {
    status: "approved",
    mode: "auto",
    required: false,
    decision: {
      status: "approved",
      reviewerId: "system:auto-approval",
      reason: "默认发布确认，用于保持旧调用兼容。",
      reviewedAt: new Date(0).toISOString()
    },
    messages: ["报告已通过默认发布确认。"]
  };
}

function uniqueInOrder(values) {
  return [...new Set(values.filter(Boolean))];
}
