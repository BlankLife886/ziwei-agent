export const REQUIRED_FIELDS = [
  "name",
  "gender",
  "calendar",
  "birth_date",
  "birth_time",
  "birth_place",
  "timezone"
];

export const BIRTH_PROFILE_FIELDS = [
  ...REQUIRED_FIELDS,
  "lunar_month",
  "use_true_solar_time",
  "is_leap_month"
];

const VALID_GENDERS = new Set(["male", "female"]);
const VALID_CALENDARS = new Set(["solar", "lunar"]);

export function validateBirthProfile(profile) {
  const normalized = normalizeProfile(profile);
  const missingFields = REQUIRED_FIELDS.filter((field) => !normalized[field]);
  const errors = [];

  if (normalized.gender && !VALID_GENDERS.has(normalized.gender)) {
    errors.push("gender must be 'male' or 'female'");
  }

  if (normalized.calendar && !VALID_CALENDARS.has(normalized.calendar)) {
    errors.push("calendar must be 'solar' or 'lunar'");
  }

  if (normalized.birth_date && !isValidDate(normalized.birth_date)) {
    errors.push("birth_date must use YYYY-MM-DD format");
  }

  if (
    normalized.lunar_month !== null &&
    (!Number.isInteger(normalized.lunar_month) ||
      normalized.lunar_month < 1 ||
      normalized.lunar_month > 12)
  ) {
    errors.push("lunar_month must be an integer from 1 to 12");
  }

  let chineseHour = null;
  if (normalized.birth_time) {
    const parsedTime = parseBirthTime(normalized.birth_time);
    if (!parsedTime) {
      errors.push("birth_time must use HH:MM 24-hour format");
    } else {
      chineseHour = toChineseHour(parsedTime.hour, parsedTime.minute);
    }
  }

  return {
    profile: normalized,
    missingFields,
    errors,
    chineseHour
  };
}

export function normalizeProfile(profile) {
  return {
    name: stringValue(profile?.name),
    gender: stringValue(profile?.gender),
    calendar: stringValue(profile?.calendar),
    birth_date: stringValue(profile?.birth_date),
    lunar_month: numberOrNull(profile?.lunar_month),
    birth_time: stringValue(profile?.birth_time),
    birth_place: stringValue(profile?.birth_place),
    timezone: stringValue(profile?.timezone),
    use_true_solar_time: Boolean(profile?.use_true_solar_time),
    is_leap_month: Boolean(profile?.is_leap_month)
  };
}

export function toChineseHour(hour, minute) {
  const totalMinutes = hour * 60 + minute;

  if (totalMinutes >= 23 * 60 || totalMinutes < 1 * 60) return "子时";
  if (totalMinutes < 3 * 60) return "丑时";
  if (totalMinutes < 5 * 60) return "寅时";
  if (totalMinutes < 7 * 60) return "卯时";
  if (totalMinutes < 9 * 60) return "辰时";
  if (totalMinutes < 11 * 60) return "巳时";
  if (totalMinutes < 13 * 60) return "午时";
  if (totalMinutes < 15 * 60) return "未时";
  if (totalMinutes < 17 * 60) return "申时";
  if (totalMinutes < 19 * 60) return "酉时";
  if (totalMinutes < 21 * 60) return "戌时";
  return "亥时";
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function parseBirthTime(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}
