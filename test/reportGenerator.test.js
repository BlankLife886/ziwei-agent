import assert from "node:assert/strict";
import test from "node:test";
import {
  REPORT_GENERATOR_IDS,
  createReportGenerationContext,
  generateReportDraft,
  generateReportDraftAsync,
  resolveReportDraftProvider
} from "../src/agent/reportGenerator.js";
import { createReportPlan } from "../src/agent/reportPlanner.js";
import { createZiweiAgentResponse } from "../src/agent/ziweiAgent.js";
import { buildChart } from "../src/chartBuilder.js";

test("createReportGenerationContext preserves the planned evidence and ref contract", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()))
  );
  const generationContext = createReportGenerationContext(reportPlan);
  const lifeSection = generationContext.sections.find((section) => {
    return section.id === "life-triad";
  });

  assert.equal(generationContext.status, "ready");
  assert.equal(generationContext.version, "report-generation-context.v1");
  assert.equal(generationContext.generatorId, REPORT_GENERATOR_IDS.DETERMINISTIC_TEMPLATE);
  assert.equal(generationContext.providerMode, "deterministic");
  assert.ok(generationContext.guardrails.some((guardrail) => {
    return guardrail.includes("所有结论必须能回指");
  }));
  assert.deepEqual(lifeSection.refs.evidenceRefs, [
    "life-triad.life-palace",
    "life-triad.wealth-palace",
    "life-triad.career-palace",
    "life-triad.travel-palace"
  ]);
  assert.ok(lifeSection.refs.referenceRefs.includes("framework.life-triad"));
  assert.ok(lifeSection.refs.sourceRefs.includes("source.local.analysis-frameworks"));
  assert.ok(
    lifeSection.refs.interpretationRefs.includes(
      "interpretation.life-triad.structure"
    )
  );
  assert.ok(lifeSection.topicRefinements.length > 0);
  assert.ok(
    lifeSection.topicRefinements.every((refinement) => {
      return refinement.evidenceRefs.length > 0 &&
        refinement.referenceRefs.includes("framework.topic-refinement") &&
        refinement.interpretationRefs.includes("interpretation.topic-refinement.structure-only");
    })
  );
  assert.deepEqual(generationContext.outputContract.requiredSectionRefFields, [
    "evidenceRefs",
    "referenceRefs",
    "sourceRefs",
    "knowledgeSnippetRefs",
    "interpretationRefs"
  ]);
  assert.equal(generationContext.outputContract.auditGate, "reportAuditor");
  assert.equal(generationContext.outputContract.publishGate, "reportPublisher");
});

test("resolveReportDraftProvider selects the deterministic provider by default", () => {
  const providerResolution = resolveReportDraftProvider();

  assert.equal(providerResolution.status, "ready");
  assert.equal(providerResolution.providerId, REPORT_GENERATOR_IDS.DETERMINISTIC_TEMPLATE);
  assert.equal(providerResolution.mode, "deterministic");
  assert.equal(typeof providerResolution.provider, "function");
});

test("generateReportDraft uses the deterministic provider without bypassing draft metadata", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()))
  );
  const reportGeneration = generateReportDraft(reportPlan);

  assert.equal(reportGeneration.status, "generated");
  assert.equal(reportGeneration.providerId, REPORT_GENERATOR_IDS.DETERMINISTIC_TEMPLATE);
  assert.equal(reportGeneration.providerResolution.mode, "deterministic");
  assert.equal(reportGeneration.reportDraft.status, "drafted");
  assert.equal(
    reportGeneration.reportDraft.generation.providerId,
    REPORT_GENERATOR_IDS.DETERMINISTIC_TEMPLATE
  );
  assert.equal(
    reportGeneration.reportDraft.generation.outputContract.auditGate,
    "reportAuditor"
  );
});

test("generateReportDraft allows a custom provider but keeps the planned contract visible", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()))
  );
  const reportGeneration = generateReportDraft(reportPlan, {
    generatorId: REPORT_GENERATOR_IDS.EXTERNAL_LLM,
    provider: ({ reportPlan: plannedReport }) => {
      return {
        providerId: "test-llm-provider",
        messages: ["测试 provider 已按 reportPlan 返回草稿。"],
        reportDraft: {
          status: "drafted",
          title: `${plannedReport.subject.name}的测试报告草稿`,
          subject: plannedReport.subject,
          introduction: plannedReport.opening,
          sections: [],
          closing: []
        }
      };
    }
  });

  assert.equal(reportGeneration.generationContext.generatorId, REPORT_GENERATOR_IDS.EXTERNAL_LLM);
  assert.equal(reportGeneration.generationContext.providerMode, "custom");
  assert.equal(reportGeneration.providerResolution.mode, "custom");
  assert.equal(reportGeneration.providerId, "test-llm-provider");
  assert.equal(reportGeneration.reportDraft.generation.contextVersion, "report-generation-context.v1");
  assert.deepEqual(reportGeneration.reportDraft.generation.outputContract.requiredParagraphRefFields, [
    "evidenceRefs",
    "referenceRefs",
    "interpretationRefs"
  ]);
});

test("generateReportDraft runs a configured external LLM provider inside the report contract", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()))
  );
  const reportGeneration = generateReportDraft(reportPlan, {
    generatorId: REPORT_GENERATOR_IDS.EXTERNAL_LLM,
    externalProvider: ({ reportPlan: plannedReport, generationContext }) => {
      return {
        providerId: "configured-external-llm",
        messages: [`收到 ${generationContext.sections.length} 个受控章节。`],
        reportDraft: {
          status: "drafted",
          title: `${plannedReport.subject.name}的外部模型测试草稿`,
          subject: plannedReport.subject,
          introduction: plannedReport.opening,
          sections: [],
          closing: []
        }
      };
    }
  });

  assert.equal(reportGeneration.status, "generated");
  assert.equal(reportGeneration.generationContext.generatorId, REPORT_GENERATOR_IDS.EXTERNAL_LLM);
  assert.equal(reportGeneration.generationContext.providerMode, "external-llm");
  assert.equal(reportGeneration.providerResolution.mode, "external-llm");
  assert.equal(reportGeneration.providerId, "configured-external-llm");
  assert.equal(reportGeneration.reportDraft.generation.providerId, "configured-external-llm");
  assert.equal(
    reportGeneration.reportDraft.generation.outputContract.publishGate,
    "reportPublisher"
  );
});

