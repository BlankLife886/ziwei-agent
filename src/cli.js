import { readFile } from "node:fs/promises";
import { runZiweiPipeline } from "./agent/ziweiPipeline.js";
import { buildChart } from "./chartBuilder.js";
import {
  formatAgentBriefing,
  formatBuildResult,
  formatReportAudit,
  formatReportDraft,
  formatReportPlan
} from "./formatters.js";

async function main() {
  const profilePath = process.argv[2];

  if (!profilePath) {
    console.error("用法：node src/cli.js examples/profile.example.json");
    return 2;
  }

  const profile = JSON.parse(await readFile(profilePath, "utf8"));
  const buildResult = buildChart(profile);
  const pipelineResult = runZiweiPipeline(buildResult);
  const lines = [
    ...formatBuildResult(pipelineResult.buildResult),
    "",
    ...formatAgentBriefing(pipelineResult.agentResult),
    "",
    ...formatReportPlan(pipelineResult.reportPlan),
    "",
    ...formatReportDraft(pipelineResult.reportDraft),
    "",
    ...formatReportAudit(pipelineResult.reportAudit)
  ];

  for (const line of lines) {
    console.log(line);
  }

  return buildResult.exitCode;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 2;
  });
