import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("release validation script includes the full local gate set", async () => {
  const source = await readFile("src/validateRelease.js", "utf8");

  for (const gate of [
    "tests",
    "knowledge",
    "runtime",
    "deployment",
    "env-example-deployment",
    "diff-check"
  ]) {
    assert.match(source, new RegExp(`name: "${gate}"`, "u"));
  }

  assert.match(source, /npm",\s+args:\s+\["test"\]/u);
  assert.match(source, /--env-file=\.env\.example/u);
  assert.match(source, /git",\s+args:\s+\["diff", "--check"\]/u);
});

test("ci workflow runs release gate and container checks", async () => {
  const workflow = await readFile(".github/workflows/ci.yml", "utf8");

  assert.match(workflow, /npm run validate:release/u);
  assert.match(workflow, /docker compose -f deploy\/docker-compose\.yml config/u);
  assert.match(workflow, /docker build -t ziwei-agent:ci \./u);
  assert.match(workflow, /node-version: "22"/u);
});
