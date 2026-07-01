import assert from "node:assert/strict";
import test from "node:test";
import { auditReportOutput } from "../src/agent/reportAuditor.js";
import { createReportDraft } from "../src/agent/reportComposer.js";
import { createReportPlan } from "../src/agent/reportPlanner.js";
import { publishReportOutput } from "../src/agent/reportPublisher.js";
import { parseQueryIntentFromText } from "../src/agent/queryIntentParser.js";
import { createZiweiAgentResponse } from "../src/agent/ziweiAgent.js";
import { buildChart } from "../src/chartBuilder.js";

test("publishReportOutput publishes only audited report drafts", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()))
  );
  const reportDraft = createReportDraft(reportPlan);
  const reportAudit = auditReportOutput(reportPlan, reportDraft);
  const reportOutput = publishReportOutput(reportPlan, reportDraft, reportAudit);

  assert.equal(reportOutput.status, "published");
  assert.equal(reportOutput.title, "示例命主的紫微斗数本命盘分析草稿");
  assert.equal(reportOutput.audit.status, "passed");
  assert.equal(reportOutput.metadata.outputType, "ziwei-user-report");
  assert.equal(reportOutput.metadata.reportStatus, "published");
  assert.equal(reportOutput.metadata.auditStatus, "passed");
  assert.ok(reportOutput.metadata.sectionIds.includes("life-triad"));
  assert.ok(reportOutput.metadata.evidenceRefs.includes("life-triad.life-palace"));
  assert.ok(reportOutput.metadata.referenceRefs.includes("framework.life-triad"));
  assert.ok(
    reportOutput.metadata.interpretationRefs.includes(
      "interpretation.life-triad.structure"
    )
  );
  assert.ok(
    reportOutput.metadata.guardrails.some((guardrail) => {
      return guardrail.includes("所有结论必须能回指");
    })
  );
  assert.ok(reportOutput.sections.length > 0);
  assert.ok(reportOutput.sections[0].paragraphs[0].evidenceRefs);
});

test("publishReportOutput blocks drafts that did not pass audit", () => {
  const reportOutput = publishReportOutput({
    status: "planned",
    sections: []
  }, {
    status: "drafted",
    sections: []
  }, {
    status: "failed",
    issues: [
      {
        message: "段落引用了不属于本章节的 evidenceRefs。"
      }
    ],
    warnings: []
  });

  assert.equal(reportOutput.status, "blocked");
  assert.deepEqual(reportOutput.sections, []);
  assert.ok(reportOutput.messages[0].includes("审计未通过"));
  assert.ok(reportOutput.messages[1].includes("evidenceRefs"));
});

test("publishReportOutput carries query intent metadata into the user report", () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()), {
      queryIntent: parseQueryIntentFromText("我想看事业和财帛。")
    })
  );
  const reportDraft = createReportDraft(reportPlan);
  const reportAudit = auditReportOutput(reportPlan, reportDraft);
  const reportOutput = publishReportOutput(reportPlan, reportDraft, reportAudit);

  assert.equal(reportOutput.status, "published");
  assert.deepEqual(reportOutput.metadata.queryIntent.topics, ["事业", "财帛"]);
  assert.deepEqual(reportOutput.metadata.queryIntent.focusAreaIds, [
    "career-palace",
    "wealth-palace"
  ]);
  assert.deepEqual(reportOutput.metadata.sectionIds, [
    "career-palace",
    "wealth-palace"
  ]);
});

test("publishReportOutput blocks missing report drafts", () => {
  const reportOutput = publishReportOutput({
    status: "blocked",
    sections: []
  }, {
    status: "blocked",
    messages: ["报告规划尚未完成。"],
    sections: []
  }, {
    status: "skipped",
    issues: [],
    warnings: []
  });

  assert.equal(reportOutput.status, "blocked");
  assert.ok(reportOutput.messages[0].includes("尚未生成"));
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
