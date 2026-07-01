import { readFile } from "node:fs/promises";
import { createExternalLLMReportProvider } from "./agent/externalLLMReportProvider.js";
import { loadKnowledgeSnippetStore } from "./agent/knowledgeSnippetStore.js";
import { REPORT_GENERATOR_IDS } from "./agent/reportGenerator.js";
import { runZiweiPipelineAsync } from "./agent/ziweiPipeline.js";
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
  const pipelineResult = await runZiweiPipelineAsync(
    buildResult,
    buildPipelineOptions(knowledgeStore.snippets)
  );
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

function buildPipelineOptions(knowledgeSnippets) {
  const options = {
    knowledgeSnippets
  };

  if (process.env.ZIWEI_REPORT_PROVIDER !== REPORT_GENERATOR_IDS.EXTERNAL_LLM) {
    return options;
  }

  return {
    ...options,
    reportGeneratorId: REPORT_GENERATOR_IDS.EXTERNAL_LLM,
    externalReportDraftProvider: createExternalLLMReportProvider({
      endpoint: process.env.ZIWEI_LLM_ENDPOINT,
      apiKey: process.env.ZIWEI_LLM_API_KEY,
      model: process.env.ZIWEI_LLM_MODEL,
      providerId: process.env.ZIWEI_LLM_PROVIDER_ID,
      timeoutMs: parseOptionalInteger(process.env.ZIWEI_LLM_TIMEOUT_MS),
      retryCount: parseOptionalInteger(process.env.ZIWEI_LLM_RETRY_COUNT),
      maxResponseBytes: parseOptionalInteger(process.env.ZIWEI_LLM_MAX_RESPONSE_BYTES)
    })
  };
}

function parseOptionalInteger(value) {
  if (value === undefined || value === "") {
    return undefined;
  }

  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) ? parsedValue : undefined;
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
