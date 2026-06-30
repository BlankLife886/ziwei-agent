import assert from "node:assert/strict";
import test from "node:test";
import { createZiweiAgentResponse } from "../src/agent/ziweiAgent.js";
import { buildChart } from "../src/chartBuilder.js";

test("createZiweiAgentResponse prepares analysis context for a complete chart", () => {
  const buildResult = buildChart(createSampleProfile());
  const agentResult = createZiweiAgentResponse(buildResult);

  assert.equal(agentResult.status, "ready");
  assert.equal(agentResult.role, "ziwei-fortune-analyst");
  assert.deepEqual(agentResult.questionItems, []);
  assert.equal(agentResult.subject.name, "示例命主");
  assert.ok(agentResult.evidence.includes("命宫在巳"));
  assert.ok(agentResult.evidence.includes("五行局为金四局"));
  assert.ok(
    agentResult.evidenceItems.some((item) => {
      return item.id === "core.life-palace-branch" && item.text === "命宫在巳";
    })
  );
  assert.ok(
    agentResult.evidenceItems
      .find((item) => item.id === "core.life-palace-branch")
      .referenceRefs.includes("rule.life-body-palace")
  );
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
    agentResult.focusAreas
      .find((area) => area.id === "life-triad")
      .evidenceItems.some((item) => item.id === "life-triad.wealth-palace")
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "life-triad")
      .evidenceItems.find((item) => item.id === "life-triad.wealth-palace")
      .referenceRefs.includes("framework.life-triad")
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
  assert.equal(agentResult.questionItems.length, 1);
  assert.equal(agentResult.questionItems[0].field, "birth_time");
  assert.ok(agentResult.questionItems[0].prompt.includes("出生时间"));
  assert.ok(agentResult.questionItems[0].reason.includes("命宫"));
  assert.deepEqual(agentResult.focusAreas, []);
  assert.deepEqual(agentResult.evidenceItems, []);
});

test("createZiweiAgentResponse blocks invalid input", () => {
  const buildResult = buildChart({
    ...createSampleProfile(),
    birth_time: "99:99"
  });
  const agentResult = createZiweiAgentResponse(buildResult);

  assert.equal(agentResult.status, "invalid_input");
  assert.deepEqual(agentResult.messages, ["出生资料格式不正确，暂不能排盘。"]);
  assert.deepEqual(agentResult.questionItems, []);
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
