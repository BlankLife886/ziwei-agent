import { readFileSync } from "node:fs";

const RUNTIME_SECRET_KEYS = new Set([
  "ZIWEI_API_CREDENTIALS",
  "ZIWEI_API_TOKEN",
  "ZIWEI_REPORT_PROVIDER",
  "ZIWEI_LLM_ENDPOINT",
  "ZIWEI_LLM_API_KEY",
  "ZIWEI_LLM_MODEL",
  "ZIWEI_LLM_PROVIDER_ID",
  "ZIWEI_LLM_TIMEOUT_MS",
  "ZIWEI_LLM_RETRY_COUNT",
  "ZIWEI_LLM_MAX_RESPONSE_BYTES",
  "ZIWEI_KNOWLEDGE_STORE",
  "ZIWEI_API_QUOTA_STORE"
]);

const FILE_BACKED_SECRETS = [
  {
    fileEnvName: "ZIWEI_API_CREDENTIALS_FILE",
    targetEnvName: "ZIWEI_API_CREDENTIALS"
  },
  {
    fileEnvName: "ZIWEI_API_TOKEN_FILE",
    targetEnvName: "ZIWEI_API_TOKEN"
  },
  {
    fileEnvName: "ZIWEI_LLM_API_KEY_FILE",
    targetEnvName: "ZIWEI_LLM_API_KEY"
  }
];

export function resolveRuntimeEnv(env = process.env) {
  // 启动边界只汇合配置来源，不校验业务含义；后续仍交给
  // serverRuntimeConfig、authenticator 和 provider 合同逐层审计。
  const resolvedEnv = { ...env };
  const issues = [];
  const secretSources = [];

  applyRuntimeSecretsFile({
    env: resolvedEnv,
    issues,
    secretSources
  });
  applyFileBackedSecrets({
    env: resolvedEnv,
    issues,
    secretSources
  });

  return {
    status: issues.length === 0 ? "ready" : "invalid",
    env: resolvedEnv,
    issues,
    secretSources
  };
}

function applyRuntimeSecretsFile({ env, issues, secretSources }) {
  const filePath = normalizeOptionalPath(env.ZIWEI_RUNTIME_SECRETS_FILE);

  if (!filePath) {
    return;
  }

  const loaded = readJsonFile(filePath, "ZIWEI_RUNTIME_SECRETS_FILE", issues);

  if (!loaded) {
    return;
  }

  if (!isPlainObject(loaded)) {
    issues.push("ZIWEI_RUNTIME_SECRETS_FILE 必须是 JSON object。");
    return;
  }

  for (const [key, value] of Object.entries(loaded)) {
    // secret JSON 只允许白名单运行时键，避免挂载错文件后把任意字段
    // 静默带进服务进程。
    if (!RUNTIME_SECRET_KEYS.has(key)) {
      issues.push(`ZIWEI_RUNTIME_SECRETS_FILE 包含不支持的键：${key}。`);
      continue;
    }

    applyResolvedEnvValue({
      env,
      key,
      value,
      source: "runtime-secrets-file",
      secretSources
    });
  }
}

function applyFileBackedSecrets({ env, issues, secretSources }) {
  for (const secret of FILE_BACKED_SECRETS) {
    const filePath = normalizeOptionalPath(env[secret.fileEnvName]);

    // 显式环境变量优先，便于临时回滚或平台级覆盖；文件只补齐缺失值。
    if (!filePath || hasConfiguredValue(env[secret.targetEnvName])) {
      continue;
    }

    try {
      const fileValue = readFileSync(filePath, "utf8").trim();

      if (!fileValue) {
        issues.push(`${secret.fileEnvName} 指向的文件内容不能为空。`);
        continue;
      }

      env[secret.targetEnvName] = fileValue;
      secretSources.push({
        name: secret.targetEnvName,
        source: secret.fileEnvName
      });
    } catch (error) {
      issues.push(`${secret.fileEnvName} 无法读取：${error.message}`);
    }
  }
}

function applyResolvedEnvValue({ env, key, value, source, secretSources }) {
  // JSON secret 文件同样只补齐缺失值，不覆盖调用者已经显式提供的配置。
  if (hasConfiguredValue(env[key])) {
    return;
  }

  if (value === undefined || value === null) {
    return;
  }

  if (typeof value === "string") {
    env[key] = value;
  } else if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    Array.isArray(value) ||
    isPlainObject(value)
  ) {
    env[key] = typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : JSON.stringify(value);
  } else {
    return;
  }

  secretSources.push({
    name: key,
    source
  });
}

function readJsonFile(filePath, envName, issues) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    issues.push(`${envName} 无法读取或解析：${error.message}`);
    return undefined;
  }
}

function normalizeOptionalPath(value) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  return value.trim();
}

function hasConfiguredValue(value) {
  return typeof value === "string" && value.length > 0;
}

function isPlainObject(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);
}
