const REQUIRED_STEP_IDS = [
  "query-intent",
  "agent-context",
  "report-plan",
  "knowledge-coverage",
  "report-generation",
  "report-draft",
  "report-audit",
  "report-output",
  "agent-readiness"
];

const DEFAULT_CAPABILITIES = {
  apiGuardrails: true,
  observability: true,
  releaseGates: true,
  cloudflareDeployment: true,
  ciReleaseGate: true,
  humanKnowledgeReview: true,
  genericToolRegistry: false,
  longTermMemory: false,
  vectorStore: false,
  webSessionAuth: false
};

const ARCHITECTURE_ITEMS = [
  {
    id: "intent-router",
    title: "Intent Router 意图识别",
    weight: 9,
    critical: true,
    evaluate: ({ pipelineResult }) => {
      return hasStep(pipelineResult, "query-intent") &&
        ["none", "matched", "unsupported"].includes(pipelineResult.queryIntent?.status)
        ? aligned("已通过 queryIntentParser 把用户问题收敛为可审计专题。")
        : missing("缺少稳定的咨询意图识别入口。");
    }
  },
  {
    id: "context-builder",
    title: "Context Builder 上下文构建",
    weight: 10,
    critical: true,
    evaluate: ({ pipelineResult }) => {
      const agentResult = pipelineResult.agentResult ?? {};
      const hasEvidence = Array.isArray(agentResult.evidenceItems) &&
        agentResult.evidenceItems.length > 0;
      const hasFocusAreas = Array.isArray(agentResult.allFocusAreas) &&
        agentResult.allFocusAreas.length > 0;

      return agentResult.status === "ready" && hasEvidence && hasFocusAreas
        ? aligned("已把命盘转换为 evidence、focusAreas、limitations 和追问上下文。")
        : missing("命盘尚未被转换成可供 Planner 使用的结构化上下文。");
    }
  },
  {
    id: "planner",
    title: "Planner 任务规划",
    weight: 10,
    critical: true,
    evaluate: ({ pipelineResult }) => {
      const sections = pipelineResult.reportPlan?.sections ?? [];

      return pipelineResult.reportPlan?.status === "planned" && sections.length > 0
        ? aligned("已通过 reportPlanner 生成章节、证据、规则、解释和知识片段引用计划。")
        : missing("缺少可执行的结构化报告计划。");
    }
  },
  {
    id: "state-machine",
    title: "Task Graph / State Machine",
    weight: 10,
    critical: true,
    evaluate: ({ pipelineResult }) => {
      const stepIds = (pipelineResult.steps ?? []).map((step) => step.id);
      const matchesExpectedOrder = REQUIRED_STEP_IDS.every((stepId, index) => {
        return stepIds[index] === stepId;
      });

      return matchesExpectedOrder
        ? aligned("pipeline 已按 query -> context -> plan -> generate -> audit -> publish 固定状态链执行。")
        : missing("pipeline 步骤顺序不完整，存在绕过核心状态链的风险。");
    }
  },
  {
    id: "executor",
    title: "Executor 执行器",
    weight: 8,
    critical: true,
    evaluate: ({ pipelineResult }) => {
      return pipelineResult.reportGeneration?.status === "generated" &&
        ["drafted", "blocked"].includes(pipelineResult.reportDraft?.status)
        ? aligned("Executor 已按计划执行报告生成，并把 provider 结果收束为 reportDraft。")
        : missing("执行层没有稳定产出可审计草稿。");
    }
  },
  {
    id: "tool-runtime",
    title: "Tool Runtime 工具系统",
    weight: 8,
    critical: false,
    evaluate: ({ pipelineResult, capabilities }) => {
      const providerResolution = pipelineResult.reportGeneration?.providerResolution;
      const providerReady = providerResolution?.status === "ready";

      if (providerReady && capabilities.genericToolRegistry) {
        return aligned("已具备 provider 边界和通用 Tool Registry。");
      }

      if (providerReady) {
        return partial("已具备 deterministic/external-llm provider 边界，但还不是通用 Tool Registry。", 0.65);
      }

      return missing("缺少可审计的工具/provider 执行边界。");
    }
  },
  {
    id: "memory-knowledge",
    title: "Memory / DB / Knowledge",
    weight: 10,
    critical: false,
    evaluate: ({ pipelineResult, capabilities }) => {
      if (
        pipelineResult.knowledgeCoverageAudit?.status === "covered" &&
        capabilities.longTermMemory &&
        capabilities.vectorStore
      ) {
        return aligned("已具备 verified 知识片段、长期记忆和向量检索。");
      }

      const ratio = [
        pipelineResult.knowledgeCoverageAudit?.status === "covered",
        capabilities.humanKnowledgeReview,
        capabilities.longTermMemory,
        capabilities.vectorStore
      ].filter(Boolean).length / 4;

      return partial(
        "已有 verified snippet 合同和人工复核边界，但长期记忆、向量库或知识覆盖仍需补强。",
        Math.max(0.35, ratio)
      );
    }
  },
  {
    id: "reviewer-evaluator",
    title: "Evaluator / Reviewer 结果检查",
    weight: 10,
    critical: true,
    evaluate: ({ pipelineResult }) => {
      return pipelineResult.reportAudit?.status === "passed" &&
        pipelineResult.reportOutput?.status === "published" &&
        pipelineResult.readinessAudit
        ? aligned("已通过 reportAuditor、reportPublisher 和 readiness audit 建立发布前检查。")
        : missing("报告草稿没有经过完整审计和发布门禁。");
    }
  },
  {
    id: "human-in-the-loop",
    title: "Human-in-the-loop 人工确认",
    weight: 6,
    critical: false,
    evaluate: ({ capabilities }) => {
      return capabilities.humanKnowledgeReview
        ? partial("知识片段已设计 draft -> verified 人工复核流程；产品侧审批流尚未实现。", 0.55)
        : missing("缺少人工复核或人工确认边界。");
    }
  },
  {
    id: "guardrails",
    title: "Guardrails 权限与安全",
    weight: 9,
    critical: true,
    evaluate: ({ capabilities }) => {
      return capabilities.apiGuardrails
        ? aligned("已具备 scoped bearer auth、credential 生命周期、限流、请求大小和生产 fail-closed。")
        : missing("生产入口缺少权限和安全门禁。");
    }
  },
  {
    id: "observability",
    title: "Observability 可观测性",
    weight: 5,
    critical: true,
    evaluate: ({ capabilities }) => {
      return capabilities.observability
        ? aligned("已具备 requestId、脱敏结构化事件、health/ready 和 release metadata。")
        : missing("缺少可追踪运行状态和诊断信息。");
    }
  },
  {
    id: "deployment",
    title: "Deployment / CI 发布闭环",
    weight: 5,
    critical: true,
    evaluate: ({ capabilities }) => {
      return capabilities.releaseGates &&
        capabilities.ciReleaseGate &&
        capabilities.cloudflareDeployment
        ? aligned("已具备 release gate、GitHub Actions CI 和 Cloudflare 真实部署验证。")
        : missing("发布链路尚未形成 CI 与真实部署证明。");
    }
  },
  {
    id: "recovery",
    title: "Recovery Planner 失败恢复",
    weight: 5,
    critical: false,
    evaluate: ({ pipelineResult }) => {
      const recoveryPlan = pipelineResult.recoveryPlan;

      if (
        recoveryPlan &&
        ["not_needed", "advisory", "recoverable"].includes(recoveryPlan.status) &&
        typeof recoveryPlan.summary === "string"
      ) {
        return aligned("已具备结构化 Recovery Planner，能把阻断、审计失败和非阻断缺口转换为恢复动作。");
      }

      return partial("当前主要返回 blocked diagnostics，尚未实现结构化恢复计划。", 0.25);
    }
  }
];

