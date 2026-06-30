import assert from "node:assert/strict";
import test from "node:test";
import { validateBirthProfile } from "../src/intake.js";

test("valid profile gets chinese hour", () => {
  const result = validateBirthProfile({
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    analysis_date: "2026-06-30",
    lunar_month: 4,
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.missingFields, []);
  assert.equal(result.chineseHour, "子时");
});

test("invalid analysis date is reported", () => {
  const result = validateBirthProfile({
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    analysis_date: "2026-99-99",
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai"
  });

  assert.deepEqual(result.errors, ["analysis_date must use YYYY-MM-DD format"]);
});

test("analysis date cannot be earlier than birth date", () => {
  const result = validateBirthProfile({
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    analysis_date: "1990-01-01",
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai"
  });

  assert.deepEqual(result.errors, [
    "analysis_date must not be earlier than birth_date"
  ]);
});

test("missing required fields are reported", () => {
  const result = validateBirthProfile({
    name: "",
    gender: "female",
    calendar: "solar",
    birth_date: "",
    birth_time: "08:00",
    birth_place: "",
    timezone: "Asia/Shanghai"
  });

  assert.deepEqual(result.missingFields, ["name", "birth_date", "birth_place"]);
  assert.deepEqual(result.errors, []);
});

test("invalid time is reported", () => {
  const result = validateBirthProfile({
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    birth_time: "25:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai"
  });

  assert.deepEqual(result.errors, ["birth_time must use HH:MM 24-hour format"]);
});

test("invalid lunar month is reported", () => {
  const result = validateBirthProfile({
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    lunar_month: 13,
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai"
  });

  assert.deepEqual(result.errors, ["lunar_month must be an integer from 1 to 12"]);
});
