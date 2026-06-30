import assert from "node:assert/strict";
import test from "node:test";
import {
  createIntakeSession,
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
