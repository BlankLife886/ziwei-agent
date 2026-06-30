import { HEAVENLY_STEMS } from "./chart.js";

// 大限骨架计算器。
//
// 这一层只负责把“哪一宫管哪一个十年年龄段”算出来。
// 它不判断流年事件，也不计算大限四化；这些都属于后续更高层能力。
//
// 当前采用的基础规则：
// 1. 第一大限从命宫起。
// 2. 起限年龄等于五行局数：水二局从 2 岁起，金四局从 4 岁起，依此类推。
// 3. 每一宫管十年。
// 4. 阳男阴女顺行，阴男阳女逆行。
// 本项目的 palaces 数组是从命宫、兄弟宫、夫妻宫...父母宫排列；
// 在这个排列中，“顺行”的第二限是父母宫，“逆行”的第二限是兄弟宫。

const YANG_STEMS = new Set(["甲", "丙", "戊", "庚", "壬"]);

export function determineMajorPeriodDirection({ yearStem, gender }) {
  assertValidYearStem(yearStem);

  if (!["male", "female"].includes(gender)) {
    throw new Error("gender must be 'male' or 'female'");
  }

  const polarity = YANG_STEMS.has(yearStem) ? "yang" : "yin";
  const genderIsMale = gender === "male";
  const stemIsYang = polarity === "yang";
  const forward = (stemIsYang && genderIsMale) || (!stemIsYang && !genderIsMale);

  return {
    polarity,
    genderLabel: `${stemIsYang ? "阳" : "阴"}${genderIsMale ? "男" : "女"}`,
    direction: forward ? "forward" : "reverse",
    directionLabel: forward ? "顺行" : "逆行"
  };
}

export function calculateMajorPeriods({
  palaces,
  fiveElementClass,
  yearStem,
  gender
}) {
  if (!fiveElementClass?.number) {
    throw new Error("fiveElementClass.number is required before calculating major periods");
  }

  const direction = determineMajorPeriodDirection({ yearStem, gender });
  const step = direction.direction === "forward" ? -1 : 1;
  const startAge = fiveElementClass.number;

  return palaces.map((_, index) => {
    const palaceIndex = wrapPalaceIndex(index * step, palaces.length);
    const palace = palaces[palaceIndex];
    const periodStartAge = startAge + index * 10;

    return {
      number: index + 1,
      palaceName: palace.name,
      branch: palace.branch,
      palaceStem: palace.stem,
      startAge: periodStartAge,
      endAge: periodStartAge + 9,
      direction: direction.direction,
      directionLabel: direction.directionLabel,
      genderLabel: direction.genderLabel
    };
  });
}

export function applyMajorPeriods(chart) {
  const majorPeriods = calculateMajorPeriods({
    palaces: chart.palaces,
    fiveElementClass: chart.fiveElementClass,
    yearStem: chart.profileSummary.lunarYearStem,
    gender: chart.profileSummary.gender
  });
  const direction = majorPeriods[0];

  return {
    ...chart,
    majorPeriods,
    calculationNotes: [
      ...chart.calculationNotes,
      `以${chart.fiveElementClass.name}从${chart.fiveElementClass.number}岁起大限，${direction.genderLabel}${direction.directionLabel}，每宫十年。`
    ]
  };
}

export function calculateNominalAge({ birthDate, analysisDate }) {
  const birth = parseIsoDate(birthDate, "birthDate");
  const analysis = parseIsoDate(analysisDate, "analysisDate");
  const age = analysis.year - birth.year + 1;

  if (analysis.timestamp < birth.timestamp) {
    throw new Error("analysisDate must not be earlier than birthDate");
  }

  return age;
}

export function findMajorPeriodByAge(majorPeriods, age) {
  return majorPeriods.find((period) => {
    return age >= period.startAge && age <= period.endAge;
  }) ?? null;
}

export function calculateCurrentMajorPeriod({
  majorPeriods,
  birthDate,
  analysisDate
}) {
  const nominalAge = calculateNominalAge({
    birthDate,
    analysisDate
  });
  const period = findMajorPeriodByAge(majorPeriods, nominalAge);

  return {
    analysisDate,
    birthDate,
    ageType: "traditional-nominal-age",
    ageLabel: "虚岁",
    age: nominalAge,
    period
  };
}

export function applyCurrentMajorPeriod(chart, { analysisDate }) {
  if (!analysisDate) {
    return chart;
  }

  const currentMajorPeriod = calculateCurrentMajorPeriod({
    majorPeriods: chart.majorPeriods,
    birthDate: chart.profileSummary.birthDate,
    analysisDate
  });
  const period = currentMajorPeriod.period;
  const periodText = period
    ? `${period.startAge}-${period.endAge}岁${period.palaceName}${period.branch}`
    : "未落入已排出的大限年龄段";

  return {
    ...chart,
    profileSummary: {
      ...chart.profileSummary,
      analysisDate
    },
    currentMajorPeriod,
    calculationNotes: [
      ...chart.calculationNotes,
      `以分析日期${analysisDate}按虚岁${currentMajorPeriod.age}岁定位当前大限：${periodText}。`
    ]
  };
}

function wrapPalaceIndex(index, length) {
  return ((index % length) + length) % length;
}

function assertValidYearStem(yearStem) {
  if (!HEAVENLY_STEMS.includes(yearStem)) {
    throw new Error("yearStem must be one of 甲乙丙丁戊己庚辛壬癸");
  }
}

function parseIsoDate(value, fieldName) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format`);
  }

  return {
    year,
    month,
    day,
    timestamp: date.getTime()
  };
}
