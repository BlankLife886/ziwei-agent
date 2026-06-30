import { EARTHLY_BRANCHES } from "./chart.js";

// 第七堂实战课：安月系辅星。
//
// 辅星不要和主星混在一起。
// 主星决定命盘的核心结构；辅星更多是辅助、加会、修饰。
// 所以命盘数据结构里也把 mainStars 和 auxiliaryStars 分开保存。

const ZUO_FU_START_BRANCH = "辰";
const YOU_BI_START_BRANCH = "戌";
const TIAN_XING_START_BRANCH = "酉";
const TIAN_YAO_START_BRANCH = "丑";

// 天月没有简单的顺逆规律，按资料口诀直接落表：
// “一犬二蛇三在龙，四虎五羊六兔宫，
// 七猪八羊九在虎，十马冬犬腊寅中。”
// 这里用项目统一的地支字“戌”，不使用 OCR 里常见的误字“戍”。
const TIAN_YUE_BRANCHES_BY_MONTH = [
  "戌",
  "巳",
  "辰",
  "寅",
  "未",
  "卯",
  "亥",
  "未",
  "寅",
  "午",
  "戌",
  "寅"
];

// 天巫按月落巳、申、亥、寅四宫循环。
const TIAN_WU_BRANCHES_BY_MONTH = [
  "巳",
  "申",
  "亥",
  "寅",
  "巳",
  "申",
  "亥",
  "寅",
  "巳",
  "申",
  "亥",
  "寅"
];

export function calculateZuoFuYouBiBranches({ lunarMonth }) {
  const month = Number(lunarMonth);

  assertValidLunarMonth(month);

  // 左辅：正月起辰，顺数至生月。
  const zuoFuBranch = walkBranches({
    startBranch: ZUO_FU_START_BRANCH,
    offset: month - 1
  });

  // 右弼：正月起戌，逆数至生月。
  const youBiBranch = walkBranches({
    startBranch: YOU_BI_START_BRANCH,
    offset: -(month - 1)
  });

  return {
    左辅: zuoFuBranch,
    右弼: youBiBranch
  };
}

export function calculateMonthlyAuxiliaryBranches({ lunarMonth }) {
  const month = Number(lunarMonth);
  assertValidLunarMonth(month);

  const zuoFuYouBiBranches = calculateZuoFuYouBiBranches({ lunarMonth: month });

  // 天刑：正月起酉，顺数至生月。
  const tianXingBranch = walkBranches({
    startBranch: TIAN_XING_START_BRANCH,
    offset: month - 1
  });

  // 天姚：正月起丑，顺数至生月。
  const tianYaoBranch = walkBranches({
    startBranch: TIAN_YAO_START_BRANCH,
    offset: month - 1
  });

  return {
    ...zuoFuYouBiBranches,
    天刑: tianXingBranch,
    天姚: tianYaoBranch,
    天月: TIAN_YUE_BRANCHES_BY_MONTH[month - 1],
    天巫: TIAN_WU_BRANCHES_BY_MONTH[month - 1]
  };
}

export function applyZuoFuYouBi(chart) {
  const lunarMonth = chart.profileSummary.lunarMonth;
  const starBranches = calculateZuoFuYouBiBranches({ lunarMonth });
  return applyMonthlyStarBranches({
    chart,
    lunarMonth,
    starBranches,
    note: `以农历${lunarMonth}月安左辅、右弼：左辅${starBranches.左辅}，右弼${starBranches.右弼}。`
  });
}

export function applyMonthlyAuxiliaryStars(chart) {
  const lunarMonth = chart.profileSummary.lunarMonth;
  const starBranches = calculateMonthlyAuxiliaryBranches({ lunarMonth });
  const starText = formatStarBranches(starBranches);

  return applyMonthlyStarBranches({
    chart,
    lunarMonth,
    starBranches,
    note: `以农历${lunarMonth}月安月系辅星：${starText}。`
  });
}

function applyMonthlyStarBranches({ chart, lunarMonth, starBranches, note }) {
  const palaces = chart.palaces.map((palace) => {
    const starsForPalace = Object.entries(starBranches)
      .filter(([, branch]) => branch === palace.branch)
      .map(([star]) => star);

    if (starsForPalace.length === 0) {
      return palace;
    }

    return {
      ...palace,
      auxiliaryStars: starsForPalace.reduce(addUniqueStar, palace.auxiliaryStars)
    };
  });

  return {
    ...chart,
    palaces,
    starAnchors: {
      ...chart.starAnchors,
      monthlyAuxiliaries: {
        lunarMonth,
        ...starBranches
      }
    },
    calculationNotes: [
      ...chart.calculationNotes,
      note
    ]
  };
}

function assertValidLunarMonth(month) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("lunarMonth must be an integer from 1 to 12");
  }
}

function formatStarBranches(starBranches) {
  return Object.entries(starBranches)
    .map(([star, branch]) => `${star}${branch}`)
    .join("，");
}

function walkBranches({ startBranch, offset }) {
  const startIndex = EARTHLY_BRANCHES.indexOf(startBranch);
  return EARTHLY_BRANCHES[wrapBranchIndex(startIndex + offset)];
}

function wrapBranchIndex(index) {
  return ((index % 12) + 12) % 12;
}

function addUniqueStar(stars, star) {
  if (stars.includes(star)) {
    return stars;
  }

  return [...stars, star];
}