export function auditAgentArchitectureCompliance(input = {}) {
  const pipelineResult = input.pipelineResult;
  const capabilities = {
    ...DEFAULT_CAPABILITIES,
    ...input.capabilities
  };

  if (!pipelineResult) {
    throw new Error("pipelineResult is required.");
  }

  const items = ARCHITECTURE_ITEMS.map((item) => {
    const result = item.evaluate({
      pipelineResult,
      capabilities
    });

    return {
      id: item.id,
      title: item.title,
      critical: item.critical,
      weight: item.weight,
      status: result.status,
      score: item.weight * result.ratio,
      message: result.message
    };
  });
  const totalWeight = sumWeights(items);
  const score = items.reduce((sum, item) => sum + item.score, 0);
  const percent = Math.round((score / totalWeight) * 100);
  const criticalFailures = items.filter((item) => {
    return item.critical && item.status === "missing";
  });
  const gaps = items.filter((item) => {
    return item.status !== "aligned";
  }).map((item) => {
    return `${item.title}：${item.message}`;
  });

  return {
    status: criticalFailures.length === 0 ? "aligned_with_gaps" : "not_aligned",
    percent,
    score,
    totalWeight,
    items,
    criticalFailures,
    gaps,
    nextPriorities: buildNextPriorities(items)
  };
}

function hasStep(pipelineResult, stepId) {
  return (pipelineResult.steps ?? []).some((step) => {
    return step.id === stepId;
  });
}

function aligned(message) {
  return {
    status: "aligned",
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

function missing(message) {
  return {
    status: "missing",
    ratio: 0,
    message
  };
}

function sumWeights(items) {
  return items.reduce((sum, item) => sum + item.weight, 0);
}

function buildNextPriorities(items) {
  return items
    .filter((item) => item.status !== "aligned")
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((item) => `${item.title}：${item.message}`);
}
