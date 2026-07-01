// 报告发布器。
//
// reportComposer 产出的是“草稿”，reportAuditor 负责审计草稿。
// 这一层负责最后一道门禁：只有审计通过的草稿，才会被包装成可交付
// 给用户的 reportOutput。这样未来接入大模型后，也不会把未审计内容
// 直接当作最终报告输出。

export function publishReportOutput(reportPlan, reportDraft, reportAudit) {
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

  return {
    status: "published",
    title: reportDraft.title,
    subject: reportDraft.subject,
    metadata: buildReportMetadata(reportPlan, reportDraft, reportAudit),
    introduction: reportDraft.introduction,
    sections: reportDraft.sections.map(publishSection),
    closing: reportDraft.closing,
    audit: {
      status: reportAudit.status,
      issues: reportAudit.issues,
      warnings: reportAudit.warnings
    }
  };
}

function buildReportMetadata(reportPlan, reportDraft, reportAudit) {
  const sections = reportPlan.sections ?? [];
  const queryIntent = reportPlan.queryIntent ?? {};

  return {
    outputType: "ziwei-user-report",
    reportStatus: "published",
    draftStatus: reportDraft.status,
    auditStatus: reportAudit.status,
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
    guardrails: reportPlan.guardrails ?? []
  };
}

function publishSection(section) {
  return {
    id: section.id,
    title: section.title,
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

function uniqueInOrder(values) {
  return [...new Set(values.filter(Boolean))];
}
