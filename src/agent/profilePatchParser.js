// 自然语言资料补充解析器。
//
// 这一层先用可审计的规则解析高频出生资料字段。它不是命理规则，
// 也不替代未来的大模型理解；它的职责是把“用户刚说的话”转换成
// intakeSession 可以合并的 profile patch，并保留每个字段的来源片段。

const GENDER_PATTERNS = [
  { value: "female", pattern: /性别[:：]?\s*(女|女性)|女命|女生/u },
  { value: "female", pattern: /(?:^|[，,\s])女(?:[，,\s]|$)/u },
  { value: "male", pattern: /性别[:：]?\s*(男|男性)|男命|男生/u },
  { value: "male", pattern: /(?:^|[，,\s])男(?:[，,\s]|$)/u }
];

const CALENDAR_PATTERNS = [
  { value: "lunar", pattern: /农历|阴历/u },
  { value: "solar", pattern: /公历|阳历|新历/u }
];

const TIMEZONE_PATTERN = /(Asia\/[A-Za-z_]+|UTC[+-]\d{1,2}|GMT[+-]\d{1,2})/u;

export function parseProfilePatchFromText(text, options = {}) {
  const sourceText = String(text ?? "").trim();
  const currentDate = options.currentDate ?? getCurrentIsoDate();
  const extractedItems = [
    extractName(sourceText),
    extractGender(sourceText),
    extractCalendar(sourceText),
    extractBirthDate(sourceText),
    extractAnalysisDate(sourceText, currentDate),
    extractBirthTime(sourceText),
    extractBirthPlace(sourceText),
    extractTimezone(sourceText)
  ].filter(Boolean);

  return {
    patch: buildPatch(extractedItems),
    extractedItems
  };
}

function buildPatch(extractedItems) {
  return Object.fromEntries(
    extractedItems.map((item) => {
      return [item.field, item.value];
    })
  );
}

function extractName(text) {
  const match = /(命主|姓名|名字|我叫|叫)[:：]?\s*([\p{Script=Han}A-Za-z0-9_-]{1,20})/u.exec(text);
  if (!match) return null;

  return createExtractedItem("name", match[2], match[0]);
}

function extractGender(text) {
  for (const { value, pattern } of GENDER_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return createExtractedItem("gender", value, match[0]);
  }

  return null;
}

function extractCalendar(text) {
  for (const { value, pattern } of CALENDAR_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return createExtractedItem("calendar", value, match[0]);
  }

  return null;
}

function extractBirthDate(text) {
  const isoMatches = text.matchAll(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/gu);
  for (const match of isoMatches) {
    if (!isAnalysisDateContext(text, match.index)) {
      return createExtractedItem(
        "birth_date",
        formatDateParts(match[1], match[2], match[3]),
        match[0]
      );
    }
  }

  const chineseMatches = text.matchAll(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})[日号]?/gu);
  for (const match of chineseMatches) {
    if (!isAnalysisDateContext(text, match.index)) {
      return createExtractedItem(
        "birth_date",
        formatDateParts(match[1], match[2], match[3]),
        match[0]
      );
    }
  }

  return null;
}

function extractAnalysisDate(text, currentDate) {
  const isoMatch = /(?:分析日期|分析时间|以|按|截至|截止到|截止|到|看)[:：]?\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/u.exec(text);
  if (isoMatch) {
    return createExtractedItem(
      "analysis_date",
      formatDateParts(isoMatch[1], isoMatch[2], isoMatch[3]),
      isoMatch[0]
    );
  }

  const chineseMatch = /(?:分析日期|分析时间|以|按|截至|截止到|截止|到|看)[:：]?\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})[日号]?/u.exec(text);
  if (chineseMatch) {
    return createExtractedItem(
      "analysis_date",
      formatDateParts(chineseMatch[1], chineseMatch[2], chineseMatch[3]),
      chineseMatch[0]
    );
  }

  const relativeMatch = /(今天|现在|当前|目前|此刻)/u.exec(text);
  if (!relativeMatch) return null;

  return createExtractedItem("analysis_date", currentDate, relativeMatch[0]);
}

function extractBirthTime(text) {
  const match = /(凌晨|早上|上午|中午|下午|晚上|夜里|晚间)?\s*(\d{1,2})(?:[:：点])(\d{1,2}|半)?分?/u.exec(text);
  if (!match) return null;

  const time = normalizeTimeParts({
    period: match[1],
    hour: Number(match[2]),
    minuteText: match[3]
  });

  if (!time) return null;
  return createExtractedItem("birth_time", time, match[0].trim());
}

function extractBirthPlace(text) {
  const prefixedMatch = /(?:出生地|出生于|出生在|生于)[:：]?\s*([\p{Script=Han}A-Za-z][\p{Script=Han}A-Za-z,\s]*?)(?:[，。；;]|$)/u.exec(text);
  if (prefixedMatch) {
    return createExtractedItem(
      "birth_place",
      cleanPlace(prefixedMatch[1]),
      prefixedMatch[0]
    );
  }

  const suffixedMatch = /(?:在|于)?\s*([\p{Script=Han}A-Za-z][\p{Script=Han}A-Za-z,\s]*?)出生/u.exec(text);
  if (!suffixedMatch) return null;

  return createExtractedItem(
    "birth_place",
    cleanPlace(suffixedMatch[1]),
    suffixedMatch[0]
  );
}

function extractTimezone(text) {
  const match = TIMEZONE_PATTERN.exec(text);
  if (!match) return null;

  return createExtractedItem("timezone", match[1], match[0]);
}

function normalizeTimeParts({ period, hour, minuteText }) {
  let normalizedHour = hour;
  const minute = minuteText === "半" ? 30 : Number(minuteText ?? 0);

  if (normalizedHour < 0 || normalizedHour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  if (["下午", "晚上", "夜里", "晚间"].includes(period) && normalizedHour < 12) {
    normalizedHour += 12;
  }

  if (["凌晨", "早上", "上午"].includes(period) && normalizedHour === 12) {
    normalizedHour = 0;
  }

  if (period === "中午" && normalizedHour < 11) {
    normalizedHour += 12;
  }

  return `${pad2(normalizedHour)}:${pad2(minute)}`;
}

function formatDateParts(year, month, day) {
  return `${year}-${pad2(Number(month))}-${pad2(Number(day))}`;
}

function cleanPlace(value) {
  return value.trim().replace(/\s+/g, " ");
}

function createExtractedItem(field, value, source) {
  return {
    field,
    value,
    source: cleanSource(source)
  };
}

function cleanSource(value) {
  return value.trim().replace(/^[，,\s]+|[，,\s。；;]+$/g, "");
}

function isAnalysisDateContext(text, index) {
  const prefix = text.slice(Math.max(0, index - 12), index);

  return /(分析日期|分析时间|以|按|截至|截止到|截止|到|看)\s*[:：]?\s*$/u.test(prefix);
}

function getCurrentIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}
