import { createHash } from "node:crypto";
import { createMemoryApiQuotaStore } from "./memoryApiQuotaStore.js";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 60;

export function createApiRateLimiter(options = {}) {
  const windowMs = normalizePositiveInteger(options.windowMs, DEFAULT_WINDOW_MS);
  const maxRequests = normalizePositiveInteger(options.maxRequests, DEFAULT_MAX_REQUESTS);
  const now = options.now ?? Date.now;
  const bucketStore = options.bucketStore ?? createMemoryApiQuotaStore();

  return {
    check(request) {
      const currentTime = now();
      const key = buildRateLimitKey(request);
      const bucketRead = readBucket(bucketStore, key);

      if (bucketRead.status !== "ready") {
        return quotaStoreBlockedResult({
          key,
          windowMs,
          maxRequests
        });
      }

      const bucket = bucketRead.bucket && bucketRead.bucket.resetAt > currentTime
        ? bucketRead.bucket
        : {
            count: 0,
            resetAt: currentTime + windowMs
          };

      bucket.count += 1;

      if (!writeBucket(bucketStore, key, bucket, currentTime)) {
        return quotaStoreBlockedResult({
          key,
          windowMs,
          maxRequests
        });
      }

      if (bucket.count > maxRequests) {
        return {
          status: "blocked",
          reason: "rate_limited",
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

function readBucket(bucketStore, key) {
  try {
    return {
      status: "ready",
      bucket: bucketStore.get(key)
    };
  } catch {
    return {
      status: "store_error"
    };
  }
}

function writeBucket(bucketStore, key, bucket, currentTime) {
  try {
    bucketStore.set(key, bucket);
    bucketStore.prune(currentTime);
    return true;
  } catch {
    return false;
  }
}

function quotaStoreBlockedResult({ key, windowMs, maxRequests }) {
  return {
    status: "blocked",
    reason: "quota_store_error",
    key,
    retryAfterMs: windowMs,
    limit: maxRequests,
    remaining: 0,
    resetAt: Date.now() + windowMs
  };
}
