// 报告审计器。
//
// 这一层不排盘、不规划章节、不写正文，只检查 reportPlan/reportDraft
// 是否仍然遵守 agent 契约。后续接入大模型后，这里会变得更重要：
// 模型生成的段落必须先通过审计，才能作为用户报告输出。

const RISK_RULES = [
  {
    id: "absolute-certainty",
    pattern: /必然|注定|铁定|一定会/u,
    allowedContextPattern: /不能|不得|不可|不应|避免|禁止|边界|不可审计/u,
    message: "出现绝对化表达，需要确认是否只是边界提示。"
  },
  {
    id: "event-timing",
    pattern: /具体年份|具体事件|今年具体事件|应期/u,
    allowedContextPattern: /不能|不得|不推|不宜|不适合|尚未|需等待|需要等待|仍需等待|边界/u,
    message: "出现时间或事件断语，需要确认是否只是能力边界。"
  },
  {
    id: "marriage-outcome",
    pattern: /结婚时间|离婚|分合事件|分离结论|婚姻灾断|伴侣具体身份/u,
    allowedContextPattern: /不能|不得|不推|不应|不宜|尚未|边界/u,
    message: "出现婚恋结果类表达，需要确认是否只是能力边界。"
  },
  {
    id: "wealth-outcome",
    pattern: /具体金额|投资结果|财富结果|暴富|破财/u,
    allowedContextPattern: /不能|不得|不推|不应|不宜|尚未|边界/u,
    message: "出现财富结果类表达，需要确认是否只是能力边界。"
  },
  {
    id: "career-outcome",
    pattern: /职位高低|升迁时间|具体职业结果|失败|灾厄/u,
    allowedContextPattern: /不能|不得|不推|不应|不宜|尚未|边界|不适合/u,
    message: "出现事业结果或灾厄类表达，需要确认是否只是能力边界。"
  },
  {
    id: "good-bad-finality",
    pattern: /吉凶|定吉凶/u,
    allowedContextPattern: /不能|不得|不推|不应|不宜|尚未|还不能|具体|边界/u,
    message: "出现吉凶判断表达，需要确认是否只是能力边界。"
  }
];

export function auditReportOutput(reportPlan, reportDraft) {
  const issues = [];
  const warnings = [];

  if (!reportPlan || !reportDraft) {
    return buildAuditResult([
      createIssue("missing-report-output", "缺少 reportPlan 或 reportDraft，无法审计。")
    ], warnings);
  }

  if (reportPlan.status !== "planned" || reportDraft.status !== "drafted") {
    return {
      status: "skipped",
      issues,
      warnings
    };
  }

  const sectionsById = new Map(reportPlan.sections.map((section) => {
    return [section.id, section];
  }));

  auditDraftSections(reportDraft, sectionsById, issues);
  auditRiskLanguage(reportDraft, warnings);
  auditTimingTriggerFraming(reportDraft, warnings);

  return buildAuditResult(issues, warnings);
}

function auditDraftSections(reportDraft, sectionsById, issues) {
  reportDraft.sections.forEach((draftSection) => {
    const planSection = sectionsById.get(draftSection.id);

    if (!planSection) {
      issues.push(createIssue(
        "section-not-planned",
        `报告草稿章节 ${draftSection.id} 不在 reportPlan 中。`,
        { sectionId: draftSection.id }
      ));
      return;
    }

    auditSectionRefs(draftSection, planSection, issues);
    auditParagraphRefs(draftSection, planSection, issues);
  });
}

function auditSectionRefs(draftSection, planSection, issues) {
  const missingEvidenceRefs = findMissingRefs(
    draftSection.evidenceRefs,
    planSection.evidenceRefs
  );
  const missingReferenceRefs = findMissingRefs(
    draftSection.referenceRefs,
    planSection.referenceRefs
  );
  const missingSourceRefs = findMissingRefs(
    draftSection.sourceRefs,
    planSection.sourceRefs
  );
  const missingKnowledgeSnippetRefs = findMissingRefs(
    draftSection.knowledgeSnippetRefs,
    planSection.knowledgeSnippetRefs
  );
  const missingInterpretationRefs = findMissingRefs(
    draftSection.interpretationRefs,
    planSection.interpretationRefs
  );

  pushMissingRefIssue(issues, draftSection.id, "evidenceRefs", missingEvidenceRefs);
  pushMissingRefIssue(issues, draftSection.id, "referenceRefs", missingReferenceRefs);
  pushMissingRefIssue(issues, draftSection.id, "sourceRefs", missingSourceRefs);
  pushMissingRefIssue(issues, draftSection.id, "knowledgeSnippetRefs", missingKnowledgeSnippetRefs);
  pushMissingRefIssue(issues, draftSection.id, "interpretationRefs", missingInterpretationRefs);
}

