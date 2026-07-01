import assert from "node:assert/strict";
import test from "node:test";
import {
  KNOWLEDGE_RISK_LEVELS,
  KNOWLEDGE_SOURCE_IDS,
  KNOWLEDGE_SNIPPET_STATUS
} from "../src/agent/knowledgeSnippetCatalog.js";
import { parseQueryIntentFromText } from "../src/agent/queryIntentParser.js";
import { createReportDraft } from "../src/agent/reportComposer.js";
import { REPORT_GENERATOR_IDS } from "../src/agent/reportGenerator.js";
import {
  runZiweiPipeline,
  runZiweiPipelineAsync
} from "../src/agent/ziweiPipeline.js";
import { buildChart } from "../src/chartBuilder.js";

test("runZiweiPipeline produces the complete agent output chain", () => {
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()));

  assert.equal(pipelineResult.status, "published");
  assert.equal(pipelineResult.agentResult.status, "ready");
  assert.equal(pipelineResult.reportPlan.status, "planned");
  assert.equal(pipelineResult.reportDraft.status, "drafted");
  assert.equal(pipelineResult.reportOutput.status, "published");
  assert.deepEqual(
    pipelineResult.steps.map((step) => step.id),
    [
      "query-intent",
      "agent-context",
      "report-plan",
      "knowledge-coverage",
      "report-generation",
      "report-draft",
      "report-audit",
      "report-output",
      "agent-readiness"
    ]
  );
  assert.equal(pipelineResult.steps[0].status, "none");
  assert.equal(pipelineResult.knowledgeCoverageAudit.status, "insufficient");
  assert.ok(
    pipelineResult.knowledgeCoverageAudit.summary.includes("verified 外部知识片段")
  );
  assert.equal(pipelineResult.reportGeneration.status, "generated");
  assert.equal(pipelineResult.reportOutput.metadata.generation.providerId, "deterministic-template");
  assert.equal(pipelineResult.reportAudit.status, "passed");
  assert.equal(pipelineResult.readinessAudit.status, "in_progress");
  assert.ok(pipelineResult.readinessAudit.percent < 100);
  assert.deepEqual(pipelineResult.reportAudit.issues, []);
  assert.ok(pipelineResult.nextAction.includes("审阅已发布的用户报告"));
});

test("runZiweiPipeline narrows report sections by query intent", () => {
  const queryIntent = parseQueryIntentFromText("现在看当前大限。");
  const pipelineResult = runZiweiPipeline(
    buildChart({
      ...createSampleProfile(),
      analysis_date: "2026-06-30"
    }),
    { queryIntent }
  );

  assert.equal(pipelineResult.queryIntent.status, "matched");
  assert.deepEqual(pipelineResult.queryIntent.focusAreaIds, [
    "current-major-period"
  ]);
  assert.deepEqual(
    pipelineResult.reportPlan.sections.map((section) => section.id),
    ["current-major-period"]
  );
  assert.ok(
    pipelineResult.reportPlan.opening.some((line) => {
      return line.includes("聚焦当前大限");
    })
  );
  assert.deepEqual(
    pipelineResult.reportDraft.sections.map((section) => section.id),
    ["current-major-period"]
  );
});

test("runZiweiPipeline uses verified knowledge snippets in report planning", () => {
  const queryIntent = parseQueryIntentFromText("我想看事业。");
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()), {
    queryIntent,
    knowledgeSnippets: [
      {
        id: "knowledge-snippet.career-structure-store",
        sourceRef: KNOWLEDGE_SOURCE_IDS.PENDING_ZIWEI_CORPUS,
        title: "官禄宫结构片段",
        topicIds: ["career"],
        referenceRefs: ["framework.career-palace"],
        excerpt: "官禄宫专题需要合看命宫、财帛宫与夫妻宫。",
        citation: "示例知识库 / 官禄宫结构",
        status: KNOWLEDGE_SNIPPET_STATUS.VERIFIED,
        riskLevel: KNOWLEDGE_RISK_LEVELS.LOW
      }
    ]
  });

  assert.equal(pipelineResult.reportPlan.sections[0].id, "career-palace");
  assert.deepEqual(pipelineResult.reportPlan.sections[0].knowledgeSnippetRefs, [
    "knowledge-snippet.career-structure-store"
  ]);
  assert.equal(pipelineResult.knowledgeCoverageAudit.status, "covered");
  assert.deepEqual(pipelineResult.reportOutput.metadata.knowledgeSnippetRefs, [
    "knowledge-snippet.career-structure-store"
  ]);
});

test("runZiweiPipeline drafts current stage for fortune intent", () => {
  const queryIntent = parseQueryIntentFromText("我想看今年运势。");
  const pipelineResult = runZiweiPipeline(
    buildChart({
      ...createSampleProfile(),
      analysis_date: "2026-06-30"
    }),
    { queryIntent }
  );

  assert.equal(pipelineResult.status, "published");
  assert.deepEqual(pipelineResult.queryIntent.focusAreaIds, ["current-stage"]);
  assert.deepEqual(
    pipelineResult.reportPlan.sections.map((section) => section.id),
    ["current-stage"]
  );
  assert.ok(
    pipelineResult.reportDraft.sections[0].paragraphs
      .find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("不能推今年具体事件")
  );
});

test("runZiweiPipeline asks for analysis date when current stage is unavailable", () => {
  const queryIntent = parseQueryIntentFromText("我想看未来运势。");
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()), {
    queryIntent
  });

  assert.equal(pipelineResult.status, "blocked");
  assert.deepEqual(pipelineResult.reportPlan.missingTopicFields, [
    "analysis_date"
  ]);
  assert.ok(pipelineResult.nextAction.includes("补充本轮专题所需资料"));
});

