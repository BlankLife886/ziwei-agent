import assert from "node:assert/strict";
import test from "node:test";
import {
  createIntakeSession,
  createIntakeSessionFromText,
  mergeProfileDraft
} from "../src/agent/intakeSession.js";

test("mergeProfileDraft keeps only supported birth profile fields", () => {
  const profileDraft = mergeProfileDraft(
    {
      name: "示例命主",
      ignored_from_initial: "不要进入命盘输入"
    },
    {
      birth_time: "23:30",
      ignored_from_patch: "不要进入命盘输入"
    }
  );

  assert.deepEqual(profileDraft, {
    name: "示例命主",
    birth_time: "23:30"
  });
});

test("mergeProfileDraft ignores undefined patch values to avoid clearing known input", () => {
  const profileDraft = mergeProfileDraft(
    {
      birth_time: "23:30"
    },
    {
      birth_time: undefined,
      birth_place: ""
    }
  );

  assert.deepEqual(profileDraft, {
    birth_time: "23:30",
    birth_place: ""
  });
});

test("createIntakeSession asks follow-up questions while profile is incomplete", () => {
  const session = createIntakeSession(createIncompleteProfile());

  assert.equal(session.status, "needs_input");
  assert.deepEqual(session.nextQuestions, ["请补充 birth_time"]);
  assert.equal(session.questionItems[0].field, "birth_time");
  assert.ok(session.nextAction.includes("补齐出生资料"));
});

test("createIntakeSession reruns the full pipeline after new input is merged", () => {
  const session = createIntakeSession(createIncompleteProfile(), {
    birth_time: "23:30"
  });

  assert.equal(session.status, "drafted");
  assert.equal(session.profileDraft.birth_time, "23:30");
  assert.deepEqual(session.questionItems, []);
  assert.equal(session.buildResult.status, "complete");
  assert.equal(session.pipelineResult.reportDraft.status, "drafted");
});

test("createIntakeSessionFromText parses text and reruns the full pipeline", () => {
  const session = createIntakeSessionFromText(
    createIncompleteProfile(),
    "晚上11点半，上海出生。"
  );

  assert.equal(session.status, "drafted");
  assert.equal(session.profileDraft.birth_time, "23:30");
  assert.equal(session.profileDraft.birth_place, "上海");
  assert.deepEqual(session.questionItems, []);
  assert.ok(
    session.extractedItems.some((item) => {
      return item.field === "birth_time" && item.source === "晚上11点半";
    })
  );
});

test("createIntakeSessionFromText accepts relative analysis date for current major period", () => {
  const session = createIntakeSessionFromText(
    {
      ...createIncompleteProfile(),
      birth_time: "23:30"
    },
    "现在看当前大限。",
    {
      currentDate: "2026-06-30"
    }
  );

  assert.equal(session.status, "drafted");
  assert.deepEqual(session.queryIntent.focusAreaIds, ["current-major-period"]);
  assert.equal(session.profileDraft.analysis_date, "2026-06-30");
  assert.equal(session.buildResult.chart.currentMajorPeriod.age, 37);
  assert.equal(
    session.buildResult.chart.currentMajorPeriod.period.palaceName,
    "子女宫"
  );
  assert.ok(
    session.extractedItems.some((item) => {
      return item.field === "analysis_date" && item.source === "现在";
    })
  );
});

test("createIntakeSessionFromText uses query intent to narrow the drafted report", () => {
  const session = createIntakeSessionFromText(
    {
      ...createIncompleteProfile(),
      birth_time: "23:30"
    },
    "我想先看事业和财帛。",
    {
      currentDate: "2026-06-30"
    }
  );

  assert.equal(session.status, "drafted");
  assert.deepEqual(session.queryIntent.focusAreaIds, [
    "career-palace",
    "wealth-palace"
  ]);
  assert.deepEqual(session.queryIntent.topics, ["事业", "财帛"]);
  assert.deepEqual(
    session.pipelineResult.reportPlan.sections.map((section) => section.id),
    ["career-palace", "wealth-palace"]
  );
  assert.ok(
    session.pipelineResult.reportDraft.sections[0].paragraphs
      .find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("官禄宫")
  );
  assert.ok(
    session.pipelineResult.reportDraft.sections[1].paragraphs
      .find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("财帛宫")
  );
});

test("createIntakeSessionFromText drafts current stage for current-year fortune wording", () => {
  const session = createIntakeSessionFromText(
    {
      ...createIncompleteProfile(),
      birth_time: "23:30"
    },
    "我想看今年运势。",
    {
      currentDate: "2026-06-30"
    }
  );

  assert.equal(session.status, "drafted");
  assert.equal(session.profileDraft.analysis_date, "2026-06-30");
  assert.deepEqual(session.queryIntent.focusAreaIds, ["current-stage"]);
  assert.deepEqual(
    session.pipelineResult.reportDraft.sections.map((section) => section.id),
    ["current-stage"]
  );
  assert.ok(
    session.pipelineResult.reportDraft.sections[0].paragraphs
      .find((paragraph) => paragraph.kind === "interpretation")
      .text.includes("不能推今年具体事件")
  );
});

function createIncompleteProfile() {
  return {
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  };
}
