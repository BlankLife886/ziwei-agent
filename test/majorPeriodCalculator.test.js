import assert from "node:assert/strict";
import test from "node:test";
import { createChartSkeleton } from "../src/chart.js";
import { applyFiveElementClass } from "../src/fiveElementClassCalculator.js";
import {
  applyMajorPeriods,
  calculateMajorPeriods,
  determineMajorPeriodDirection
} from "../src/majorPeriodCalculator.js";
import { applyLifeAndBodyPalaces } from "../src/palaceCalculator.js";

test("determineMajorPeriodDirection follows yang male yin female forward rule", () => {
  assert.deepEqual(determineMajorPeriodDirection({
    yearStem: "庚",
    gender: "male"
  }), {
    polarity: "yang",
    genderLabel: "阳男",
    direction: "forward",
    directionLabel: "顺行"
  });
  assert.deepEqual(determineMajorPeriodDirection({
    yearStem: "庚",
    gender: "female"
  }), {
    polarity: "yang",
    genderLabel: "阳女",
    direction: "reverse",
    directionLabel: "逆行"
  });
  assert.equal(determineMajorPeriodDirection({
    yearStem: "乙",
    gender: "female"
  }).direction, "forward");
  assert.equal(determineMajorPeriodDirection({
    yearStem: "乙",
    gender: "male"
  }).direction, "reverse");
});

test("calculateMajorPeriods starts from five element class number and walks ten-year palaces", () => {
  const chart = createChartWithPalaces({
    gender: "female",
    yearStem: "庚"
  });
  const periods = calculateMajorPeriods({
    palaces: chart.palaces,
    fiveElementClass: chart.fiveElementClass,
    yearStem: "庚",
    gender: "female"
  });

  assert.deepEqual(periods.slice(0, 4).map((period) => {
    return {
      palaceName: period.palaceName,
      branch: period.branch,
      startAge: period.startAge,
      endAge: period.endAge,
      directionLabel: period.directionLabel
    };
  }), [
    {
      palaceName: "命宫",
      branch: "巳",
      startAge: 4,
      endAge: 13,
      directionLabel: "逆行"
    },
    {
      palaceName: "兄弟宫",
      branch: "辰",
      startAge: 14,
      endAge: 23,
      directionLabel: "逆行"
    },
    {
      palaceName: "夫妻宫",
      branch: "卯",
      startAge: 24,
      endAge: 33,
      directionLabel: "逆行"
    },
    {
      palaceName: "子女宫",
      branch: "寅",
      startAge: 34,
      endAge: 43,
      directionLabel: "逆行"
    }
  ]);
});

test("applyMajorPeriods attaches major period skeleton to chart", () => {
  const chart = createChartWithPalaces({
    gender: "female",
    yearStem: "庚"
  });
  const result = applyMajorPeriods(chart);

  assert.equal(result.majorPeriods.length, 12);
  assert.deepEqual(result.majorPeriods[0], {
    number: 1,
    palaceName: "命宫",
    branch: "巳",
    palaceStem: "辛",
    startAge: 4,
    endAge: 13,
    direction: "reverse",
    directionLabel: "逆行",
    genderLabel: "阳女"
  });
  assert.ok(
    result.calculationNotes.some((note) => note.includes("阳女逆行"))
  );
});

function createChartWithPalaces({ gender, yearStem }) {
  let chart = createChartSkeleton({
    name: "示例命主",
    gender,
    calendar: "solar",
    birth_date: "1990-05-18",
    lunar_year: 1990,
    lunar_year_stem: yearStem,
    lunar_year_branch: "午",
    lunar_month: 4,
    lunar_day: 24,
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  });

  chart = applyLifeAndBodyPalaces(chart, {
    lunarMonth: 4,
    chineseHour: "子时"
  });
  return applyFiveElementClass(chart, {
    yearStem
  });
}
