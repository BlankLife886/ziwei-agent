import assert from "node:assert/strict";
import test from "node:test";
import {
  applyMonthlyPeriod,
  calculateMonthBranch,
  calculateMonthlyPeriod
} from "../src/monthlyPeriodCalculator.js";
import { createChartSkeleton } from "../src/chart.js";
import { applyFiveElementClass } from "../src/fiveElementClassCalculator.js";
import { applyLifeAndBodyPalaces } from "../src/palaceCalculator.js";

test("calculateMonthBranch follows lunar month earthly branch sequence", () => {
  assert.equal(calculateMonthBranch(1), "寅");
  assert.equal(calculateMonthBranch(2), "卯");
  assert.equal(calculateMonthBranch(6), "未");
  assert.equal(calculateMonthBranch(12), "丑");
});

test("calculateMonthlyPeriod maps analysis date to lunar month and month palace", () => {
  const chart = createChartWithPalaceBranches();
  const monthlyPeriod = calculateMonthlyPeriod({
    analysisDate: "2026-06-30",
    palaces: chart.palaces
  });

  assert.deepEqual(monthlyPeriod, {
    analysisDate: "2026-06-30",
    calendar: "lunar-month-of-analysis-date",
    lunarYear: 2026,
    lunarMonth: 5,
    lunarDay: 16,
    isLeapMonth: false,
    monthBranch: "午",
    palaceName: "父母宫",
    branch: "午"
  });
});

test("applyMonthlyPeriod attaches monthly timing skeleton without event claims", () => {
  const chart = applyMonthlyPeriod(createChartWithPalaceBranches(), {
    analysisDate: "2026-06-30"
  });

  assert.equal(chart.monthlyPeriod.lunarMonth, 5);
  assert.equal(chart.monthlyPeriod.monthBranch, "午");
  assert.equal(chart.monthlyPeriod.palaceName, "父母宫");
  assert.ok(
    chart.calculationNotes.some((note) => {
      return note.includes("流月月建暂按午支定位到父母宫午");
    })
  );
  assert.ok(
    chart.calculationNotes.every((note) => {
      return !/应期|具体事件|吉凶/u.test(note);
    })
  );
});

function createChartWithPalaceBranches() {
  let chart = createChartSkeleton(createResolvedSampleProfile());

  chart = applyLifeAndBodyPalaces(chart, {
    lunarMonth: 4,
    chineseHour: "子时"
  });
  chart = applyFiveElementClass(chart, {
    yearStem: "庚"
  });

  return chart;
}

function createResolvedSampleProfile() {
  return {
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
  };
}
