import assert from "node:assert/strict";
import test from "node:test";
import { auditAgentReadiness } from "../src/agent/agentReadinessAuditor.js";
import { runZiweiPipeline } from "../src/agent/ziweiPipeline.js";
import { buildChart } from "../src/chartBuilder.js";

test("auditAgentReadiness exposes progress and remaining blockers", () => {
  const pipelineResult = runZiweiPipeline(buildChart({
    ...createSampleProfile(),
    analysis_date: "2026-06-30"
  }));
  const audit = auditAgentReadiness(pipelineResult);

  assert.equal(audit.status, "in_progress");
  assert.ok(audit.percent > 40);
  assert.ok(audit.percent < 100);
  assert.ok(
    audit.items.some((item) => {
      return item.id === "knowledge-coverage" && item.status === "partial";
    })
  );
  assert.ok(
    audit.items.some((item) => {
      return item.id === "interpretation-depth" &&
        item.status === "partial" &&
        item.message.includes("章节级组合归纳");
    })
  );
  assert.ok(audit.percent >= 77);
  assert.ok(
    audit.blockers.some((blocker) => {
      return blocker.includes("组合验证底座") &&
        blocker.includes("深层跨宫、跨限运解释");
    })
  );
  assert.ok(audit.nextPriorities.length > 0);
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
