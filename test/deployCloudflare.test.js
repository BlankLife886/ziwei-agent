import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCloudflareReleaseMetadata,
  buildWranglerDeployArgs
} from "../src/deployCloudflare.js";

test("buildCloudflareReleaseMetadata derives deploy-safe Cloudflare release metadata", () => {
  const release = buildCloudflareReleaseMetadata({
    gitHead: "abcdef1234567890abcdef1234567890abcdef12"
  });

  assert.equal(release.version, "0.1.0+abcdef1");
  assert.equal(release.commit, "abcdef1234567890abcdef1234567890abcdef12");
  assert.equal(release.source, "cloudflare-workers");
});

test("buildWranglerDeployArgs injects release metadata as Worker vars", () => {
  const args = buildWranglerDeployArgs({
    version: "0.1.0+abcdef1",
    commit: "abcdef1234567890abcdef1234567890abcdef12",
    source: "cloudflare-workers"
  }, ["--dry-run"]);

  assert.deepEqual(args, [
    "deploy",
    "--var",
    "ZIWEI_RELEASE_VERSION:0.1.0+abcdef1",
    "--var",
    "ZIWEI_RELEASE_COMMIT:abcdef1234567890abcdef1234567890abcdef12",
    "--var",
    "ZIWEI_RELEASE_SOURCE:cloudflare-workers",
    "--dry-run"
  ]);
});
