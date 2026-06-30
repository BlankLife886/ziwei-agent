import { Solar } from "lunar-javascript";
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from "./chart.js";

// 第四堂实战课：公历转农历。
//
// 为什么要单独做这个模块？
// 因为“历法转换”和“命理排盘”是两件事。
// 如果混在一起，后面出错时很难判断到底是日期错了，还是排盘规则错了。

export function resolveLunarProfile(profile) {
  if (profile.calendar === "solar") {
    const lunar = convertSolarDateToLunar(profile.birth_date);

    return {
      profile: {
        ...profile,
        lunar_year: lunar.year,
        lunar_year_stem: lunar.yearStem,
        lunar_year_branch: lunar.yearBranch,
        lunar_month: lunar.month,
        lunar_day: lunar.day,
        is_leap_month: lunar.isLeapMonth
      },
      lunar,
      notes: [
        `公历 ${profile.birth_date} 转换为农历 ${lunar.text}。`,
        `排命宫/身宫使用农历${lunar.month}月。`
      ]
    };
  }

  // 如果用户已经明确给的是农历生日，当前阶段先信任输入。
  // birth_date 仍使用 YYYY-MM-DD，只是这里的年月日代表农历年月日。
  // 后续可以继续补充“农历日期反查公历”的能力。
  const lunarDate = parseIsoDate(profile.birth_date);
  const lunarMonth = profile.lunar_month ?? lunarDate.month;
  const lunarYearStem = calculateYearStem(lunarDate.year);
  const lunarYearBranch = calculateYearBranch(lunarDate.year);

  return {
    profile: {
      ...profile,
      lunar_year: lunarDate.year,
      lunar_year_stem: lunarYearStem,
      lunar_year_branch: lunarYearBranch,
      lunar_month: lunarMonth,
      lunar_day: lunarDate.day
    },
    lunar: {
      year: lunarDate.year,
      yearStem: lunarYearStem,
      yearBranch: lunarYearBranch,
      month: lunarMonth,
      day: lunarDate.day,
      isLeapMonth: Boolean(profile.is_leap_month),
      text: `${lunarDate.year}年农历${lunarMonth}月${lunarDate.day}日`
    },
    notes: [`用户输入为农历，使用农历${lunarMonth}月排命宫/身宫。`]
  };
}

export function convertSolarDateToLunar(birthDate) {
  const { year, month, day } = parseIsoDate(birthDate);
  assertValidSolarDate(year, month, day);

  const lunar = Solar.fromYmd(year, month, day).getLunar();
  const rawMonth = lunar.getMonth();

  // lunar-javascript 使用负数月份表示闰月。
  // 例如 -4 表示闰四月。
  return {
    year: lunar.getYear(),
    yearStem: lunar.getYearGan(),
    yearBranch: lunar.getYearZhi(),
    month: Math.abs(rawMonth),
    day: lunar.getDay(),
    isLeapMonth: rawMonth < 0,
    text: lunar.toString()
  };
}

function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error("birth_date must use YYYY-MM-DD format");
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
}

function assertValidSolarDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const isSameDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isSameDate) {
    throw new Error("birth_date must be a valid solar date");
  }
}

function calculateYearStem(year) {
  // 干支纪年中，公元 4 年为甲子年。
  // 所以只要把年份减 4，再对十天干取余，就能得到该年的天干。
  const stemIndex = ((year - 4) % 10 + 10) % 10;
  return HEAVENLY_STEMS[stemIndex];
}

function calculateYearBranch(year) {
  // 干支纪年中，公元 4 年为甲子年；地支也从子开始同步取余。
  const branchIndex = ((year - 4) % 12 + 12) % 12;
  return EARTHLY_BRANCHES[branchIndex];
}
