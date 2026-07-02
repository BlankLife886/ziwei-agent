import assert from "node:assert/strict";
import test from "node:test";
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
