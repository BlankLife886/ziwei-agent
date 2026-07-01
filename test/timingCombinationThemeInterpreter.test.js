import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTimingCombinationTheme,
  interpretTimingCombinationThemes
} from "../src/agent/timingCombinationThemeInterpreter.js";

test("interpretTimingCombinationThemes maps verified palaces to conservative stage themes", () => {
  const themes = interpretTimingCombinationThemes([
    {
      id: "timing-combination.verified.1.children",
      palaceName: "子女宫",
      signalGroups: ["大限定位", "流年四化"],
      evidenceRefs: [
        "current-stage.major-period-anchor",
        "current-stage.annual-transformations"
      ],
      referenceRefs: ["framework.timing-combination-verification"],
      blockedClaims: ["不推具体事件"]
    }
  ]);

  assert.equal(themes.length, 1);
  assert.equal(themes[0].palaceName, "子女宫");
  assert.equal(themes[0].title, "延展事务与创作表达");
  assert.deepEqual(themes[0].evidenceRefs, [
    "current-stage.major-period-anchor",
    "current-stage.annual-transformations"
  ]);
  assert.deepEqual(themes[0].referenceRefs, [
    "framework.timing-combination-theme",
    "framework.timing-combination-verification"
  ]);
  assert.deepEqual(themes[0].interpretationRefs, [
    "interpretation.timing-combination.theme-only"
  ]);
  assert.ok(themes[0].blockedClaims.includes("不把阶段主题写成实际发生事件"));
  assert.ok(formatTimingCombinationTheme(themes[0]).includes("不推事件或结果"));
});

test("interpretTimingCombinationThemes keeps unknown palaces inside fallback theme boundary", () => {
  const themes = interpretTimingCombinationThemes([
    {
      id: "timing-combination.verified.unknown",
      palaceName: "测试宫",
      signalGroups: ["大限定位", "流月定位"]
    }
  ]);

  assert.equal(themes[0].themeId, "palace-theme");
  assert.equal(themes[0].title, "测试宫阶段主题");
  assert.ok(themes[0].text.includes("合参主题"));
});
