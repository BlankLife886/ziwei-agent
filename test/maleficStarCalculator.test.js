import assert from "node:assert/strict";
import test from "node:test";
import {
  applyFireBellStars,
  calculateFireBellBranches
} from "../src/maleficStarCalculator.js";
import { createChartSkeleton } from "../src/chart.js";
import { applyLifeAndBodyPalaces } from "../src/palaceCalculator.js";

test("fire star and bell star use year branch groups and chinese hour", () => {
  // 子时不移动，正好能直接验证四组年支各自的起点。
  assert.deepEqual(
    calculateFireBellBranches({
      yearBranch: "午",
      chineseHour: "子时"
    }),
    {
      火星: "丑",
      铃星: "卯"
    }
  );
  assert.deepEqual(
    calculateFireBellBranches({
      yearBranch: "辰",
      chineseHour: "子时"
    }),
    {
      火星: "寅",
      铃星: "戌"
    }
  );
  assert.deepEqual(
    calculateFireBellBranches({
      yearBranch: "酉",
      chineseHour: "子时"
    }),
    {
      火星: "卯",
      铃星: "戌"
    }
  );
  assert.deepEqual(
    calculateFireBellBranches({
      yearBranch: "亥",
      chineseHour: "子时"
    }),
    {
      火星: "酉",
      铃星: "戌"
    }
  );
});

test("fire star and bell star advance from zi hour to birth hour", () => {
  assert.deepEqual(
    calculateFireBellBranches({
      yearBranch: "辰",
      chineseHour: "寅时"
    }),
    {
      火星: "辰",
      铃星: "子"
    }
  );
});

test("fire star and bell star are placed into malefic star slots", () => {
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
  const result = applyFireBellStars(chartWithPalaces, {
    chineseHour: "子时"
  });

  const palaceByBranch = new Map(
    result.palaces.map((palace) => [palace.branch, palace])
  );

  assert.deepEqual(result.starAnchors.fireBell, {
    yearBranch: "午",
    chineseHour: "子时",
    火星: "丑",
    铃星: "卯"
  });
  assert.deepEqual(palaceByBranch.get("丑").maleficStars, ["火星"]);
  assert.deepEqual(palaceByBranch.get("卯").maleficStars, ["铃星"]);
});
