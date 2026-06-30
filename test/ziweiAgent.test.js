import assert from "node:assert/strict";
import test from "node:test";
import { createZiweiAgentResponse } from "../src/agent/ziweiAgent.js";
import { buildChart } from "../src/chartBuilder.js";

test("createZiweiAgentResponse prepares analysis context for a complete chart", () => {
  const buildResult = buildChart(createSampleProfile());
  const agentResult = createZiweiAgentResponse(buildResult);

  assert.equal(agentResult.status, "ready");
  assert.equal(agentResult.role, "ziwei-fortune-analyst");
  assert.equal(agentResult.subject.name, "示例命主");
  assert.ok(agentResult.evidence.includes("命宫在巳"));
  assert.ok(agentResult.evidence.includes("五行局为金四局"));
  assert.deepEqual(
    agentResult.focusAreas.map((area) => area.id),
    ["life-triad", "body-palace", "star-balance"]
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "life-triad")
      .evidence.some((item) => item.includes("财帛宫丑"))
  );
  assert.ok(
    agentResult.limitations.some((item) => item.includes("尚未接入四化"))
  );
});

test("createZiweiAgentResponse asks for missing input before analysis", () => {
  const profile = createSampleProfile();
  delete profile.birth_time;

  const buildResult = buildChart(profile);
  const agentResult = createZiweiAgentResponse(buildResult);

  assert.equal(agentResult.status, "needs_input");
  assert.deepEqual(agentResult.nextQuestions, ["请补充 birth_time"]);
  assert.deepEqual(agentResult.focusAreas, []);
});

test("createZiweiAgentResponse blocks invalid input", () => {
  const buildResult = buildChart({
    ...createSampleProfile(),
    birth_time: "99:99"
  });
  const agentResult = createZiweiAgentResponse(buildResult);

  assert.equal(agentResult.status, "invalid_input");
  assert.deepEqual(agentResult.messages, ["出生资料格式不正确，暂不能排盘。"]);
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
