import assert from "node:assert/strict";
import test from "node:test";
import { handleCloudflareWorkerRequest } from "../src/cloudflareWorker.js";
import profile from "../examples/profile.example.json" with { type: "json" };

const PROD_ENV = {
  NODE_ENV: "production",
  ZIWEI_API_CREDENTIALS: JSON.stringify([
    {
      id: "worker-client",
      token: "worker-secret",
      scopes: ["reports:write"]
    }
  ]),
  ZIWEI_RELEASE_VERSION: "v0.1.0",
  ZIWEI_RELEASE_COMMIT: "abcdef1234567890",
  ZIWEI_RELEASE_SOURCE: "cloudflare-workers"
};

test("Cloudflare Worker serves health, readiness, and OpenAPI responses", async () => {
  const healthResponse = await workerFetch("/health");
  const readyResponse = await workerFetch("/ready");
  const openApiResponse = await workerFetch("/openapi.json");
  const healthBody = await healthResponse.json();
  const readyBody = await readyResponse.json();
  const openApiBody = await openApiResponse.json();

  assert.equal(healthResponse.status, 200);
  assert.equal(healthBody.status, "ok");
  assert.equal(healthBody.checks.platform, "cloudflare-workers");
  assert.equal(healthBody.checks.knowledgeSnippetCount, 20);
  assert.equal(healthBody.release.source, "cloudflare-workers");
  assert.equal(readyResponse.status, 200);
  assert.equal(readyBody.status, "ready");
  assert.equal(readyBody.checks.runtime.platform, "cloudflare-workers");
  assert.equal(readyBody.checks.knowledge.count, 20);
  assert.match(readyBody.checks.agentEntry.pipeline, /reportPublisher/u);
  assert.equal(openApiResponse.status, 200);
  assert.equal(openApiBody.openapi, "3.1.0");
  assert.ok(openApiBody.paths["/v1/reports"].post);
});

test("Cloudflare Worker fails closed when production credentials are missing", async () => {
  const response = await workerFetch("/ready", {
    env: {
      NODE_ENV: "production"
    }
  });
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.status, "not_ready");
  assert.equal(body.checks.runtime.status, "not_ready");
  assert.match(body.checks.runtime.issues.join("\n"), /reports:write API credential/u);
});

test("Cloudflare Worker delegates static assets to the ASSETS binding", async () => {
  const assets = {
    async fetch(request) {
      const url = new URL(request.url);

      assert.equal(url.pathname, "/index.html");

      return new Response("<h1>紫微斗数命理师 Agent</h1>", {
        headers: {
          "content-type": "text/html; charset=utf-8"
        }
      });
    }
  };
  const response = await workerFetch("/", {
    assets
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/u);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(body, /紫微斗数命理师 Agent/u);
});

test("Cloudflare Worker runs the full agent report route with bearer auth", async () => {
  const response = await workerFetch("/v1/reports", {
    method: "POST",
    headers: {
      authorization: "Bearer worker-secret",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      profile,
      query: "我想看婚姻、财富和当前运势"
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "published");
  assert.equal(body.report.status, "published");
  assert.ok(body.report.appendix.knowledgeSnippets.length > 0);
  assert.ok(body.chart);
  assert.equal(body.diagnostics.authorization.principalId, "worker-client");
  assert.equal(response.headers.get("x-request-id"), body.requestId);
});

test("Cloudflare Worker rate limits report requests inside the Worker boundary", async () => {
  const env = {
    ...PROD_ENV,
    ZIWEI_API_CREDENTIALS: JSON.stringify([
      {
        id: "worker-rate-client",
        token: "worker-rate-secret",
        scopes: ["reports:write"]
      }
    ]),
    ZIWEI_API_RATE_LIMIT_WINDOW_MS: "60000",
    ZIWEI_API_RATE_LIMIT_MAX: "1"
  };
  const firstResponse = await workerFetch("/v1/reports", {
    env,
    method: "POST",
    headers: {
      authorization: "Bearer worker-rate-secret"
    },
    body: "{}"
  });
  const secondResponse = await workerFetch("/v1/reports", {
    env,
    method: "POST",
    headers: {
      authorization: "Bearer worker-rate-secret"
    },
    body: "{}"
  });
  const body = await secondResponse.json();

  assert.equal(firstResponse.status, 400);
  assert.equal(secondResponse.status, 429);
  assert.equal(body.status, "rate_limited");
  assert.equal(secondResponse.headers.has("retry-after"), true);
});

async function workerFetch(path, options = {}) {
  const request = new Request(`https://ziwei-agent.example${path}`, {
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body
  });

  return handleCloudflareWorkerRequest(request, {
    env: options.env ?? PROD_ENV,
    assets: options.assets
  });
}
