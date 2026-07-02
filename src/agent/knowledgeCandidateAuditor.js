import { findKnowledgeSources } from "./knowledgeSnippetCatalog.js";
import { findReferences } from "./referenceCatalog.js";

// 知识候选片段质量审计。
//
// 这一层发生在 candidate 进入 draft 之前。它不判断命理内容是否“正确”，
// 只检查候选摘录是否具备进入知识库复核队列的最低工程质量：
// 来源可追踪、摘录足够具体、主题和规则引用相互匹配，并且没有把高风险
// 断语伪装成可直接引用的知识片段。

const MIN_EXCERPT_LENGTH = 24;
const MIN_CITATION_LENGTH = 8;

const TOPIC_REFERENCE_COMPATIBILITY = {
  life: [
    "framework.life-triad",
    "framework.body-palace",
    "framework.star-balance",
    "framework.palace-role"
  ],
  personality: [
    "framework.life-triad",
    "framework.body-palace",
    "framework.star-balance",
    "framework.palace-role"
  ],
  career: ["framework.career-palace"],
  wealth: ["framework.wealth-palace"],
  marriage: ["framework.spouse-palace"],
  fortune: [
    "framework.current-stage",
    "framework.timing-trigger-candidate",
    "framework.timing-combination-verification",
    "framework.timing-combination-theme",
    "framework.timing-cross-layer-analysis",
    "rule.major-periods",
    "rule.current-major-period",
    "rule.annual-period",
    "rule.annual-four-transformations",
    "rule.monthly-period"
  ],
  timing: [
    "framework.current-stage",
    "framework.timing-trigger-candidate",
    "framework.timing-combination-verification",
    "framework.timing-combination-theme",
    "framework.timing-cross-layer-analysis",
    "rule.major-periods",
    "rule.current-major-period",
    "rule.annual-period",
    "rule.annual-four-transformations",
    "rule.monthly-period"
  ],
  transformation: [
    "framework.current-stage",
    "framework.timing-trigger-candidate",
    "framework.timing-combination-verification",
    "rule.birth-year-four-transformations",
    "rule.major-period-four-transformations",
    "rule.annual-four-transformations"
  ]
};

const HIGH_RISK_PATTERNS = [
  {
    id: "absolute-claim",
    pattern: /必然|注定|铁定|一定会/u,
    message: "候选摘录包含绝对化断语，不能直接进入知识库复核队列。"
  },
  {
    id: "timing-event-claim",
    pattern: /具体年份|具体事件|今年具体事件|应期/u,
    message: "候选摘录包含具体事件或应期断语，需要先改写为边界说明或证据观察。"
  },
  {
    id: "relationship-outcome-claim",
    pattern: /结婚时间|离婚|分合事件|分离结论|婚姻灾断|伴侣具体身份/u,
    message: "候选摘录包含婚恋结果断语，需要先改写为可审计的关系结构观察。"
  },
  {
    id: "wealth-outcome-claim",
    pattern: /具体金额|投资结果|财富结果|暴富|破财/u,
    message: "候选摘录包含财富结果断语，需要先改写为资源结构或风险边界观察。"
  }
];

const BOUNDARY_LANGUAGE_PATTERN = /不能|不宜|不得|不应|避免|禁止|边界|不可|不直接|不输出|不推出/u;

export function auditKnowledgeSnippetCandidate(candidate) {
  const issues = [];
  const warnings = [];

  if (!isPlainObject(candidate)) {
    return {
      status: "failed",
      issues: [
        buildIssue("candidate.invalid", "知识候选片段必须是一个普通对象。")
      ],
      warnings
    };
  }

  auditRequiredFields(candidate, issues);
  auditSourceRef(candidate, issues);
  auditKnownReferences(candidate, issues);
  auditCitationQuality(candidate, issues);
  auditExcerptQuality(candidate, issues);
  auditTopicReferenceCompatibility(candidate, issues, warnings);
  auditRiskLanguage(candidate, issues);
  auditIdQuality(candidate, warnings);

  return {
    status: issues.length === 0 ? "passed" : "failed",
    issues,
    warnings
  };
}

