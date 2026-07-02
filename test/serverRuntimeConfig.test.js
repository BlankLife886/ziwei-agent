import assert from "node:assert/strict";
import test from "node:test";
import { buildServerRuntimeConfig } from "../src/serverRuntimeConfig.js";

test("buildServerRuntimeConfig accepts secure production runtime settings", () => {
  const config = buildServerRuntimeConfig({
    NODE_ENV: "production",
    PORT: "8080",
    ZIWEI_API_TOKEN: "secret-token",
    ZIWEI_API_MAX_BODY_BYTES: "200000",
    ZIWEI_API_RATE_LIMIT_WINDOW_MS: "120000",
    ZIWEI_API_RATE_LIMIT_MAX: "30",
    ZIWEI_API_OBSERVABILITY: "stdout",
    ZIWEI_API_QUOTA_STORE: ".runtime/quota.json",
    ZIWEI_KNOWLEDGE_STORE: "data/knowledge-snippets.example.json",
    ZIWEI_RELEASE_VERSION: "v0.1.0",
    ZIWEI_RELEASE_COMMIT: "abcdef1234567890",
    ZIWEI_RELEASE_SOURCE: "main",
    ZIWEI_RELEASE_SUMMARY_PATH: ".runtime/release-summary.json"
  });

  assert.equal(config.status, "ready");
  assert.equal(config.issues.length, 0);
  assert.equal(config.values.port, 8080);
  assert.equal(config.values.maxBodyBytes, 200000);
  assert.equal(config.values.rateLimitWindowMs, 120000);
  assert.equal(config.values.rateLimitMaxRequests, 30);
  assert.equal(config.values.observabilityMode, "stdout");
  assert.equal(config.values.release.version, "v0.1.0");
  assert.equal(config.values.release.commit, "abcdef1234567890");
  assert.equal(config.values.release.source, "main");
  assert.equal(config.values.release.summaryConfigured, true);
});

test("buildServerRuntimeConfig accepts env already resolved from secret files", () => {
  const config = buildServerRuntimeConfig({
    NODE_ENV: "production",
    ZIWEI_API_CREDENTIALS: JSON.stringify([
      {
        id: "secret-file-client",
        token: "secret-file-token",
        scopes: ["reports:write"]
      }
    ])
  });

  assert.equal(config.status, "ready");
});

test("buildServerRuntimeConfig blocks production without API credentials", () => {
  const config = buildServerRuntimeConfig({
    NODE_ENV: "production"
  });

  assert.equal(config.status, "invalid");
  assert.ok(config.issues.some((issue) => {
    return issue.includes("生产部署必须配置");
  }));
});

test("buildServerRuntimeConfig blocks invalid numeric and observability settings", () => {
  const config = buildServerRuntimeConfig({
    ZIWEI_REQUIRE_API_AUTH: "true",
    ZIWEI_API_TOKEN: "secret-token",
    PORT: "99999",
    ZIWEI_API_MAX_BODY_BYTES: "0",
    ZIWEI_API_RATE_LIMIT_WINDOW_MS: "-1",
    ZIWEI_API_RATE_LIMIT_MAX: "many",
    ZIWEI_API_OBSERVABILITY: "verbose"
  });

  assert.equal(config.status, "invalid");
  assert.ok(config.issues.some((issue) => issue.includes("PORT")));
  assert.ok(config.issues.some((issue) => issue.includes("ZIWEI_API_MAX_BODY_BYTES")));
  assert.ok(config.issues.some((issue) => issue.includes("ZIWEI_API_RATE_LIMIT_WINDOW_MS")));
  assert.ok(config.issues.some((issue) => issue.includes("ZIWEI_API_RATE_LIMIT_MAX")));
  assert.ok(config.issues.some((issue) => issue.includes("ZIWEI_API_OBSERVABILITY")));
});

test("buildServerRuntimeConfig rejects invalid release metadata", () => {
  const config = buildServerRuntimeConfig({
    ZIWEI_RELEASE_VERSION: "bad version with spaces",
    ZIWEI_RELEASE_COMMIT: "not-a-commit"
  });

  assert.equal(config.status, "invalid");
  assert.ok(config.issues.some((issue) => issue.includes("ZIWEI_RELEASE_VERSION")));
  assert.ok(config.issues.some((issue) => issue.includes("ZIWEI_RELEASE_COMMIT")));
});

