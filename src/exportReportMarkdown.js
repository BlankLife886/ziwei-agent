import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { loadKnowledgeSnippetStore } from "./agent/knowledgeSnippetStore.js";
import { formatReportOutputMarkdown } from "./agent/reportMarkdownExporter.js";
import { parseQueryIntentFromText } from "./agent/queryIntentParser.js";
import { runZiweiPipelineAsync } from "./agent/ziweiPipeline.js";
import { buildChart } from "./chartBuilder.js";
import { buildPipelineOptionsFromRuntime } from "./runtimeOptions.js";

// Markdown 报告导出命令。
//
// 它不是一个旁路生成器：命令内部仍然调用统一 pipeline，
// 只有 reportOutput 通过审计与发布门禁后，才会写出 Markdown 文件。

export async function runReportMarkdownExportCommand(argv = [], env = process.env) {
  const options = parseArgs(argv);

  if (options.help) {
    return {
      exitCode: 0,
      output: buildHelpText()
    };
  }

  requireOption(options, "profile");
  requireOption(options, "output");

  const profile = JSON.parse(await readFile(options.profile, "utf8"));
  const knowledgeStore = options.knowledgeStore
    ? await loadKnowledgeSnippetStore(options.knowledgeStore)
    : { status: "empty", snippets: [], issues: [] };

  if (options.knowledgeStore && knowledgeStore.status !== "ready") {
    return {
      exitCode: 1,
      output: JSON.stringify({
        status: "blocked",
        output: null,
        reason: "knowledge-store-not-ready",
        knowledgeStoreStatus: knowledgeStore.status,
        issues: knowledgeStore.issues ?? []
      }, null, 2)
    };
  }

  const buildResult = buildChart(profile);
  const queryIntent = options.query
    ? parseQueryIntentFromText(options.query)
    : undefined;
  const pipelineOptions = {
    ...buildPipelineOptionsFromRuntime({
      knowledgeSnippets: knowledgeStore.snippets,
      env
    }),
    queryIntent
  };
  const pipelineResult = await runZiweiPipelineAsync(buildResult, pipelineOptions);

  if (pipelineResult.reportOutput.status !== "published") {
    return {
      exitCode: 1,
      output: JSON.stringify({
        status: "blocked",
        output: null,
        reportOutputStatus: pipelineResult.reportOutput.status,
        nextAction: pipelineResult.nextAction,
        messages: pipelineResult.reportOutput.messages ?? []
      }, null, 2)
    };
  }

  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(
    options.output,
    formatReportOutputMarkdown(pipelineResult.reportOutput, {
      chart: buildResult.chart
    }),
    "utf8"
  );

  return {
    exitCode: 0,
    output: JSON.stringify({
      status: "exported",
      output: options.output,
      reportOutputStatus: pipelineResult.reportOutput.status,
      sectionCount: pipelineResult.reportOutput.sections.length,
      chartIncluded: Boolean(buildResult.chart),
      evidenceRefCount: pipelineResult.reportOutput.metadata.evidenceRefs.length,
      knowledgeSnippetRefCount: pipelineResult.reportOutput.metadata.knowledgeSnippetRefs.length,
      interpretationRefCount: pipelineResult.reportOutput.metadata.interpretationRefs.length
    }, null, 2)
  };
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--profile") {
      options.profile = readOptionValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--knowledge-store") {
      options.knowledgeStore = readOptionValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.output = readOptionValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--query") {
      options.query = readOptionValue(argv, index, arg);
      index += 1;
      continue;
    }

    throw new Error(`未知参数：${arg}`);
  }

  return options;
}

function readOptionValue(argv, index, optionName) {
  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`参数 ${optionName} 缺少取值。`);
  }

  return value;
}

function requireOption(options, key) {
  if (!options[key]) {
    throw new Error(`缺少必要参数 --${toKebabCase(key)}`);
  }
}

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function buildHelpText() {
  return `用法：
  node src/exportReportMarkdown.js --profile <profile.json> --output <report.md> [--knowledge-store <store.json>] [--query <text>]

说明：
  先运行完整 agent pipeline，只有 reportOutput 已发布时才写出 Markdown 用户报告。`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runReportMarkdownExportCommand(process.argv.slice(2))
    .then((result) => {
      if (result.output) {
        console.log(result.output);
      }

      process.exitCode = result.exitCode;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 2;
    });
}
