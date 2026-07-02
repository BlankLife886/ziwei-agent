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
