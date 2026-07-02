import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { resolveRuntimeEnv } from "../src/runtimeEnv.js";
import { buildServerRuntimeConfig } from "../src/serverRuntimeConfig.js";
import { runApiSmokeCheck } from "../src/smokeApi.js";

test("resolveRuntimeEnv loads supported values from a runtime secrets JSON file", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ziwei-runtime-env-"));

  try {
    const secretsPath = join(tempDir, "secrets.json");
    await writeFile(secretsPath, JSON.stringify({
      ZIWEI_API_CREDENTIALS: [
        {
          id: "file-client",
          token: "file-secret",
          scopes: ["reports:write"]
        }
      ],
      ZIWEI_LLM_API_KEY: "llm-secret"
    }));

    const runtimeEnv = resolveRuntimeEnv({
      NODE_ENV: "production",
      ZIWEI_RUNTIME_SECRETS_FILE: secretsPath
    });
    const config = buildServerRuntimeConfig(runtimeEnv.env);

    assert.equal(runtimeEnv.status, "ready");
    assert.equal(config.status, "ready");
    assert.match(runtimeEnv.env.ZIWEI_API_CREDENTIALS, /file-client/u);
    assert.equal(runtimeEnv.env.ZIWEI_LLM_API_KEY, "llm-secret");
    assert.equal(runtimeEnv.secretSources.length, 2);
  } finally {
    await rm(tempDir, {
      force: true,
      recursive: true
    });
  }
});

test("resolveRuntimeEnv lets explicit env values override runtime secrets file values", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ziwei-runtime-env-"));

  try {
    const secretsPath = join(tempDir, "secrets.json");
    await writeFile(secretsPath, JSON.stringify({
      ZIWEI_API_TOKEN: "file-token"
    }));

    const runtimeEnv = resolveRuntimeEnv({
      ZIWEI_RUNTIME_SECRETS_FILE: secretsPath,
      ZIWEI_API_TOKEN: "direct-token"
    });

    assert.equal(runtimeEnv.status, "ready");
    assert.equal(runtimeEnv.env.ZIWEI_API_TOKEN, "direct-token");
    assert.equal(runtimeEnv.secretSources.length, 0);
  } finally {
    await rm(tempDir, {
      force: true,
      recursive: true
    });
  }
});

test("resolveRuntimeEnv loads managed secret command output without a shell", () => {
  const secretPayload = {
    SecretString: JSON.stringify({
      ZIWEI_API_CREDENTIALS: [
        {
          id: "managed-client",
          token: "managed-secret",
          scopes: ["reports:write"]
        }
      ],
      ZIWEI_LLM_API_KEY: "managed-model-secret"
    })
  };
  const command = JSON.stringify([
    process.execPath,
    "-e",
    `process.stdout.write(${JSON.stringify(JSON.stringify(secretPayload))})`
  ]);
  const runtimeEnv = resolveRuntimeEnv({
    NODE_ENV: "production",
    ZIWEI_MANAGED_SECRET_COMMAND: command
  });
  const config = buildServerRuntimeConfig(runtimeEnv.env);

  assert.equal(runtimeEnv.status, "ready");
  assert.equal(config.status, "ready");
  assert.match(runtimeEnv.env.ZIWEI_API_CREDENTIALS, /managed-client/u);
  assert.equal(runtimeEnv.env.ZIWEI_LLM_API_KEY, "managed-model-secret");
  assert.deepEqual(runtimeEnv.secretSources, [
    {
      name: "ZIWEI_API_CREDENTIALS",
      source: "managed-secret-command"
    },
    {
      name: "ZIWEI_LLM_API_KEY",
      source: "managed-secret-command"
    }
  ]);
});

test("resolveRuntimeEnv keeps direct env values ahead of managed secret command output", () => {
  const command = JSON.stringify([
    process.execPath,
    "-e",
    "process.stdout.write(JSON.stringify({ ZIWEI_API_TOKEN: 'managed-token' }))"
  ]);
  const runtimeEnv = resolveRuntimeEnv({
    ZIWEI_MANAGED_SECRET_COMMAND: command,
    ZIWEI_API_TOKEN: "direct-token"
  });

  assert.equal(runtimeEnv.status, "ready");
  assert.equal(runtimeEnv.env.ZIWEI_API_TOKEN, "direct-token");
  assert.equal(runtimeEnv.secretSources.length, 0);
});

