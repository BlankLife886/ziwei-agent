import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildReleaseSummary } from "../src/validateRelease.js";

test("release validation script includes the full local gate set", async () => {
  const source = await readFile("src/validateRelease.js", "utf8");

  for (const gate of [
    "tests",
    "knowledge",
    "runtime",
    "deployment",
    "cloudflare",
    "architecture",
    "env-example-deployment",
    "diff-check"
  ]) {
    assert.match(source, new RegExp(`name: "${gate}"`, "u"));
  }

  assert.match(source, /npm",\s+args:\s+\["test"\]/u);
  assert.match(source, /validate:cloudflare/u);
  assert.match(source, /validate:architecture/u);
  assert.match(source, /--env-file=\.env\.example/u);
  assert.match(source, /git",\s+args:\s+\["diff", "--check"\]/u);
  assert.match(source, /--summary/u);
  assert.match(source, /ZIWEI_RELEASE_SUMMARY_PATH/u);
});

test("release validation builds a machine-readable summary", () => {
  const summary = buildReleaseSummary([
    {
      name: "tests",
      status: "passed",
      durationMs: 12,
      code: 0
    },
    {
      name: "deployment",
      status: "failed",
      durationMs: 5,
      code: 2
    }
  ], {
    generatedAt: "2026-07-02T00:00:00.000Z"
  });

  assert.equal(summary.type, "ziwei-release-validation");
  assert.equal(summary.status, "invalid");
  assert.equal(summary.generatedAt, "2026-07-02T00:00:00.000Z");
  assert.equal(summary.checks.length, 2);
  assert.deepEqual(summary.checks.map((check) => check.name), [
    "tests",
    "deployment"
  ]);
  assert.equal(summary.checks[0].code, 0);
});

test("ci workflow runs release gate and container checks", async () => {
  const workflow = await readFile(".github/workflows/ci.yml", "utf8");

  assert.match(workflow, /npm run validate:release/u);
  assert.match(workflow, /docker compose -f deploy\/docker-compose\.yml config/u);
  assert.match(workflow, /docker build -t ziwei-agent:ci \./u);
  assert.match(workflow, /node-version: "22"/u);
});
