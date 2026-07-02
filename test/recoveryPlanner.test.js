import assert from "node:assert/strict";
import test from "node:test";
import { parseQueryIntentFromText } from "../src/agent/queryIntentParser.js";
import { createReportDraft } from "../src/agent/reportComposer.js";
import { REPORT_GENERATOR_IDS } from "../src/agent/reportGenerator.js";
import { runZiweiPipeline } from "../src/agent/ziweiPipeline.js";
import { buildChart } from "../src/chartBuilder.js";

test("runZiweiPipeline returns advisory recovery actions for non-blocking knowledge gaps", () => {
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()));

  assert.equal(pipelineResult.status, "published");
  assert.equal(pipelineResult.recoveryPlan.status, "advisory");
  assert.equal(pipelineResult.recoveryPlan.actions.length, 0);
  assert.ok(
    pipelineResult.recoveryPlan.advisoryActions.some((action) => {
      return action.id === "advise.knowledge.ingest-verified-snippets";
    })
  );
});

test("runZiweiPipeline returns a user-owned recovery action for missing topic input", () => {
  const queryIntent = parseQueryIntentFromText("我想看未来运势。");
  const profile = createSampleProfile();
  delete profile.analysis_date;

  const pipelineResult = runZiweiPipeline(buildChart(profile), {
    queryIntent
  });

  assert.equal(pipelineResult.status, "blocked");
  assert.equal(pipelineResult.recoveryPlan.status, "recoverable");
  assert.equal(pipelineResult.recoveryPlan.requiresUserInput, true);
  assert.ok(
    pipelineResult.recoveryPlan.actions.some((action) => {
      return action.id === "recover.report-plan.collect-topic-input" &&
        action.owner === "user";
    })
  );
});

test("runZiweiPipeline returns an operator recovery action for missing external LLM provider", () => {
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()), {
    reportGeneratorId: REPORT_GENERATOR_IDS.EXTERNAL_LLM
  });

  assert.equal(pipelineResult.reportGeneration.status, "blocked");
  assert.equal(pipelineResult.recoveryPlan.status, "recoverable");
  assert.ok(
    pipelineResult.recoveryPlan.actions.some((action) => {
      return action.id === "recover.report-generation.configure-external-provider" &&
        action.owner === "operator" &&
        action.nextStep.includes("ZIWEI_LLM_ENDPOINT");
    })
  );
});

test("runZiweiPipeline returns an agent recovery action for audit failures", () => {
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

  assert.equal(pipelineResult.reportAudit.status, "failed");
  assert.equal(pipelineResult.recoveryPlan.status, "recoverable");
  assert.ok(
    pipelineResult.recoveryPlan.actions.some((action) => {
      return action.id === "recover.report-audit.revise-draft" &&
        action.owner === "agent" &&
        action.reason.includes("planned-section-missing");
    })
  );
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
    is_leap_month: false,
    analysis_date: "2026-06-30"
  };
}
