import { readFile } from "node:fs/promises";
import {
  applyDailyAuxiliaryStars,
  applyMonthlyAuxiliaryStars
} from "./auxiliaryStarCalculator.js";
import { resolveLunarProfile } from "./calendarConverter.js";
import { createChartSkeleton, summarizeChartSkeleton } from "./chart.js";
import { applyFiveElementClass } from "./fiveElementClassCalculator.js";
import { validateBirthProfile } from "./intake.js";
import {
  applyTianFuStarGroup,
  applyZiWeiStar,
  applyZiWeiStarGroup
} from "./mainStarCalculator.js";
import { applyFireBellStars } from "./maleficStarCalculator.js";
import { applyLifeAndBodyPalaces } from "./palaceCalculator.js";

async function main() {
  const profilePath = process.argv[2];

  if (!profilePath) {
    console.error("用法：node src/cli.js examples/profile.example.json");
    return 2;
  }

  const profile = JSON.parse(await readFile(profilePath, "utf8"));
  const result = validateBirthProfile(profile);

  if (result.errors.length > 0) {
    console.error("资料格式错误：");
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    return 2;
  }

  if (result.missingFields.length > 0) {
    console.log("资料不完整，需要补充：");
    for (const field of result.missingFields) {
      console.log(`- ${field}`);
    }
    return 1;
  }

  console.log("资料校验通过");
  console.log(`命主：${result.profile.name}`);
  console.log(`性别：${result.profile.gender}`);
  console.log(`历法：${result.profile.calendar}`);
  console.log(`出生日期：${result.profile.birth_date}`);
  console.log(`出生时间：${result.profile.birth_time} (${result.chineseHour})`);
  console.log(`出生地：${result.profile.birth_place}`);
  console.log(`时区：${result.profile.timezone}`);
  console.log(`真太阳时：${Boolean(result.profile.use_true_solar_time)}`);
  console.log(`闰月：${Boolean(result.profile.is_leap_month)}`);

  const lunarResult = resolveLunarProfile(result.profile);
  console.log("");
  console.log("历法转换：");
  for (const note of lunarResult.notes) {
    console.log(`- ${note}`);
  }

  let chart = createChartSkeleton(lunarResult.profile);

  if (lunarResult.profile.lunar_month && result.chineseHour) {
    chart = applyLifeAndBodyPalaces(chart, {
      lunarMonth: lunarResult.profile.lunar_month,
      chineseHour: result.chineseHour
    });
  }

  if (chart.lifePalace && lunarResult.profile.lunar_year_stem) {
    chart = applyFiveElementClass(chart, {
      yearStem: lunarResult.profile.lunar_year_stem
    });
  }

  if (chart.fiveElementClass && lunarResult.profile.lunar_day) {
    chart = applyZiWeiStar(chart);
    chart = applyZiWeiStarGroup(chart);
    chart = applyTianFuStarGroup(chart);
  }

  if (lunarResult.profile.lunar_month) {
    chart = applyMonthlyAuxiliaryStars(chart);
  }

  if (lunarResult.profile.lunar_month && lunarResult.profile.lunar_day) {
    chart = applyDailyAuxiliaryStars(chart);
  }

  if (lunarResult.profile.lunar_year_branch && result.chineseHour) {
    chart = applyFireBellStars(chart, {
      chineseHour: result.chineseHour
    });
  }

  console.log("");
  console.log("命盘骨架已建立：");
  for (const line of summarizeChartSkeleton(chart)) {
    console.log(line);
  }

  if (chart.lifePalace && chart.bodyPalace) {
    console.log("");
    console.log(`命宫：${chart.lifePalace.branch}`);
    console.log(`身宫：${chart.bodyPalace.name}（${chart.bodyPalace.branch}）`);
    if (chart.fiveElementClass) {
      console.log(
        `五行局：${chart.fiveElementClass.name}（命宫${chart.fiveElementClass.palaceGanZhi}，纳音${chart.fiveElementClass.naYin}）`
      );
    }
    if (chart.starAnchors?.ziWei) {
      console.log(`紫微星：${chart.starAnchors.ziWei.branch}`);
    }
    if (chart.starAnchors?.ziWeiGroup) {
      const ziWeiGroupText = Object.entries(chart.starAnchors.ziWeiGroup)
        .map(([star, branch]) => `${star}${branch}`)
        .join("、");
      console.log(`紫微星系：${ziWeiGroupText}`);
    }
    if (chart.starAnchors?.tianFuGroup) {
      const tianFuGroupText = Object.entries(chart.starAnchors.tianFuGroup)
        .map(([star, branch]) => `${star}${branch}`)
        .join("、");
      console.log(`天府星系：${tianFuGroupText}`);
    }
    if (chart.starAnchors?.monthlyAuxiliaries) {
      const monthlyAuxiliaryText = Object.entries(
        chart.starAnchors.monthlyAuxiliaries
      )
        .filter(([key]) => key !== "lunarMonth")
        .map(([star, branch]) => `${star}${branch}`)
        .join("、");
      console.log(`月系辅星：${monthlyAuxiliaryText}`);
    }
    if (chart.starAnchors?.dailyAuxiliaries) {
      const dailyAuxiliaryText = Object.entries(
        chart.starAnchors.dailyAuxiliaries
      )
        .filter(([key]) => key !== "lunarMonth" && key !== "lunarDay")
        .map(([star, branch]) => `${star}${branch}`)
        .join("、");
      console.log(`日系辅星：${dailyAuxiliaryText}`);
    }
    if (chart.starAnchors?.fireBell) {
      const fireBellText = Object.entries(chart.starAnchors.fireBell)
        .filter(([key]) => key !== "yearBranch" && key !== "chineseHour")
        .map(([star, branch]) => `${star}${branch}`)
        .join("、");
      console.log(`火铃煞曜：${fireBellText}`);
    }
    console.log("");
    console.log("计算说明：");
    for (const note of chart.calculationNotes) {
      console.log(`- ${note}`);
    }
  } else {
    console.log("");
    console.log("暂未计算命宫/身宫：需要提供 lunar_month。");
  }

  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 2;
  });
