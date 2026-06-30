import assert from "node:assert/strict";
import test from "node:test";
import { parseProfilePatchFromText } from "../src/agent/profilePatchParser.js";

test("parseProfilePatchFromText extracts a complete Chinese birth profile patch", () => {
  const result = parseProfilePatchFromText(
    "命主示例命主，女，公历1990年5月18日晚上11点半，上海出生，时区 Asia/Shanghai。"
  );

  assert.deepEqual(result.patch, {
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    birth_time: "23:30",
    birth_place: "上海",
    timezone: "Asia/Shanghai"
  });
  assert.ok(
    result.extractedItems.some((item) => {
      return item.field === "birth_time" && item.source === "晚上11点半";
    })
  );
});

test("parseProfilePatchFromText handles ISO date and 24-hour time", () => {
  const result = parseProfilePatchFromText("男，农历 1990-04-24 23:30 生于 Shanghai, China");

  assert.equal(result.patch.gender, "male");
  assert.equal(result.patch.calendar, "lunar");
  assert.equal(result.patch.birth_date, "1990-04-24");
  assert.equal(result.patch.birth_time, "23:30");
  assert.equal(result.patch.birth_place, "Shanghai, China");
  assert.ok(
    result.extractedItems.some((item) => {
      return item.field === "gender" && item.source === "男";
    })
  );
});

test("parseProfilePatchFromText extracts explicit analysis date without replacing birth date", () => {
  const result = parseProfilePatchFromText(
    "以 2026-06-30 分析当前大限，命主公历1990-05-18晚上11点半出生。"
  );

  assert.equal(result.patch.analysis_date, "2026-06-30");
  assert.equal(result.patch.birth_date, "1990-05-18");
  assert.equal(result.patch.birth_time, "23:30");
  assert.ok(
    result.extractedItems.some((item) => {
      return item.field === "analysis_date" && item.source === "以 2026-06-30";
    })
  );
});

test("parseProfilePatchFromText maps relative analysis date from caller supplied current date", () => {
  const result = parseProfilePatchFromText("现在看当前大限。", {
    currentDate: "2026-06-30"
  });

  assert.deepEqual(result.patch, {
    analysis_date: "2026-06-30"
  });
  assert.equal(result.extractedItems[0].source, "现在");
});

test("parseProfilePatchFromText does not treat analysis-only date as birth date", () => {
  const result = parseProfilePatchFromText("以2026-06-30分析当前大限。");

  assert.equal(result.patch.analysis_date, "2026-06-30");
  assert.equal(result.patch.birth_date, undefined);
});

test("parseProfilePatchFromText returns an empty patch for unrelated text", () => {
  const result = parseProfilePatchFromText("我想先看看整体分析风格。");

  assert.deepEqual(result.patch, {});
  assert.deepEqual(result.extractedItems, []);
});
