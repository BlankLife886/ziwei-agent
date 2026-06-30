import { EARTHLY_BRANCHES } from "./chart.js";

// 第九堂实战课：安火星、铃星。
//
// 火星、铃星属于煞曜，所以不要放进 auxiliaryStars。
// 数据结构上单独进入 maleficStars，后续分析时才能区分“助力”与“冲击”。

const CHINESE_HOURS = [
  "子时",
  "丑时",
  "寅时",
  "卯时",
  "辰时",
  "巳时",
  "午时",
  "未时",
  "申时",
  "酉时",
  "戌时",
  "亥时"
];

const FIRE_STAR_START_BRANCH_BY_YEAR_GROUP = [
  [["寅", "午", "戌"], "丑"],
  [["申", "子", "辰"], "寅"],
  [["巳", "酉", "丑"], "卯"],
  [["亥", "卯", "未"], "酉"]
];

const BELL_STAR_START_BRANCH_BY_YEAR_GROUP = [
  [["寅", "午", "戌"], "卯"],
  [["申", "子", "辰"], "戌"],
  [["巳", "酉", "丑"], "戌"],
  [["亥", "卯", "未"], "戌"]
];

export function calculateFireBellBranches({ yearBranch, chineseHour }) {
  assertValidYearBranch(yearBranch);

  const hourIndex = CHINESE_HOURS.indexOf(chineseHour);
  if (hourIndex === -1) {
    throw new Error("chineseHour must be one of 子时 to 亥时");
  }

  const fireStartBranch = findStartBranch({
    yearBranch,
    table: FIRE_STAR_START_BRANCH_BY_YEAR_GROUP
  });
  const bellStartBranch = findStartBranch({
    yearBranch,
    table: BELL_STAR_START_BRANCH_BY_YEAR_GROUP
  });

  return {
    火星: walkBranches({
      startBranch: fireStartBranch,
      offset: hourIndex
    }),
    铃星: walkBranches({
      startBranch: bellStartBranch,
      offset: hourIndex
    })
  };
}

export function applyFireBellStars(chart, { chineseHour }) {
  const yearBranch = chart.profileSummary.lunarYearBranch;
  const starBranches = calculateFireBellBranches({
    yearBranch,
    chineseHour
  });
  const starText = Object.entries(starBranches)
    .map(([star, branch]) => `${star}${branch}`)
    .join("，");

  const palaces = chart.palaces.map((palace) => {
    const starsForPalace = Object.entries(starBranches)
      .filter(([, branch]) => branch === palace.branch)
      .map(([star]) => star);

    if (starsForPalace.length === 0) {
      return palace;
    }

    return {
      ...palace,
      maleficStars: starsForPalace.reduce(addUniqueStar, palace.maleficStars)
    };
  });

  return {
    ...chart,
    palaces,
    starAnchors: {
      ...chart.starAnchors,
      fireBell: {
        yearBranch,
        chineseHour,
        ...starBranches
      }
    },
    calculationNotes: [
      ...chart.calculationNotes,
      `以生年地支${yearBranch}和${chineseHour}安火星、铃星：${starText}。`
    ]
  };
}

function findStartBranch({ yearBranch, table }) {
  const result = table.find(([yearBranches]) => {
    return yearBranches.includes(yearBranch);
  });

  if (!result) {
    throw new Error("yearBranch must be one of 子丑寅卯辰巳午未申酉戌亥");
  }

  return result[1];
}

function assertValidYearBranch(yearBranch) {
  if (!EARTHLY_BRANCHES.includes(yearBranch)) {
    throw new Error("yearBranch must be one of 子丑寅卯辰巳午未申酉戌亥");
  }
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
