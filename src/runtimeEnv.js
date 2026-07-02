import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const MANAGED_SECRET_COMMAND_ENV = "ZIWEI_MANAGED_SECRET_COMMAND";
const MANAGED_SECRET_TIMEOUT_ENV = "ZIWEI_MANAGED_SECRET_TIMEOUT_MS";
const DEFAULT_MANAGED_SECRET_TIMEOUT_MS = 5_000;
const MANAGED_SECRET_MAX_OUTPUT_BYTES = 200_000;

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

  applyManagedSecretCommand({
    env: resolvedEnv,
    issues,
    secretSources
  });
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

function applyManagedSecretCommand({ env, issues, secretSources }) {
  const argv = parseManagedSecretCommand(env[MANAGED_SECRET_COMMAND_ENV], issues);

  if (!argv) {
    return;
  }

  const timeoutMs = parseManagedSecretTimeout(env[MANAGED_SECRET_TIMEOUT_ENV], issues);

  if (!timeoutMs) {
    return;
  }

  const result = spawnSync(argv[0], argv.slice(1), {
    encoding: "utf8",
    maxBuffer: MANAGED_SECRET_MAX_OUTPUT_BYTES,
    shell: false,
    timeout: timeoutMs
  });

  if (result.error) {
    issues.push(`${MANAGED_SECRET_COMMAND_ENV} 执行失败：${formatManagedSecretCommandError(result.error)}。`);
    return;
  }

  if (result.status !== 0) {
    issues.push(`${MANAGED_SECRET_COMMAND_ENV} 返回非零退出码：${result.status}。`);
    return;
  }

  const payload = parseManagedSecretPayload(result.stdout, issues);

  if (!payload) {
    return;
  }

  for (const [key, value] of Object.entries(payload)) {
    if (!RUNTIME_SECRET_KEYS.has(key)) {
      issues.push(`${MANAGED_SECRET_COMMAND_ENV} 返回不支持的键：${key}。`);
      continue;
    }

    applyResolvedEnvValue({
      env,
      key,
      value,
      source: "managed-secret-command",
      secretSources
    });
  }
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

function parseManagedSecretCommand(rawCommand, issues) {
  if (!hasConfiguredValue(rawCommand)) {
    return undefined;
  }

  try {
    const parsedCommand = JSON.parse(rawCommand);

    if (
      !Array.isArray(parsedCommand) ||
      parsedCommand.length === 0 ||
      !parsedCommand.every((item) => typeof item === "string" && item.length > 0)
    ) {
      issues.push(`${MANAGED_SECRET_COMMAND_ENV} 必须是非空 JSON 字符串数组。`);
      return undefined;
    }

    return parsedCommand;
  } catch {
    issues.push(`${MANAGED_SECRET_COMMAND_ENV} 必须是合法 JSON 字符串数组。`);
    return undefined;
  }
}

function parseManagedSecretTimeout(rawTimeout, issues) {
  if (!hasConfiguredValue(rawTimeout)) {
    return DEFAULT_MANAGED_SECRET_TIMEOUT_MS;
  }

  const timeoutMs = Number(rawTimeout);

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000) {
    issues.push(`${MANAGED_SECRET_TIMEOUT_ENV} 必须是 1 到 60000 之间的整数。`);
    return undefined;
  }

  return timeoutMs;
}

function parseManagedSecretPayload(stdout, issues) {
  const trimmedOutput = typeof stdout === "string" ? stdout.trim() : "";

  if (!trimmedOutput) {
    issues.push(`${MANAGED_SECRET_COMMAND_ENV} 没有返回 secret JSON。`);
    return undefined;
  }

  try {
    const parsedOutput = JSON.parse(trimmedOutput);
    const unwrappedOutput = unwrapManagedSecretOutput(parsedOutput);

    if (!isPlainObject(unwrappedOutput)) {
      issues.push(`${MANAGED_SECRET_COMMAND_ENV} 返回值必须能解析为 JSON object。`);
      return undefined;
    }

    return unwrappedOutput;
  } catch {
    issues.push(`${MANAGED_SECRET_COMMAND_ENV} 返回值必须是合法 JSON。`);
    return undefined;
  }
}

function unwrapManagedSecretOutput(value) {
  if (isPlainObject(value) && typeof value.SecretString === "string") {
    return parseNestedSecretString(value.SecretString);
  }

  if (isPlainObject(value) && typeof value.value === "string") {
    return parseNestedSecretString(value.value);
  }

  if (
    isPlainObject(value) &&
    isPlainObject(value.payload) &&
    typeof value.payload.data === "string"
  ) {
    return parseNestedSecretString(Buffer.from(value.payload.data, "base64").toString("utf8"));
  }

  return value;
}

function parseNestedSecretString(value) {
  return JSON.parse(value);
}

function formatManagedSecretCommandError(error) {
  if (error.code === "ETIMEDOUT") {
    return "超时";
  }

  if (error.code === "ENOBUFS") {
    return "输出超过限制";
  }

  return error.message;
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
