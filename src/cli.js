import { readFile } from "node:fs/promises";
import { createZiweiAgentResponse } from "./agent/ziweiAgent.js";
import { buildChart } from "./chartBuilder.js";
import { formatAgentBriefing, formatBuildResult } from "./formatters.js";

async function main() {
  const profilePath = process.argv[2];

  if (!profilePath) {
    console.error("用法：node src/cli.js examples/profile.example.json");
    return 2;
  }

  const profile = JSON.parse(await readFile(profilePath, "utf8"));
  const buildResult = buildChart(profile);
  const agentResult = createZiweiAgentResponse(buildResult);
  const lines = [
    ...formatBuildResult(buildResult),
    "",
    ...formatAgentBriefing(agentResult)
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
