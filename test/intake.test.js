import assert from "node:assert/strict";
import test from "node:test";
import {
  convertSolarDateToLunar,
  resolveLunarProfile
} from "../src/calendarConverter.js";
import { createChartSkeleton, PALACE_NAMES } from "../src/chart.js";
import {
  applyFiveElementClass,
  calculatePalaceStem
} from "../src/fiveElementClassCalculator.js";
import { validateBirthProfile } from "../src/intake.js";
import { applyLifeAndBodyPalaces } from "../src/palaceCalculator.js";

test("valid profile gets chinese hour", () => {
  const result = validateBirthProfile({
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    lunar_month: 4,
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.missingFields, []);
  assert.equal(result.chineseHour, "子时");
});

test("missing required fields are reported", () => {
  const result = validateBirthProfile({
    name: "",
    gender: "female",
    calendar: "solar",
    birth_date: "",
    birth_time: "08:00",
    birth_place: "",
    timezone: "Asia/Shanghai"
  });

  assert.deepEqual(result.missingFields, ["name", "birth_date", "birth_place"]);
  assert.deepEqual(result.errors, []);
});

test("invalid time is reported", () => {
  const result = validateBirthProfile({
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    birth_time: "25:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai"
  });

  assert.deepEqual(result.errors, ["birth_time must use HH:MM 24-hour format"]);
});

test("invalid lunar month is reported", () => {
  const result = validateBirthProfile({
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    lunar_month: 13,
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai"
  });

  assert.deepEqual(result.errors, ["lunar_month must be an integer from 1 to 12"]);
});

test("solar date converts to lunar date", () => {
  const result = convertSolarDateToLunar("1990-05-18");

  assert.deepEqual(result, {
    year: 1990,
    yearStem: "庚",
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
});

test("chart skeleton creates twelve empty palaces", () => {
  const chart = createChartSkeleton({
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    lunar_month: 4,
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  });

  assert.equal(chart.palaces.length, 12);
  assert.deepEqual(
    chart.palaces.map((palace) => palace.name),
    PALACE_NAMES
  );
  assert.deepEqual(chart.palaces[0].mainStars, []);
  assert.equal(chart.lifePalace, null);
});

test("life and body palaces are calculated from lunar month and chinese hour", () => {
  const chart = createChartSkeleton({
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    lunar_month: 4,
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  });

  const result = applyLifeAndBodyPalaces(chart, {
    lunarMonth: 4,
    chineseHour: "子时"
  });

  assert.deepEqual(result.lifePalace, { name: "命宫", branch: "巳" });
  assert.deepEqual(result.bodyPalace, { name: "命宫", branch: "巳" });
  assert.equal(result.palaces[0].branch, "巳");
  assert.equal(result.palaces[1].branch, "辰");
});

test("palace stem is calculated by five tiger rule", () => {
  const stem = calculatePalaceStem({
    yearStem: "庚",
    branch: "巳"
  });

  assert.equal(stem, "辛");
});

test("five element class is calculated from life palace gan zhi na yin", () => {
  const chart = createChartSkeleton({
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    lunar_year: 1990,
    lunar_year_stem: "庚",
    lunar_month: 4,
    lunar_day: 24,
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  });

  const chartWithPalaces = applyLifeAndBodyPalaces(chart, {
    lunarMonth: 4,
    chineseHour: "子时"
  });
  const result = applyFiveElementClass(chartWithPalaces, {
    yearStem: "庚"
  });

  assert.equal(result.palaces[0].stem, "辛");
  assert.deepEqual(result.fiveElementClass, {
    name: "金四局",
    number: 4,
    element: "金",
    palaceStem: "辛",
    palaceBranch: "巳",
    palaceGanZhi: "辛巳",
    naYin: "白蜡金"
  });
});
