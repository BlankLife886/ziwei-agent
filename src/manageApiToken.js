import {
  API_SCOPES,
  createApiTokenHash,
  createApiTokenSecret
} from "./agent/apiCredentials.js";

export function createApiCredentialBundle(options = {}) {
  const token = options.token ?? createApiTokenSecret();
  const credential = {
    id: options.id ?? buildDefaultCredentialId(),
    tokenHash: createApiTokenHash(token),
    scopes: normalizeScopes(options.scopes),
    disabled: false
  };

  if (options.notBefore) {
    credential.notBefore = options.notBefore;
  }

  if (options.expiresAt) {
    credential.expiresAt = options.expiresAt;
  }

  return {
    token,
    credential,
    env: {
      ZIWEI_API_CREDENTIALS: JSON.stringify([credential])
    },
    curlHeader: `authorization: Bearer ${token}`
  };
}

function normalizeScopes(scopes) {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return [API_SCOPES.REPORTS_WRITE];
  }

  return scopes.filter((scope) => {
    return typeof scope === "string" && scope.trim();
  }).map((scope) => {
    return scope.trim();
  });
}

function buildDefaultCredentialId() {
  return `app-client-${new Date().toISOString().slice(0, 10)}`;
}

function parseArgs(argv) {
  const options = {
    scopes: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--id") {
      options.id = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--scope") {
      options.scopes.push(requireValue(arg, next));
      index += 1;
      continue;
    }

    if (arg === "--not-before") {
      options.notBefore = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--expires-at") {
      options.expiresAt = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      return {
        help: true
      };
    }

    throw new Error(`未知参数：${arg}`);
  }

  return options;
}

function requireValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} 缺少参数值。`);
  }

  return value;
}

function printHelp() {
  console.log(`用法：node src/manageApiToken.js [options]

选项：
  --id <id>                  credential id，默认 app-client-YYYY-MM-DD
  --scope <scope>            可重复，默认 reports:write
  --not-before <iso-date>    可选生效时间
  --expires-at <iso-date>    可选过期时间

输出：
  token                      只给客户端保存的 bearer token
  credential.tokenHash       放进 ZIWEI_API_CREDENTIALS 的服务端 hash credential
`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
      printHelp();
    } else {
      console.log(JSON.stringify(createApiCredentialBundle(options), null, 2));
    }
  } catch (error) {
    console.error(`生成 API token 失败：${error.message}`);
    process.exitCode = 2;
  }
}
