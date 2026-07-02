import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createApiObserver } from "../src/agent/apiObservability.js";
import { createZiweiHttpServer } from "../src/server.js";

test("createZiweiHttpServer serves health responses", async () => {
  const server = createZiweiHttpServer({
    env: {},
    knowledgeSnippets: [
      {
        id: "knowledge-snippet.test"
      }
    ]
  });

  await new Promise((resolve) => {
    server.listen(0, resolve);
  });

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "ziwei-agent");
    assert.equal(body.checks.http, "ok");
    assert.equal(body.checks.agentEntry, "ready");
    assert.equal(body.checks.knowledgeSnippetCount, 1);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-request-id"), body.requestId);
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
});

test("createZiweiHttpServer serves readiness responses for deploy probes", async () => {
  const server = createZiweiHttpServer({
    env: {},
    knowledgeSnippets: [
      {
        id: "knowledge-snippet.test"
      }
    ],
    knowledgeStoreStatus: "ready"
  });

  await listen(server);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/ready`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ready");
    assert.equal(body.checks.runtime.status, "ready");
    assert.equal(body.checks.agentEntry.status, "ready");
    assert.match(body.checks.agentEntry.pipeline, /reportPublisher/u);
    assert.equal(body.checks.knowledge.status, "ready");
    assert.equal(body.checks.knowledge.count, 1);
    assert.equal(body.checks.reportProvider.status, "ready");
    assert.equal(body.checks.reportProvider.mode, "deterministic");
    assert.equal(response.headers.get("cache-control"), "no-store");
  } finally {
    await close(server);
  }
});

test("createZiweiHttpServer reports not ready for incomplete external providers", async () => {
  const server = createZiweiHttpServer({
    env: {
      ZIWEI_REPORT_PROVIDER: "external-llm",
      ZIWEI_LLM_ENDPOINT: "https://example.com/v1/chat/completions"
    },
    knowledgeSnippets: []
  });

  await listen(server);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/ready`);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.status, "not_ready");
    assert.equal(body.checks.reportProvider.status, "not_ready");
    assert.deepEqual(body.checks.reportProvider.missing, [
      "ZIWEI_LLM_API_KEY",
      "ZIWEI_LLM_MODEL"
    ]);
    assert.equal(JSON.stringify(body).includes("secret"), false);
  } finally {
    await close(server);
  }
});

test("createZiweiHttpServer serves readiness responses without consuming rate quota", async () => {
  const server = createZiweiHttpServer({
    env: {},
    knowledgeSnippets: [],
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 1
  });

  await listen(server);

  try {
    const { port } = server.address();
    const firstResponse = await fetch(`http://127.0.0.1:${port}/ready`);
    const secondResponse = await fetch(`http://127.0.0.1:${port}/ready`);
    const body = await secondResponse.json();

    assert.equal(firstResponse.status, 200);
    assert.equal(secondResponse.status, 200);
    assert.equal(body.status, "ready");
  } finally {
    await close(server);
  }
});

test("createZiweiHttpServer serves the web UI assets", async () => {
  const server = createZiweiHttpServer({
    env: {},
    knowledgeSnippets: []
  });

  await listen(server);

  try {
    const { port } = server.address();
    const indexResponse = await fetch(`http://127.0.0.1:${port}/`);
    const scriptResponse = await fetch(`http://127.0.0.1:${port}/app.js`);
    const styleResponse = await fetch(`http://127.0.0.1:${port}/styles.css`);
    const indexBody = await indexResponse.text();
    const scriptBody = await scriptResponse.text();
    const styleBody = await styleResponse.text();

    assert.equal(indexResponse.status, 200);
    assert.equal(scriptResponse.status, 200);
    assert.equal(styleResponse.status, 200);
    assert.match(indexResponse.headers.get("content-type"), /text\/html/u);
    assert.match(scriptResponse.headers.get("content-type"), /text\/javascript/u);
    assert.match(styleResponse.headers.get("content-type"), /text\/css/u);
    assert.match(indexBody, /紫微斗数命理师 Agent/u);
    assert.match(scriptBody, /POST/u);
    assert.match(styleBody, /palace-grid/u);
  } finally {
    await close(server);
  }
});

