import { convertSolarDateToLunar } from "./calendarConverter.js";

// 流年骨架计算器。
//
// 这一层只负责把分析日期对应到农历年份，并找到该年太岁地支所在宫位。
// 它不判断年度事件，也不解释运势好坏；这些必须留给 agent 的证据链、
// 解释目录和后续更严格的触发规则。

export function calculateAnnualPeriod({ analysisDate, palaces }) {
  if (!analysisDate) {
    return null;
  }

  const annualLunar = convertSolarDateToLunar(analysisDate);
  const annualPalace = palaces.find((palace) => {
    return palace.branch === annualLunar.yearBranch;
  }) ?? null;

  return {
    analysisDate,
    calendar: "lunar-year-of-analysis-date",
    lunarYear: annualLunar.year,
    yearStem: annualLunar.yearStem,
    yearBranch: annualLunar.yearBranch,
    palaceName: annualPalace?.name ?? null,
    branch: annualPalace?.branch ?? annualLunar.yearBranch
  };
}

export function applyAnnualPeriod(chart, { analysisDate }) {
  const annualPeriod = calculateAnnualPeriod({
    analysisDate,
    palaces: chart.palaces
  });

  if (!annualPeriod) {
    return chart;
  }

  const palaceText = annualPeriod.palaceName
    ? `${annualPeriod.palaceName}${annualPeriod.branch}`
    : `${annualPeriod.yearBranch}支未匹配到本命宫位`;

  return {
    ...chart,
    annualPeriod,
    calculationNotes: [
      ...chart.calculationNotes,
      `以分析日期${analysisDate}换算流年为农历${annualPeriod.lunarYear}年${annualPeriod.yearStem}${annualPeriod.yearBranch}，流年命宫暂按太岁地支定位到${palaceText}。`
    ]
  };
}
