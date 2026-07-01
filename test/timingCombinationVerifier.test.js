import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTimingCombinationVerification,
  verifyTimingCombinations
} from "../src/agent/timingCombinationVerifier.js";
import { buildTimingTriggerCandidates } from "../src/agent/timingTriggerCatalog.js";
import { buildChart } from "../src/chartBuilder.js";

test("verifyTimingCombinations keeps only multi-layer observation points", () => {
  const buildResult = buildChart({
    ...createSampleProfile(),
    analysis_date: "2026-06-30"
  });
  const candidates = buildTimingTriggerCandidates(buildResult.chart);
  const verifications = verifyTimingCombinations(candidates);

  assert.ok(verifications.length > 0);
  assert.equal(verifications[0].palaceName, "子女宫");
  assert.ok(verifications[0].signalGroups.includes("大限定位"));
  assert.ok(verifications[0].signalGroups.includes("流年四化"));
  assert.ok(
    verifications[0].referenceRefs.includes("framework.timing-combination-verification")
  );
  assert.deepEqual(verifications[0].interpretationRefs, [
    "interpretation.timing-combination.verified-only"
  ]);
  assert.ok(verifications[0].blockedClaims.includes("不推月份事件"));
  assert.ok(
    formatTimingCombinationVerification(verifications[0]).includes("不推事件、应期或结果")
  );
});

test("verifyTimingCombinations rejects single-layer low-score candidates", () => {
  const verifications = verifyTimingCombinations([
    {
      id: "timing-trigger.low.test",
      palaceName: "父母宫",
      priority: "low",
      priorityLabel: "低优先级",
      score: 0.5,
      signals: [{
        type: "monthly-period-palace",
        text: "流月月建定位到父母宫",
        weight: 0.5,
        evidenceRefs: ["current-stage.monthly-period"],
        referenceRefs: ["rule.monthly-period"]
      }],
      evidenceRefs: ["current-stage.monthly-period"],
      referenceRefs: ["rule.monthly-period"]
    }
  ]);

  assert.deepEqual(verifications, []);
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
