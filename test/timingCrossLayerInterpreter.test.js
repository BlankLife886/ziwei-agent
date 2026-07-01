import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTimingCrossLayerInteraction,
  interpretTimingCrossLayerInteractions
} from "../src/agent/timingCrossLayerInterpreter.js";

test("interpretTimingCrossLayerInteractions links verified themes with timing layers", () => {
  const interactions = interpretTimingCrossLayerInteractions({
    themes: [
      {
        id: "timing-combination-theme.1.children",
        palaceName: "子女宫",
        themeId: "creation-extension",
        title: "延展事务与创作表达",
        evidenceRefs: ["current-stage.major-period-anchor"],
        referenceRefs: ["framework.timing-combination-theme"],
        blockedClaims: ["不把阶段主题写成实际发生事件"]
      }
    ],
    currentMajorPalaceName: "子女宫",
    annualPalaceName: "父母宫",
    monthlyPalaceName: "父母宫"
  });

  assert.equal(interactions.length, 2);
  assert.equal(interactions[0].title, "大限落宫与组合主题同宫");
  assert.equal(interactions[0].primaryPalaceName, "子女宫");
  assert.deepEqual(interactions[0].referenceRefs, [
    "framework.timing-cross-layer-analysis",
    "framework.timing-combination-theme"
  ]);
  assert.deepEqual(interactions[0].interpretationRefs, [
    "interpretation.timing-cross-layer.structure-only"
  ]);
  assert.ok(interactions[0].blockedClaims.includes("不把跨宫关系写成实际事件"));
  assert.equal(interactions[1].title, "流年与流月定位同宫");
  assert.equal(interactions[1].primaryPalaceName, "父母宫");
  assert.ok(interactions[1].evidenceRefs.includes("current-stage.annual-period"));
  assert.ok(interactions[1].evidenceRefs.includes("current-stage.monthly-period"));
  assert.ok(
    formatTimingCrossLayerInteraction(interactions[0]).includes("不推事件、应期或结果")
  );
});

test("interpretTimingCrossLayerInteractions keeps separated annual and monthly layers distinct", () => {
  const interactions = interpretTimingCrossLayerInteractions({
    themes: [{
      id: "timing-combination-theme.1.wealth",
      palaceName: "财帛宫",
      themeId: "resource-management",
      title: "资源经营与取用方式"
    }],
    currentMajorPalaceName: "命宫",
    annualPalaceName: "官禄宫",
    monthlyPalaceName: "福德宫"
  });

  assert.deepEqual(
    interactions.map((item) => item.title),
    [
      "大限落宫与组合主题分宫",
      "流年定位与组合主题分层",
      "流月定位与组合主题分层"
    ]
  );
  assert.ok(interactions.every((item) => item.text.includes("合参")));
});
