import assert from "node:assert/strict";
import test from "node:test";
import { buildInputQuestions } from "../src/agent/inputQuestionnaire.js";

test("buildInputQuestions creates structured questions for known missing fields", () => {
  const questions = buildInputQuestions(["birth_time"]);

  assert.deepEqual(questions, [
    {
      field: "birth_time",
      required: true,
      prompt: "请提供出生时间，格式为 HH:MM；如果只知道时辰，也可以先说明大概时辰。",
      example: "23:30",
      reason: "出生时间用于换算时辰，并影响命宫、身宫和部分星曜。"
    }
  ]);
});

test("buildInputQuestions creates structured question for analysis date", () => {
  const questions = buildInputQuestions(["analysis_date"]);

  assert.deepEqual(questions, [
    {
      field: "analysis_date",
      required: true,
      prompt: "请提供本次想分析的日期，格式为 YYYY-MM-DD；如果看当前阶段，也可以说“今天”或“今年”。",
      example: "2026-06-30",
      reason: "当前阶段和当前大限需要一个分析日期，才能按虚岁定位命主所在大限。"
    }
  ]);
});

test("buildInputQuestions keeps unknown fields askable", () => {
  const questions = buildInputQuestions(["custom_field"]);

  assert.deepEqual(questions, [
    {
      field: "custom_field",
      required: true,
      prompt: "请补充 custom_field。",
      example: "custom_field",
      reason: "这是完成排盘所需的字段。"
    }
  ]);
});
