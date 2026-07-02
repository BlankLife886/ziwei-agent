import { parseOptionalInteger } from "./runtimeOptions.js";

const DEFAULT_PORT = 3000;
const DEFAULT_MAX_REQUEST_BYTES = 100_000;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 60;
const OBSERVABILITY_MODES = new Set(["off", "stdout", undefined, ""]);

export function buildServerRuntimeConfig(env = process.env) {
  const issues = [];
  const port = parsePositiveIntegerEnv(env.PORT, {
    name: "PORT",
    fallback: DEFAULT_PORT,
    issues,
    max: 65_535
  });
  const maxBodyBytes = parsePositiveIntegerEnv(env.ZIWEI_API_MAX_BODY_BYTES, {
    name: "ZIWEI_API_MAX_BODY_BYTES",
    fallback: DEFAULT_MAX_REQUEST_BYTES,
    issues
  });
  const rateLimitWindowMs = parsePositiveIntegerEnv(env.ZIWEI_API_RATE_LIMIT_WINDOW_MS, {
    name: "ZIWEI_API_RATE_LIMIT_WINDOW_MS",
    fallback: DEFAULT_RATE_LIMIT_WINDOW_MS,
    issues
  });
  const rateLimitMaxRequests = parsePositiveIntegerEnv(env.ZIWEI_API_RATE_LIMIT_MAX, {
    name: "ZIWEI_API_RATE_LIMIT_MAX",
    fallback: DEFAULT_RATE_LIMIT_MAX,
    issues
  });
  const observabilityMode = env.ZIWEI_API_OBSERVABILITY || "off";

  if (!OBSERVABILITY_MODES.has(env.ZIWEI_API_OBSERVABILITY)) {
    issues.push("ZIWEI_API_OBSERVABILITY 只能为 stdout 或留空。");
  }

  if (!hasValidApiCredentialRuntime(env)) {
    issues.push("生产部署必须配置 ZIWEI_API_TOKEN 或合法的 ZIWEI_API_CREDENTIALS。");
  }

  return {
    status: issues.length === 0 ? "ready" : "invalid",
    issues,
    values: {
      port,
      maxBodyBytes,
      rateLimitWindowMs,
      rateLimitMaxRequests,
      observabilityMode,
      quotaStorePath: env.ZIWEI_API_QUOTA_STORE,
      knowledgeStorePath: env.ZIWEI_KNOWLEDGE_STORE
    }
  };
}

function parsePositiveIntegerEnv(value, { name, fallback, issues, max = Number.MAX_SAFE_INTEGER }) {
  const parsedValue = parseOptionalInteger(value);

  if (value === undefined || value === "") {
    return fallback;
  }

  if (parsedValue === undefined || parsedValue <= 0 || parsedValue > max) {
    issues.push(`${name} 必须是 1 到 ${max} 之间的整数。`);
    return fallback;
  }

  return parsedValue;
}

function hasValidApiCredentialRuntime(env) {
  if (env.NODE_ENV !== "production" && env.ZIWEI_REQUIRE_API_AUTH !== "true") {
    return true;
  }

  if (env.ZIWEI_API_TOKEN) {
    return true;
  }

  return hasValidCredentialJson(env.ZIWEI_API_CREDENTIALS);
}

function hasValidCredentialJson(rawValue) {
  if (!rawValue) {
    return false;
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    return Array.isArray(parsedValue) &&
      parsedValue.length > 0 &&
      parsedValue.every((credential) => {
        return credential &&
          typeof credential.id === "string" &&
          credential.id.trim() &&
          typeof credential.token === "string" &&
          credential.token &&
          Array.isArray(credential.scopes);
      }) &&
      parsedValue.some((credential) => {
        return credential.scopes.includes("*") ||
          credential.scopes.includes("reports:write");
      });
  } catch {
    return false;
  }
}
