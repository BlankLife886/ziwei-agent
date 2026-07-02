import assert from "node:assert/strict";
import test from "node:test";
import { handleZiweiApiRequest } from "../src/agent/ziweiApiHandler.js";

test("handleZiweiApiRequest exposes a health endpoint", async () => {
  const response = await handleZiweiApiRequest({
    method: "GET",
    path: "/health",
    headers: {},
    body: ""
  }, {
    requestId: "health-request"
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.requestId, "health-request");
});

test("handleZiweiApiRequest requires bearer token when configured", async () => {
  const response = await handleZiweiApiRequest({
    method: "POST",
    path: "/v1/reports",
    headers: {},
    body: JSON.stringify({
      profile: createSampleProfile()
    })
  }, {
    apiToken: "secret-token",
    requestId: "auth-request"
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.status, "unauthorized");
  assert.equal(response.headers["www-authenticate"], "Bearer");
  assert.equal(response.body.authorization.status, "unauthorized");
});

test("handleZiweiApiRequest rejects scoped credentials without report access", async () => {
  const response = await handleZiweiApiRequest({
    method: "POST",
    path: "/v1/reports",
    headers: {
      authorization: "Bearer read-token"
    },
    body: JSON.stringify({
      profile: createSampleProfile()
    })
  }, {
    apiCredentials: [
      {
        id: "read-only-client",
        token: "read-token",
        scopes: ["health:read"]
      }
    ],
    requestId: "forbidden-request"
  });

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.status, "forbidden");
  assert.equal(response.body.authorization.principalId, "read-only-client");
  assert.equal(JSON.stringify(response.body).includes("read-token"), false);
});

test("handleZiweiApiRequest rejects inactive credentials before running reports", async () => {
  const response = await handleZiweiApiRequest({
    method: "POST",
    path: "/v1/reports",
    headers: {
      authorization: "Bearer expired-token"
    },
    body: JSON.stringify({
      profile: createSampleProfile()
    })
  }, {
    apiCredentials: [
      {
        id: "expired-client",
        token: "expired-token",
        scopes: ["reports:write"],
        expiresAt: "2000-01-01T00:00:00Z"
      }
    ],
    requestId: "inactive-credential-request"
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.status, "unauthorized");
  assert.equal(response.body.authorization.reason, "credential_inactive");
  assert.equal(response.body.chart, undefined);
});

test("handleZiweiApiRequest runs the full agent pipeline and returns a user report", async () => {
  const response = await handleZiweiApiRequest({
    method: "POST",
    path: "/v1/reports",
    headers: {
      authorization: "Bearer secret-token"
    },
    body: JSON.stringify({
      profile: {
        ...createSampleProfile(),
        analysis_date: "2026-07-01"
      },
      query: "我想看婚姻和今年运势"
    })
  }, {
    apiToken: "secret-token",
    requestId: "report-request",
    env: {},
    knowledgeSnippets: []
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "published");
  assert.equal(response.body.chart.profileSummary.name, "示例命主");
  assert.equal(response.body.report.metadata.outputType, "ziwei-user-report");
  assert.equal(response.body.audits.report.status, "passed");
  assert.equal(response.body.queryIntent.hasIntent, true);
  assert.ok(response.body.queryIntent.topics.includes("婚姻"));
  assert.ok(response.body.queryIntent.topics.includes("运势"));
  assert.equal(response.body.diagnostics.buildStatus, "complete");
  assert.equal(response.body.diagnostics.reportOutputStatus, "published");
  assert.equal(response.body.diagnostics.authorization.principalId, "legacy-token");
});

test("handleZiweiApiRequest rejects incomplete profile through the agent chain", async () => {
  const response = await handleZiweiApiRequest({
    method: "POST",
    path: "/v1/reports",
    headers: {},
    body: JSON.stringify({
      profile: {
        name: "缺字段命主"
      }
    })
  }, {
    requestId: "incomplete-request"
  });

  assert.equal(response.statusCode, 422);
  assert.equal(response.body.status, "needs_input");
  assert.equal(response.body.validation.missingFields.length > 0, true);
  assert.equal(response.body.report.status, "blocked");
});

test("handleZiweiApiRequest blocks invalid JSON and oversized payloads", async () => {
  const invalidJsonResponse = await handleZiweiApiRequest({
    method: "POST",
    path: "/v1/reports",
    headers: {},
    body: "{not-json"
  }, {
    requestId: "invalid-json-request"
  });
  const oversizedResponse = await handleZiweiApiRequest({
    method: "POST",
    path: "/v1/reports",
    headers: {},
    body: JSON.stringify({
      profile: createSampleProfile(),
      filler: "x".repeat(64)
    })
  }, {
    maxBodyBytes: 32,
    requestId: "large-request"
  });

  assert.equal(invalidJsonResponse.statusCode, 400);
  assert.equal(invalidJsonResponse.body.status, "invalid_json");
  assert.equal(oversizedResponse.statusCode, 413);
  assert.equal(oversizedResponse.body.status, "payload_too_large");
});

function createSampleProfile() {
  return {
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  };
}
