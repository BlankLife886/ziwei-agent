import { EARTHLY_BRANCHES } from "./chart.js";

// 第七堂实战课：安月系辅星，先做左辅、右弼。
//
// 辅星不要和主星混在一起。
// 主星决定命盘的核心结构；辅星更多是辅助、加会、修饰。
// 所以命盘数据结构里也把 mainStars 和 auxiliaryStars 分开保存。

const ZUO_FU_START_BRANCH = "辰";
const YOU_BI_START_BRANCH = "戌";

export function calculateZuoFuYouBiBranches({ lunarMonth }) {
  const month = Number(lunarMonth);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("lunarMonth must be an integer from 1 to 12");
  }

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

export function applyZuoFuYouBi(chart) {
  const lunarMonth = chart.profileSummary.lunarMonth;
  const starBranches = calculateZuoFuYouBiBranches({ lunarMonth });
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
      `以农历${lunarMonth}月安左辅、右弼：左辅${starBranches.左辅}，右弼${starBranches.右弼}。`
    ]
  };
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
