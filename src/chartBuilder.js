import {
  applyDailyAuxiliaryStars,
  applyMonthlyAuxiliaryStars
} from "./auxiliaryStarCalculator.js";
import { resolveLunarProfile } from "./calendarConverter.js";
import { createChartSkeleton } from "./chart.js";
import { applyFiveElementClass } from "./fiveElementClassCalculator.js";
import { applyBirthYearFourTransformations } from "./fourTransformationCalculator.js";
import { validateBirthProfile } from "./intake.js";
import {
  applyCurrentMajorPeriod,
  applyMajorPeriods
} from "./majorPeriodCalculator.js";
import {
  applyTianFuStarGroup,
  applyZiWeiStar,
  applyZiWeiStarGroup
} from "./mainStarCalculator.js";
import { applyFireBellStars } from "./maleficStarCalculator.js";
import { applyLifeAndBodyPalaces } from "./palaceCalculator.js";
import {
  applyJieKongStars,
  applyKuiYueStars,
  applyLuYangTuoStars,
  applyTianChuStar,
  applyTianGuanFuStars
} from "./yearStemStarCalculator.js";

// 排盘服务层：把“从出生资料到完整命盘”的流程集中在这里。
//
// CLI、未来 API、未来 LLM tool 都应该调用这个模块，而不是复制一遍排盘步骤。
// 这样后面接真正的 agent 时，agent 只需要把用户资料交给 buildChart，
// 再读取结构化 chart 做分析、追问或生成报告。

export function buildChart(rawProfile) {
  const validation = validateBirthProfile(rawProfile);

  if (validation.errors.length > 0) {
    return {
      status: "invalid",
      exitCode: 2,
      validation,
      lunarResult: null,
      chart: null
    };
  }

  if (validation.missingFields.length > 0) {
    return {
      status: "incomplete",
      exitCode: 1,
      validation,
      lunarResult: null,
      chart: null
    };
  }

  const lunarResult = resolveLunarProfile(validation.profile);
  const chart = buildChartFromResolvedProfile({
    profile: lunarResult.profile,
    chineseHour: validation.chineseHour
  });

  return {
    status: "complete",
    exitCode: 0,
    validation,
    lunarResult,
    chart
  };
}

function buildChartFromResolvedProfile({ profile, chineseHour }) {
  let chart = createChartSkeleton(profile);

  if (profile.lunar_month && chineseHour) {
    chart = applyLifeAndBodyPalaces(chart, {
      lunarMonth: profile.lunar_month,
      chineseHour
    });
  }

  if (chart.lifePalace && profile.lunar_year_stem) {
    chart = applyFiveElementClass(chart, {
      yearStem: profile.lunar_year_stem
    });
  }

  if (chart.fiveElementClass && profile.lunar_day) {
    chart = applyZiWeiStar(chart);
    chart = applyZiWeiStarGroup(chart);
    chart = applyTianFuStarGroup(chart);
  }

  if (chart.fiveElementClass && profile.lunar_year_stem) {
    chart = applyMajorPeriods(chart);
  }

  if (chart.majorPeriods.length > 0 && profile.analysis_date) {
    chart = applyCurrentMajorPeriod(chart, {
      analysisDate: profile.analysis_date
    });
  }

  if (profile.lunar_month) {
    chart = applyMonthlyAuxiliaryStars(chart);
  }

  if (profile.lunar_month && profile.lunar_day) {
    chart = applyDailyAuxiliaryStars(chart);
  }

  if (profile.lunar_year_stem) {
    chart = applyLuYangTuoStars(chart);
    chart = applyKuiYueStars(chart);
    chart = applyTianGuanFuStars(chart);
    chart = applyTianChuStar(chart);
    chart = applyJieKongStars(chart);
  }

  if (profile.lunar_year_branch && chineseHour) {
    chart = applyFireBellStars(chart, {
      chineseHour
    });
  }

  if (profile.lunar_year_stem) {
    chart = applyBirthYearFourTransformations(chart);
  }

  return chart;
}
