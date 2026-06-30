import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeQueryIntent,
  parseQueryIntentFromText
} from "../src/agent/queryIntentParser.js";

test("parseQueryIntentFromText detects current major period intent", () => {
  const result = parseQueryIntentFromText("现在看当前大限。");

  assert.equal(result.status, "matched");
  assert.deepEqual(result.focusAreaIds, ["current-major-period"]);
  assert.deepEqual(result.topics, ["当前大限"]);
  assert.ok(result.matchedItems[0].reason.includes("当前所在大限"));
});

test("parseQueryIntentFromText maps career and wealth questions to life triad", () => {
  const result = parseQueryIntentFromText("我想先看事业和财帛。");

  assert.equal(result.status, "matched");
  assert.deepEqual(result.focusAreaIds, ["life-triad"]);
  assert.deepEqual(result.topics, ["事业", "财帛"]);
  assert.deepEqual(result.topicIds, ["career", "wealth"]);
  assert.deepEqual(result.primaryPalaceNames, ["官禄宫", "财帛宫"]);
});

test("parseQueryIntentFromText can collect multiple focus areas", () => {
  const result = parseQueryIntentFromText("看身宫，再看生年四化。");

  assert.deepEqual(result.focusAreaIds, [
    "body-palace",
    "birth-year-transformations"
  ]);
  assert.deepEqual(result.topics, ["身宫落点", "生年四化"]);
});

test("parseQueryIntentFromText does not treat generic development as migration", () => {
  const result = parseQueryIntentFromText("我想看事业发展。");

  assert.deepEqual(result.focusAreaIds, ["life-triad"]);
  assert.deepEqual(result.topicIds, ["career"]);
  assert.deepEqual(result.primaryPalaceNames, ["官禄宫"]);
});

test("parseQueryIntentFromText returns no intent for unrelated text", () => {
  const result = parseQueryIntentFromText("我把资料补充完整。");

  assert.equal(result.status, "none");
  assert.equal(result.hasIntent, false);
  assert.deepEqual(result.focusAreaIds, []);
});

test("normalizeQueryIntent removes duplicate focus ids", () => {
  const result = normalizeQueryIntent({
    hasIntent: true,
    focusAreaIds: ["life-triad", "life-triad", "body-palace"],
    topics: ["整体", "整体"]
  });

  assert.equal(result.status, "matched");
  assert.deepEqual(result.focusAreaIds, ["life-triad", "body-palace"]);
  assert.deepEqual(result.topics, ["整体"]);
});

test("normalizeQueryIntent derives readable topics from focus ids", () => {
  const result = normalizeQueryIntent({
    hasIntent: true,
    focusAreaIds: ["current-major-period"]
  });

  assert.equal(result.status, "matched");
  assert.deepEqual(result.topics, ["当前大限"]);
});

test("normalizeQueryIntent keeps a safe topic for unknown external focus ids", () => {
  const result = normalizeQueryIntent({
    hasIntent: true,
    focusAreaIds: ["external-topic"]
  });

  assert.equal(result.status, "matched");
  assert.deepEqual(result.topics, ["用户指定主题"]);
});

test("normalizeQueryIntent keeps empty topics when there is no intent", () => {
  const result = normalizeQueryIntent({
    hasIntent: true,
    focusAreaIds: []
  });

  assert.equal(result.status, "none");
  assert.equal(result.hasIntent, false);
  assert.deepEqual(result.topics, []);
});
