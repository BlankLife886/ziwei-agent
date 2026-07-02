import { createHash } from "node:crypto";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 60;

export function createApiRateLimiter(options = {}) {
  const windowMs = normalizePositiveInteger(options.windowMs, DEFAULT_WINDOW_MS);
  const maxRequests = normalizePositiveInteger(options.maxRequests, DEFAULT_MAX_REQUESTS);
  const now = options.now ?? Date.now;
  const buckets = new Map();

  return {
    check(request) {
      const currentTime = now();
      const key = buildRateLimitKey(request);
      const existingBucket = buckets.get(key);
      const bucket = existingBucket && existingBucket.resetAt > currentTime
        ? existingBucket
        : {
            count: 0,
            resetAt: currentTime + windowMs
          };

      bucket.count += 1;
      buckets.set(key, bucket);
      pruneExpiredBuckets(buckets, currentTime);

      if (bucket.count > maxRequests) {
        return {
          status: "blocked",
          key,
          retryAfterMs: Math.max(0, bucket.resetAt - currentTime),
          limit: maxRequests,
          remaining: 0,
          resetAt: bucket.resetAt
        };
      }

      return {
        status: "allowed",
        key,
        retryAfterMs: 0,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - bucket.count),
        resetAt: bucket.resetAt
      };
    }
  };
}

export function buildRateLimitKey(request = {}) {
  const authorization = getHeader(request.headers, "authorization");

  if (authorization) {
    return `auth:${hashIdentity(authorization)}`;
  }

  const forwardedFor = getHeader(request.headers, "x-forwarded-for");
  const remoteAddress = request.remoteAddress ?? "unknown";
  const clientAddress = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : remoteAddress;

  return `ip:${clientAddress || "unknown"}`;
}

function hashIdentity(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizePositiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function getHeader(headers = {}, headerName) {
  const matchedHeaderName = Object.keys(headers).find((key) => {
    return key.toLowerCase() === headerName.toLowerCase();
  });

  return matchedHeaderName ? headers[matchedHeaderName] : undefined;
}

function pruneExpiredBuckets(buckets, currentTime) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= currentTime) {
      buckets.delete(key);
    }
  }
}
