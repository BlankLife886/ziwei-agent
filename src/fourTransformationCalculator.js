import { HEAVENLY_STEMS } from "./chart.js";

// 生年四化计算器。
//
// 这一层只负责“按年干查出哪颗星化禄/权/科/忌，并把结果挂回命盘”。
// 它不负责解释吉凶，也不负责判断事件；这些都应该留给 agent 的解释目录和报告层。
//
// 注意：四化表存在派别差异。本项目先采用一套明确的默认口诀表：
// 甲廉破武阳，乙机梁紫阴，丙同机昌廉，丁阴同机巨，戊贪阴弼机，
// 己武贪梁曲，庚阳武阴同，辛巨阳曲昌，壬梁紫左武，癸破巨阴贪。
// 后续如果要支持不同派别，应把这张表改成可配置知识源，而不是散写在业务逻辑里。

export const BIRTH_YEAR_FOUR_TRANSFORMATIONS_BY_STEM = {
  甲: { 化禄: "廉贞", 化权: "破军", 化科: "武曲", 化忌: "太阳" },
  乙: { 化禄: "天机", 化权: "天梁", 化科: "紫微", 化忌: "太阴" },
  丙: { 化禄: "天同", 化权: "天机", 化科: "文昌", 化忌: "廉贞" },
  丁: { 化禄: "太阴", 化权: "天同", 化科: "天机", 化忌: "巨门" },
  戊: { 化禄: "贪狼", 化权: "太阴", 化科: "右弼", 化忌: "天机" },
  己: { 化禄: "武曲", 化权: "贪狼", 化科: "天梁", 化忌: "文曲" },
  庚: { 化禄: "太阳", 化权: "武曲", 化科: "太阴", 化忌: "天同" },
  辛: { 化禄: "巨门", 化权: "太阳", 化科: "文曲", 化忌: "文昌" },
  壬: { 化禄: "天梁", 化权: "紫微", 化科: "左辅", 化忌: "武曲" },
  癸: { 化禄: "破军", 化权: "巨门", 化科: "太阴", 化忌: "贪狼" }
};

const STAR_GROUP_KEYS = [
  "mainStars",
  "auxiliaryStars",
  "maleficStars",
  "voidStars"
];

export function calculateBirthYearFourTransformations({ yearStem }) {
  assertValidYearStem(yearStem);
  return BIRTH_YEAR_FOUR_TRANSFORMATIONS_BY_STEM[yearStem];
}

export function applyBirthYearFourTransformations(chart) {
  const yearStem = chart.profileSummary.lunarYearStem;
  const transformations = calculateBirthYearFourTransformations({ yearStem });
  const transformationEntries = Object.entries(transformations).map(
    ([name, star]) => {
      return {
        name,
        star,
        source: "birth-year-stem"
      };
    }
  );

  return {
    ...chart,
    palaces: chart.palaces.map((palace) => {
      const transformationsForPalace = transformationEntries.filter(
        (transformation) => palaceHasStar(palace, transformation.star)
      );

      if (transformationsForPalace.length === 0) {
        return palace;
      }

      return transformationsForPalace.reduce(addTransformationToPalace, palace);
    }),
    starAnchors: {
      ...chart.starAnchors,
      birthYearTransformations: {
        yearStem,
        ...transformations
      }
    },
    calculationNotes: [
      ...chart.calculationNotes,
      `以生年天干${yearStem}取四化：${formatTransformationText(transformations)}。`
    ]
  };
}

export function calculateMajorPeriodFourTransformations({ palaceStem }) {
  assertValidYearStem(palaceStem);
  return BIRTH_YEAR_FOUR_TRANSFORMATIONS_BY_STEM[palaceStem];
}

export function calculateAnnualFourTransformations({ yearStem }) {
  assertValidYearStem(yearStem);
  return BIRTH_YEAR_FOUR_TRANSFORMATIONS_BY_STEM[yearStem];
}

