export function createMemoryApiQuotaStore(initialBuckets = {}) {
  const buckets = new Map(Object.entries(initialBuckets));

  return {
    get(key) {
      return buckets.get(key);
    },
    set(key, bucket) {
      buckets.set(key, bucket);
    },
    prune(currentTime) {
      for (const [key, bucket] of buckets.entries()) {
        if (bucket.resetAt <= currentTime) {
          buckets.delete(key);
        }
      }
    },
    snapshot() {
      return Object.fromEntries(buckets.entries());
    }
  };
}