export function auditKnowledgeSnippetCandidates(candidates) {
  if (!Array.isArray(candidates)) {
    return {
      status: "failed",
      items: [],
      issues: [
        buildIssue("candidate-batch.invalid", "批量候选片段必须是数组。")
      ],
      warnings: []
    };
  }

  const items = candidates.map((candidate, index) => {
    return {
      index,
      candidateId: typeof candidate?.id === "string" ? candidate.id : null,
      audit: auditKnowledgeSnippetCandidate(candidate)
    };
  });
  const issues = items.flatMap((item) => {
    return item.audit.issues.map((issue) => ({
      ...issue,
      index: item.index,
      candidateId: item.candidateId
    }));
  });
  const warnings = items.flatMap((item) => {
    return item.audit.warnings.map((warning) => ({
      ...warning,
      index: item.index,
      candidateId: item.candidateId
    }));
  });

  return {
    status: issues.length === 0 ? "passed" : "failed",
    items,
    issues,
    warnings
  };
}

function auditRequiredFields(candidate, issues) {
  requireString(candidate, "sourceRef", issues);
  requireString(candidate, "title", issues);
  requireString(candidate, "excerpt", issues);
  requireString(candidate, "citation", issues);
  requireStringArray(candidate, "topicIds", issues);
  requireStringArray(candidate, "referenceRefs", issues);
}

function auditSourceRef(candidate, issues) {
  const sourceRef = normalizeString(candidate.sourceRef);

  if (sourceRef && findKnowledgeSources([sourceRef]).length === 0) {
    issues.push(buildIssue(
      "candidate.sourceRef.unknown",
      "知识候选片段 sourceRef 必须指向已登记的知识来源。"
    ));
  }
}

function auditKnownReferences(candidate, issues) {
  const referenceRefs = normalizeStringArray(candidate.referenceRefs);

  for (const referenceRef of referenceRefs) {
    if (findReferences([referenceRef]).length === 0) {
      issues.push(buildIssue(
        "candidate.referenceRefs.unknown",
        `知识候选片段包含未登记的规则或框架引用：${referenceRef}。`
      ));
    }
  }
}

function auditCitationQuality(candidate, issues) {
  const citation = normalizeString(candidate.citation);

  if (!citation) {
    return;
  }

  if (citation.length < MIN_CITATION_LENGTH) {
    issues.push(buildIssue(
      "candidate.citation.too-short",
      "知识候选片段 citation 过短，无法定位到书名、文件名、页码、章节或段落。"
    ));
  }

  if (!hasCitationLocator(citation)) {
    issues.push(buildIssue(
      "candidate.citation.locator-missing",
      "知识候选片段 citation 需要包含可复核定位，例如书名/文件名、页码、章节或段落。"
    ));
  }
}

function auditExcerptQuality(candidate, issues) {
  const excerpt = normalizeString(candidate.excerpt);

  if (!excerpt) {
    return;
  }

  if (countMeaningfulCharacters(excerpt) < MIN_EXCERPT_LENGTH) {
    issues.push(buildIssue(
      "candidate.excerpt.too-short",
      `知识候选片段 excerpt 至少需要 ${MIN_EXCERPT_LENGTH} 个有效字符。`
    ));
  }
}

function auditTopicReferenceCompatibility(candidate, issues, warnings) {
  const topicIds = normalizeStringArray(candidate.topicIds);
  const referenceRefs = normalizeStringArray(candidate.referenceRefs);

  if (topicIds.length === 0 || referenceRefs.length === 0) {
    return;
  }

  for (const topicId of topicIds) {
    const compatibleRefs = TOPIC_REFERENCE_COMPATIBILITY[topicId];

    if (!compatibleRefs) {
      warnings.push(buildIssue(
        "candidate.topicIds.unknown",
        `知识候选片段包含未建立兼容规则的 topicId：${topicId}。`
      ));
      continue;
    }

    if (!referenceRefs.some((referenceRef) => compatibleRefs.includes(referenceRef))) {
      issues.push(buildIssue(
        "candidate.topic-reference.mismatch",
        `知识候选片段 topicId ${topicId} 缺少匹配的规则或框架引用。`
      ));
    }
  }
}

