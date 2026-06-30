import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from "./chart.js";

// 第十堂实战课：安生年干系星曜。
//
// 这一课先做禄存、擎羊、陀罗，再扩展天魁、天钺。
// 禄存按出生年干定位；擎羊、陀罗跟着禄存走，形成“羊禄陀”三连。
// 其中禄存偏财禄助力，放入 auxiliaryStars；
// 擎羊、陀罗属于煞曜，放入 maleficStars。

const LU_CUN_BRANCH_BY_YEAR_STEM = {
  甲: "寅",
  乙: "卯",
  丙: "巳",
  丁: "午",
  戊: "巳",
  己: "午",
  庚: "申",
  辛: "酉",
  壬: "亥",
  癸: "子"
};

const KUI_YUE_BRANCHES_BY_YEAR_STEM = {
  甲: { 天魁: "丑", 天钺: "未" },
  乙: { 天魁: "子", 天钺: "申" },
  丙: { 天魁: "亥", 天钺: "酉" },
  丁: { 天魁: "亥", 天钺: "酉" },
  戊: { 天魁: "丑", 天钺: "未" },
  己: { 天魁: "子", 天钺: "申" },
  庚: { 天魁: "丑", 天钺: "未" },
  辛: { 天魁: "午", 天钺: "寅" },
  壬: { 天魁: "卯", 天钺: "巳" },
  癸: { 天魁: "卯", 天钺: "巳" }
};

const AUXILIARY_STARS = new Set(["禄存", "天魁", "天钺"]);
const MALEFIC_STARS = new Set(["擎羊", "陀罗"]);

export function calculateLuYangTuoBranches({ yearStem }) {
  assertValidYearStem(yearStem);

  const luCunBranch = LU_CUN_BRANCH_BY_YEAR_STEM[yearStem];

  return {
    禄存: luCunBranch,
    // “禄前擎羊”：以禄存为中点，顺数下一宫安擎羊。
    擎羊: walkBranches({
      startBranch: luCunBranch,
      offset: 1
    }),
    // “禄后陀罗”：以禄存为中点，逆数上一宫安陀罗。
    陀罗: walkBranches({
      startBranch: luCunBranch,
      offset: -1
    })
  };
}

export function calculateKuiYueBranches({ yearStem }) {
  assertValidYearStem(yearStem);
  return KUI_YUE_BRANCHES_BY_YEAR_STEM[yearStem];
}

export function applyLuYangTuoStars(chart) {
  const yearStem = chart.profileSummary.lunarYearStem;
  const starBranches = calculateLuYangTuoBranches({ yearStem });
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

    return starsForPalace.reduce(placeStarInPalace, palace);
  });

  return {
    ...chart,
    palaces,
    starAnchors: {
      ...chart.starAnchors,
      luYangTuo: {
        yearStem,
        ...starBranches
      }
    },
    calculationNotes: [
      ...chart.calculationNotes,
      `以生年天干${yearStem}安禄存、擎羊、陀罗：${starText}。`
    ]
  };
}

export function applyKuiYueStars(chart) {
  const yearStem = chart.profileSummary.lunarYearStem;
  const starBranches = calculateKuiYueBranches({ yearStem });
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

    return starsForPalace.reduce(placeStarInPalace, palace);
  });

  return {
    ...chart,
    palaces,
    starAnchors: {
      ...chart.starAnchors,
      kuiYue: {
        yearStem,
        ...starBranches
      }
    },
    calculationNotes: [
      ...chart.calculationNotes,
      `以生年天干${yearStem}安天魁、天钺：${starText}。`
    ]
  };
}

function placeStarInPalace(palace, star) {
  if (AUXILIARY_STARS.has(star)) {
    return {
      ...palace,
      auxiliaryStars: addUniqueStar(palace.auxiliaryStars, star)
    };
  }

  if (MALEFIC_STARS.has(star)) {
    return {
      ...palace,
      maleficStars: addUniqueStar(palace.maleficStars, star)
    };
  }

  return palace;
}

function assertValidYearStem(yearStem) {
  if (!HEAVENLY_STEMS.includes(yearStem)) {
    throw new Error("yearStem must be one of 甲乙丙丁戊己庚辛壬癸");
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
