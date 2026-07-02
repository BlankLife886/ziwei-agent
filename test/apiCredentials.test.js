import assert from "node:assert/strict";
import test from "node:test";
import {
  API_SCOPES,
  createApiAuthenticator,
  createApiTokenHash,
  parseApiCredentialsFromRuntime,
  summarizeAuthResult
} from "../src/agent/apiCredentials.js";

test("parseApiCredentialsFromRuntime supports JSON credentials and legacy token fallback", () => {
  const credentials = parseApiCredentialsFromRuntime({
    env: {
      ZIWEI_API_CREDENTIALS: JSON.stringify([
        {
          id: "reader",
          token: "reader-token",
          scopes: ["reports:read"]
        }
      ])
    },
    legacyApiToken: "legacy-token"
  });

  assert.equal(credentials.length, 2);
  assert.deepEqual(credentials.map((credential) => credential.id), [
    "reader",
    "legacy-token"
  ]);
  assert.deepEqual(credentials[1].scopes, [API_SCOPES.REPORTS_WRITE]);
});

test("parseApiCredentialsFromRuntime fails closed for malformed credential config", () => {
  const credentials = parseApiCredentialsFromRuntime({
    env: {
      ZIWEI_API_CREDENTIALS: "{not-json"
    }
  });
  const authenticator = createApiAuthenticator({
    credentials
  });

  const result = authenticator.authenticate({
    headers: {
      authorization: "Bearer any-token"
    },
    requiredScope: API_SCOPES.REPORTS_WRITE
  });

  assert.equal(credentials.length, 1);
  assert.equal(result.status, "unauthorized");
});

test("parseApiCredentialsFromRuntime fails closed for invalid credential entries", () => {
  const credentials = parseApiCredentialsFromRuntime({
    env: {
      ZIWEI_API_CREDENTIALS: JSON.stringify([
        {
          id: "missing-token",
          scopes: [API_SCOPES.REPORTS_WRITE]
        }
      ])
    }
  });
  const authenticator = createApiAuthenticator({
    credentials
  });

  const result = authenticator.authenticate({
    headers: {
      authorization: "Bearer any-token"
    },
    requiredScope: API_SCOPES.REPORTS_WRITE
  });

  assert.equal(credentials.length, 1);
  assert.equal(result.status, "unauthorized");
});

test("createApiAuthenticator fails closed for explicit invalid credential lists", () => {
  const authenticator = createApiAuthenticator({
    credentials: [
      {
        id: "invalid-hash",
        tokenHash: "sha256:not-a-valid-hash",
        scopes: [API_SCOPES.REPORTS_WRITE]
      }
    ]
  });

  const result = authenticator.authenticate({
    headers: {
      authorization: "Bearer any-token"
    },
    requiredScope: API_SCOPES.REPORTS_WRITE
  });

  assert.equal(result.status, "unauthorized");
  assert.equal(result.reason, "invalid_credential_config");
});

test("createApiAuthenticator allows matching scoped credentials without exposing tokens", () => {
  const authenticator = createApiAuthenticator({
    credentials: [
      {
        id: "report-writer",
        token: "secret-token",
        scopes: [API_SCOPES.REPORTS_WRITE]
      }
    ]
  });

  const result = authenticator.authenticate({
    headers: {
      authorization: "Bearer secret-token"
    },
    requiredScope: API_SCOPES.REPORTS_WRITE
  });
  const summary = summarizeAuthResult(result);

  assert.equal(result.status, "allowed");
  assert.equal(summary.principalId, "report-writer");
  assert.deepEqual(summary.scopes, [API_SCOPES.REPORTS_WRITE]);
  assert.equal(JSON.stringify(summary).includes("secret-token"), false);
});

test("createApiAuthenticator supports hashed credentials without storing plaintext tokens", () => {
  const tokenHash = createApiTokenHash("secret-token");
  const authenticator = createApiAuthenticator({
    credentials: [
      {
        id: "hashed-report-writer",
        tokenHash,
        scopes: [API_SCOPES.REPORTS_WRITE]
      }
    ]
  });

  const result = authenticator.authenticate({
    headers: {
      authorization: "Bearer secret-token"
    },
    requiredScope: API_SCOPES.REPORTS_WRITE
  });
  const summary = summarizeAuthResult(result);

  assert.equal(result.status, "allowed");
  assert.equal(summary.principalId, "hashed-report-writer");
  assert.equal(JSON.stringify(summary).includes("secret-token"), false);
  assert.equal(JSON.stringify(summary).includes(tokenHash), false);
});

test("createApiAuthenticator blocks missing, invalid, and underscoped tokens", () => {
  const authenticator = createApiAuthenticator({
    credentials: [
      {
        id: "health-only",
        token: "health-token",
        scopes: ["health:read"]
      }
    ]
  });

  assert.equal(
    authenticator.authenticate({
      headers: {},
      requiredScope: API_SCOPES.REPORTS_WRITE
    }).status,
    "unauthorized"
  );
  assert.equal(
    authenticator.authenticate({
      headers: {
        authorization: "Bearer wrong-token"
      },
      requiredScope: API_SCOPES.REPORTS_WRITE
    }).status,
    "unauthorized"
  );
  assert.equal(
    authenticator.authenticate({
      headers: {
        authorization: "Bearer health-token"
      },
      requiredScope: API_SCOPES.REPORTS_WRITE
    }).status,
    "forbidden"
  );
});

test("createApiAuthenticator enforces credential lifecycle windows", () => {
  const authenticator = createApiAuthenticator({
    now: () => Date.parse("2026-07-02T00:00:00Z"),
    credentials: [
      {
        id: "disabled",
        token: "disabled-token",
        scopes: [API_SCOPES.REPORTS_WRITE],
        disabled: true
      },
      {
        id: "expired",
        token: "expired-token",
        scopes: [API_SCOPES.REPORTS_WRITE],
        expiresAt: "2026-07-01T00:00:00Z"
      },
      {
        id: "future",
        token: "future-token",
        scopes: [API_SCOPES.REPORTS_WRITE],
        notBefore: "2026-07-03T00:00:00Z"
      },
      {
        id: "bad-date",
        token: "bad-date-token",
        scopes: [API_SCOPES.REPORTS_WRITE],
        expiresAt: "not-a-date"
      },
      {
        id: "active",
        token: "active-token",
        scopes: [API_SCOPES.REPORTS_WRITE],
        notBefore: "2026-07-01T00:00:00Z",
        expiresAt: "2026-07-03T00:00:00Z"
      }
    ]
  });

  for (const token of [
    "disabled-token",
    "expired-token",
    "future-token",
    "bad-date-token"
  ]) {
    const result = authenticator.authenticate({
      headers: {
        authorization: `Bearer ${token}`
      },
      requiredScope: API_SCOPES.REPORTS_WRITE
    });

    assert.equal(result.status, "unauthorized");
    assert.equal(result.reason, "credential_inactive");
  }

  assert.equal(
    authenticator.authenticate({
      headers: {
        authorization: "Bearer active-token"
      },
      requiredScope: API_SCOPES.REPORTS_WRITE
    }).status,
    "allowed"
  );
});

test("createApiAuthenticator allows anonymous access when credentials are not configured", () => {
  const authenticator = createApiAuthenticator();
  const result = authenticator.authenticate({
    headers: {},
    requiredScope: API_SCOPES.REPORTS_WRITE
  });

  assert.equal(result.status, "allowed");
  assert.equal(result.mode, "disabled");
  assert.equal(result.principal.id, "anonymous");
});
