// 第六堂实战课：安紫微星。
//
// 十四主星不能凭文字描述随便放。
// 对程序来说，第一步要先确定“紫微星落在哪个地支”。
// 紫微定下来以后，后面才能继续按口诀安天机、太阳、武曲、天同、廉贞，
// 再由紫微位置推出天府星系。

const BRANCHES_FROM_YIN = [
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
  "子",
  "丑"
];

export function calculateZiWeiBranch({ lunarDay, fiveElementClassNumber }) {
  const day = Number(lunarDay);
  const classNumber = Number(fiveElementClassNumber);

  if (!Number.isInteger(day) || day < 1 || day > 30) {
    throw new Error("lunarDay must be an integer from 1 to 30");
  }

  if (![2, 3, 4, 5, 6].includes(classNumber)) {
    throw new Error("fiveElementClassNumber must be one of 2, 3, 4, 5, 6");
  }

  // 资料中的速求公式：
  // 设农历出生日为 A，五行局数为 B。
  // 先找最小的 X，使 (A + X) 可以被 B 整除。
  // C = (A + X) / B。
  const adjustment = findSmallestDivisibleAdjustment(day, classNumber);
  const quotient = (day + adjustment) / classNumber;

  // X 为偶数时 D = C + X；X 为奇数时 D = C - X。
  // D 再换算为地支序号：寅 1、卯 2、辰 3……子 11、丑 12。
  const rawBranchNumber =
    adjustment % 2 === 0 ? quotient + adjustment : quotient - adjustment;
  const branchNumber = wrapBranchNumber(rawBranchNumber);

  return {
    branch: BRANCHES_FROM_YIN[branchNumber - 1],
    adjustment,
    quotient,
    branchNumber
  };
}

export function applyZiWeiStar(chart) {
  const lunarDay = chart.profileSummary.lunarDay;
  const fiveElementClassNumber = chart.fiveElementClass?.number;

  if (!fiveElementClassNumber) {
    throw new Error("fiveElementClass.number is required before placing Zi Wei star");
  }

  const result = calculateZiWeiBranch({
    lunarDay,
    fiveElementClassNumber
  });

  const palaces = chart.palaces.map((palace) => {
    if (palace.branch !== result.branch) {
      return palace;
    }

    return {
      ...palace,
      mainStars: addUniqueStar(palace.mainStars, "紫微")
    };
  });

  return {
    ...chart,
    palaces,
    starAnchors: {
      ...chart.starAnchors,
      ziWei: {
        branch: result.branch,
        lunarDay,
        fiveElementClassNumber,
        adjustment: result.adjustment,
        quotient: result.quotient,
        branchNumber: result.branchNumber
      }
    },
    calculationNotes: [
      ...chart.calculationNotes,
      `以农历${lunarDay}日和${chart.fiveElementClass.name}定紫微星。`,
      `(${lunarDay}+${result.adjustment})÷${fiveElementClassNumber}=${result.quotient}，${result.adjustment}为${result.adjustment % 2 === 0 ? "偶数" : "奇数"}，紫微落${result.branch}。`
    ]
  };
}

function findSmallestDivisibleAdjustment(day, classNumber) {
  for (let adjustment = 0; adjustment < classNumber; adjustment += 1) {
    if ((day + adjustment) % classNumber === 0) {
      return adjustment;
    }
  }

  // 理论上不会到这里；保留错误能帮助我们及时发现公式实现问题。
  throw new Error("unable to find divisible adjustment");
}

function wrapBranchNumber(value) {
  return ((value - 1) % 12 + 12) % 12 + 1;
}

function addUniqueStar(stars, star) {
  if (stars.includes(star)) {
    return stars;
  }

  return [...stars, star];
}
