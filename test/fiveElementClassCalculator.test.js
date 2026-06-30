import assert from "node:assert/strict";
import test from "node:test";
import { createChartSkeleton } from "../src/chart.js";
import {
  applyFiveElementClass,
  calculatePalaceStem
} from "../src/fiveElementClassCalculator.js";
import { applyLifeAndBodyPalaces } from "../src/palaceCalculator.js";

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
