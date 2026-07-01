import { EARTHLY_BRANCHES } from "./chart.js";
import { convertSolarDateToLunar } from "./calendarConverter.js";

// 流月骨架计算器。
//
// 这一层只负责把分析日期换算到农历月份，并用月建地支找到本命盘中
// 对应的宫位。它不负责解释月份事件，也不生成应期；这些必须留在
// agent 的证据链、解释目录和后续组合验证中处理。

export function calculateMonthlyPeriod({ analysisDate, palaces }) {
  if (!analysisDate) {
    return null;
  }

  const lunar = convertSolarDateToLunar(analysisDate);
  const monthBranch = calculateMonthBranch(lunar.month);
  const monthlyPalace = palaces.find((palace) => {
    return palace.branch === monthBranch;
  }) ?? null;

  return {
    analysisDate,
    calendar: "lunar-month-of-analysis-date",
    lunarYear: lunar.year,
    lunarMonth: lunar.month,
    lunarDay: lunar.day,
    isLeapMonth: lunar.isLeapMonth,
    monthBranch,
    palaceName: monthlyPalace?.name ?? null,
    branch: monthlyPalace?.branch ?? monthBranch
  };
}

export function applyMonthlyPeriod(chart, { analysisDate }) {
  const monthlyPeriod = calculateMonthlyPeriod({
    analysisDate,
    palaces: chart.palaces
  });

  if (!monthlyPeriod) {
    return chart;
  }

  const palaceText = monthlyPeriod.palaceName
    ? `${monthlyPeriod.palaceName}${monthlyPeriod.branch}`
    : `${monthlyPeriod.monthBranch}支未匹配到本命宫位`;
  const leapText = monthlyPeriod.isLeapMonth ? "闰" : "";

  return {
    ...chart,
    monthlyPeriod,
    calculationNotes: [
      ...chart.calculationNotes,
      `以分析日期${analysisDate}换算为农历${monthlyPeriod.lunarYear}年${leapText}${monthlyPeriod.lunarMonth}月${monthlyPeriod.lunarDay}日，流月月建暂按${monthlyPeriod.monthBranch}支定位到${palaceText}。`
    ]
  };
}

export function calculateMonthBranch(lunarMonth) {
  if (!Number.isInteger(lunarMonth) || lunarMonth < 1 || lunarMonth > 12) {
    throw new Error("lunarMonth must be an integer between 1 and 12");
  }

  // 月建地支常用规则：正月建寅、二月建卯，依次顺行到十二月丑。
  const branchIndex = (lunarMonth + 1) % EARTHLY_BRANCHES.length;

  return EARTHLY_BRANCHES[branchIndex];
}