test("buildServerRuntimeConfig accepts scoped credential JSON for required auth", () => {
  const config = buildServerRuntimeConfig({
    ZIWEI_REQUIRE_API_AUTH: "true",
    ZIWEI_API_CREDENTIALS: JSON.stringify([
      {
        id: "app-client",
        token: "app-secret",
        scopes: ["reports:write"]
      }
    ])
  });

  assert.equal(config.status, "ready");
});

test("buildServerRuntimeConfig accepts hashed scoped credential JSON for required auth", () => {
  const config = buildServerRuntimeConfig({
    ZIWEI_REQUIRE_API_AUTH: "true",
    ZIWEI_API_CREDENTIALS: JSON.stringify([
      {
        id: "app-client",
        tokenHash: "sha256:688f510940fa8f0e94ce7b639de7b54152d1616c4540e3f17ce8d3ef7f27003d",
        scopes: ["reports:write"]
      }
    ])
  });

  assert.equal(config.status, "ready");
});

test("buildServerRuntimeConfig accepts lifecycle-managed active credentials", () => {
  const config = buildServerRuntimeConfig({
    ZIWEI_REQUIRE_API_AUTH: "true",
    ZIWEI_API_CREDENTIALS: JSON.stringify([
      {
        id: "old-client",
        token: "old-secret",
        scopes: ["reports:write"],
        disabled: true
      },
      {
        id: "active-client",
        token: "active-secret",
        scopes: ["reports:write"],
        notBefore: "2020-01-01T00:00:00Z",
        expiresAt: "2999-01-01T00:00:00Z"
      }
    ])
  });

  assert.equal(config.status, "ready");
});

test("buildServerRuntimeConfig rejects malformed scoped credential JSON", () => {
  const config = buildServerRuntimeConfig({
    ZIWEI_REQUIRE_API_AUTH: "true",
    ZIWEI_API_CREDENTIALS: JSON.stringify([
      {
        id: "missing-token",
        scopes: ["reports:write"]
      }
    ])
  });

  assert.equal(config.status, "invalid");
});

test("buildServerRuntimeConfig rejects malformed token hashes", () => {
  const config = buildServerRuntimeConfig({
    ZIWEI_REQUIRE_API_AUTH: "true",
    ZIWEI_API_CREDENTIALS: JSON.stringify([
      {
        id: "bad-hash-client",
        tokenHash: "sha256:not-a-valid-hash",
        scopes: ["reports:write"]
      }
    ])
  });

  assert.equal(config.status, "invalid");
  assert.ok(config.issues.some((issue) => issue.includes(".tokenHash")));
});

test("buildServerRuntimeConfig rejects invalid credential lifecycle fields", () => {
  const config = buildServerRuntimeConfig({
    ZIWEI_REQUIRE_API_AUTH: "true",
    ZIWEI_API_CREDENTIALS: JSON.stringify([
      {
        id: "app-client",
        token: "app-secret",
        scopes: ["reports:write"],
        disabled: "no",
        expiresAt: "not-a-date"
      }
    ])
  });

  assert.equal(config.status, "invalid");
  assert.ok(config.issues.some((issue) => issue.includes(".disabled")));
});

test("buildServerRuntimeConfig requires an active report-writing credential", () => {
  const config = buildServerRuntimeConfig({
    ZIWEI_REQUIRE_API_AUTH: "true",
    ZIWEI_API_CREDENTIALS: JSON.stringify([
      {
        id: "expired-client",
        token: "expired-secret",
        scopes: ["reports:write"],
        expiresAt: "2000-01-01T00:00:00Z"
      },
      {
        id: "future-client",
        token: "future-secret",
        scopes: ["reports:write"],
        notBefore: "2999-01-01T00:00:00Z"
      }
    ])
  });

  assert.equal(config.status, "invalid");
  assert.ok(config.issues.some((issue) => {
    return issue.includes("当前可用");
  }));
});

test("buildServerRuntimeConfig requires at least one report-writing credential", () => {
  const config = buildServerRuntimeConfig({
    ZIWEI_REQUIRE_API_AUTH: "true",
    ZIWEI_API_CREDENTIALS: JSON.stringify([
      {
        id: "health-client",
        token: "health-secret",
        scopes: ["health:read"]
      }
    ])
  });

  assert.equal(config.status, "invalid");
});
