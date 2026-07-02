import { parseOptionalInteger } from "./runtimeOptions.js";

const DEFAULT_PORT = 3000;
const DEFAULT_MAX_REQUEST_BYTES = 100_000;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 60;
const OBSERVABILITY_MODES = new Set(["off", "stdout", undefined, ""]);
const REPORTS_WRITE_SCOPE = "reports:write";

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

  const credentialAudit = auditApiCredentialRuntime(env);
  issues.push(...credentialAudit.issues);

  if (!credentialAudit.hasActiveReportWriter) {
    issues.push("生产部署必须配置至少一个当前可用的 reports:write API credential。");
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

function auditApiCredentialRuntime(env) {
  const issues = [];

  if (env.NODE_ENV !== "production" && env.ZIWEI_REQUIRE_API_AUTH !== "true") {
    return {
      issues,
      hasActiveReportWriter: true
    };
  }

  if (env.ZIWEI_API_TOKEN) {
    return {
      issues,
      hasActiveReportWriter: true
    };
  }

  const credentialAudit = auditCredentialJson(env.ZIWEI_API_CREDENTIALS, Date.now());

  return {
    issues: credentialAudit.issues,
    hasActiveReportWriter: credentialAudit.hasActiveReportWriter
  };
}

function auditCredentialJson(rawValue, nowMs) {
  if (!rawValue) {
    return {
      issues: [],
      hasActiveReportWriter: false
    };
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue) || parsedValue.length === 0) {
      return {
        issues: ["ZIWEI_API_CREDENTIALS 必须是非空 JSON 数组。"],
        hasActiveReportWriter: false
      };
    }

    const issues = [];
    const validCredentials = parsedValue.filter((credential, index) => {
      return auditCredentialShape(credential, index, issues);
    });
    const hasActiveReportWriter = validCredentials.some((credential) => {
      return isReportWriter(credential) && isCredentialActive(credential, nowMs);
    });

    return {
      issues,
      hasActiveReportWriter
    };
  } catch {
    return {
      issues: ["ZIWEI_API_CREDENTIALS 必须是合法 JSON。"],
      hasActiveReportWriter: false
    };
  }
}

function auditCredentialShape(credential, index, issues) {
  const label = `ZIWEI_API_CREDENTIALS[${index}]`;
  const hasIdentity = credential &&
    typeof credential.id === "string" &&
    credential.id.trim() &&
    typeof credential.token === "string" &&
    credential.token &&
    Array.isArray(credential.scopes);

  if (!hasIdentity) {
    issues.push(`${label} 必须包含 id、token 和 scopes 数组。`);
    return false;
  }

  if (credential.disabled !== undefined && typeof credential.disabled !== "boolean") {
    issues.push(`${label}.disabled 必须是 boolean。`);
    return false;
  }

  if (!isOptionalDateString(credential.notBefore)) {
    issues.push(`${label}.notBefore 必须是可解析的日期字符串。`);
    return false;
  }

  if (!isOptionalDateString(credential.expiresAt)) {
    issues.push(`${label}.expiresAt 必须是可解析的日期字符串。`);
    return false;
  }

  return true;
}

function isReportWriter(credential) {
  return credential.scopes.includes("*") ||
    credential.scopes.includes(REPORTS_WRITE_SCOPE);
}

function isCredentialActive(credential, nowMs) {
  if (credential.disabled === true) {
    return false;
  }

  const notBeforeMs = parseOptionalTime(credential.notBefore);
  const expiresAtMs = parseOptionalTime(credential.expiresAt);

  if (Number.isFinite(notBeforeMs) && nowMs < notBeforeMs) {
    return false;
  }

  if (Number.isFinite(expiresAtMs) && nowMs >= expiresAtMs) {
    return false;
  }

  return true;
}

function isOptionalDateString(value) {
  if (value === undefined) {
    return true;
  }

  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  return Number.isFinite(Date.parse(value));
}

function parseOptionalTime(value) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  return Date.parse(value);
}
