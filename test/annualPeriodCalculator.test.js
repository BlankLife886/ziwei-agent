import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAnnualPeriod,
  calculateAnnualPeriod
} from "../src/annualPeriodCalculator.js";
import { createChartSkeleton } from "../src/chart.js";
import { applyFiveElementClass } from "../src/fiveElementClassCalculator.js";
import { applyLifeAndBodyPalaces } from "../src/palaceCalculator.js";

test("calculateAnnualPeriod maps analysis date to lunar year and tai sui palace", () => {
  const chart = createChartWithPalaceBranches();
  const annualPeriod = calculateAnnualPeriod({
    analysisDate: "2026-06-30",
    palaces: chart.palaces
  });

  assert.deepEqual(annualPeriod, {
    analysisDate: "2026-06-30",
    calendar: "lunar-year-of-analysis-date",
    lunarYear: 2026,
    yearStem: "丙",
    yearBranch: "午",
    palaceName: "父母宫",
    branch: "午"
  });
});

test("applyAnnualPeriod attaches annual timing skeleton without event claims", () => {
  const chart = applyAnnualPeriod(createChartWithPalaceBranches(), {
    analysisDate: "2026-06-30"
  });

  assert.equal(chart.annualPeriod.yearStem, "丙");
  assert.equal(chart.annualPeriod.yearBranch, "午");
  assert.equal(chart.annualPeriod.palaceName, "父母宫");
  assert.ok(
    chart.calculationNotes.some((note) => {
      return note.includes("流年命宫暂按太岁地支定位到父母宫午");
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
