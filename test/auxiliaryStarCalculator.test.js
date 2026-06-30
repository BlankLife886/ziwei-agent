import assert from "node:assert/strict";
import test from "node:test";
import {
  applyMonthlyAuxiliaryStars,
  applyZuoFuYouBi,
  calculateMonthlyAuxiliaryBranches,
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

test("monthly auxiliary stars match the full month reference table", () => {
  const table = {
    1: {
      左辅: "辰",
      右弼: "戌",
      天刑: "酉",
      天姚: "丑",
      天月: "戌",
      天巫: "巳"
    },
    2: {
      左辅: "巳",
      右弼: "酉",
      天刑: "戌",
      天姚: "寅",
      天月: "巳",
      天巫: "申"
    },
    3: {
      左辅: "午",
      右弼: "申",
      天刑: "亥",
      天姚: "卯",
      天月: "辰",
      天巫: "亥"
    },
    4: {
      左辅: "未",
      右弼: "未",
      天刑: "子",
      天姚: "辰",
      天月: "寅",
      天巫: "寅"
    },
    5: {
      左辅: "申",
      右弼: "午",
      天刑: "丑",
      天姚: "巳",
      天月: "未",
      天巫: "巳"
    },
    6: {
      左辅: "酉",
      右弼: "巳",
      天刑: "寅",
      天姚: "午",
      天月: "卯",
      天巫: "申"
    },
    7: {
      左辅: "戌",
      右弼: "辰",
      天刑: "卯",
      天姚: "未",
      天月: "亥",
      天巫: "亥"
    },
    8: {
      左辅: "亥",
      右弼: "卯",
      天刑: "辰",
      天姚: "申",
      天月: "未",
      天巫: "寅"
    },
    9: {
      左辅: "子",
      右弼: "寅",
      天刑: "巳",
      天姚: "酉",
      天月: "寅",
      天巫: "巳"
    },
    10: {
      左辅: "丑",
      右弼: "丑",
      天刑: "午",
      天姚: "戌",
      天月: "午",
      天巫: "申"
    },
    11: {
      左辅: "寅",
      右弼: "子",
      天刑: "未",
      天姚: "亥",
      天月: "戌",
      天巫: "亥"
    },
    12: {
      左辅: "卯",
      右弼: "亥",
      天刑: "申",
      天姚: "子",
      天月: "寅",
      天巫: "寅"
    }
  };

  for (const [lunarMonth, expected] of Object.entries(table)) {
    assert.deepEqual(
      calculateMonthlyAuxiliaryBranches({
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

test("monthly auxiliary stars are placed into matching palaces", () => {
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
  const result = applyMonthlyAuxiliaryStars(chartWithPalaces);

  const palaceByBranch = new Map(
    result.palaces.map((palace) => [palace.branch, palace])
  );

  assert.deepEqual(result.starAnchors.monthlyAuxiliaries, {
    lunarMonth: 4,
    左辅: "未",
    右弼: "未",
    天刑: "子",
    天姚: "辰",
    天月: "寅",
    天巫: "寅"
  });
  assert.deepEqual(palaceByBranch.get("未").auxiliaryStars, ["左辅", "右弼"]);
  assert.deepEqual(palaceByBranch.get("子").auxiliaryStars, ["天刑"]);
  assert.deepEqual(palaceByBranch.get("辰").auxiliaryStars, ["天姚"]);
  assert.deepEqual(palaceByBranch.get("寅").auxiliaryStars, ["天月", "天巫"]);
});
