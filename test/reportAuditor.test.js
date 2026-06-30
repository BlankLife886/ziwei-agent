import assert from "node:assert/strict";
import test from "node:test";
import { auditReportOutput } from "../src/agent/reportAuditor.js";
import { createReportDraft } from "../src/agent/reportComposer.js";
import { createReportPlan } from "../src/agent/reportPlanner.js";
import { createZiweiAgentResponse } from "../src/agent/ziweiAgent.js";
import { buildChart } from "../src/chartBuilder.js";

test("auditReportOutput passes a normal agent report draft", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()))
  );
  const reportDraft = createReportDraft(reportPlan);
  const audit = auditReportOutput(reportPlan, reportDraft);

  assert.equal(audit.status, "passed");
  assert.deepEqual(audit.issues, []);
  assert.deepEqual(audit.warnings, []);
});

test("auditReportOutput detects refs that bypass the planned section contract", () => {
  const reportPlan = {
    status: "planned",
    sections: [
      {
        id: "life-triad",
        evidenceRefs: ["life-triad.life-palace"],
        referenceRefs: ["framework.life-triad"],
        interpretationRefs: ["interpretation.life-triad.structure"]
      }
    ]
  };
  const reportDraft = {
    status: "drafted",
    sections: [
      {
        id: "life-triad",
        evidenceRefs: ["life-triad.life-palace"],
        referenceRefs: ["framework.life-triad"],
        interpretationRefs: ["interpretation.life-triad.structure"],
        paragraphs: [
          {
            kind: "interpretation",
            text: "【草稿判断】这里只是测试段落。",
            evidenceRefs: ["outside.evidence"],
            referenceRefs: ["outside.reference"],
            interpretationRefs: ["outside.interpretation"]
          }
        ]
      }
    ],
    closing: []
  };
  const audit = auditReportOutput(reportPlan, reportDraft);

  assert.equal(audit.status, "failed");
  assert.deepEqual(
    audit.issues.map((issue) => issue.id),
    [
      "paragraph-ref-outside-section",
      "paragraph-ref-outside-section",
      "paragraph-ref-outside-section"
    ]
  );
});

test("auditReportOutput warns when risky fortune language is not framed as a boundary", () => {
  const reportPlan = {
    status: "planned",
    sections: [
      {
        id: "current-stage",
        evidenceRefs: ["current-stage.current-major-period"],
        referenceRefs: ["framework.current-stage"],
        interpretationRefs: ["interpretation.current-stage.static-only"]
      }
    ]
  };
  const reportDraft = {
    status: "drafted",
    sections: [
      {
        id: "current-stage",
        evidenceRefs: ["current-stage.current-major-period"],
        referenceRefs: ["framework.current-stage"],
        interpretationRefs: ["interpretation.current-stage.static-only"],
        paragraphs: [
          {
            kind: "interpretation",
            text: "【草稿判断】今年具体事件会集中出现。",
            evidenceRefs: ["current-stage.current-major-period"],
            referenceRefs: ["framework.current-stage"],
            interpretationRefs: ["interpretation.current-stage.static-only"]
          }
        ]
      }
    ],
    closing: []
  };
  const audit = auditReportOutput(reportPlan, reportDraft);

  assert.equal(audit.status, "passed");
  assert.equal(audit.warnings.length, 1);
  assert.equal(audit.warnings[0].id, "risk-language.event-timing");
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
