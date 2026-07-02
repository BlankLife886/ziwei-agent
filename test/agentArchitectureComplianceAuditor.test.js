import assert from "node:assert/strict";
import test from "node:test";
import { auditAgentArchitectureCompliance } from "../src/agent/agentArchitectureComplianceAuditor.js";
import {
  KNOWLEDGE_RISK_LEVELS,
  KNOWLEDGE_SOURCE_IDS,
  KNOWLEDGE_SNIPPET_STATUS
} from "../src/agent/knowledgeSnippetCatalog.js";
import { parseQueryIntentFromText } from "../src/agent/queryIntentParser.js";
import { runZiweiPipeline } from "../src/agent/ziweiPipeline.js";
import { buildChart } from "../src/chartBuilder.js";

test("auditAgentArchitectureCompliance confirms the current complex agent skeleton", () => {
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()), {
    queryIntent: parseQueryIntentFromText("我想看事业。"),
    knowledgeSnippets: [createKnowledgeSnippet()]
  });
  const audit = auditAgentArchitectureCompliance({
    pipelineResult
  });

  assert.equal(audit.status, "aligned");
  assert.ok(audit.percent >= 80);
  assert.deepEqual(audit.criticalFailures, []);
  assert.ok(
    audit.items.some((item) => {
      return item.id === "state-machine" &&
        item.status === "aligned" &&
        item.message.includes("audit -> approval -> publish");
    })
  );
  assert.ok(
    audit.items.some((item) => {
      return item.id === "recovery" &&
        item.status === "aligned" &&
        item.message.includes("Recovery Planner");
    })
  );
  assert.ok(
    audit.items.some((item) => {
      return item.id === "tool-runtime" &&
        item.status === "aligned" &&
        item.message.includes("工具执行审计");
    })
  );
  assert.ok(
    audit.items.some((item) => {
      return item.id === "memory-knowledge" &&
        item.status === "aligned" &&
        item.message.includes("稀疏向量检索");
    })
  );
  assert.ok(
    audit.items.some((item) => {
      return item.id === "human-in-the-loop" &&
        item.status === "aligned" &&
        item.message.includes("人工确认门禁");
    })
  );
});

test("auditAgentArchitectureCompliance fails when audit and publish gates are bypassed", () => {
  const pipelineResult = runZiweiPipeline(buildChart(createSampleProfile()));
  const bypassedPipeline = {
    ...pipelineResult,
    reportAudit: {
      status: "skipped"
    },
    reportOutput: {
      status: "drafted"
    }
  };
  const audit = auditAgentArchitectureCompliance({
    pipelineResult: bypassedPipeline
  });

  assert.equal(audit.status, "not_aligned");
  assert.ok(
    audit.criticalFailures.some((failure) => {
      return failure.id === "reviewer-evaluator";
    })
  );
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
    is_leap_month: false,
    analysis_date: "2026-06-30"
  };
}

function createKnowledgeSnippet() {
  return {
    id: "knowledge-snippet.career-structure-store",
    sourceRef: KNOWLEDGE_SOURCE_IDS.PENDING_ZIWEI_CORPUS,
    title: "官禄宫结构片段",
    topicIds: ["career"],
    referenceRefs: ["framework.career-palace"],
    excerpt: "官禄宫专题需要合看命宫、财帛宫与夫妻宫。",
    citation: "示例知识库 / 官禄宫结构",
    status: KNOWLEDGE_SNIPPET_STATUS.VERIFIED,
    riskLevel: KNOWLEDGE_RISK_LEVELS.LOW
  };
}
