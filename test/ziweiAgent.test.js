import assert from "node:assert/strict";
import test from "node:test";
import { parseQueryIntentFromText } from "../src/agent/queryIntentParser.js";
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
    [
      "life-triad",
      "career-palace",
      "wealth-palace",
      "spouse-palace",
      "body-palace",
      "star-balance",
      "birth-year-transformations",
      "major-periods"
    ]
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
    agentResult.focusAreas
      .find((area) => area.id === "career-palace")
      .evidence.some((item) => item.includes("官禄宫酉"))
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "career-palace")
      .evidenceItems.find((item) => item.id === "career-palace.career-palace")
      .referenceRefs.includes("framework.career-palace")
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "wealth-palace")
      .evidence.some((item) => item.includes("财帛宫丑"))
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "wealth-palace")
      .evidenceItems.find((item) => item.id === "wealth-palace.wealth-palace")
      .referenceRefs.includes("framework.wealth-palace")
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "spouse-palace")
      .evidence.some((item) => item.includes("夫妻宫卯"))
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "spouse-palace")
      .evidenceItems.find((item) => item.id === "spouse-palace.spouse-palace")
      .referenceRefs.includes("framework.spouse-palace")
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "birth-year-transformations")
      .evidence.some((item) => item.includes("太阳化禄在兄弟宫辰"))
  );
  assert.ok(
    agentResult.evidenceItems
      .find((item) => item.id === "core.birth-year-transformations")
      .referenceRefs.includes("rule.birth-year-four-transformations")
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "major-periods")
      .evidence.some((item) => item.includes("4-13岁命宫巳"))
  );
  assert.ok(
    agentResult.evidenceItems
      .find((item) => item.id === "core.major-periods")
      .referenceRefs.includes("rule.major-periods")
  );
  assert.ok(
    agentResult.evidenceItems
      .find((item) => item.id === "core.major-period-transformations")
      .referenceRefs.includes("rule.major-period-four-transformations")
  );
  assert.ok(
    agentResult.limitations.some((item) => item.includes("已接入生年四化、大限年龄段、大限四化骨架"))
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

test("createZiweiAgentResponse includes current major period when analysis date exists", () => {
  const buildResult = buildChart({
    ...createSampleProfile(),
    analysis_date: "2026-06-30"
  });
  const agentResult = createZiweiAgentResponse(buildResult);

  assert.ok(
    agentResult.evidenceItems.some((item) => {
      return item.id === "core.current-major-period" &&
        item.text.includes("虚岁37岁") &&
        item.text.includes("34-43岁子女宫寅");
    })
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "current-major-period")
      .evidence.some((item) => item.includes("2026-06-30"))
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "current-stage")
      .evidence.some((item) => item.includes("阶段大限宫位：34-43岁子女宫寅"))
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "current-stage")
      .evidence.some((item) => item.includes("子女宫寅"))
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "current-stage")
      .evidence.some((item) => item.includes("当前大限四化骨架"))
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "current-stage")
      .evidence.some((item) => item.includes("贪狼化禄在本命迁移宫"))
  );
  assert.ok(
    agentResult.evidenceItems
      .find((item) => item.id === "core.annual-period")
      .referenceRefs.includes("rule.annual-period")
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "current-stage")
      .evidence.some((item) => item.includes("流年骨架"))
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "current-stage")
      .evidence.some((item) => item.includes("天同化禄在本命子女宫"))
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "current-stage")
      .evidence.some((item) => item.includes("安全触发观察点"))
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "current-stage")
      .evidenceItems.find((item) => item.id === "current-stage.timing-trigger-candidates")
      .referenceRefs.includes("framework.timing-trigger-candidate")
  );
  assert.equal(
    agentResult.focusAreas
      .find((area) => area.id === "current-stage")
      .evidenceItems.find((item) => item.id === "current-stage.timing-trigger-candidates")
      .metadata.timingTriggerCandidates[0].palaceName,
    "子女宫"
  );
  assert.ok(
    agentResult.focusAreas
      .find((area) => area.id === "current-stage")
      .evidence.some((item) => item.includes("运限组合验证"))
  );
  assert.equal(
    agentResult.focusAreas
      .find((area) => area.id === "current-stage")
      .evidenceItems.find((item) => item.id === "current-stage.timing-combination-verifications")
      .metadata.timingCombinationVerifications[0].palaceName,
    "子女宫"
  );
  assert.ok(
    agentResult.evidenceItems
      .find((item) => item.id === "core.current-major-period")
      .referenceRefs.includes("rule.current-major-period")
  );
  assert.ok(
    agentResult.limitations.some((item) => item.includes("当前大限定位、大限四化骨架、流年骨架、流年四化骨架"))
  );
});

