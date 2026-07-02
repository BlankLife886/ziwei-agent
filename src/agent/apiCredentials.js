import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const API_SCOPES = {
  REPORTS_WRITE: "reports:write"
};

const TOKEN_HASH_PREFIX = "sha256:";
const TOKEN_HASH_PATTERN = /^sha256:[0-9a-f]{64}$/iu;

export function parseApiCredentialsFromRuntime({
  env = process.env,
  legacyApiToken
} = {}) {
  const credentials = [];
  const configuredCredentials = parseCredentialList(env.ZIWEI_API_CREDENTIALS);

  credentials.push(...configuredCredentials);

  const fallbackToken = legacyApiToken ?? env.ZIWEI_API_TOKEN;
  if (fallbackToken) {
    credentials.push({
      id: "legacy-token",
      token: fallbackToken,
      scopes: [API_SCOPES.REPORTS_WRITE]
    });
  }

  return credentials;
}

export function createApiAuthenticator(options = {}) {
  const configuredCredentials = Array.isArray(options.credentials) ? options.credentials : [];
  const credentials = normalizeCredentials(configuredCredentials);
  const invalidCredentialConfig = configuredCredentials.length > 0 && credentials.length === 0;
  const now = typeof options.now === "function" ? options.now : Date.now;

  return {
    authenticate({ headers = {}, requiredScope } = {}) {
      if (invalidCredentialConfig) {
        return {
          status: "unauthorized",
          mode: "bearer",
          reason: "invalid_credential_config",
          message: "API credential 配置不合法。"
        };
      }

      if (credentials.length === 0) {
        return {
          status: "allowed",
          mode: "disabled",
          principal: {
            id: "anonymous",
            scopes: ["*"]
          }
        };
      }

      const token = extractBearerToken(headers);

      if (!token) {
        return {
          status: "unauthorized",
          mode: "bearer",
          message: "缺少或错误的 bearer token。"
        };
      }

      const matchedCredential = credentials.find((credential) => {
        return safeTokenEquals(token, credential.tokenHash);
      });

      if (!matchedCredential) {
        return {
          status: "unauthorized",
          mode: "bearer",
          message: "缺少或错误的 bearer token。"
        };
      }

      if (!isCredentialActive(matchedCredential, now())) {
        return {
          status: "unauthorized",
          mode: "bearer",
          reason: "credential_inactive",
          message: "当前 token 已失效或尚未生效。"
        };
      }

      if (!hasScope(matchedCredential.scopes, requiredScope)) {
        return {
          status: "forbidden",
          mode: "bearer",
          principal: publicPrincipal(matchedCredential),
          message: "当前 token 没有访问该 API 的权限。"
        };
      }

      return {
        status: "allowed",
        mode: "bearer",
        principal: publicPrincipal(matchedCredential)
      };
    }
  };
}

export function createApiTokenSecret({ byteLength = 32 } = {}) {
  return `zwt_${randomBytes(byteLength).toString("base64url")}`;
}

export function createApiTokenHash(token) {
  return `${TOKEN_HASH_PREFIX}${hashTokenHex(token)}`;
}

export function summarizeAuthResult(authResult) {
  return {
    status: authResult.status,
    mode: authResult.mode,
    reason: authResult.reason,
    principalId: authResult.principal?.id,
    scopes: authResult.principal?.scopes
  };
}

function parseCredentialList(rawValue) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [createInvalidRuntimeCredential()];
    }

    if (!parsedValue.every(isCredentialShape)) {
      return [createInvalidRuntimeCredential()];
    }

    return parsedValue;
  } catch {
    return [createInvalidRuntimeCredential()];
  }
}

function createInvalidRuntimeCredential() {
  return {
    id: "invalid-runtime-credentials",
    token: randomBytes(32).toString("hex"),
    scopes: []
  };
}

