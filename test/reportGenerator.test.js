import assert from "node:assert/strict";
import test from "node:test";
import {
  REPORT_GENERATOR_IDS,
  createReportGenerationContext,
  generateReportDraft
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

test("generateReportDraft uses the deterministic provider without bypassing draft metadata", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()))
  );
  const reportGeneration = generateReportDraft(reportPlan);

  assert.equal(reportGeneration.status, "generated");
  assert.equal(reportGeneration.providerId, REPORT_GENERATOR_IDS.DETERMINISTIC_TEMPLATE);
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
  assert.equal(reportGeneration.providerId, "test-llm-provider");
  assert.equal(reportGeneration.reportDraft.generation.contextVersion, "report-generation-context.v1");
  assert.deepEqual(reportGeneration.reportDraft.generation.outputContract.requiredParagraphRefFields, [
    "evidenceRefs",
    "referenceRefs",
    "interpretationRefs"
  ]);
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
