import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from "node:fs";
import { dirname } from "node:path";
export { createMemoryApiQuotaStore } from "./memoryApiQuotaStore.js";

export function createFileApiQuotaStore(options = {}) {
  const filePath = options.filePath;

  if (!filePath) {
    throw new Error("API quota store filePath is required.");
  }

  return {
    get(key) {
      return readBuckets(filePath)[key];
    },
    set(key, bucket) {
      const buckets = readBuckets(filePath);

      buckets[key] = bucket;
      writeBuckets(filePath, buckets);
    },
    prune(currentTime) {
      const buckets = readBuckets(filePath);
      const activeBuckets = Object.fromEntries(
        Object.entries(buckets).filter(([, bucket]) => {
          return bucket.resetAt > currentTime;
        })
      );

      writeBuckets(filePath, activeBuckets);
    },
    snapshot() {
      return readBuckets(filePath);
    }
  };
}

function readBuckets(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const rawStore = readFileSync(filePath, "utf8");
  const parsedStore = JSON.parse(rawStore);
  const rawBuckets = parsedStore && typeof parsedStore === "object"
    ? parsedStore.buckets
    : undefined;

  if (!rawBuckets || typeof rawBuckets !== "object" || Array.isArray(rawBuckets)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawBuckets).filter(([, bucket]) => {
      return isValidBucket(bucket);
    })
  );
}

function writeBuckets(filePath, buckets) {
  mkdirSync(dirname(filePath), {
    recursive: true
  });

  const tempPath = `${filePath}.tmp`;
  const payload = JSON.stringify({
    version: 1,
    buckets
  }, null, 2);

  writeFileSync(tempPath, `${payload}\n`, "utf8");
  renameSync(tempPath, filePath);
}

function isValidBucket(bucket) {
  return bucket &&
    Number.isInteger(bucket.count) &&
    bucket.count >= 0 &&
    Number.isInteger(bucket.resetAt) &&
    bucket.resetAt >= 0;
}
