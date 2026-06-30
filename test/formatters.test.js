import assert from "node:assert/strict";
import test from "node:test";
import { buildChart } from "../src/chartBuilder.js";
import { formatBuildResult } from "../src/formatters.js";

test("formatBuildResult renders the complete chart summary for CLI output", () => {
  const lines = formatBuildResult(buildChart(createSampleProfile()));

  assert.ok(lines.includes("资料校验通过"));
  assert.ok(lines.includes("命盘骨架已建立："));
  assert.ok(lines.includes("命宫：巳"));
  assert.ok(lines.includes("五行局：金四局（命宫辛巳，纳音白蜡金）"));
  assert.ok(lines.includes("天厨星曜：天厨寅"));
  assert.ok(lines.includes("截空星曜：正空午、副空未"));
  assert.ok(
    lines.includes(
      "12. 父母宫：午｜主星：天机｜辅星：三台、天福｜空曜：截空（正空）"
    )
  );
});

test("formatBuildResult renders validation errors", () => {
  const result = buildChart({
    ...createSampleProfile(),
    gender: "unknown"
  });

  assert.deepEqual(formatBuildResult(result), [
    "资料格式错误：",
    "- gender must be 'male' or 'female'"
  ]);
});

function createSampleProfile() {
  return {
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  };
}
