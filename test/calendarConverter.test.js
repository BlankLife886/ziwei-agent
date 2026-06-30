import assert from "node:assert/strict";
import test from "node:test";
import {
  convertSolarDateToLunar,
  resolveLunarProfile
} from "../src/calendarConverter.js";

test("solar date converts to lunar date", () => {
  const result = convertSolarDateToLunar("1990-05-18");

  assert.deepEqual(result, {
    year: 1990,
    yearStem: "庚",
    yearBranch: "午",
    month: 4,
    day: 24,
    isLeapMonth: false,
    text: "一九九〇年四月廿四"
  });
});

test("invalid solar date is rejected by converter", () => {
  assert.throws(
    () => convertSolarDateToLunar("1990-02-30"),
    /birth_date must be a valid solar date/
  );
});

test("lunar input derives lunar month from birth date", () => {
  const result = resolveLunarProfile({
    name: "示例命主",
    gender: "female",
    calendar: "lunar",
    birth_date: "1990-04-24",
    lunar_month: null,
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  });

  assert.equal(result.profile.lunar_month, 4);
  assert.equal(result.profile.lunar_day, 24);
  assert.equal(result.profile.lunar_year_stem, "庚");
  assert.equal(result.profile.lunar_year_branch, "午");
});
