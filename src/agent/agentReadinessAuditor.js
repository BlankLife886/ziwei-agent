// Agent 完整度审计器。
//
// 这个审计器用于回答“离可用的完整命理师 agent 还有多远”。
// 它不是玄学结论评分，而是工程能力覆盖度：输入、排盘、意图、知识库、
// 报告、审计、发布等关键层是否已经具备。

const READINESS_ITEMS = [
  {
    id: "birth-input",
    title: "出生资料输入与追问",
    weight: 10,
    evaluate: ({ pipelineResult }) => {
      return pipelineResult.agentResult.status === "needs_input" ||
        Boolean(pipelineResult.agentResult.subject)
        ? completed("已支持资料校验、缺字段追问和多轮补充。")
        : blocked("出生资料尚未进入可分析状态。");
    }
  },
  {
    id: "chart-calculation",
    title: "本命盘排盘计算",
    weight: 18,
    evaluate: ({ pipelineResult }) => {
      return pipelineResult.buildResult.status === "complete"
        ? completed("已完成命宫、身宫、主星、辅星、煞曜、生年四化和大限骨架。")
        : blocked("排盘结果尚未完整。");
    }
  },
  {
    id: "query-intent",
    title: "用户咨询意图识别",
    weight: 8,
    evaluate: ({ pipelineResult }) => {
      return ["none", "matched"].includes(pipelineResult.queryIntent.status)
        ? completed("已支持事业、财富、婚姻、运势等主题意图收敛。")
        : partial("仍需扩展更多自然语言问法和主题映射。", 0.5);
    }
  },
  {
    id: "report-planning",
    title: "报告规划",
    weight: 10,
    evaluate: ({ pipelineResult }) => {
      return pipelineResult.reportPlan.status === "planned"
        ? completed("已能按意图生成章节、证据、规则、来源和解释引用。")
        : blocked("报告规划尚未完成。");
    }
  },
  {
    id: "knowledge-coverage",
    title: "外部知识库覆盖",
    weight: 14,
    evaluate: ({ pipelineResult }) => {
      if (pipelineResult.knowledgeCoverageAudit.status === "covered") {
        return completed("当前规划章节已有 verified 外部知识片段。");
      }

      return partial("当前规划章节仍缺 verified 外部知识片段，不能升级为文献充分支撑的深入报告。", 0.15);
    }
  },
  {
    id: "interpretation-depth",
    title: "解释目录深度",
    weight: 12,
    evaluate: ({ pipelineResult }) => {
      const sections = pipelineResult.reportPlan.sections ?? [];
      const draftSections = pipelineResult.reportDraft.sections ?? [];
      const sectionsWithInterpretations = sections.filter((section) => {
        return section.interpretationRefs?.length > 0;
      }).length;
      const ratio = sections.length > 0 ? sectionsWithInterpretations / sections.length : 0;
      const sectionsWithSynthesis = draftSections.filter((section) => {
        return section.paragraphs?.some((paragraph) => {
          return paragraph.kind === "section-synthesis";
        });
      }).length;
      const synthesisRatio = sections.length > 0 ? sectionsWithSynthesis / sections.length : 0;
      const hasTimingCombinationThemeInterpretation = sections.some((section) => {
        return section.interpretationRefs?.includes("interpretation.timing-combination.theme-only");
      });
      const hasTimingCrossLayerInterpretation = sections.some((section) => {
        return section.interpretationRefs?.includes("interpretation.timing-cross-layer.structure-only");
      });
      const sectionsWithTopicRefinements = sections.filter((section) => {
        return section.topicRefinements?.some((refinement) => {
          return refinement.interpretationRefs?.includes("interpretation.topic-refinement.structure-only");
        });
      }).length;
      const topicRefinementRatio = sections.length > 0
        ? sectionsWithTopicRefinements / sections.length
        : 0;

      if (
        ratio === 1 &&
        synthesisRatio === 1 &&
        hasTimingCrossLayerInterpretation &&
        topicRefinementRatio === 1
      ) {
        return completed("当前支持章节已有解释条目、章节级组合归纳、组合主题解释、跨宫跨限运关系解释和专题细分任务单。");
      }

      if (ratio === 1 && synthesisRatio === 1 && hasTimingCrossLayerInterpretation) {
        return partial("所有当前章节已有解释条目、章节级组合归纳、组合主题解释和跨宫跨限运关系解释；后续仍需扩充更多文献支撑与专题细分。", 0.94);
      }

      if (ratio === 1 && synthesisRatio === 1 && hasTimingCombinationThemeInterpretation) {
        return partial("所有当前章节已有解释条目、章节级组合归纳和组合主题解释，但深层跨宫、跨限运解释仍需继续扩充。", 0.88);
      }

      if (ratio === 1 && synthesisRatio === 1) {
        return partial("所有当前章节已有解释条目和章节级组合归纳，但深层跨宫、跨限运解释仍需扩充。", 0.82);
      }

      if (ratio === 1) {
        return partial("所有当前章节已有解释条目，但组合解释仍偏基础。", 0.65);
      }

      return partial("部分章节缺少解释条目。", Math.max(0.2, ratio * 0.5));
    }
  },
  {
    id: "dynamic-timing",
    title: "动态运限规则",
    weight: 12,
    evaluate: ({ pipelineResult }) => {
      const hasCurrentMajorPeriod = Boolean(pipelineResult.buildResult.chart?.currentMajorPeriod);
      const hasMajorPeriodTransformations = Boolean(
        pipelineResult.buildResult.chart?.currentMajorPeriod?.transformations
      );
      const hasAnnualTransformations = Boolean(
        pipelineResult.buildResult.chart?.annualPeriod?.transformations
      );
      const hasMonthlyPeriod = Boolean(pipelineResult.buildResult.chart?.monthlyPeriod);
      const hasTimingTriggerCandidates = Boolean(
        pipelineResult.agentResult.allFocusAreas?.some((area) => {
          return area.evidenceItems?.some((item) => {
            return item.metadata?.timingTriggerCandidates?.length > 0;
          });
        })
      );
      const hasTimingCombinationVerifications = Boolean(
        pipelineResult.agentResult.allFocusAreas?.some((area) => {
          return area.evidenceItems?.some((item) => {
            return item.metadata?.timingCombinationVerifications?.length > 0;
          });
        })
      );
      const hasTimingCombinationThemes = Boolean(
        pipelineResult.agentResult.allFocusAreas?.some((area) => {
          return area.evidenceItems?.some((item) => {
            return item.metadata?.timingCombinationThemes?.length > 0;
          });
        })
      );
      const hasTimingCrossLayerInteractions = Boolean(
        pipelineResult.agentResult.allFocusAreas?.some((area) => {
          return area.evidenceItems?.some((item) => {
            return item.metadata?.timingCrossLayerInteractions?.length > 0;
          });
        })
      );

      if (
        hasCurrentMajorPeriod &&
        hasMajorPeriodTransformations &&
        hasAnnualTransformations &&
        hasMonthlyPeriod &&
        hasTimingTriggerCandidates &&
        hasTimingCombinationVerifications &&
        hasTimingCombinationThemes &&
        hasTimingCrossLayerInteractions
      ) {
        return completed("已支持当前大限定位、大限四化骨架、流年四化骨架、流月骨架、安全事件触发候选、组合验证底座、组合主题解释和跨宫跨限运关系解释。");
      }

      if (
        hasCurrentMajorPeriod &&
        hasMajorPeriodTransformations &&
        hasAnnualTransformations &&
        hasMonthlyPeriod &&
        hasTimingTriggerCandidates &&
        hasTimingCombinationVerifications &&
        hasTimingCombinationThemes
      ) {
        return partial("已支持当前大限定位、大限四化骨架、流年四化骨架、流月骨架、安全事件触发候选、组合验证底座和组合主题解释，但深层跨宫、跨限运解释仍需继续扩充。", 0.98);
      }

      if (
        hasCurrentMajorPeriod &&
        hasMajorPeriodTransformations &&
        hasAnnualTransformations &&
        hasMonthlyPeriod &&
        hasTimingTriggerCandidates &&
        hasTimingCombinationVerifications
      ) {
        return partial("已支持当前大限定位、大限四化骨架、流年四化骨架、流月骨架、安全事件触发候选和组合验证底座，但深层跨宫、跨限运解释仍需扩充。", 0.96);
      }

      if (
        hasCurrentMajorPeriod &&
        hasMajorPeriodTransformations &&
        hasAnnualTransformations &&
        hasMonthlyPeriod &&
        hasTimingTriggerCandidates
      ) {
        return partial("已支持当前大限定位、大限四化骨架、流年四化骨架、流月骨架和安全事件触发候选，但尚未完成深层组合验证。", 0.9);
      }

      if (
        hasCurrentMajorPeriod &&
        hasMajorPeriodTransformations &&
        hasAnnualTransformations &&
        hasTimingTriggerCandidates
      ) {
        return partial("已支持当前大限定位、大限四化骨架、流年四化骨架和安全事件触发候选，但尚未接入流月和组合验证。", 0.82);
      }

      if (hasCurrentMajorPeriod && hasMajorPeriodTransformations && hasAnnualTransformations) {
        return partial("已支持当前大限定位、大限四化骨架和流年四化骨架，但尚未接入事件触发规则、流月和组合验证。", 0.7);
      }

      if (hasCurrentMajorPeriod && hasMajorPeriodTransformations) {
        return partial("已支持当前大限定位和大限四化骨架，但尚未接入流年盘和事件触发规则。", 0.55);
      }

      if (hasCurrentMajorPeriod) {
        return partial("已支持当前大限定位，但尚未接入大限四化、流年盘和事件触发规则。", 0.35);
      }

      return partial("已支持大限骨架，但缺少分析日期时不能定位当前阶段，且尚未接入大限四化、流年盘和事件触发规则。", 0.25);
    }
  },
  {
    id: "draft-and-publish",
    title: "报告草稿与发布门禁",
    weight: 10,
    evaluate: ({ pipelineResult }) => {
      return pipelineResult.reportOutput.status === "published"
        ? completed("已能生成保守报告并通过审计后发布。")
        : blocked("用户报告尚未通过发布门禁。");
    }
  },
  {
    id: "llm-and-product",
    title: "大模型报告器与产品化",
    weight: 6,
    evaluate: ({ pipelineResult }) => {
      if (pipelineResult.reportGeneration?.status === "generated") {
        return partial("已建立报告生成器合同和确定性 provider，但尚未接入外部大模型、API、UI、权限、观测和生产部署。", 0.25);
      }

      return partial("尚未接入大模型生成器、API、UI、权限、观测和生产部署。", 0);
    }
  }
];

