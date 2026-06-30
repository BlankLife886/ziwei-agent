// 用户查询意图解析器。
//
// 这一层只回答一个问题：用户“想看什么”。
// 它不读取命盘、不计算宫位、不生成命理解读，只把自然语言问题转换成
// agent 可以审计的 focusAreaIds。后续接入 LLM 时，这个结构也可以作为
// tool 调用或 prompt 输入的中间层，避免模型直接跳到断语。

export const QUERY_FOCUS_IDS = {
  LIFE_TRIAD: "life-triad",
  BODY_PALACE: "body-palace",
  STAR_BALANCE: "star-balance",
  BIRTH_YEAR_TRANSFORMATIONS: "birth-year-transformations",
  MAJOR_PERIODS: "major-periods",
  CURRENT_MAJOR_PERIOD: "current-major-period"
};

const QUERY_RULES = [
  {
    focusAreaId: QUERY_FOCUS_IDS.CURRENT_MAJOR_PERIOD,
    topicId: "current-major-period",
    topic: "当前大限",
    reason: "用户询问当前所在大限，需要把报告收敛到当前大限定位。",
    patterns: [
      /(当前|现在|目前|此刻|正在|现阶段).{0,8}(大限|运限|十年运)/u,
      /(大限|运限|十年运).{0,8}(当前|现在|目前|此刻|现阶段)/u
    ]
  },
  {
    focusAreaId: QUERY_FOCUS_IDS.MAJOR_PERIODS,
    topicId: "major-periods",
    topic: "大限骨架",
    reason: "用户询问大限或人生阶段，需要查看大限年龄段骨架。",
    patterns: [
      /大限骨架|大限列表|全部大限|所有大限|运限结构|十年运|人生阶段|年龄段/u,
      /(?:看|分析|研究|讲).{0,6}(大限|运限)/u
    ]
  },
  {
    focusAreaId: QUERY_FOCUS_IDS.LIFE_TRIAD,
    topicId: "life-structure",
    topic: "命宫格局",
    palaceNames: ["命宫", "财帛宫", "官禄宫", "迁移宫"],
    reason: "用户询问命宫、整体或基础格局，当前先映射到命宫三方四正。",
    patterns: [
      /命宫|三方四正|格局|整体|基础画像|本命/u
    ]
  },
  {
    focusAreaId: QUERY_FOCUS_IDS.LIFE_TRIAD,
    topicId: "career",
    topic: "事业",
    palaceNames: ["官禄宫"],
    reason: "用户询问事业、工作或职业，需要在命宫三方四正中优先查看官禄宫。",
    patterns: [/事业|工作|职业|官禄/u]
  },
  {
    focusAreaId: QUERY_FOCUS_IDS.LIFE_TRIAD,
    topicId: "wealth",
    topic: "财帛",
    palaceNames: ["财帛宫"],
    reason: "用户询问财帛、财运或收入，需要在命宫三方四正中优先查看财帛宫。",
    patterns: [/财帛|财运|赚钱|收入|资源经营/u]
  },
  {
    focusAreaId: QUERY_FOCUS_IDS.LIFE_TRIAD,
    topicId: "travel",
    topic: "迁移",
    palaceNames: ["迁移宫"],
    reason: "用户询问外出、迁移或外部发展，需要在命宫三方四正中优先查看迁移宫。",
    patterns: [/迁移|外出|外部|外地|异地|远行/u]
  },
  {
    focusAreaId: QUERY_FOCUS_IDS.BODY_PALACE,
    topicId: "body-palace",
    topic: "身宫落点",
    reason: "用户询问身宫，需要查看后天行为重心。",
    patterns: [/身宫/u]
  },
  {
    focusAreaId: QUERY_FOCUS_IDS.STAR_BALANCE,
    topicId: "star-balance",
    topic: "星曜类别",
    reason: "用户询问星曜，需要先查看主星、辅星、煞曜、空曜的类别平衡。",
    patterns: [/星曜|主星|辅星|煞曜|空曜|火星|铃星|擎羊|陀罗/u]
  },
  {
    focusAreaId: QUERY_FOCUS_IDS.BIRTH_YEAR_TRANSFORMATIONS,
    topicId: "birth-year-transformations",
    topic: "生年四化",
    reason: "用户询问四化，需要查看本命盘中的禄权科忌结构。",
    patterns: [/生年四化|四化|化禄|化权|化科|化忌|禄权科忌/u]
  }
];

