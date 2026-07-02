import assert from "node:assert/strict";
import test from "node:test";
import { createApiCredentialBundle } from "../src/manageApiToken.js";

test("createApiCredentialBundle outputs a plaintext token and hashed server credential", () => {
  const bundle = createApiCredentialBundle({
    id: "app-client-2026-07",
    token: "secret-token",
    scopes: ["reports:write"],
    expiresAt: "2026-10-01T00:00:00Z"
  });

  assert.equal(bundle.token, "secret-token");
  assert.equal(bundle.credential.id, "app-client-2026-07");
  assert.equal(bundle.credential.token, undefined);
  assert.match(bundle.credential.tokenHash, /^sha256:[0-9a-f]{64}$/u);
  assert.deepEqual(bundle.credential.scopes, ["reports:write"]);
  assert.equal(bundle.credential.expiresAt, "2026-10-01T00:00:00Z");
  assert.equal(JSON.parse(bundle.env.ZIWEI_API_CREDENTIALS)[0].token, undefined);
  assert.equal(JSON.parse(bundle.env.ZIWEI_API_CREDENTIALS)[0].tokenHash, bundle.credential.tokenHash);
});