export function auditAgentReadiness(pipelineResult) {
  const items = READINESS_ITEMS.map((item) => {
    const result = item.evaluate({ pipelineResult });

    return {
      id: item.id,
      title: item.title,
      weight: item.weight,
      status: result.status,
      score: item.weight * result.ratio,
      message: result.message
    };
  });
  const totalWeight = READINESS_ITEMS.reduce((sum, item) => sum + item.weight, 0);
  const score = items.reduce((sum, item) => sum + item.score, 0);
  const percent = Math.round((score / totalWeight) * 100);
  const blockers = items.filter((item) => item.status !== "complete").map((item) => {
    return `${item.title}：${item.message}`;
  });

  return {
    status: percent >= 90 ? "near_complete" : "in_progress",
    percent,
    score,
    totalWeight,
    items,
    blockers,
    nextPriorities: buildNextPriorities(items)
  };
}

function completed(message) {
  return {
    status: "complete",
    ratio: 1,
    message
  };
}

function partial(message, ratio) {
  return {
    status: "partial",
    ratio,
    message
  };
}

function blocked(message) {
  return {
    status: "blocked",
    ratio: 0,
    message
  };
}

function buildNextPriorities(items) {
  return items
    .filter((item) => item.status !== "complete")
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map((item) => `${item.title}：${item.message}`);
}
