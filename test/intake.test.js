import assert from "node:assert/strict";
import test from "node:test";
import {
  convertSolarDateToLunar,
  resolveLunarProfile
} from "../src/calendarConverter.js";
import { createChartSkeleton, PALACE_NAMES } from "../src/chart.js";
import {
  applyFiveElementClass,
  calculatePalaceStem
} from "../src/fiveElementClassCalculator.js";
import { validateBirthProfile } from "../src/intake.js";
import {
  applyTianFuStarGroup,
  applyZiWeiStar,
  applyZiWeiStarGroup,
  calculateTianFuBranch,
  calculateTianFuStarBranches,
  calculateZiWeiStarBranches,
  calculateZiWeiBranch
} from "../src/mainStarCalculator.js";
import { applyLifeAndBodyPalaces } from "../src/palaceCalculator.js";

test("valid profile gets chinese hour", () => {
  const result = validateBirthProfile({
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

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.missingFields, []);
  assert.equal(result.chineseHour, "子时");
});

test("missing required fields are reported", () => {
  const result = validateBirthProfile({
    name: "",
    gender: "female",
    calendar: "solar",
    birth_date: "",
    birth_time: "08:00",
    birth_place: "",
    timezone: "Asia/Shanghai"
  });

  assert.deepEqual(result.missingFields, ["name", "birth_date", "birth_place"]);
  assert.deepEqual(result.errors, []);
});

test("invalid time is reported", () => {
  const result = validateBirthProfile({
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    birth_time: "25:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai"
  });

  assert.deepEqual(result.errors, ["birth_time must use HH:MM 24-hour format"]);
});

test("invalid lunar month is reported", () => {
  const result = validateBirthProfile({
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    lunar_month: 13,
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai"
  });

  assert.deepEqual(result.errors, ["lunar_month must be an integer from 1 to 12"]);
});

test("solar date converts to lunar date", () => {
  const result = convertSolarDateToLunar("1990-05-18");

  assert.deepEqual(result, {
    year: 1990,
    yearStem: "庚",
    month: 4,
    day: 24,
    isLeapMonth: false,
    text: "一九九〇年四月廿四"
  });
});

test("invalid solar date is rejected by converter", () => {
  assert.throws(
    () => convertSolarDateToLunar("1990-02-30"),
    /birth_date must be a valid solar date/
  );
});

test("lunar input derives lunar month from birth date", () => {
  const result = resolveLunarProfile({
    name: "示例命主",
    gender: "female",
    calendar: "lunar",
    birth_date: "1990-04-24",
    lunar_month: null,
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  });

  assert.equal(result.profile.lunar_month, 4);
  assert.equal(result.profile.lunar_day, 24);
  assert.equal(result.profile.lunar_year_stem, "庚");
});

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

test("zi wei branch is calculated from lunar day and five element class", () => {
  assert.equal(
    calculateZiWeiBranch({
      lunarDay: 1,
      fiveElementClassNumber: 4
    }).branch,
    "亥"
  );
  assert.equal(
    calculateZiWeiBranch({
      lunarDay: 16,
      fiveElementClassNumber: 3
    }).branch,
    "酉"
  );
  assert.equal(
    calculateZiWeiBranch({
      lunarDay: 28,
      fiveElementClassNumber: 5
    }).branch,
    "酉"
  );
});

test("zi wei star is placed into the matching palace", () => {
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
  const chartWithFiveElementClass = applyFiveElementClass(chartWithPalaces, {
    yearStem: "庚"
  });
  const result = applyZiWeiStar(chartWithFiveElementClass);
  const ziWeiPalace = result.palaces.find((palace) => {
    return palace.branch === "未";
  });

  assert.equal(result.starAnchors.ziWei.branch, "未");
  assert.ok(ziWeiPalace.mainStars.includes("紫微"));
});

test("zi wei star group is calculated from zi wei branch", () => {
  const result = calculateZiWeiStarBranches({
    ziWeiBranch: "子"
  });

  assert.deepEqual(result, {
    紫微: "子",
    天机: "亥",
    太阳: "酉",
    武曲: "申",
    天同: "未",
    廉贞: "辰"
  });
});

test("zi wei star group is placed into matching palaces", () => {
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
  const chartWithFiveElementClass = applyFiveElementClass(chartWithPalaces, {
    yearStem: "庚"
  });
  const chartWithZiWei = applyZiWeiStar(chartWithFiveElementClass);
  const result = applyZiWeiStarGroup(chartWithZiWei);

  assert.deepEqual(result.starAnchors.ziWeiGroup, {
    紫微: "未",
    天机: "午",
    太阳: "辰",
    武曲: "卯",
    天同: "寅",
    廉贞: "亥"
  });
  assert.ok(
    result.palaces.find((palace) => palace.branch === "亥").mainStars.includes("廉贞")
  );
});

test("tian fu branch is calculated from zi wei branch", () => {
  assert.equal(calculateTianFuBranch({ ziWeiBranch: "子" }), "辰");
  assert.equal(calculateTianFuBranch({ ziWeiBranch: "辰" }), "子");
  assert.equal(calculateTianFuBranch({ ziWeiBranch: "寅" }), "寅");
  assert.equal(calculateTianFuBranch({ ziWeiBranch: "申" }), "申");
  assert.equal(calculateTianFuBranch({ ziWeiBranch: "卯" }), "丑");
  assert.equal(calculateTianFuBranch({ ziWeiBranch: "丑" }), "卯");
});

test("tian fu star group is calculated from tian fu branch", () => {
  const result = calculateTianFuStarBranches({
    tianFuBranch: "寅"
  });

  assert.deepEqual(result, {
    天府: "寅",
    太阴: "卯",
    贪狼: "辰",
    巨门: "巳",
    天相: "午",
    天梁: "未",
    七杀: "申",
    破军: "子"
  });
});

test("all fourteen main stars match the reference table", () => {
  const table = {
    子: {
      紫微: "子",
      天机: "亥",
      太阳: "酉",
      武曲: "申",
      天同: "未",
      廉贞: "辰",
      天府: "辰",
      太阴: "巳",
      贪狼: "午",
      巨门: "未",
      天相: "申",
      天梁: "酉",
      七杀: "戌",
      破军: "寅"
    },
    丑: {
      紫微: "丑",
      天机: "子",
      太阳: "戌",
      武曲: "酉",
      天同: "申",
      廉贞: "巳",
      天府: "卯",
      太阴: "辰",
      贪狼: "巳",
      巨门: "午",
      天相: "未",
      天梁: "申",
      七杀: "酉",
      破军: "丑"
    },
    寅: {
      紫微: "寅",
      天机: "丑",
      太阳: "亥",
      武曲: "戌",
      天同: "酉",
      廉贞: "午",
      天府: "寅",
      太阴: "卯",
      贪狼: "辰",
      巨门: "巳",
      天相: "午",
      天梁: "未",
      七杀: "申",
      破军: "子"
    },
    卯: {
      紫微: "卯",
      天机: "寅",
      太阳: "子",
      武曲: "亥",
      天同: "戌",
      廉贞: "未",
      天府: "丑",
      太阴: "寅",
      贪狼: "卯",
      巨门: "辰",
      天相: "巳",
      天梁: "午",
      七杀: "未",
      破军: "亥"
    },
    辰: {
      紫微: "辰",
      天机: "卯",
      太阳: "丑",
      武曲: "子",
      天同: "亥",
      廉贞: "申",
      天府: "子",
      太阴: "丑",
      贪狼: "寅",
      巨门: "卯",
      天相: "辰",
      天梁: "巳",
      七杀: "午",
      破军: "戌"
    },
    巳: {
      紫微: "巳",
      天机: "辰",
      太阳: "寅",
      武曲: "丑",
      天同: "子",
      廉贞: "酉",
      天府: "亥",
      太阴: "子",
      贪狼: "丑",
      巨门: "寅",
      天相: "卯",
      天梁: "辰",
      七杀: "巳",
      破军: "酉"
    },
    午: {
      紫微: "午",
      天机: "巳",
      太阳: "卯",
      武曲: "寅",
      天同: "丑",
      廉贞: "戌",
      天府: "戌",
      太阴: "亥",
      贪狼: "子",
      巨门: "丑",
      天相: "寅",
      天梁: "卯",
      七杀: "辰",
      破军: "申"
    },
    未: {
      紫微: "未",
      天机: "午",
      太阳: "辰",
      武曲: "卯",
      天同: "寅",
      廉贞: "亥",
      天府: "酉",
      太阴: "戌",
      贪狼: "亥",
      巨门: "子",
      天相: "丑",
      天梁: "寅",
      七杀: "卯",
      破军: "未"
    },
    申: {
      紫微: "申",
      天机: "未",
      太阳: "巳",
      武曲: "辰",
      天同: "卯",
      廉贞: "子",
      天府: "申",
      太阴: "酉",
      贪狼: "戌",
      巨门: "亥",
      天相: "子",
      天梁: "丑",
      七杀: "寅",
      破军: "午"
    },
    酉: {
      紫微: "酉",
      天机: "申",
      太阳: "午",
      武曲: "巳",
      天同: "辰",
      廉贞: "丑",
      天府: "未",
      太阴: "申",
      贪狼: "酉",
      巨门: "戌",
      天相: "亥",
      天梁: "子",
      七杀: "丑",
      破军: "巳"
    },
    戌: {
      紫微: "戌",
      天机: "酉",
      太阳: "未",
      武曲: "午",
      天同: "巳",
      廉贞: "寅",
      天府: "午",
      太阴: "未",
      贪狼: "申",
      巨门: "酉",
      天相: "戌",
      天梁: "亥",
      七杀: "子",
      破军: "辰"
    },
    亥: {
      紫微: "亥",
      天机: "戌",
      太阳: "申",
      武曲: "未",
      天同: "午",
      廉贞: "卯",
      天府: "巳",
      太阴: "午",
      贪狼: "未",
      巨门: "申",
      天相: "酉",
      天梁: "戌",
      七杀: "亥",
      破军: "卯"
    }
  };

  for (const [ziWeiBranch, expected] of Object.entries(table)) {
    const tianFuBranch = calculateTianFuBranch({ ziWeiBranch });
    assert.deepEqual(
      {
        ...calculateZiWeiStarBranches({ ziWeiBranch }),
        ...calculateTianFuStarBranches({ tianFuBranch })
      },
      expected
    );
  }
});

test("tian fu star group is placed into matching palaces", () => {
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
  const chartWithFiveElementClass = applyFiveElementClass(chartWithPalaces, {
    yearStem: "庚"
  });
  const chartWithZiWei = applyZiWeiStar(chartWithFiveElementClass);
  const chartWithZiWeiGroup = applyZiWeiStarGroup(chartWithZiWei);
  const result = applyTianFuStarGroup(chartWithZiWeiGroup);
  const ziWeiPalace = result.palaces.find((palace) => {
    return palace.branch === "未";
  });

  assert.deepEqual(result.starAnchors.tianFu, {
    branch: "酉",
    ziWeiBranch: "未"
  });
  assert.deepEqual(result.starAnchors.tianFuGroup, {
    天府: "酉",
    太阴: "戌",
    贪狼: "亥",
    巨门: "子",
    天相: "丑",
    天梁: "寅",
    七杀: "卯",
    破军: "未"
  });
  assert.deepEqual(ziWeiPalace.mainStars, ["紫微", "破军"]);
});