test("resolveRuntimeEnv fails closed for invalid managed secret command output", () => {
  const command = JSON.stringify([
    process.execPath,
    "-e",
    "process.stdout.write(JSON.stringify({ UNSUPPORTED_SECRET: 'value' }))"
  ]);
  const runtimeEnv = resolveRuntimeEnv({
    NODE_ENV: "production",
    ZIWEI_MANAGED_SECRET_COMMAND: command
  });

  assert.equal(runtimeEnv.status, "invalid");
  assert.ok(runtimeEnv.issues.some((issue) => {
    return issue.includes("ZIWEI_MANAGED_SECRET_COMMAND 返回不支持的键");
  }));
});

test("resolveRuntimeEnv loads single secret values from *_FILE paths", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ziwei-runtime-env-"));

  try {
    const credentialsPath = join(tempDir, "api-credentials.json");
    await writeFile(credentialsPath, JSON.stringify([
      {
        id: "file-client",
        token: "file-secret",
        scopes: ["reports:write"]
      }
    ]));

    const runtimeEnv = resolveRuntimeEnv({
      NODE_ENV: "production",
      ZIWEI_API_CREDENTIALS_FILE: credentialsPath
    });
    const config = buildServerRuntimeConfig(runtimeEnv.env);

    assert.equal(runtimeEnv.status, "ready");
    assert.equal(config.status, "ready");
    assert.match(runtimeEnv.env.ZIWEI_API_CREDENTIALS, /file-client/u);
    assert.deepEqual(runtimeEnv.secretSources, [
      {
        name: "ZIWEI_API_CREDENTIALS",
        source: "ZIWEI_API_CREDENTIALS_FILE"
      }
    ]);
  } finally {
    await rm(tempDir, {
      force: true,
      recursive: true
    });
  }
});

test("resolveRuntimeEnv fails closed for malformed runtime secrets files", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ziwei-runtime-env-"));

  try {
    const secretsPath = join(tempDir, "bad-secrets.json");
    await writeFile(secretsPath, "{bad-json");

    const runtimeEnv = resolveRuntimeEnv({
      NODE_ENV: "production",
      ZIWEI_RUNTIME_SECRETS_FILE: secretsPath
    });

    assert.equal(runtimeEnv.status, "invalid");
    assert.ok(runtimeEnv.issues.some((issue) => {
      return issue.includes("ZIWEI_RUNTIME_SECRETS_FILE");
    }));
  } finally {
    await rm(tempDir, {
      force: true,
      recursive: true
    });
  }
});

test("runApiSmokeCheck uses resolved runtime secrets for bearer auth", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ziwei-runtime-env-"));

  try {
    const secretsPath = join(tempDir, "secrets.json");
    await writeFile(secretsPath, JSON.stringify({
      ZIWEI_API_CREDENTIALS: [
        {
          id: "smoke-client",
          token: "smoke-secret",
          scopes: ["reports:write"]
        }
      ]
    }));

    const result = await runApiSmokeCheck({
      env: {
        NODE_ENV: "production",
        ZIWEI_RUNTIME_SECRETS_FILE: secretsPath,
        ZIWEI_KNOWLEDGE_STORE: "data/knowledge-snippets.example.json"
      }
    });

    assert.equal(result.status, "ready");
    assert.equal(result.knowledgeSnippetCount, 10);
  } finally {
    await rm(tempDir, {
      force: true,
      recursive: true
    });
  }
});

test("runApiSmokeCheck supports hashed credentials with a smoke-only token", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "ziwei-runtime-env-"));

  try {
    const secretsPath = join(tempDir, "secrets.json");
    await writeFile(secretsPath, JSON.stringify({
      ZIWEI_API_CREDENTIALS: [
        {
          id: "smoke-hash-client",
          tokenHash: "sha256:930bbdc51b6aed5c2a5678fd6e28dee7a05e8a4b643cfc0b4427c3efb86c0d94",
          scopes: ["reports:write"]
        }
      ]
    }));

    const result = await runApiSmokeCheck({
      env: {
        NODE_ENV: "production",
        ZIWEI_RUNTIME_SECRETS_FILE: secretsPath,
        ZIWEI_API_SMOKE_TOKEN: "secret-token",
        ZIWEI_KNOWLEDGE_STORE: "data/knowledge-snippets.example.json"
      }
    });

    assert.equal(result.status, "ready");
    assert.equal(result.knowledgeSnippetCount, 10);
  } finally {
    await rm(tempDir, {
      force: true,
      recursive: true
    });
  }
});
