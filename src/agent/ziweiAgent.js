import { REFERENCE_IDS } from "./referenceCatalog.js";

// 命理师 agent 外壳。
//
// 这里先不接大模型，也不急着输出复杂断语。
// 一个稳定的 agent 应该先有结构化上下文：
// 1. 输入资料是否足够。
// 2. 命盘中哪些证据已经可用。
// 3. 哪些分析主题可以展开。
// 4. 哪些能力尚未实现，不能过度断言。

const LIFE_TRIAD_PALACE_NAMES = ["命宫", "财帛宫", "官禄宫", "迁移宫"];
const PALACE_EVIDENCE_IDS = {
  命宫: "life-palace",
  财帛宫: "wealth-palace",
  官禄宫: "career-palace",
  迁移宫: "travel-palace"
};

export function createZiweiAgentResponse(buildResult) {
  if (buildResult.status === "invalid") {
    return {
      status: "invalid_input",
      role: "ziwei-fortune-analyst",
      messages: ["出生资料格式不正确，暂不能排盘。"],
      nextQuestions: [],
      evidence: [],
      evidenceItems: [],
      focusAreas: [],
      limitations: []
    };
  }

  if (buildResult.status === "incomplete") {
    return {
      status: "needs_input",
      role: "ziwei-fortune-analyst",
      messages: ["出生资料还不完整，需要先补齐关键字段。"],
      nextQuestions: buildResult.validation.missingFields.map((field) => {
        return `请补充 ${field}`;
      }),
      evidence: [],
      evidenceItems: [],
      focusAreas: [],
      limitations: []
    };
  }

  const chart = buildResult.chart;
  const palaceByName = new Map(chart.palaces.map((palace) => [palace.name, palace]));
  const evidenceItems = buildCoreEvidenceItems(chart, palaceByName);

  return {
    status: "ready",
    role: "ziwei-fortune-analyst",
    messages: [
      "命盘已经建立，可以进入命理分析。",
      "当前 agent 会先基于命盘证据组织分析重点，避免在规则未实现时过度断言。"
    ],
    nextQuestions: [],
    subject: buildSubjectSummary(buildResult),
    evidence: evidenceItems.map(formatEvidenceText),
    evidenceItems,
    focusAreas: buildFocusAreas(chart, palaceByName),
    limitations: [
      "尚未接入四化，因此不能完整判断生年化禄、化权、化科、化忌的牵引。",
      "尚未接入大限、流年，因此当前只适合做本命盘静态分析。",
      "尚未接入知识库检索与引用，因此解释应以已实现规则为边界。"
    ]
  };
}

function buildSubjectSummary(buildResult) {
  const profile = buildResult.validation.profile;
  const lunarProfile = buildResult.lunarResult.profile;

  return {
    name: profile.name,
    gender: profile.gender,
    calendar: profile.calendar,
    birthDate: profile.birth_date,
    chineseHour: buildResult.validation.chineseHour,
    lunarYearStem: lunarProfile.lunar_year_stem,
    lunarYearBranch: lunarProfile.lunar_year_branch,
    lunarMonth: lunarProfile.lunar_month,
    lunarDay: lunarProfile.lunar_day
  };
}

function buildCoreEvidenceItems(chart, palaceByName) {
  const lifePalace = palaceByName.get("命宫");
  const bodyPalace = palaceByName.get(chart.bodyPalace?.name);

  return [
    createEvidenceItem(
      "core.life-palace-branch",
      `命宫在${chart.lifePalace.branch}`,
      "chart.lifePalace",
      [REFERENCE_IDS.LIFE_BODY_PALACE]
    ),
    createEvidenceItem(
      "core.body-palace-location",
      `身宫在${chart.bodyPalace.name}（${chart.bodyPalace.branch}）`,
      "chart.bodyPalace",
      [REFERENCE_IDS.LIFE_BODY_PALACE]
    ),
    createEvidenceItem(
      "core.five-element-class",
      `五行局为${chart.fiveElementClass.name}`,
      "chart.fiveElementClass",
      [REFERENCE_IDS.FIVE_ELEMENT_CLASS]
    ),
    createEvidenceItem(
      "core.life-palace-stars",
      `命宫星曜：${formatPalaceStars(lifePalace)}`,
      "chart.palaces.命宫",
      [REFERENCE_IDS.STAR_PLACEMENT]
    ),
    createEvidenceItem(
      "core.body-palace-stars",
      `身宫星曜：${formatPalaceStars(bodyPalace)}`,
      `chart.palaces.${chart.bodyPalace.name}`,
      [REFERENCE_IDS.STAR_PLACEMENT]
    )
  ];
}

