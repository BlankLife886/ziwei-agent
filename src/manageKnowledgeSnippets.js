import { readFile, writeFile } from "node:fs/promises";
import {
  auditKnowledgeSnippet
} from "./agent/knowledgeSnippetCatalog.js";
import {
  ingestKnowledgeSnippetCandidate,
  promoteKnowledgeSnippet
} from "./agent/knowledgeSnippetIngestor.js";
import { buildKnowledgeSnippetStore } from "./agent/knowledgeSnippetStore.js";

// 知识片段管理命令。
//
// 这条链路服务于“PDF/OCR/研读笔记 -> 候选摘录 -> draft -> verified -> JSON store”。
// 它只处理知识材料入库，不参与排盘、不生成报告；这样可以把资料复核流程
// 固定在 agent 的 Memory/Knowledge 边界内，避免未审计文本直接进入报告生成器。

export async function runKnowledgeSnippetCommand(argv = []) {
  const parsed = parseArgs(argv);

  if (parsed.help) {
    return {
      exitCode: 0,
      output: buildHelpText()
    };
  }

  if (parsed.command === "draft") {
    return draftKnowledgeSnippetFile(parsed);
  }

  if (parsed.command === "promote") {
    return promoteKnowledgeSnippetFile(parsed);
  }

  if (parsed.command === "append") {
    return appendKnowledgeSnippetFile(parsed);
  }

  throw new Error(`未知知识片段命令：${parsed.command}`);
}

export async function draftKnowledgeSnippetFile(options) {
  requirePathOption(options, "input");
  const candidate = await readJsonFile(options.input);
  const result = ingestKnowledgeSnippetCandidate(candidate);

  if (options.output) {
    await writeJsonFile(options.output, result.snippet);
  }

  return {
    exitCode: 0,
    output: JSON.stringify({
      command: "draft",
      status: result.status,
      input: options.input,
      output: options.output ?? null,
      snippetId: result.snippet.id,
      audit: result.audit,
      nextAction: result.nextAction
    }, null, 2)
  };
}

export async function promoteKnowledgeSnippetFile(options) {
  requirePathOption(options, "input");
  const snippet = unwrapSnippetPayload(await readJsonFile(options.input));
  const result = promoteKnowledgeSnippet(snippet);

  if (result.status === "verified" && options.output) {
    await writeJsonFile(options.output, result.snippet);
  }

  return {
    exitCode: result.status === "verified" ? 0 : 1,
    output: JSON.stringify({
      command: "promote",
      status: result.status,
      input: options.input,
      output: result.status === "verified" ? options.output ?? null : null,
      snippetId: result.snippet.id,
      audit: result.audit,
      nextAction: result.nextAction
    }, null, 2)
  };
}

export async function appendKnowledgeSnippetFile(options) {
  requirePathOption(options, "input");
  requirePathOption(options, "store");
  const snippet = unwrapSnippetPayload(await readJsonFile(options.input));
  const snippetAudit = auditKnowledgeSnippet(snippet);

  if (snippetAudit.status !== "passed") {
    return {
      exitCode: 1,
      output: JSON.stringify({
        command: "append",
        status: "blocked",
        input: options.input,
        store: options.store,
        output: null,
        snippetId: snippet?.id ?? null,
        audit: snippetAudit,
        nextAction: "只能追加已通过 schema 审计的 verified 知识片段。"
      }, null, 2)
    };
  }

  const storePayload = await readJsonFile(options.store);

  if (!Array.isArray(storePayload?.snippets)) {
    return buildAppendBlockedResult({
      options,
      snippet,
      issueId: "knowledge-store.snippets.required",
      message: "目标知识库必须包含 snippets 数组。"
    });
  }

  if (storePayload.snippets.some((item) => item?.id === snippet.id)) {
    return buildAppendBlockedResult({
      options,
      snippet,
      issueId: "knowledge-store.snippet.duplicate-id",
      message: "目标知识库已存在相同 id 的知识片段。"
    });
  }

  const nextPayload = {
    ...storePayload,
    snippets: [...storePayload.snippets, snippet]
  };
  const nextStore = buildKnowledgeSnippetStore(nextPayload);

  if (nextStore.status !== "ready") {
    return {
      exitCode: 1,
      output: JSON.stringify({
        command: "append",
        status: "blocked",
        input: options.input,
        store: options.store,
        output: null,
        snippetId: snippet.id,
        storeStatus: nextStore.status,
        issues: nextStore.issues,
        nextAction: "追加后的知识库未通过全库审计，请修复问题后再写入。"
      }, null, 2)
    };
  }

  const outputPath = options.output ?? options.store;
  await writeJsonFile(outputPath, nextPayload);

  return {
    exitCode: 0,
    output: JSON.stringify({
      command: "append",
      status: "appended",
      input: options.input,
      store: options.store,
      output: outputPath,
      snippetId: snippet.id,
      storeStatus: nextStore.status,
      snippetCount: nextStore.snippets.length,
      nextAction: "知识片段已追加并通过全库审计，可进入报告规划检索。"
    }, null, 2)
  };
}

function buildAppendBlockedResult({
  options,
  snippet,
  issueId,
  message
}) {
  return {
    exitCode: 1,
    output: JSON.stringify({
      command: "append",
      status: "blocked",
      input: options.input,
      store: options.store,
      output: null,
      snippetId: snippet?.id ?? null,
      issues: [{ id: issueId, message }],
      nextAction: "请先修复目标知识库，再追加 verified 知识片段。"
    }, null, 2)
  };
}

async function readJsonFile(filePath) {
  const rawText = await readFile(filePath, "utf8");
  return JSON.parse(rawText);
}

async function writeJsonFile(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function unwrapSnippetPayload(payload) {
  if (isPlainObject(payload?.snippet)) {
    return payload.snippet;
  }

  return payload;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h") {
    return { help: true };
  }

  const options = {
    command
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    const next = rest[index + 1];

    if (arg === "--input") {
      options.input = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.output = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--store") {
      options.store = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      return { help: true };
    }

    throw new Error(`未知参数：${arg}`);
  }

  return options;
}

function requireValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} 缺少参数值。`);
  }

  return value;
}

function requirePathOption(options, key) {
  if (!options[key]) {
    throw new Error(`${options.command} 缺少 --${key} <path>。`);
  }
}

function buildHelpText() {
  return `用法：
  node src/manageKnowledgeSnippets.js draft --input <candidate.json> [--output <draft.json>]
  node src/manageKnowledgeSnippets.js promote --input <draft.json> [--output <verified.json>]
  node src/manageKnowledgeSnippets.js append --input <verified.json> --store <store.json> [--output <store.json>]

说明：
  draft    把 PDF/OCR/研读笔记候选摘录标准化为 draft 知识片段。
  promote  只在字段完整、来源已登记、规则引用完整时晋升为 verified。
  append   只追加 verified 片段，并在写入前执行全库审计。
`;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runKnowledgeSnippetCommand(process.argv.slice(2))
    .then((result) => {
      console.log(result.output);
      process.exitCode = result.exitCode;
    })
    .catch((error) => {
      console.error(`知识片段命令失败：${error.message}`);
      process.exitCode = 2;
    });
}