test("createZiweiAgentResponse keeps all evidence but filters focus areas by query intent", () => {
  const buildResult = buildChart({
    ...createSampleProfile(),
    analysis_date: "2026-06-30"
  });
  const agentResult = createZiweiAgentResponse(buildResult, {
    queryIntent: {
      hasIntent: true,
      focusAreaIds: ["current-major-period"],
      topics: ["当前大限"]
    }
  });

  assert.ok(
    agentResult.evidenceItems.some((item) => {
      return item.id === "core.life-palace-branch";
    })
  );
  assert.deepEqual(
    agentResult.focusAreas.map((area) => area.id),
    ["current-major-period"]
  );
  assert.ok(
    agentResult.allFocusAreas.some((area) => area.id === "life-triad")
  );
  assert.ok(
    agentResult.limitations.some((item) => {
      return item.includes("本轮已按查询意图收敛章节");
    })
  );
});

test("createZiweiAgentResponse exposes current stage when fortune intent has analysis date", () => {
  const buildResult = buildChart({
    ...createSampleProfile(),
    analysis_date: "2026-06-30"
  });
  const agentResult = createZiweiAgentResponse(buildResult, {
    queryIntent: parseQueryIntentFromText("我想看今年运势。")
  });

  assert.deepEqual(
    agentResult.focusAreas.map((area) => area.id),
    ["current-stage"]
  );
  assert.ok(
    agentResult.focusAreas[0].evidenceItems.some((item) => {
      return item.id === "current-stage.children-palace" ||
        item.text.includes("子女宫寅");
    })
  );
  assert.deepEqual(agentResult.unavailableFocusAreaIds, []);
});

test("createZiweiAgentResponse marks current stage unavailable without analysis date", () => {
  const buildResult = buildChart(createSampleProfile());
  const agentResult = createZiweiAgentResponse(buildResult, {
    queryIntent: parseQueryIntentFromText("我想看今年运势。")
  });

  assert.deepEqual(agentResult.focusAreas, []);
  assert.deepEqual(agentResult.unavailableFocusAreaIds, ["current-stage"]);
  assert.deepEqual(agentResult.nextQuestions, ["请补充 analysis_date"]);
  assert.deepEqual(agentResult.questionItems.map((item) => item.field), [
    "analysis_date"
  ]);
  assert.ok(
    agentResult.limitations.some((item) => {
      return item.includes("当前查询还需要补充字段：analysis_date");
    })
  );
});

test("createZiweiAgentResponse exposes final report domains and planned limits", () => {
  const buildResult = buildChart(createSampleProfile());
  const agentResult = createZiweiAgentResponse(buildResult, {
    queryIntent: parseQueryIntentFromText("我想看婚姻、因果和前世今生。")
  });

  assert.deepEqual(agentResult.queryIntent.reportDomainIds, [
    "marriage",
    "karma",
    "past-and-present"
  ]);
  assert.deepEqual(
    agentResult.reportDomains.map((domain) => domain.title),
    ["婚姻感情报告", "因果主题报告", "前世今生主题报告"]
  );
  assert.deepEqual(
    agentResult.focusAreas.map((area) => area.id),
    ["spouse-palace"]
  );
  assert.ok(
    agentResult.limitations.some((item) => {
      return item.includes("最终报告目标：婚姻感情报告、因果主题报告、前世今生主题报告");
    })
  );
  assert.ok(
    agentResult.limitations.some((item) => {
      return item.includes("只完成目标登记，尚不能输出深入断语：因果主题报告、前世今生主题报告");
    })
  );
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
