import { readFile } from "node:fs/promises";
import { buildChart } from "./chartBuilder.js";
import { formatBuildResult } from "./formatters.js";

async function main() {
  const profilePath = process.argv[2];

  if (!profilePath) {
    console.error("用法：node src/cli.js examples/profile.example.json");
    return 2;
  }

  const profile = JSON.parse(await readFile(profilePath, "utf8"));
  const buildResult = buildChart(profile);
  const lines = formatBuildResult(buildResult);

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