test("runZiweiPipeline blocks report-only domains without supported sections", () => {
  const queryIntent = parseQueryIntentFromText("我想看因果和前世今生。");
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()), {
    queryIntent
  });

  assert.equal(pipelineResult.status, "blocked");
  assert.equal(pipelineResult.agentResult.status, "ready");
  assert.equal(pipelineResult.reportPlan.status, "blocked");
  assert.equal(pipelineResult.reportDraft.status, "blocked");
  assert.ok(pipelineResult.nextAction.includes("没有可用报告章节"));
  assert.deepEqual(pipelineResult.reportPlan.sections, []);
});

test("runZiweiPipeline blocks custom providers that omit planned sections", () => {
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()), {
    reportDraftProvider: ({ reportPlan }) => {
      return {
        providerId: "empty-provider",
        reportDraft: {
          status: "drafted",
          title: `${reportPlan.subject.name}的不完整测试草稿`,
          subject: reportPlan.subject,
          introduction: reportPlan.opening,
          sections: [],
          closing: []
        }
      };
    }
  });

  assert.equal(pipelineResult.reportGeneration.status, "generated");
  assert.equal(pipelineResult.reportAudit.status, "failed");
  assert.equal(pipelineResult.reportOutput.status, "blocked");
  assert.ok(
    pipelineResult.reportAudit.issues.some((issue) => {
      return issue.id === "planned-section-missing";
    })
  );
});

test("runZiweiPipeline passes a configured external LLM provider through the full agent chain", () => {
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()), {
    reportGeneratorId: REPORT_GENERATOR_IDS.EXTERNAL_LLM,
    externalReportDraftProvider: ({ reportPlan, generationContext }) => {
      const draft = createReportDraft(reportPlan);

      return {
        providerId: "pipeline-external-llm",
        messages: [`外部 provider 收到 ${generationContext.sections.length} 个章节。`],
        reportDraft: draft
      };
    }
  });

  assert.equal(pipelineResult.status, "published");
  assert.equal(pipelineResult.reportGeneration.status, "generated");
  assert.equal(pipelineResult.reportGeneration.providerResolution.mode, "external-llm");
  assert.equal(pipelineResult.reportGeneration.generationContext.providerMode, "external-llm");
  assert.equal(pipelineResult.reportOutput.metadata.generation.providerId, "pipeline-external-llm");
  assert.equal(pipelineResult.reportAudit.status, "passed");
});

test("runZiweiPipelineAsync awaits an async external LLM provider through the full agent chain", async () => {
  const pipelineResult = await runZiweiPipelineAsync(buildChart(createSampleProfile()), {
    reportGeneratorId: REPORT_GENERATOR_IDS.EXTERNAL_LLM,
    externalReportDraftProvider: async ({ reportPlan }) => {
      return {
        providerId: "pipeline-async-external-llm",
        reportDraft: createReportDraft(reportPlan)
      };
    }
  });

  assert.equal(pipelineResult.status, "published");
  assert.equal(pipelineResult.reportGeneration.status, "generated");
  assert.equal(pipelineResult.reportOutput.metadata.generation.providerId, "pipeline-async-external-llm");
  assert.equal(pipelineResult.reportAudit.status, "passed");
});

test("runZiweiPipeline blocks the external LLM generator when no provider is configured", () => {
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()), {
    reportGeneratorId: REPORT_GENERATOR_IDS.EXTERNAL_LLM
  });

  assert.equal(pipelineResult.status, "planned");
  assert.equal(pipelineResult.reportGeneration.status, "blocked");
  assert.equal(pipelineResult.reportGeneration.providerResolution.status, "blocked");
  assert.equal(pipelineResult.reportDraft.status, "blocked");
  assert.equal(pipelineResult.reportAudit.status, "skipped");
  assert.equal(pipelineResult.reportOutput.status, "blocked");
  assert.ok(pipelineResult.nextAction.includes("生成报告正文草稿"));
});

test("runZiweiPipeline drafts a conservative marriage report section", () => {
  const queryIntent = parseQueryIntentFromText("我想看婚姻感情。");
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()), {
    queryIntent
  });

  assert.equal(pipelineResult.status, "published");
  assert.equal(pipelineResult.reportPlan.status, "planned");
  assert.equal(pipelineResult.reportOutput.status, "published");
  assert.deepEqual(
    pipelineResult.reportPlan.sections.map((section) => section.id),
    ["spouse-palace"]
  );
  assert.ok(
    pipelineResult.reportDraft.sections[0].paragraphs
      .find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("不能推结婚时间")
  );
});

test("runZiweiPipeline keeps the chain blocked when input is incomplete", () => {
  const profile = createSampleProfile();
  delete profile.birth_time;

  const pipelineResult = runZiweiPipeline(buildChart(profile));

  assert.equal(pipelineResult.status, "needs_input");
  assert.equal(pipelineResult.agentResult.status, "needs_input");
  assert.equal(pipelineResult.reportPlan.status, "blocked");
  assert.equal(pipelineResult.reportDraft.status, "blocked");
  assert.equal(pipelineResult.reportAudit.status, "skipped");
  assert.equal(pipelineResult.reportOutput.status, "blocked");
  assert.ok(pipelineResult.nextAction.includes("补齐出生资料"));
});

test("runZiweiPipeline keeps invalid input out of report generation", () => {
  const pipelineResult = runZiweiPipeline(
    buildChart({
      ...createSampleProfile(),
      birth_time: "99:99"
    })
  );

  assert.equal(pipelineResult.status, "invalid_input");
  assert.equal(pipelineResult.agentResult.status, "invalid_input");
  assert.deepEqual(pipelineResult.reportPlan.sections, []);
  assert.deepEqual(pipelineResult.reportDraft.sections, []);
  assert.equal(pipelineResult.reportOutput.status, "blocked");
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