test("generateReportDraft blocks promise-returning providers on the sync path", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()))
  );
  let asyncProviderCalled = false;
  const reportGeneration = generateReportDraft(reportPlan, {
    generatorId: REPORT_GENERATOR_IDS.EXTERNAL_LLM,
    externalProvider: async ({ reportPlan: plannedReport }) => {
      asyncProviderCalled = true;

      return {
        providerId: "async-provider",
        reportDraft: {
          status: "drafted",
          title: `${plannedReport.subject.name}的异步测试草稿`,
          subject: plannedReport.subject,
          introduction: plannedReport.opening,
          sections: [],
          closing: []
        }
      };
    }
  });

  assert.equal(reportGeneration.status, "blocked");
  assert.equal(reportGeneration.providerId, "async-provider");
  assert.equal(asyncProviderCalled, false);
  assert.ok(reportGeneration.messages[0].includes("同步 pipeline 已阻断"));
});

test("generateReportDraftAsync awaits async external providers inside the same contract", async () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()))
  );
  const reportGeneration = await generateReportDraftAsync(reportPlan, {
    generatorId: REPORT_GENERATOR_IDS.EXTERNAL_LLM,
    externalProvider: async ({ reportPlan: plannedReport, generationContext }) => {
      return {
        providerId: "async-external-llm",
        messages: [`异步 provider 收到 ${generationContext.sections.length} 个章节。`],
        reportDraft: {
          status: "drafted",
          title: `${plannedReport.subject.name}的异步外部模型测试草稿`,
          subject: plannedReport.subject,
          introduction: plannedReport.opening,
          sections: [],
          closing: []
        }
      };
    }
  });

  assert.equal(reportGeneration.status, "generated");
  assert.equal(reportGeneration.providerId, "async-external-llm");
  assert.equal(reportGeneration.providerResolution.mode, "external-llm");
  assert.equal(reportGeneration.reportDraft.generation.providerId, "async-external-llm");
});

test("generateReportDraft blocks an external LLM generator until an external provider is configured", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()))
  );
  const reportGeneration = generateReportDraft(reportPlan, {
    generatorId: REPORT_GENERATOR_IDS.EXTERNAL_LLM
  });

  assert.equal(reportGeneration.status, "blocked");
  assert.equal(reportGeneration.providerId, REPORT_GENERATOR_IDS.EXTERNAL_LLM);
  assert.equal(reportGeneration.generationContext.providerMode, "external-llm");
  assert.equal(reportGeneration.providerResolution.status, "blocked");
  assert.equal(reportGeneration.reportDraft.status, "blocked");
  assert.ok(reportGeneration.messages[0].includes("尚未配置可调用的 externalProvider"));
});

test("generateReportDraft blocks unknown report generator ids", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()))
  );
  const reportGeneration = generateReportDraft(reportPlan, {
    generatorId: "unknown-generator"
  });

  assert.equal(reportGeneration.status, "blocked");
  assert.equal(reportGeneration.providerId, "unknown-generator");
  assert.equal(reportGeneration.providerResolution.mode, "unknown");
  assert.equal(reportGeneration.reportDraft.status, "blocked");
  assert.ok(reportGeneration.messages[0].includes("未知报告生成器"));
});

test("generateReportDraft blocks before generation when report planning is blocked", () => {
  const reportGeneration = generateReportDraft({
    status: "blocked",
    guardrails: [],
    sections: []
  });

  assert.equal(reportGeneration.status, "blocked");
  assert.equal(reportGeneration.providerId, "none");
  assert.equal(reportGeneration.generationContext.status, "blocked");
  assert.equal(reportGeneration.reportDraft.status, "blocked");
});

test("generateReportDraft blocks malformed providers without throwing", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()))
  );
  const reportGeneration = generateReportDraft(reportPlan, {
    provider: () => {
      return {
        providerId: "malformed-provider"
      };
    }
  });

  assert.equal(reportGeneration.status, "blocked");
  assert.equal(reportGeneration.providerId, "malformed-provider");
  assert.equal(reportGeneration.reportDraft.status, "blocked");
  assert.ok(reportGeneration.messages[0].includes("未返回 reportDraft"));
});

test("generateReportDraft blocks non-function or throwing providers without crashing the pipeline", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()))
  );
  const nonFunctionProviderGeneration = generateReportDraft(reportPlan, {
    provider: "not-a-function"
  });
  const throwingProviderGeneration = generateReportDraft(reportPlan, {
    provider: () => {
      throw new Error("测试 provider 故障");
    }
  });

  assert.equal(nonFunctionProviderGeneration.status, "blocked");
  assert.equal(nonFunctionProviderGeneration.providerResolution.mode, "custom");
  assert.ok(nonFunctionProviderGeneration.messages[0].includes("不是函数"));
  assert.equal(throwingProviderGeneration.status, "blocked");
  assert.equal(throwingProviderGeneration.providerId, "provider-error");
  assert.ok(throwingProviderGeneration.messages[0].includes("执行失败"));
  assert.ok(throwingProviderGeneration.messages[1].includes("未返回 reportDraft"));
});

function createSampleProfile() {
  return {
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  };
}