function buildFocusAreas(chart, palaceByName) {
  const lifeTriadPalaces = LIFE_TRIAD_PALACE_NAMES.map((name) => {
    return palaceByName.get(name);
  }).filter(Boolean);

  return [
    {
      id: "life-triad",
      title: "命宫与三方四正",
      reason: "先看命宫，再合看财帛、官禄、迁移，建立命主核心格局。",
      evidenceItems: lifeTriadPalaces.map((palace) => {
        return createPalaceEvidenceItem("life-triad", palace);
      })
    },
    {
      id: "body-palace",
      title: "身宫落点",
      reason: "身宫提示后天行为重心，适合和命宫一起看人生发力方式。",
      evidenceItems: [
        createPalaceEvidenceItem(
          "body-palace",
          palaceByName.get(chart.bodyPalace.name)
        )
      ]
    },
    {
      id: "star-balance",
      title: "星曜类别平衡",
      reason: "先区分主星、辅星、煞曜、空曜，避免把助力、冲击和空亡混为一谈。",
      evidenceItems: buildStarBalanceEvidenceItems(chart)
    }
  ].map((focusArea) => {
    return {
      ...focusArea,
      evidence: focusArea.evidenceItems.map(formatEvidenceText)
    };
  });
}

function buildStarBalanceEvidenceItems(chart) {
  const totals = chart.palaces.reduce(
    (sum, palace) => {
      return {
        mainStars: sum.mainStars + palace.mainStars.length,
        auxiliaryStars: sum.auxiliaryStars + palace.auxiliaryStars.length,
        maleficStars: sum.maleficStars + palace.maleficStars.length,
        voidStars: sum.voidStars + palace.voidStars.length
      };
    },
    {
      mainStars: 0,
      auxiliaryStars: 0,
      maleficStars: 0,
      voidStars: 0
    }
  );

  return [
    createEvidenceItem(
      "star-balance.main-stars",
      `主星 ${totals.mainStars} 颗`,
      "chart.palaces.mainStars",
      [REFERENCE_IDS.STAR_BALANCE]
    ),
    createEvidenceItem(
      "star-balance.auxiliary-stars",
      `辅星 ${totals.auxiliaryStars} 颗`,
      "chart.palaces.auxiliaryStars",
      [REFERENCE_IDS.STAR_BALANCE]
    ),
    createEvidenceItem(
      "star-balance.malefic-stars",
      `煞曜 ${totals.maleficStars} 颗`,
      "chart.palaces.maleficStars",
      [REFERENCE_IDS.STAR_BALANCE]
    ),
    createEvidenceItem(
      "star-balance.void-stars",
      `空曜 ${totals.voidStars} 颗`,
      "chart.palaces.voidStars",
      [REFERENCE_IDS.STAR_BALANCE]
    )
  ];
}

function createPalaceEvidenceItem(scope, palace) {
  const palaceId = PALACE_EVIDENCE_IDS[palace.name] ?? palace.name;

  return createEvidenceItem(
    `${scope}.${palaceId}`,
    formatPalaceSnapshot(palace),
    `chart.palaces.${palace.name}`,
    getPalaceEvidenceReferenceRefs(scope)
  );
}

function createEvidenceItem(id, text, source, referenceRefs = []) {
  return {
    id,
    text,
    source,
    referenceRefs
  };
}

function getPalaceEvidenceReferenceRefs(scope) {
  if (scope === "life-triad") {
    return [REFERENCE_IDS.LIFE_TRIAD, REFERENCE_IDS.STAR_PLACEMENT];
  }

  if (scope === "body-palace") {
    return [REFERENCE_IDS.BODY_PALACE, REFERENCE_IDS.STAR_PLACEMENT];
  }

  return [REFERENCE_IDS.STAR_PLACEMENT];
}

function formatEvidenceText(evidenceItem) {
  return evidenceItem.text;
}

function formatPalaceSnapshot(palace) {
  return `${palace.name}${palace.branch}：${formatPalaceStars(palace)}`;
}

function formatPalaceStars(palace) {
  if (!palace) {
    return "未找到宫位";
  }

  const groups = [
    ["主星", palace.mainStars],
    ["辅星", palace.auxiliaryStars],
    ["煞曜", palace.maleficStars],
    ["空曜", palace.voidStars]
  ]
    .filter(([, stars]) => stars.length > 0)
    .map(([label, stars]) => `${label}${stars.join("、")}`);

  if (groups.length === 0) {
    return "无已安星曜";
  }

  return groups.join("；");
}
