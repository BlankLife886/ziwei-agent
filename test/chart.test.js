import assert from "node:assert/strict";
import test from "node:test";
import { createChartSkeleton, PALACE_NAMES } from "../src/chart.js";

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