function normalizeCredentials(credentials) {
  return credentials
    .filter((credential) => {
      const hasToken = typeof credential?.token === "string" && credential.token;
      const hasTokenHash = typeof credential?.tokenHash === "string" &&
        TOKEN_HASH_PATTERN.test(credential.tokenHash);

      return credential &&
        typeof credential.id === "string" &&
        credential.id.trim() &&
        (hasToken || hasTokenHash);
    })
    .map((credential) => {
      return {
        id: credential.id.trim(),
        tokenHash: normalizeTokenHash(credential),
        scopes: normalizeScopes(credential.scopes),
        disabled: credential.disabled === true,
        notBeforeMs: parseCredentialTime(credential.notBefore),
        expiresAtMs: parseCredentialTime(credential.expiresAt)
      };
    });
}

function isCredentialShape(credential) {
  const hasToken = typeof credential?.token === "string" && credential.token;
  const hasTokenHash = typeof credential?.tokenHash === "string" &&
    TOKEN_HASH_PATTERN.test(credential.tokenHash);
  const hasIdentity = credential &&
    typeof credential.id === "string" &&
    credential.id.trim() &&
    (hasToken || hasTokenHash);
  const hasValidScopes = credential?.scopes === undefined ||
    Array.isArray(credential.scopes);
  const hasValidLifecycle = credential?.disabled === undefined ||
    typeof credential.disabled === "boolean";
  const hasValidNotBefore = credential?.notBefore === undefined ||
    typeof credential.notBefore === "string";
  const hasValidExpiresAt = credential?.expiresAt === undefined ||
    typeof credential.expiresAt === "string";

  return Boolean(
    hasIdentity &&
    hasValidScopes &&
    hasValidLifecycle &&
    hasValidNotBefore &&
    hasValidExpiresAt
  );
}

function normalizeScopes(scopes) {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return [];
  }

  return scopes.filter((scope) => {
    return typeof scope === "string" && scope.trim();
  }).map((scope) => {
    return scope.trim();
  });
}

function extractBearerToken(headers) {
  const authorization = getHeader(headers, "authorization");
  const match = /^Bearer\s+(.+)$/iu.exec(String(authorization ?? ""));

  return match ? match[1] : undefined;
}

function safeTokenEquals(providedToken, configuredToken) {
  const providedHash = hashToken(providedToken);
  const configuredHash = Buffer.from(configuredToken.slice(TOKEN_HASH_PREFIX.length), "hex");

  return timingSafeEqual(providedHash, configuredHash);
}

function hashToken(token) {
  return createHash("sha256").update(token).digest();
}

function hashTokenHex(token) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeTokenHash(credential) {
  if (typeof credential.tokenHash === "string" && TOKEN_HASH_PATTERN.test(credential.tokenHash)) {
    return credential.tokenHash.toLowerCase();
  }

  return createApiTokenHash(credential.token);
}

function hasScope(scopes, requiredScope) {
  if (!requiredScope) {
    return true;
  }

  return scopes.includes("*") || scopes.includes(requiredScope);
}

function isCredentialActive(credential, nowMs) {
  if (credential.disabled) {
    return false;
  }

  if (Number.isNaN(credential.notBeforeMs) || Number.isNaN(credential.expiresAtMs)) {
    return false;
  }

  if (Number.isFinite(credential.notBeforeMs) && nowMs < credential.notBeforeMs) {
    return false;
  }

  if (Number.isFinite(credential.expiresAtMs) && nowMs >= credential.expiresAtMs) {
    return false;
  }

  return true;
}

function parseCredentialTime(value) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const parsedValue = Date.parse(value);

  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
}

function publicPrincipal(credential) {
  return {
    id: credential.id,
    scopes: credential.scopes
  };
}

function getHeader(headers = {}, headerName) {
  const matchedHeaderName = Object.keys(headers).find((key) => {
    return key.toLowerCase() === headerName.toLowerCase();
  });

  return matchedHeaderName ? headers[matchedHeaderName] : undefined;
}
