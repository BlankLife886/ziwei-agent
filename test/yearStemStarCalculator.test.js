import assert from "node:assert/strict";
import test from "node:test";
import {
  applyJieKongStars,
  applyKuiYueStars,
  applyLuYangTuoStars,
  applyTianChuStar,
  applyTianGuanFuStars,
  calculateJieKongBranches,
  calculateKuiYueBranches,
  calculateLuYangTuoBranches,
  calculateTianChuBranches,
  calculateTianGuanFuBranches
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

test("tian guan and tian fu match the ten-stem reference table", () => {
  const table = {
    甲: { 天官: "未", 天福: "酉" },
    乙: { 天官: "辰", 天福: "申" },
    丙: { 天官: "巳", 天福: "子" },
    丁: { 天官: "寅", 天福: "亥" },
    戊: { 天官: "卯", 天福: "卯" },
    己: { 天官: "酉", 天福: "寅" },
    庚: { 天官: "亥", 天福: "午" },
    辛: { 天官: "酉", 天福: "巳" },
    壬: { 天官: "戌", 天福: "午" },
    癸: { 天官: "午", 天福: "巳" }
  };

  for (const [yearStem, expected] of Object.entries(table)) {
    assert.deepEqual(calculateTianGuanFuBranches({ yearStem }), expected);
  }
});

test("tian guan and tian fu are placed as auxiliary stars", () => {
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
  const result = applyTianGuanFuStars(chartWithPalaces);

  const palaceByBranch = new Map(
    result.palaces.map((palace) => [palace.branch, palace])
  );

  assert.deepEqual(result.starAnchors.tianGuanFu, {
    yearStem: "庚",
    天官: "亥",
    天福: "午"
  });
  assert.deepEqual(palaceByBranch.get("亥").auxiliaryStars, ["天官"]);
  assert.deepEqual(palaceByBranch.get("午").auxiliaryStars, ["天福"]);
});

test("tian chu matches the ten-stem reference table", () => {
  const table = {
    甲: { 天厨: "巳" },
    乙: { 天厨: "午" },
    丙: { 天厨: "子" },
    丁: { 天厨: "巳" },
    戊: { 天厨: "午" },
    己: { 天厨: "申" },
    庚: { 天厨: "寅" },
    辛: { 天厨: "午" },
    壬: { 天厨: "酉" },
    癸: { 天厨: "亥" }
  };

  for (const [yearStem, expected] of Object.entries(table)) {
    assert.deepEqual(calculateTianChuBranches({ yearStem }), expected);
  }
});

test("tian chu is placed as an auxiliary star", () => {
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
  const result = applyTianChuStar(chartWithPalaces);

  const palaceByBranch = new Map(
    result.palaces.map((palace) => [palace.branch, palace])
  );

  assert.deepEqual(result.starAnchors.tianChu, {
    yearStem: "庚",
    天厨: "寅"
  });
  assert.deepEqual(palaceByBranch.get("寅").auxiliaryStars, ["天厨"]);
});

test("jie kong matches the ten-stem reference table with primary and secondary void", () => {
  const table = {
    甲: { 正空: "申", 副空: "酉" },
    乙: { 正空: "未", 副空: "午" },
    丙: { 正空: "辰", 副空: "巳" },
    丁: { 正空: "卯", 副空: "寅" },
    戊: { 正空: "子", 副空: "丑" },
    己: { 正空: "酉", 副空: "申" },
    庚: { 正空: "午", 副空: "未" },
    辛: { 正空: "巳", 副空: "辰" },
    壬: { 正空: "寅", 副空: "卯" },
    癸: { 正空: "丑", 副空: "子" }
  };

  for (const [yearStem, expected] of Object.entries(table)) {
    assert.deepEqual(calculateJieKongBranches({ yearStem }), expected);
  }
});

test("jie kong is placed into the void star slot", () => {
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
  const result = applyJieKongStars(chartWithPalaces);

  const palaceByBranch = new Map(
    result.palaces.map((palace) => [palace.branch, palace])
  );

  assert.deepEqual(result.starAnchors.jieKong, {
    yearStem: "庚",
    正空: "午",
    副空: "未"
  });
  assert.deepEqual(palaceByBranch.get("午").voidStars, ["截空（正空）"]);
  assert.deepEqual(palaceByBranch.get("未").voidStars, ["截空（副空）"]);
  assert.deepEqual(palaceByBranch.get("午").auxiliaryStars, []);
  assert.deepEqual(palaceByBranch.get("午").maleficStars, []);
});
