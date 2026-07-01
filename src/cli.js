import { readFile } from "node:fs/promises";
import { loadKnowledgeSnippetStore } from "./agent/knowledgeSnippetStore.js";
import { runZiweiPipeline } from "./agent/ziweiPipeline.js";
import { buildChart } from "./chartBuilder.js";
import {
  formatAgentBriefing,
  formatBuildResult,
  formatKnowledgeCoverageAudit,
  formatReadinessAudit,
  formatReportAudit,
  formatReportOutput,
  formatReportPlan
} from "./formatters.js";

async function main() {
  const profilePath = process.argv[2];
  const knowledgeStorePath = process.argv[3];

  if (!profilePath) {
    console.error("用法：node src/cli.js examples/profile.example.json [data/knowledge-snippets.json]");
    return 2;
  }

  const profile = JSON.parse(await readFile(profilePath, "utf8"));
  const knowledgeStore = knowledgeStorePath
    ? await loadKnowledgeSnippetStore(knowledgeStorePath)
    : { status: "empty", snippets: [], issues: [] };
  const buildResult = buildChart(profile);
  const pipelineResult = runZiweiPipeline(buildResult, {
    knowledgeSnippets: knowledgeStore.snippets
  });
  const lines = [
    ...formatKnowledgeStoreSummary(knowledgeStore),
    "",
    ...formatBuildResult(pipelineResult.buildResult),
    "",
    ...formatAgentBriefing(pipelineResult.agentResult),
    "",
    ...formatReportPlan(pipelineResult.reportPlan),
    "",
    ...formatKnowledgeCoverageAudit(pipelineResult.knowledgeCoverageAudit),
    "",
    ...formatReportAudit(pipelineResult.reportAudit),
    "",
    ...formatReadinessAudit(pipelineResult.readinessAudit),
    "",
    ...formatReportOutput(pipelineResult.reportOutput)
  ];

  for (const line of lines) {
    console.log(line);
  }

  return buildResult.exitCode;
}

function formatKnowledgeStoreSummary(knowledgeStore) {
  if (knowledgeStore.status === "empty") {
    return [
      "知识库加载：未提供外部知识片段文件"
    ];
  }

  return [
    `知识库加载：${knowledgeStore.status}`,
    `- 可用片段：${knowledgeStore.snippets.length} 项`,
    `- 待处理问题：${knowledgeStore.issues.length} 项`
  ];
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 2;
  });