export function applyMajorPeriodFourTransformations(chart) {
  if (!chart.majorPeriods || chart.majorPeriods.length === 0) {
    return chart;
  }

  const majorPeriodTransformations = chart.majorPeriods.map((period) => {
    const transformations = calculateMajorPeriodFourTransformations({
      palaceStem: period.palaceStem
    });
    const transformationEntries = Object.entries(transformations).map(([name, star]) => {
      return {
        name,
        star,
        source: "major-period-palace-stem",
        majorPeriodNumber: period.number,
        majorPeriodPalaceName: period.palaceName,
        majorPeriodBranch: period.branch,
        majorPeriodStem: period.palaceStem,
        startAge: period.startAge,
        endAge: period.endAge,
        targetPalaceName: findPalaceNameByStar(chart.palaces, star)
      };
    });

    return {
      majorPeriodNumber: period.number,
      palaceName: period.palaceName,
      branch: period.branch,
      palaceStem: period.palaceStem,
      startAge: period.startAge,
      endAge: period.endAge,
      transformations: transformationEntries
    };
  });

  const currentMajorPeriodTransformations = chart.currentMajorPeriod?.period
    ? majorPeriodTransformations.find((item) => {
        return item.majorPeriodNumber === chart.currentMajorPeriod.period.number;
      }) ?? null
    : null;

  return {
    ...chart,
    majorPeriodTransformations,
    currentMajorPeriod: chart.currentMajorPeriod
      ? {
          ...chart.currentMajorPeriod,
          transformations: currentMajorPeriodTransformations
        }
      : chart.currentMajorPeriod,
    starAnchors: {
      ...chart.starAnchors,
      majorPeriodTransformations
    },
    calculationNotes: [
      ...chart.calculationNotes,
      `已按各大限宫干计算大限四化骨架，当前仅作为阶段结构证据。`
    ]
  };
}

export function applyAnnualFourTransformations(chart) {
  if (!chart.annualPeriod) {
    return chart;
  }

  const transformations = calculateAnnualFourTransformations({
    yearStem: chart.annualPeriod.yearStem
  });
  const transformationEntries = Object.entries(transformations).map(([name, star]) => {
    return {
      name,
      star,
      source: "annual-year-stem",
      analysisDate: chart.annualPeriod.analysisDate,
      annualLunarYear: chart.annualPeriod.lunarYear,
      annualYearStem: chart.annualPeriod.yearStem,
      annualYearBranch: chart.annualPeriod.yearBranch,
      targetPalaceName: findPalaceNameByStar(chart.palaces, star)
    };
  });

  const annualTransformations = {
    analysisDate: chart.annualPeriod.analysisDate,
    lunarYear: chart.annualPeriod.lunarYear,
    yearStem: chart.annualPeriod.yearStem,
    yearBranch: chart.annualPeriod.yearBranch,
    transformations: transformationEntries
  };

  return {
    ...chart,
    annualPeriod: {
      ...chart.annualPeriod,
      transformations: annualTransformations
    },
    starAnchors: {
      ...chart.starAnchors,
      annualTransformations
    },
    calculationNotes: [
      ...chart.calculationNotes,
      `已按流年天干${chart.annualPeriod.yearStem}计算流年四化骨架，当前仅作为年度结构证据。`
    ]
  };
}

function palaceHasStar(palace, starName) {
  return STAR_GROUP_KEYS.some((key) => {
    return palace[key].includes(starName);
  });
}

function findPalaceNameByStar(palaces, starName) {
  const palace = palaces.find((item) => palaceHasStar(item, starName));

  return palace?.name ?? null;
}

function addTransformationToPalace(palace, transformation) {
  const alreadyExists = palace.transformations.some((item) => {
    return item.name === transformation.name
      && item.star === transformation.star
      && item.source === transformation.source;
  });

  if (alreadyExists) {
    return palace;
  }

  return {
    ...palace,
    transformations: [
      ...palace.transformations,
      transformation
    ]
  };
}

function formatTransformationText(transformations) {
  return Object.entries(transformations)
    .map(([name, star]) => `${star}${name}`)
    .join("，");
}

function assertValidYearStem(yearStem) {
  if (!HEAVENLY_STEMS.includes(yearStem)) {
    throw new Error("yearStem must be one of 甲乙丙丁戊己庚辛壬癸");
  }
}
