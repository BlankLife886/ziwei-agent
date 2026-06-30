import { EARTHLY_BRANCHES } from "./chart.js";

// 第三堂实战课：计算命宫和身宫。
//
// 这一步只做紫微斗数排盘中的一个小规则：
// 1. 用农历月份找到起点。
// 2. 用出生时辰推出命宫。
// 3. 用出生时辰推出身宫。
//
// 先不要把所有排盘规则一次塞进来。
// 好的 agent 工程应该小步实现、小步测试。

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

const YIN_BRANCH_INDEX = EARTHLY_BRANCHES.indexOf("寅");

export function calculateLifeAndBodyBranches({ lunarMonth, chineseHour }) {
  const month = Number(lunarMonth);
  const hourIndex = CHINESE_HOURS.indexOf(chineseHour);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("lunarMonth must be an integer from 1 to 12");
  }

  if (hourIndex === -1) {
    throw new Error("chineseHour must be one of 子时 to 亥时");
  }

  // 规则一：寅宫起正月，顺数到出生农历月份。
  // 正月在寅，二月在卯，三月在辰，依次顺行。
  const monthBranchIndex = wrapBranchIndex(YIN_BRANCH_INDEX + month - 1);

  // 规则二：命宫从月份所在宫起子时，逆数到出生时辰。
  const lifeBranchIndex = wrapBranchIndex(monthBranchIndex - hourIndex);

  // 规则三：身宫从月份所在宫起子时，顺数到出生时辰。
  const bodyBranchIndex = wrapBranchIndex(monthBranchIndex + hourIndex);

  return {
    monthBranch: EARTHLY_BRANCHES[monthBranchIndex],
    lifeBranch: EARTHLY_BRANCHES[lifeBranchIndex],
    bodyBranch: EARTHLY_BRANCHES[bodyBranchIndex]
  };
}

export function applyLifeAndBodyPalaces(chart, { lunarMonth, chineseHour }) {
  const branches = calculateLifeAndBodyBranches({ lunarMonth, chineseHour });
  const lifeBranchIndex = EARTHLY_BRANCHES.indexOf(branches.lifeBranch);
  const bodyBranchIndex = EARTHLY_BRANCHES.indexOf(branches.bodyBranch);

  // 十二宫从命宫开始逆布。
  // 例：命宫在寅，则兄弟宫在丑，夫妻宫在子，子女宫在亥。
  const palaces = chart.palaces.map((palace, index) => {
    const branchIndex = wrapBranchIndex(lifeBranchIndex - index);
    return {
      ...palace,
      branch: EARTHLY_BRANCHES[branchIndex]
    };
  });

  const bodyPalace = palaces.find((palace) => {
    return EARTHLY_BRANCHES.indexOf(palace.branch) === bodyBranchIndex;
  });

  return {
    ...chart,
    palaces,
    lifePalace: {
      name: "命宫",
      branch: branches.lifeBranch
    },
    bodyPalace: bodyPalace
      ? {
          name: bodyPalace.name,
          branch: bodyPalace.branch
        }
      : null,
    calculationNotes: [
      `寅宫起正月，顺数至农历${lunarMonth}月，得${branches.monthBranch}。`,
      `命宫从${branches.monthBranch}起子时逆数至${chineseHour}，落${branches.lifeBranch}。`,
      `身宫从${branches.monthBranch}起子时顺数至${chineseHour}，落${branches.bodyBranch}。`
    ]
  };
}

function wrapBranchIndex(index) {
  return ((index % 12) + 12) % 12;
}

