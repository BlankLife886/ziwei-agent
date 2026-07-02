import assert from "node:assert/strict";
import test from "node:test";
import {
  createToolDefinition,
  createToolRegistry,
  executeTool,
  executeToolAsync,
  summarizeToolExecution
} from "../src/agent/toolRuntime.js";

test("createToolRegistry registers callable tools with contracts", () => {
  const registry = createToolRegistry([
    createToolDefinition({
      id: "tool.echo",
      kind: "test-tool",
      description: "测试工具",
      inputContract: {
        requiredFields: ["text"]
      },
      outputContract: {
        requiredFields: ["text"]
      },
      handler: ({ text }) => {
        return {
          text
        };
      }
    })
  ]);

  assert.equal(registry.status, "ready");
  assert.deepEqual(registry.toolIds, ["tool.echo"]);
  assert.equal(registry.listTools()[0].kind, "test-tool");
});

test("executeTool returns an auditable execution summary without exposing input", () => {
  const registry = createToolRegistry([
    createToolDefinition({
      id: "tool.echo",
      kind: "test-tool",
      inputContract: {
        requiredFields: ["secretText"]
      },
      outputContract: {
        requiredFields: ["text"]
      },
      handler: ({ secretText }) => {
        return {
          text: secretText
        };
      }
    })
  ]);
  const execution = executeTool(registry, "tool.echo", {
    secretText: "不要写入执行摘要"
  });
  const summary = summarizeToolExecution(execution);

  assert.equal(execution.status, "succeeded");
  assert.equal(execution.output.text, "不要写入执行摘要");
  assert.equal(summary.status, "succeeded");
  assert.equal(summary.toolId, "tool.echo");
  assert.equal(summary.output, undefined);
  assert.equal(JSON.stringify(summary).includes("不要写入执行摘要"), false);
});

test("executeTool blocks async handlers on the sync path before calling them", () => {
  let called = false;
  const registry = createToolRegistry([
    createToolDefinition({
      id: "tool.async",
      kind: "test-tool",
      handler: async () => {
        called = true;
        return {
          ok: true
        };
      }
    })
  ]);
  const execution = executeTool(registry, "tool.async", {});

  assert.equal(execution.status, "blocked");
  assert.equal(execution.reason, "async-handler-on-sync-path");
  assert.equal(called, false);
});

test("executeToolAsync awaits async handlers", async () => {
  const registry = createToolRegistry([
    createToolDefinition({
      id: "tool.async",
      kind: "test-tool",
      handler: async () => {
        return {
          ok: true
        };
      }
    })
  ]);
  const execution = await executeToolAsync(registry, "tool.async", {});

  assert.equal(execution.status, "succeeded");
  assert.equal(execution.output.ok, true);
});

test("createToolRegistry records invalid definitions instead of throwing", () => {
  const registry = createToolRegistry([
    {
      id: "tool.invalid",
      kind: "test-tool"
    }
  ]);
  const execution = executeTool(registry, "tool.invalid", {});

  assert.equal(registry.status, "invalid");
  assert.ok(registry.issues[0].includes("handler"));
  assert.equal(execution.status, "blocked");
  assert.ok(execution.messages[0].includes("Tool Registry"));
});
