import assert from "node:assert/strict";
import test from "node:test";
import {
  applyZuoFuYouBi,
  calculateZuoFuYouBiBranches
} from "../src/auxiliaryStarCalculator.js";
import { createChartSkeleton } from "../src/chart.js";
import { applyLifeAndBodyPalaces } from "../src/palaceCalculator.js";

test("zuo fu and you bi are calculated from lunar month", () => {
  assert.deepEqual(calculateZuoFuYouBiBranches({ lunarMonth: 1 }), {
    左辅: "辰",
    右弼: "戌"
  });
  assert.deepEqual(calculateZuoFuYouBiBranches({ lunarMonth: 2 }), {
    左辅: "巳",
    右弼: "酉"
  });
  assert.deepEqual(calculateZuoFuYouBiBranches({ lunarMonth: 4 }), {
    左辅: "未",
    右弼: "未"
  });
  assert.deepEqual(calculateZuoFuYouBiBranches({ lunarMonth: 12 }), {
    左辅: "卯",
    右弼: "亥"
  });
});

test("zuo fu and you bi match the full month reference table", () => {
  const table = {
    1: { 左辅: "辰", 右弼: "戌" },
    2: { 左辅: "巳", 右弼: "酉" },
    3: { 左辅: "午", 右弼: "申" },
    4: { 左辅: "未", 右弼: "未" },
    5: { 左辅: "申", 右弼: "午" },
    6: { 左辅: "酉", 右弼: "巳" },
    7: { 左辅: "戌", 右弼: "辰" },
    8: { 左辅: "亥", 右弼: "卯" },
    9: { 左辅: "子", 右弼: "寅" },
    10: { 左辅: "丑", 右弼: "丑" },
    11: { 左辅: "寅", 右弼: "子" },
    12: { 左辅: "卯", 右弼: "亥" }
  };

  for (const [lunarMonth, expected] of Object.entries(table)) {
    assert.deepEqual(
      calculateZuoFuYouBiBranches({
        lunarMonth: Number(lunarMonth)
      }),
      expected
    );
  }
});

test("zuo fu and you bi are placed into matching palaces", () => {
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
  const result = applyZuoFuYouBi(chartWithPalaces);
  const targetPalace = result.palaces.find((palace) => {
    return palace.branch === "未";
  });

  assert.deepEqual(result.starAnchors.monthlyAuxiliaries, {
    lunarMonth: 4,
    左辅: "未",
    右弼: "未"
  });
  assert.deepEqual(targetPalace.auxiliaryStars, ["左辅", "右弼"]);
});
