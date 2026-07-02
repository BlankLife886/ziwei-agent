import assert from "node:assert/strict";
import test from "node:test";
import { auditAgentArchitectureCompliance } from "../src/agent/agentArchitectureComplianceAuditor.js";
import { runZiweiPipeline } from "../src/agent/ziweiPipeline.js";
import { buildChart } from "../src/chartBuilder.js";

test("auditAgentArchitectureCompliance confirms the current complex agent skeleton", () => {
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()));
  const audit = auditAgentArchitectureCompliance({
    pipelineResult
  });

  assert.equal(audit.status, "aligned_with_gaps");
  assert.ok(audit.percent >= 80);
  assert.deepEqual(audit.criticalFailures, []);
  assert.ok(
    audit.items.some((item) => {
      return item.id === "state-machine" &&
        item.status === "aligned" &&
        item.message.includes("audit -> publish");
    })
  );
  assert.ok(
    audit.items.some((item) => {
      return item.id === "recovery" &&
        item.status === "aligned" &&
        item.message.includes("Recovery Planner");
    })
  );
  assert.ok(
    audit.items.some((item) => {
      return item.id === "tool-runtime" &&
        item.status === "aligned" &&
        item.message.includes("工具执行审计");
    })
  );
  assert.ok(
    audit.items.some((item) => {
      return item.id === "memory-knowledge" &&
        item.status === "partial" &&
        item.message.includes("长期记忆");
    })
  );
});

test("auditAgentArchitectureCompliance fails when audit and publish gates are bypassed", () => {
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()));
  const bypassedPipeline = {
    ...pipelineResult,
    reportAudit: {
      status: "skipped"
    },
    reportOutput: {
      status: "drafted"
    }
  };
  const audit = auditAgentArchitectureCompliance({
    pipelineResult: bypassedPipeline
  });

  assert.equal(audit.status, "not_aligned");
  assert.ok(
    audit.criticalFailures.some((failure) => {
      return failure.id === "reviewer-evaluator";
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
