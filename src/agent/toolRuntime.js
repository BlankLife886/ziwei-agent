// 通用 Tool Runtime。
//
// 复杂 agent 的工具层不能只是“拿到函数就调用”。这里把工具登记、
// 同步/异步边界、执行诊断和输出合同集中到一个小型 runtime 中，
// 让 pipeline 能审计“调用了什么工具、按什么合同调用、失败后如何阻断”。

export const TOOL_RUNTIME_VERSION = "tool-runtime.v1";

export function createToolDefinition({
  id,
  kind,
  owner = "agent",
  description = "",
  inputContract = {},
  outputContract = {},
  handler
}) {
  return {
    id,
    kind,
    owner,
    description,
    inputContract,
    outputContract,
    handler
  };
}

export function createToolRegistry(tools = []) {
  const entries = [];
  const issues = [];
  const byId = new Map();

  for (const rawTool of tools) {
    const normalized = normalizeToolDefinition(rawTool);

    if (normalized.status === "invalid") {
      issues.push(...normalized.issues);
      continue;
    }

    if (byId.has(normalized.tool.id)) {
      issues.push(`重复工具 id：${normalized.tool.id}。`);
      continue;
    }

    entries.push(normalized.tool);
    byId.set(normalized.tool.id, normalized.tool);
  }

  return {
    version: TOOL_RUNTIME_VERSION,
    status: issues.length > 0 ? "invalid" : "ready",
    issues,
    toolIds: entries.map((tool) => tool.id),
    getTool(toolId) {
      return byId.get(toolId) ?? null;
    },
    listTools() {
      return entries.map(summarizeToolDefinition);
    }
  };
}

export function executeTool(registry, toolId, input = {}) {
  const startedAt = Date.now();
  const tool = resolveExecutableTool(registry, toolId);

  if (tool.status === "blocked") {
    return blockedToolExecution({
      toolId,
      startedAt,
      mode: "sync",
      messages: tool.messages
    });
  }

  if (isAsyncFunction(tool.definition.handler)) {
    return blockedToolExecution({
      toolId,
      startedAt,
      mode: "sync",
      messages: ["工具 handler 是 async function；同步执行路径已阻断，请使用异步执行器。"],
      reason: "async-handler-on-sync-path"
    });
  }

  try {
    const output = tool.definition.handler(input);

    if (isPromiseLike(output)) {
      return blockedToolExecution({
        toolId,
        startedAt,
        mode: "sync",
        messages: ["工具 handler 返回 Promise；同步执行路径已阻断，请使用异步执行器。"],
        reason: "promise-output-on-sync-path"
      });
    }

    return succeededToolExecution({
      tool: tool.definition,
      toolId,
      startedAt,
      mode: "sync",
      output
    });
  } catch (error) {
    return blockedToolExecution({
      tool: tool.definition,
      toolId,
      startedAt,
      mode: "sync",
      messages: [
        `工具执行失败：${error instanceof Error ? error.message : String(error)}`
      ],
      reason: "tool-execution-error"
    });
  }
}

export async function executeToolAsync(registry, toolId, input = {}) {
  const startedAt = Date.now();
  const tool = resolveExecutableTool(registry, toolId);

  if (tool.status === "blocked") {
    return blockedToolExecution({
      toolId,
      startedAt,
      mode: "async",
      messages: tool.messages
    });
  }

  try {
    const output = await tool.definition.handler(input);

    return succeededToolExecution({
      tool: tool.definition,
      toolId,
      startedAt,
      mode: "async",
      output
    });
  } catch (error) {
    return blockedToolExecution({
      tool: tool.definition,
      toolId,
      startedAt,
      mode: "async",
      messages: [
        `工具执行失败：${error instanceof Error ? error.message : String(error)}`
      ],
      reason: "tool-execution-error"
    });
  }
}

export function summarizeToolExecution(execution) {
  return {
    status: execution.status,
    runtimeVersion: execution.runtimeVersion,
    toolId: execution.toolId,
    kind: execution.kind,
    owner: execution.owner,
    mode: execution.mode,
    durationMs: execution.durationMs,
    messages: execution.messages,
    reason: execution.reason,
    inputContract: execution.inputContract,
    outputContract: execution.outputContract
  };
}

function normalizeToolDefinition(tool) {
  const issues = [];

  if (!tool || typeof tool !== "object") {
    return {
      status: "invalid",
      issues: ["工具定义必须是对象。"]
    };
  }

  if (!isNonEmptyString(tool.id)) {
    issues.push("工具 id 不能为空。");
  }

  if (!isNonEmptyString(tool.kind)) {
    issues.push(`工具 ${tool.id ?? "unknown"} 缺少 kind。`);
  }

  if (typeof tool.handler !== "function") {
    issues.push(`工具 ${tool.id ?? "unknown"} 缺少可调用 handler。`);
  }

  if (issues.length > 0) {
    return {
      status: "invalid",
      issues
    };
  }

  return {
    status: "ready",
    tool: {
      ...tool,
      owner: tool.owner ?? "agent",
      description: tool.description ?? "",
      inputContract: tool.inputContract ?? {},
      outputContract: tool.outputContract ?? {}
    }
  };
}

function resolveExecutableTool(registry, toolId) {
  if (!registry || registry.status !== "ready") {
    return {
      status: "blocked",
      messages: [
        "Tool Registry 未就绪。",
        ...(registry?.issues ?? [])
      ]
    };
  }

  const definition = registry.getTool(toolId);

  if (!definition) {
    return {
      status: "blocked",
      messages: [`未找到工具：${toolId}。`]
    };
  }

  return {
    status: "ready",
    definition
  };
}

function succeededToolExecution({
  tool,
  toolId,
  startedAt,
  mode,
  output
}) {
  return {
    status: "succeeded",
    runtimeVersion: TOOL_RUNTIME_VERSION,
    toolId,
    kind: tool.kind,
    owner: tool.owner,
    mode,
    durationMs: Date.now() - startedAt,
    messages: [],
    inputContract: tool.inputContract,
    outputContract: tool.outputContract,
    output
  };
}

function blockedToolExecution({
  tool,
  toolId,
  startedAt,
  mode,
  messages,
  reason = "blocked"
}) {
  return {
    status: "blocked",
    runtimeVersion: TOOL_RUNTIME_VERSION,
    toolId,
    kind: tool?.kind,
    owner: tool?.owner,
    mode,
    durationMs: Date.now() - startedAt,
    messages,
    reason,
    inputContract: tool?.inputContract ?? {},
    outputContract: tool?.outputContract ?? {},
    output: null
  };
}

function summarizeToolDefinition(tool) {
  return {
    id: tool.id,
    kind: tool.kind,
    owner: tool.owner,
    description: tool.description,
    inputContract: tool.inputContract,
    outputContract: tool.outputContract
  };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPromiseLike(value) {
  return Boolean(value) && typeof value.then === "function";
}

function isAsyncFunction(value) {
  return value?.constructor?.name === "AsyncFunction";
}