const TOPICS_BY_FOCUS_AREA_ID = {
  [QUERY_FOCUS_IDS.LIFE_TRIAD]: "命宫三方四正",
  [QUERY_FOCUS_IDS.BODY_PALACE]: "身宫落点",
  [QUERY_FOCUS_IDS.STAR_BALANCE]: "星曜类别",
  [QUERY_FOCUS_IDS.BIRTH_YEAR_TRANSFORMATIONS]: "生年四化",
  [QUERY_FOCUS_IDS.MAJOR_PERIODS]: "大限骨架",
  [QUERY_FOCUS_IDS.CURRENT_MAJOR_PERIOD]: "当前大限"
};

export function parseQueryIntentFromText(text) {
  const sourceText = String(text ?? "").trim();
  const matchedItems = collectMatchedItems(sourceText);
  const normalizedItems = removeGenericMajorPeriodWhenCurrentIsMatched(matchedItems);
  const focusAreaIds = uniqueInOrder(
    normalizedItems.map((item) => item.focusAreaId)
  );

  return {
    status: focusAreaIds.length > 0 ? "matched" : "none",
    hasIntent: focusAreaIds.length > 0,
    focusAreaIds,
    topics: uniqueInOrder(normalizedItems.map((item) => item.topic)),
    topicIds: uniqueInOrder(normalizedItems.map((item) => item.topicId)),
    primaryPalaceNames: uniqueInOrder(
      normalizedItems.flatMap((item) => item.palaceNames ?? [])
    ),
    matchedItems: normalizedItems,
    sourceText
  };
}

export function normalizeQueryIntent(queryIntent) {
  if (!queryIntent || queryIntent.hasIntent !== true) {
    return createEmptyQueryIntent();
  }

  const focusAreaIds = uniqueInOrder(queryIntent.focusAreaIds ?? []);

  return {
    status: focusAreaIds.length > 0 ? "matched" : "none",
    hasIntent: focusAreaIds.length > 0,
    focusAreaIds,
    topics: normalizeTopics(queryIntent.topics, focusAreaIds),
    topicIds: uniqueInOrder(queryIntent.topicIds ?? []),
    primaryPalaceNames: uniqueInOrder(queryIntent.primaryPalaceNames ?? []),
    matchedItems: queryIntent.matchedItems ?? [],
    sourceText: queryIntent.sourceText ?? ""
  };
}

function collectMatchedItems(text) {
  if (!text) {
    return [];
  }

  return QUERY_RULES.flatMap((rule) => {
    const match = findRuleMatch(text, rule.patterns);
    if (!match) {
      return [];
    }

    return [{
      focusAreaId: rule.focusAreaId,
      topicId: rule.topicId,
      topic: rule.topic,
      palaceNames: rule.palaceNames ?? [],
      source: match[0],
      reason: rule.reason
    }];
  });
}

function findRuleMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      return match;
    }
  }

  return null;
}

function removeGenericMajorPeriodWhenCurrentIsMatched(items) {
  const hasCurrentMajorPeriod = items.some((item) => {
    return item.focusAreaId === QUERY_FOCUS_IDS.CURRENT_MAJOR_PERIOD;
  });

  if (!hasCurrentMajorPeriod) {
    return items;
  }

  // “看当前大限”会同时命中“当前大限”和泛化的“大限”规则。
  // 这里保留更精确的当前大限意图，避免报告重复写“大限骨架”章节。
  return items.filter((item) => {
    return item.focusAreaId !== QUERY_FOCUS_IDS.MAJOR_PERIODS ||
      /全部|所有|列表|骨架|结构|年龄段/u.test(item.source);
  });
}

function createEmptyQueryIntent() {
  return {
    status: "none",
    hasIntent: false,
    focusAreaIds: [],
    topics: [],
    topicIds: [],
    primaryPalaceNames: [],
    matchedItems: [],
    sourceText: ""
  };
}

function uniqueInOrder(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeTopics(topics, focusAreaIds) {
  const explicitTopics = uniqueInOrder(topics ?? []);
  if (explicitTopics.length > 0) {
    return explicitTopics;
  }

  if (focusAreaIds.length === 0) {
    return [];
  }

  const derivedTopics = uniqueInOrder(
    focusAreaIds.map((focusAreaId) => TOPICS_BY_FOCUS_AREA_ID[focusAreaId])
  );

  return derivedTopics.length > 0 ? derivedTopics : ["用户指定主题"];
}
