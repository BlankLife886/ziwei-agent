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
  assert.deepEqual(result.reportDomainIds, ["fortune"]);
  assert.ok(result.matchedItems[0].reason.includes("当前所在大限"));
});

test("parseQueryIntentFromText maps career and wealth questions to life triad", () => {
  const result = parseQueryIntentFromText("我想先看事业和财帛。");

  assert.equal(result.status, "matched");
  assert.deepEqual(result.focusAreaIds, ["life-triad"]);
  assert.deepEqual(result.topics, ["事业", "财帛"]);
  assert.deepEqual(result.topicIds, ["career", "wealth"]);
  assert.deepEqual(result.reportDomainIds, ["career", "wealth"]);
  assert.deepEqual(result.primaryPalaceNames, ["官禄宫", "财帛宫"]);
});

test("parseQueryIntentFromText maps colloquial wealth wording", () => {
  const result = parseQueryIntentFromText("我想看财富和事业。");

  assert.deepEqual(result.focusAreaIds, ["life-triad"]);
  assert.deepEqual(result.topics, ["事业", "财帛"]);
  assert.deepEqual(result.reportDomainIds, ["career", "wealth"]);
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

test("parseQueryIntentFromText maps marriage and records planned report domains", () => {
  const result = parseQueryIntentFromText("我想看婚姻、因果和前世今生。");

  assert.equal(result.status, "matched");
  assert.equal(result.hasIntent, true);
  assert.deepEqual(result.focusAreaIds, ["spouse-palace"]);
  assert.deepEqual(result.reportDomainIds, [
    "marriage",
    "karma",
    "past-and-present"
  ]);
  assert.deepEqual(result.topics, ["婚姻", "因果", "前世今生"]);
  assert.deepEqual(result.primaryPalaceNames, ["夫妻宫"]);
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
    reportDomainIds: ["personality", "personality"],
    topics: ["整体", "整体"]
  });

  assert.equal(result.status, "matched");
  assert.deepEqual(result.focusAreaIds, ["life-triad", "body-palace"]);
  assert.deepEqual(result.reportDomainIds, ["personality"]);
  assert.deepEqual(result.topics, ["整体"]);
});

test("normalizeQueryIntent keeps report-only intents matched", () => {
  const result = normalizeQueryIntent({
    hasIntent: true,
    focusAreaIds: [],
    reportDomainIds: ["marriage"],
    topics: ["婚姻"]
  });

  assert.equal(result.status, "matched");
  assert.equal(result.hasIntent, true);
  assert.deepEqual(result.focusAreaIds, []);
  assert.deepEqual(result.reportDomainIds, ["marriage"]);
  assert.deepEqual(result.topics, ["婚姻"]);
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