test("createZiweiHttpServer serves health responses without consuming rate quota", async () => {
  const server = createZiweiHttpServer({
    env: {},
    knowledgeSnippets: [],
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 1
  });

  await listen(server);

  try {
    const { port } = server.address();
    const firstResponse = await fetch(`http://127.0.0.1:${port}/health`);
    const secondResponse = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await secondResponse.json();

    assert.equal(firstResponse.status, 200);
    assert.equal(secondResponse.status, 200);
    assert.equal(body.status, "ok");
  } finally {
    await close(server);
  }
});

test("createZiweiHttpServer rate limits API requests before handling bodies", async () => {
  const server = createZiweiHttpServer({
    env: {},
    knowledgeSnippets: [],
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 1
  });

  await listen(server);

  try {
    const { port } = server.address();
    const firstResponse = await fetch(`http://127.0.0.1:${port}/v1/reports`, {
      method: "POST",
      body: "{}"
    });
    const secondResponse = await fetch(`http://127.0.0.1:${port}/v1/reports`, {
      method: "POST",
      body: "{}"
    });
    const body = await secondResponse.json();

    assert.equal(firstResponse.status, 400);
    assert.equal(secondResponse.status, 429);
    assert.equal(body.status, "rate_limited");
    assert.equal(typeof body.retryAfterMs, "number");
    assert.equal(secondResponse.headers.get("x-request-id"), body.requestId);
    assert.equal(secondResponse.headers.has("retry-after"), true);
  } finally {
    await close(server);
  }
});

test("createZiweiHttpServer emits redacted observer events", async () => {
  const events = [];
  const observer = createApiObserver({
    mode: "stdout",
    logger: (line) => {
      events.push(JSON.parse(line));
    }
  });
  const server = createZiweiHttpServer({
    env: {},
    apiToken: "secret-token",
    knowledgeSnippets: [],
    observer
  });

  await listen(server);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      headers: {
        authorization: "Bearer secret-token"
      }
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(events.length, 2);
    assert.equal(events[0].type, "api.request.started");
    assert.equal(events[0].headers.authorization, "[redacted]");
    assert.equal(events[1].type, "api.request.completed");
    assert.equal(events[1].requestId, body.requestId);
    assert.equal(events[1].responseStatus, "ok");
    assert.equal(events[1].rateLimit, undefined);
  } finally {
    await close(server);
  }
});

test("createZiweiHttpServer can persist quota windows across server instances", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "ziwei-server-quota-"));
  const quotaStorePath = join(tempDir, "quota.json");

  try {
    const firstServer = createZiweiHttpServer({
      env: {
        ZIWEI_API_QUOTA_STORE: quotaStorePath
      },
      knowledgeSnippets: [],
      rateLimitWindowMs: 60_000,
      rateLimitMaxRequests: 1
    });

    await listen(firstServer);

    const firstPort = firstServer.address().port;
    const firstResponse = await fetch(`http://127.0.0.1:${firstPort}/v1/reports`, {
      method: "POST",
      body: "{}"
    });
    await close(firstServer);

    const secondServer = createZiweiHttpServer({
      env: {
        ZIWEI_API_QUOTA_STORE: quotaStorePath
      },
      knowledgeSnippets: [],
      rateLimitWindowMs: 60_000,
      rateLimitMaxRequests: 1
    });

    await listen(secondServer);

    try {
      const secondPort = secondServer.address().port;
      const secondResponse = await fetch(`http://127.0.0.1:${secondPort}/v1/reports`, {
        method: "POST",
        body: "{}"
      });
      const body = await secondResponse.json();

      assert.equal(firstResponse.status, 400);
      assert.equal(secondResponse.status, 429);
      assert.equal(body.status, "rate_limited");
    } finally {
      await close(secondServer);
    }
  } finally {
    rmSync(tempDir, {
      recursive: true,
      force: true
    });
  }
});

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, resolve);
  });
}

function close(server) {
  return new Promise((resolve) => {
    server.close(resolve);
  });
}
