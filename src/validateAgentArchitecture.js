import { readFile } from "node:fs/promises";
import { auditAgentArchitectureCompliance } from "./agent/agentArchitectureComplianceAuditor.js";
import { runZiweiPipeline } from "./agent/ziweiPipeline.js";
import { buildChart } from "./chartBuilder.js";

const SAMPLE_PROFILE_PATH = "examples/profile.example.json";

async function main() {
  const profile = JSON.parse(await readFile(SAMPLE_PROFILE_PATH, "utf8"));
  const pipelineResult = runZiweiPipeline(buildChart(profile));
  const audit = auditAgentArchitectureCompliance({
    pipelineResult,
    capabilities: {
      apiGuardrails: true,
      observability: true,
      releaseGates: true,
      cloudflareDeployment: true,
      ciReleaseGate: true,
      humanKnowledgeReview: true,
      longTermMemory: false,
      vectorStore: false,
      webSessionAuth: false
    }
  });

  printArchitectureAudit(audit);

  if (audit.status !== "aligned_with_gaps") {
    process.exitCode = 2;
  }
}

function printArchitectureAudit(audit) {
  console.log("Agent 架构合规审计：");
  console.log(`- 状态：${audit.status}`);
  console.log(`- 符合度：${audit.percent}%`);

  for (const item of audit.items) {
    console.log(`- ${item.title}：${item.status}（${Math.round(item.score)}/${item.weight}）`);
    console.log(`  - ${item.message}`);
  }

  if (audit.criticalFailures.length === 0) {
    console.log("- 核心阻断：0 项");
  } else {
    console.log("- 核心阻断：");
    for (const failure of audit.criticalFailures) {
      console.log(`  - ${failure.title}：${failure.message}`);
    }
  }

  if (audit.nextPriorities.length > 0) {
    console.log("- 后续补强：");
    for (const priority of audit.nextPriorities) {
      console.log(`  - ${priority}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Agent 架构合规审计：");
    console.error("- 状态：failed");
    console.error(`- 原因：${error.message}`);
    process.exitCode = 2;
  });
}
