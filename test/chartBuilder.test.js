import assert from "node:assert/strict";
import test from "node:test";
import { buildChart } from "../src/chartBuilder.js";

test("buildChart creates a complete chart from a solar birth profile", () => {
  const result = buildChart(createSampleProfile());

  assert.equal(result.status, "complete");
  assert.equal(result.exitCode, 0);
  assert.equal(result.validation.chineseHour, "子时");
  assert.equal(result.lunarResult.profile.lunar_year_stem, "庚");
  assert.equal(result.lunarResult.profile.lunar_year_branch, "午");
  assert.equal(result.chart.lifePalace.branch, "巳");
  assert.equal(result.chart.bodyPalace.branch, "巳");
  assert.equal(result.chart.fiveElementClass.name, "金四局");
  assert.deepEqual(result.chart.starAnchors.ziWei, {
    branch: "未",
    lunarDay: 24,
    fiveElementClassNumber: 4,
    adjustment: 0,
    quotient: 6,
    branchNumber: 6
  });
  assert.deepEqual(result.chart.starAnchors.tianChu, {
    yearStem: "庚",
    天厨: "寅"
  });
  assert.deepEqual(result.chart.starAnchors.jieKong, {
    yearStem: "庚",
    正空: "午",
    副空: "未"
  });
  assert.deepEqual(result.chart.starAnchors.birthYearTransformations, {
    yearStem: "庚",
    化禄: "太阳",
    化权: "武曲",
    化科: "太阴",
    化忌: "天同"
  });
  assert.deepEqual(result.chart.majorPeriods.slice(0, 3).map((period) => {
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
    }
  ]);
  assert.equal(result.chart.profileSummary.analysisDate, "2026-06-30");
  assert.equal(result.chart.currentMajorPeriod.ageLabel, "虚岁");
  assert.equal(result.chart.currentMajorPeriod.age, 37);
  assert.equal(result.chart.currentMajorPeriod.period.palaceName, "子女宫");
  assert.equal(result.chart.currentMajorPeriod.period.branch, "寅");

  const palaceByBranch = new Map(
    result.chart.palaces.map((palace) => [palace.branch, palace])
  );

  assert.deepEqual(palaceByBranch.get("未").mainStars, ["紫微", "破军"]);
  assert.deepEqual(palaceByBranch.get("未").voidStars, ["截空（副空）"]);
  assert.deepEqual(palaceByBranch.get("午").voidStars, ["截空（正空）"]);
  assert.deepEqual(palaceByBranch.get("辰").transformations, [
    {
      name: "化禄",
      star: "太阳",
      source: "birth-year-stem"
    }
  ]);
  assert.deepEqual(palaceByBranch.get("卯").transformations, [
    {
      name: "化权",
      star: "武曲",
      source: "birth-year-stem"
    }
  ]);
});

test("buildChart returns structured validation failures", () => {
  const result = buildChart({
    ...createSampleProfile(),
    birth_time: "25:99"
  });

  assert.equal(result.status, "invalid");
  assert.equal(result.exitCode, 2);
  assert.equal(result.chart, null);
  assert.deepEqual(result.validation.errors, [
    "birth_time must use HH:MM 24-hour format"
  ]);
});

test("buildChart returns structured missing field results", () => {
  const profile = createSampleProfile();
  delete profile.birth_place;

  const result = buildChart(profile);

  assert.equal(result.status, "incomplete");
  assert.equal(result.exitCode, 1);
  assert.equal(result.chart, null);
  assert.deepEqual(result.validation.missingFields, ["birth_place"]);
});

function createSampleProfile() {
  return {
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    analysis_date: "2026-06-30",
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  };
}
