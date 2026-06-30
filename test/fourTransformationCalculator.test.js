import assert from "node:assert/strict";
import test from "node:test";
import {
  applyBirthYearFourTransformations,
  calculateBirthYearFourTransformations
} from "../src/fourTransformationCalculator.js";
import { createChartSkeleton } from "../src/chart.js";
import { applyLifeAndBodyPalaces } from "../src/palaceCalculator.js";
import {
  applyTianFuStarGroup,
  applyZiWeiStar,
  applyZiWeiStarGroup
} from "../src/mainStarCalculator.js";

test("birth year four transformations match the ten-stem default table", () => {
  const table = {
    甲: { 化禄: "廉贞", 化权: "破军", 化科: "武曲", 化忌: "太阳" },
    乙: { 化禄: "天机", 化权: "天梁", 化科: "紫微", 化忌: "太阴" },
    丙: { 化禄: "天同", 化权: "天机", 化科: "文昌", 化忌: "廉贞" },
    丁: { 化禄: "太阴", 化权: "天同", 化科: "天机", 化忌: "巨门" },
    戊: { 化禄: "贪狼", 化权: "太阴", 化科: "右弼", 化忌: "天机" },
    己: { 化禄: "武曲", 化权: "贪狼", 化科: "天梁", 化忌: "文曲" },
    庚: { 化禄: "太阳", 化权: "武曲", 化科: "太阴", 化忌: "天同" },
    辛: { 化禄: "巨门", 化权: "太阳", 化科: "文曲", 化忌: "文昌" },
    壬: { 化禄: "天梁", 化权: "紫微", 化科: "左辅", 化忌: "武曲" },
    癸: { 化禄: "破军", 化权: "巨门", 化科: "太阴", 化忌: "贪狼" }
  };

  for (const [yearStem, expected] of Object.entries(table)) {
    assert.deepEqual(calculateBirthYearFourTransformations({ yearStem }), expected);
  }
});

test("birth year four transformations are attached to palaces containing target stars", () => {
  let chart = createChartSkeleton(createResolvedSampleProfile());

  chart = applyLifeAndBodyPalaces(chart, {
    lunarMonth: 4,
    chineseHour: "子时"
  });
  chart = {
    ...chart,
    fiveElementClass: {
      name: "金四局",
      number: 4
    }
  };
  chart = applyZiWeiStar(chart);
  chart = applyZiWeiStarGroup(chart);
  chart = applyTianFuStarGroup(chart);
  chart = applyBirthYearFourTransformations(chart);

  const palaceByName = new Map(chart.palaces.map((palace) => [palace.name, palace]));

  assert.deepEqual(chart.starAnchors.birthYearTransformations, {
    yearStem: "庚",
    化禄: "太阳",
    化权: "武曲",
    化科: "太阴",
    化忌: "天同"
  });
  assert.deepEqual(palaceByName.get("兄弟宫").transformations, [
    {
      name: "化禄",
      star: "太阳",
      source: "birth-year-stem"
    }
  ]);
  assert.deepEqual(palaceByName.get("夫妻宫").transformations, [
    {
      name: "化权",
      star: "武曲",
      source: "birth-year-stem"
    }
  ]);
  assert.deepEqual(palaceByName.get("仆役宫").transformations, [
    {
      name: "化科",
      star: "太阴",
      source: "birth-year-stem"
    }
  ]);
  assert.deepEqual(palaceByName.get("子女宫").transformations, [
    {
      name: "化忌",
      star: "天同",
      source: "birth-year-stem"
    }
  ]);
});

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
