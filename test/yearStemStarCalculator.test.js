import assert from "node:assert/strict";
import test from "node:test";
import {
  applyKuiYueStars,
  applyLuYangTuoStars,
  calculateKuiYueBranches,
  calculateLuYangTuoBranches
} from "../src/yearStemStarCalculator.js";
import { createChartSkeleton } from "../src/chart.js";
import { applyLifeAndBodyPalaces } from "../src/palaceCalculator.js";

test("lu cun, qing yang, and tuo luo match the ten-stem reference table", () => {
  const table = {
    甲: { 禄存: "寅", 擎羊: "卯", 陀罗: "丑" },
    乙: { 禄存: "卯", 擎羊: "辰", 陀罗: "寅" },
    丙: { 禄存: "巳", 擎羊: "午", 陀罗: "辰" },
    丁: { 禄存: "午", 擎羊: "未", 陀罗: "巳" },
    戊: { 禄存: "巳", 擎羊: "午", 陀罗: "辰" },
    己: { 禄存: "午", 擎羊: "未", 陀罗: "巳" },
    庚: { 禄存: "申", 擎羊: "酉", 陀罗: "未" },
    辛: { 禄存: "酉", 擎羊: "戌", 陀罗: "申" },
    壬: { 禄存: "亥", 擎羊: "子", 陀罗: "戌" },
    癸: { 禄存: "子", 擎羊: "丑", 陀罗: "亥" }
  };

  for (const [yearStem, expected] of Object.entries(table)) {
    assert.deepEqual(calculateLuYangTuoBranches({ yearStem }), expected);
  }
});

test("lu cun is auxiliary while qing yang and tuo luo are malefic", () => {
  const chart = createChartSkeleton({
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    lunar_year: 1990,
    lunar_year_stem: "庚",
    lunar_year_branch: "午",
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
  const result = applyLuYangTuoStars(chartWithPalaces);

  const palaceByBranch = new Map(
    result.palaces.map((palace) => [palace.branch, palace])
  );

  assert.deepEqual(result.starAnchors.luYangTuo, {
    yearStem: "庚",
    禄存: "申",
    擎羊: "酉",
    陀罗: "未"
  });
  assert.deepEqual(palaceByBranch.get("申").auxiliaryStars, ["禄存"]);
  assert.deepEqual(palaceByBranch.get("酉").maleficStars, ["擎羊"]);
  assert.deepEqual(palaceByBranch.get("未").maleficStars, ["陀罗"]);
});

test("tian kui and tian yue match the ten-stem reference table", () => {
  const table = {
    甲: { 天魁: "丑", 天钺: "未" },
    乙: { 天魁: "子", 天钺: "申" },
    丙: { 天魁: "亥", 天钺: "酉" },
    丁: { 天魁: "亥", 天钺: "酉" },
    戊: { 天魁: "丑", 天钺: "未" },
    己: { 天魁: "子", 天钺: "申" },
    庚: { 天魁: "丑", 天钺: "未" },
    辛: { 天魁: "午", 天钺: "寅" },
    壬: { 天魁: "卯", 天钺: "巳" },
    癸: { 天魁: "卯", 天钺: "巳" }
  };

  for (const [yearStem, expected] of Object.entries(table)) {
    assert.deepEqual(calculateKuiYueBranches({ yearStem }), expected);
  }
});

test("tian kui and tian yue are placed as auxiliary stars", () => {
  const chart = createChartSkeleton({
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    lunar_year: 1990,
    lunar_year_stem: "庚",
    lunar_year_branch: "午",
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
  const result = applyKuiYueStars(chartWithPalaces);

  const palaceByBranch = new Map(
    result.palaces.map((palace) => [palace.branch, palace])
  );

  assert.deepEqual(result.starAnchors.kuiYue, {
    yearStem: "庚",
    天魁: "丑",
    天钺: "未"
  });
  assert.deepEqual(palaceByBranch.get("丑").auxiliaryStars, ["天魁"]);
  assert.deepEqual(palaceByBranch.get("未").auxiliaryStars, ["天钺"]);
});
