import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("docker compose deployment wires runtime secrets, quota state, and liveness", async () => {
  const compose = await readFile("deploy/docker-compose.yml", "utf8");

  assert.match(compose, /ZIWEI_RUNTIME_SECRETS_FILE:\s+\/run\/secrets\/ziwei_runtime/u);
  assert.match(compose, /ZIWEI_API_QUOTA_STORE:\s+\/app\/\.runtime\/api-quota\.json/u);
  assert.match(compose, /ZIWEI_RELEASE_VERSION:\s+\$\{ZIWEI_RELEASE_VERSION:-development\}/u);
  assert.match(compose, /ZIWEI_RELEASE_SUMMARY_PATH:\s+\/app\/\.runtime\/release-summary\.json/u);
  assert.match(compose, /ziwei-runtime:\/app\/\.runtime/u);
  assert.match(compose, /runtime-secrets\.example\.json/u);
  assert.match(compose, /\/health/u);
});

test("kubernetes deployment wires liveness, readiness, secrets, and runtime state", async () => {
  const manifest = await readFile("deploy/kubernetes.yml", "utf8");

  assert.match(manifest, /kind:\s+Secret/u);
  assert.match(manifest, /ZIWEI_RUNTIME_SECRETS_FILE/u);
  assert.match(manifest, /path:\s+\/health/u);
  assert.match(manifest, /path:\s+\/ready/u);
  assert.match(manifest, /terminationGracePeriodSeconds:\s+30/u);
  assert.match(manifest, /persistentVolumeClaim/u);
  assert.match(manifest, /ZIWEI_API_QUOTA_STORE/u);
  assert.match(manifest, /ZIWEI_RELEASE_VERSION/u);
  assert.match(manifest, /ZIWEI_RELEASE_SUMMARY_PATH/u);
});

test("docker image accepts release metadata build arguments", async () => {
  const dockerfile = await readFile("Dockerfile", "utf8");

  assert.match(dockerfile, /ARG ZIWEI_RELEASE_VERSION/u);
  assert.match(dockerfile, /ARG ZIWEI_RELEASE_COMMIT/u);
  assert.match(dockerfile, /ENV ZIWEI_RELEASE_VERSION=\$ZIWEI_RELEASE_VERSION/u);
});

test("runtime secret example keeps credentials in the supported JSON shape", async () => {
  const rawSecret = await readFile("deploy/runtime-secrets.example.json", "utf8");
  const parsedSecret = JSON.parse(rawSecret);

  assert.ok(Array.isArray(parsedSecret.ZIWEI_API_CREDENTIALS));
  assert.equal(parsedSecret.ZIWEI_API_CREDENTIALS[0].id, "app-client");
  assert.deepEqual(parsedSecret.ZIWEI_API_CREDENTIALS[0].scopes, ["reports:write"]);
  assert.equal(typeof parsedSecret.ZIWEI_LLM_API_KEY, "string");
});

test("cloudflare deployment wires Worker entry, assets, and Node compatibility", async () => {
  const wrangler = await readFile("wrangler.toml", "utf8");
  const worker = await readFile("src/cloudflareWorker.js", "utf8");
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  assert.match(wrangler, /main = "src\/cloudflareWorker\.js"/u);
  assert.match(wrangler, /compatibility_flags = \["nodejs_compat"\]/u);
  assert.match(wrangler, /\[assets\]/u);
  assert.match(wrangler, /binding = "ASSETS"/u);
  assert.match(worker, /handleZiweiApiRequest/u);
  assert.match(worker, /buildChart -> runZiweiPipelineAsync -> reportAuditor -> reportPublisher/u);
  assert.equal(packageJson.scripts["deploy:cloudflare"], "wrangler deploy");
  assert.equal(packageJson.scripts["validate:cloudflare"], "node src/validateCloudflare.js");
});
