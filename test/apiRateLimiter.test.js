import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFileApiQuotaStore } from "../src/agent/apiQuotaStore.js";
import {
  buildRateLimitKey,
  createApiRateLimiter
} from "../src/agent/apiRateLimiter.js";

test("createApiRateLimiter blocks requests after the configured window quota", () => {
  let currentTime = 1_000;
  const limiter = createApiRateLimiter({
    windowMs: 1_000,
    maxRequests: 2,
    now: () => currentTime
  });
  const request = {
    headers: {
      authorization: "Bearer token-a"
    },
    remoteAddress: "127.0.0.1"
  };

  assert.equal(limiter.check(request).status, "allowed");
  assert.equal(limiter.check(request).status, "allowed");

  const blocked = limiter.check(request);
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.limit, 2);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfterMs, 1_000);

  currentTime += 1_001;
  assert.equal(limiter.check(request).status, "allowed");
});

test("buildRateLimitKey prefers auth identity and falls back to client address", () => {
  const authKey = buildRateLimitKey({
    headers: {
      authorization: "Bearer token-a"
    },
    remoteAddress: "127.0.0.1"
  });

  assert.equal(authKey.startsWith("auth:"), true);
  assert.equal(authKey.includes("token-a"), false);
  assert.equal(
    buildRateLimitKey({
      headers: {
        "x-forwarded-for": "203.0.113.10, 198.51.100.2"
      },
      remoteAddress: "127.0.0.1"
    }),
    "ip:203.0.113.10"
  );
});

test("createApiRateLimiter persists window buckets through a file quota store", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "ziwei-quota-"));
  const quotaStorePath = join(tempDir, "quota.json");
  let currentTime = 1_000;

  try {
    const firstLimiter = createApiRateLimiter({
      windowMs: 1_000,
      maxRequests: 1,
      now: () => currentTime,
      bucketStore: createFileApiQuotaStore({
        filePath: quotaStorePath
      })
    });
    const request = {
      headers: {
        authorization: "Bearer token-a"
      },
      remoteAddress: "127.0.0.1"
    };

    assert.equal(firstLimiter.check(request).status, "allowed");

    currentTime += 1;

    const secondLimiter = createApiRateLimiter({
      windowMs: 1_000,
      maxRequests: 1,
      now: () => currentTime,
      bucketStore: createFileApiQuotaStore({
        filePath: quotaStorePath
      })
    });
    const blocked = secondLimiter.check(request);

    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.reason, "rate_limited");
    assert.equal(blocked.retryAfterMs, 999);
  } finally {
    rmSync(tempDir, {
      recursive: true,
      force: true
    });
  }
});

test("createApiRateLimiter fails closed when the quota store cannot be read", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "ziwei-quota-"));
  const quotaStorePath = join(tempDir, "quota.json");

  try {
    writeFileSync(quotaStorePath, "{not-json", "utf8");

    const limiter = createApiRateLimiter({
      windowMs: 1_000,
      maxRequests: 1,
      bucketStore: createFileApiQuotaStore({
        filePath: quotaStorePath
      })
    });
    const result = limiter.check({
      headers: {
        authorization: "Bearer token-a"
      },
      remoteAddress: "127.0.0.1"
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.reason, "quota_store_error");
  } finally {
    rmSync(tempDir, {
      recursive: true,
      force: true
    });
  }
});