function auditRiskLanguage(candidate, issues) {
  const excerpt = normalizeString(candidate.excerpt);

  if (!excerpt) {
    return;
  }

  for (const rule of HIGH_RISK_PATTERNS) {
    const unboundedMatches = findUnboundedRiskMatches(excerpt, rule.pattern);

    if (unboundedMatches.length > 0) {
      issues.push(buildIssue(`candidate.risk-language.${rule.id}`, rule.message));
    }
  }
}

function findUnboundedRiskMatches(excerpt, pattern) {
  const globalPattern = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`
  );
  const matches = [...excerpt.matchAll(globalPattern)];

  return matches.filter((match) => {
    const segment = getRiskSegment(excerpt, match.index ?? 0);
    return !BOUNDARY_LANGUAGE_PATTERN.test(segment);
  });
}

function getRiskSegment(excerpt, matchIndex) {
  const segmentStart = findSegmentBoundary(excerpt, matchIndex, -1);
  const segmentEnd = findSegmentBoundary(excerpt, matchIndex, 1);

  return excerpt.slice(segmentStart, segmentEnd);
}

function findSegmentBoundary(excerpt, matchIndex, direction) {
  const boundaryPattern = /[。；;！？!?\n]|但是|然而|不过|可是|但/u;

  if (direction < 0) {
    for (let index = matchIndex; index >= 0; index -= 1) {
      const prefix = excerpt.slice(index, matchIndex + 1);
      const boundaryMatch = prefix.match(boundaryPattern);

      if (boundaryMatch?.index !== undefined) {
        return index + boundaryMatch.index + boundaryMatch[0].length;
      }
    }

    return 0;
  }

  for (let index = matchIndex; index <= excerpt.length; index += 1) {
    const suffix = excerpt.slice(matchIndex, index);
    const boundaryMatch = suffix.match(boundaryPattern);

    if (boundaryMatch?.index !== undefined) {
      return matchIndex + boundaryMatch.index;
    }
  }

  return excerpt.length;
}

function auditIdQuality(candidate, warnings) {
  const id = normalizeString(candidate.id);

  if (!id) {
    warnings.push(buildIssue(
      "candidate.id.generated",
      "候选片段缺少 id，后续 draft 会按来源、标题和 citation 自动生成。"
    ));
    return;
  }

  if (!id.startsWith("knowledge-snippet.")) {
    warnings.push(buildIssue(
      "candidate.id.prefix",
      "候选片段 id 建议使用 knowledge-snippet. 前缀，便于报告引用链追踪。"
    ));
  }
}

function requireString(record, field, issues) {
  if (typeof record[field] !== "string" || record[field].trim() === "") {
    issues.push(buildIssue(
      `candidate.${field}.required`,
      `知识候选片段缺少必填字符串字段 ${field}。`
    ));
  }
}

function requireStringArray(record, field, issues) {
  const value = record[field];

  if (!Array.isArray(value) || value.length === 0) {
    issues.push(buildIssue(
      `candidate.${field}.required`,
      `知识候选片段字段 ${field} 必须是非空字符串数组。`
    ));
    return;
  }

  if (value.some((item) => typeof item !== "string" || item.trim() === "")) {
    issues.push(buildIssue(
      `candidate.${field}.invalid-item`,
      `知识候选片段字段 ${field} 只能包含非空字符串。`
    ));
  }
}

function hasCitationLocator(citation) {
  return /\/|第.+页|页|章|节|段|文件|PDF|pdf|扫描|OCR|p\.\s*\d+/u.test(citation);
}

function countMeaningfulCharacters(value) {
  return normalizeString(value).replace(/\s+/g, "").length;
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(normalizeString).filter(Boolean))];
}

function buildIssue(id, message) {
  return { id, message };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