function auditParagraphRefs(draftSection, planSection, issues) {
  const allowedEvidenceRefs = new Set(planSection.evidenceRefs ?? []);
  const allowedReferenceRefs = new Set(planSection.referenceRefs ?? []);
  const allowedInterpretationRefs = new Set(planSection.interpretationRefs ?? []);

  draftSection.paragraphs.forEach((paragraph) => {
    auditParagraphRefGroup({
      issues,
      sectionId: draftSection.id,
      paragraphKind: paragraph.kind,
      refName: "evidenceRefs",
      refs: paragraph.evidenceRefs,
      allowedRefs: allowedEvidenceRefs
    });
    auditParagraphRefGroup({
      issues,
      sectionId: draftSection.id,
      paragraphKind: paragraph.kind,
      refName: "referenceRefs",
      refs: paragraph.referenceRefs,
      allowedRefs: allowedReferenceRefs
    });
    auditParagraphRefGroup({
      issues,
      sectionId: draftSection.id,
      paragraphKind: paragraph.kind,
      refName: "interpretationRefs",
      refs: paragraph.interpretationRefs,
      allowedRefs: allowedInterpretationRefs
    });
  });
}

function auditParagraphRefGroup({
  issues,
  sectionId,
  paragraphKind,
  refName,
  refs = [],
  allowedRefs
}) {
  const unknownRefs = refs.filter((ref) => {
    return !allowedRefs.has(ref);
  });

  if (unknownRefs.length === 0) {
    return;
  }

  issues.push(createIssue(
    "paragraph-ref-outside-section",
    `${sectionId} 的 ${paragraphKind} 段落引用了不属于本章节的 ${refName}：${unknownRefs.join("、")}。`,
    {
      sectionId,
      paragraphKind,
      refName,
      refs: unknownRefs
    }
  ));
}

function auditRiskLanguage(reportDraft, warnings) {
  collectDraftTexts(reportDraft).forEach((item) => {
    RISK_RULES.forEach((rule) => {
      if (!rule.pattern.test(item.text)) {
        return;
      }

      if (rule.allowedContextPattern.test(item.text)) {
        return;
      }

      warnings.push({
        id: `risk-language.${rule.id}`,
        message: rule.message,
        sectionId: item.sectionId,
        paragraphKind: item.paragraphKind,
        text: item.text
      });
    });
  });
}

function auditTimingTriggerFraming(reportDraft, warnings) {
  collectDraftTexts(reportDraft).forEach((item) => {
    if (!/触发候选|触发观察点|安全触发/u.test(item.text)) {
      return;
    }

    if (/观察点|待验证|不推|不能|不是事件预测/u.test(item.text)) {
      return;
    }

    warnings.push({
      id: "risk-language.timing-trigger-framing",
      message: "触发候选必须保持观察点或待验证表述，不能写成事件预测。",
      sectionId: item.sectionId,
      paragraphKind: item.paragraphKind,
      text: item.text
    });
  });
}

function collectDraftTexts(reportDraft) {
  const sectionTexts = reportDraft.sections.flatMap((section) => {
    return section.paragraphs.map((paragraph) => {
      return {
        sectionId: section.id,
        paragraphKind: paragraph.kind,
        text: paragraph.text
      };
    });
  });
  const closingTexts = (reportDraft.closing ?? []).map((text, index) => {
    return {
      sectionId: "closing",
      paragraphKind: `closing-${index + 1}`,
      text
    };
  });

  return [...sectionTexts, ...closingTexts];
}

function findMissingRefs(actualRefs = [], allowedRefs = []) {
  const allowedRefSet = new Set(allowedRefs);

  return actualRefs.filter((ref) => {
    return !allowedRefSet.has(ref);
  });
}

function pushMissingRefIssue(issues, sectionId, refName, missingRefs) {
  if (missingRefs.length === 0) {
    return;
  }

  issues.push(createIssue(
    "section-ref-outside-plan",
    `${sectionId} 章节包含不在 reportPlan 中的 ${refName}：${missingRefs.join("、")}。`,
    {
      sectionId,
      refName,
      refs: missingRefs
    }
  ));
}

function createIssue(id, message, details = {}) {
  return {
    id,
    message,
    ...details
  };
}

function buildAuditResult(issues, warnings) {
  return {
    status: issues.length === 0 ? "passed" : "failed",
    issues,
    warnings
  };
}
