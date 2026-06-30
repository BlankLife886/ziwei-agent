// 这个文件是第二堂实战课：命盘数据结构。
//
// 重要原则：
// 1. 排盘算法负责“怎么算出来”。
// 2. 数据结构负责“算出来以后怎么存”。
// 3. 命理分析模块只读取这个结构，不应该重新猜测命盘。

export const EARTHLY_BRANCHES = [
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥"
];

// 十天干。
// 后续会用于：
// 1. 五虎遁推十二宫天干。
// 2. 年干四化。
// 3. 大限、流年等动态推演。
export const HEAVENLY_STEMS = [
  "甲",
  "乙",
  "丙",
  "丁",
  "戊",
  "己",
  "庚",
  "辛",
  "壬",
  "癸"
];

// 紫微斗数十二宫的逻辑顺序。
// 注意：这里不是说命宫一定在第一个地支。
// 真实排盘时，命宫会落到某个地支上，然后其他宫位按规则排布。
export const PALACE_NAMES = [
  "命宫",
  "兄弟宫",
  "夫妻宫",
  "子女宫",
  "财帛宫",
  "疾厄宫",
  "迁移宫",
  "仆役宫",
  "官禄宫",
  "田宅宫",
  "福德宫",
  "父母宫"
];

// 十四主星是分析命盘的核心星曜。
// 先把名字集中放在常量里，后续排盘和校验都可以复用。
export const MAIN_STARS = [
  "紫微",
  "天机",
  "太阳",
  "武曲",
  "天同",
  "廉贞",
  "天府",
  "太阴",
  "贪狼",
  "巨门",
  "天相",
  "天梁",
  "七杀",
  "破军"
];

// 四化是动态推演的核心。
// 第一版只定义名字，后续再接入“天干 -> 四化星”的规则。
export const FOUR_TRANSFORMATIONS = ["化禄", "化权", "化科", "化忌"];

export function createChartSkeleton(profile) {
  return {
    // profileSummary 只放分析需要的命主摘要。
    // 原始输入仍由 intake 模块负责保存和校验。
    profileSummary: {
      name: profile.name,
      gender: profile.gender,
      calendar: profile.calendar,
      birthDate: profile.birth_date,
      lunarYear: profile.lunar_year ?? null,
      lunarYearStem: profile.lunar_year_stem ?? null,
      lunarMonth: profile.lunar_month ?? null,
      lunarDay: profile.lunar_day ?? null,
      birthTime: profile.birth_time,
      birthPlace: profile.birth_place,
      timezone: profile.timezone,
      useTrueSolarTime: Boolean(profile.use_true_solar_time),
      isLeapMonth: Boolean(profile.is_leap_month)
    },

    // 这几个字段后续由排盘模块填入。
    // 现在先设为 null，表示“结构已经准备好，但尚未计算”。
    lifePalace: null,
    bodyPalace: null,
    fiveElementClass: null,
    starAnchors: {
      ziWei: null,
      ziWeiGroup: null,
      tianFu: null,
      tianFuGroup: null,
      monthlyAuxiliaries: null,
      dailyAuxiliaries: null
    },

    // palaces 是整张命盘最重要的数据容器。
    // 每一个 palace 都是一宫，里面会放地支、主星、辅星、煞曜、四化等信息。
    palaces: PALACE_NAMES.map((name) => createEmptyPalace(name)),

    // majorPeriods 用来放大限。
    // annualPeriod 用来放当前流年。
    // 这两个会在后续课程中实现。
    majorPeriods: [],
    annualPeriod: null,

    // calculationNotes 记录关键计算过程。
    // 后续生成报告时，agent 可以解释“为什么这样排”，而不是只给结论。
    calculationNotes: []
  };
}

export function createEmptyPalace(name) {
  return {
    name,

    // branch 是地支，比如 子、丑、寅。
    // 真实排盘前先留空。
    branch: null,

    // stem 是天干，比如 甲、乙、丙。
    // 宫干需要通过“五虎遁”从出生年干推出来，因此这里先留空。
    stem: null,

    // 主星、辅星、煞曜分开放。
    // 这样后续分析时可以明确区分“核心格局”和“加会影响”。
    mainStars: [],
    auxiliaryStars: [],
    maleficStars: [],

    // transformations 存四化，比如某宫有“化忌”。
    transformations: [],

    // notes 用来放程序生成的结构化提示。
    // 例如：“命宫无主星，需借对宫分析”。
    notes: []
  };
}

export function summarizeChartSkeleton(chart) {
  return chart.palaces.map((palace, index) => {
    const number = String(index + 1).padStart(2, "0");
    const branch = palace.branch ?? "待排盘";
    const mainStars =
      palace.mainStars.length > 0 ? `｜主星：${palace.mainStars.join("、")}` : "";
    const auxiliaryStars =
      palace.auxiliaryStars.length > 0
        ? `｜辅星：${palace.auxiliaryStars.join("、")}`
        : "";
    return `${number}. ${palace.name}：${branch}${mainStars}${auxiliaryStars}`;
  });
}
