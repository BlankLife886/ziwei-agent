import assert from "node:assert/strict";
import test from "node:test";
import { createChartSkeleton } from "../src/chart.js";
import { applyLifeAndBodyPalaces } from "../src/palaceCalculator.js";

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
