import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTimingTriggerCandidates,
  formatTimingTriggerCandidate
} from "../src/agent/timingTriggerCatalog.js";
import { buildChart } from "../src/chartBuilder.js";

test("buildTimingTriggerCandidates creates observation points without event claims", () => {
  const buildResult = buildChart({
    ...createSampleProfile(),
    analysis_date: "2026-06-30"
  });
  const candidates = buildTimingTriggerCandidates(buildResult.chart);

  assert.ok(candidates.length > 0);
  assert.equal(candidates[0].palaceName, "子女宫");
  assert.equal(candidates[0].priority, "high");
  assert.ok(
    candidates[0].signals.some((signal) => {
      return signal.text.includes("当前大限落子女宫");
    })
  );
  assert.ok(
    candidates[0].signals.some((signal) => {
      return signal.text.includes("流年天同化禄落子女宫");
    })
  );
  const monthlyCandidate = candidates.find((candidate) => {
    return candidate.palaceName === "父母宫";
  });
  assert.ok(monthlyCandidate);
  assert.ok(
    monthlyCandidate.signals.some((signal) => {
      return signal.text.includes("流月月建定位到父母宫");
    })
  );
  assert.ok(monthlyCandidate.referenceRefs.includes("rule.monthly-period"));
  assert.ok(candidates[0].referenceRefs.includes("framework.timing-trigger-candidate"));
  assert.deepEqual(candidates[0].interpretationRefs, [
    "interpretation.timing-trigger.candidate-only"
  ]);
  assert.ok(candidates[0].blockedClaims.includes("不推应期"));
  assert.ok(formatTimingTriggerCandidate(candidates[0]).includes("只用于提示待验证主题"));
});

test("buildTimingTriggerCandidates stays empty before current major period exists", () => {
  const buildResult = buildChart(createSampleProfile());

  assert.deepEqual(buildTimingTriggerCandidates(buildResult.chart), []);
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
