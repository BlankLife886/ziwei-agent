import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const API_SCOPES = {
  REPORTS_WRITE: "reports:write"
};

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
  const credentials = normalizeCredentials(options.credentials ?? []);

  return {
    authenticate({ headers = {}, requiredScope } = {}) {
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
        return safeTokenEquals(token, credential.token);
      });

      if (!matchedCredential) {
        return {
          status: "unauthorized",
          mode: "bearer",
          message: "缺少或错误的 bearer token。"
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

export function summarizeAuthResult(authResult) {
  return {
    status: authResult.status,
    mode: authResult.mode,
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
      return credential &&
        typeof credential.id === "string" &&
        credential.id.trim() &&
        typeof credential.token === "string" &&
        credential.token;
    })
    .map((credential) => {
      return {
        id: credential.id.trim(),
        token: credential.token,
        scopes: normalizeScopes(credential.scopes)
      };
    });
}

function isCredentialShape(credential) {
  const hasIdentity = credential &&
    typeof credential.id === "string" &&
    credential.id.trim() &&
    typeof credential.token === "string" &&
    credential.token;
  const hasValidScopes = credential?.scopes === undefined ||
    Array.isArray(credential.scopes);

  return Boolean(hasIdentity && hasValidScopes);
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
  const configuredHash = hashToken(configuredToken);

  return timingSafeEqual(providedHash, configuredHash);
}

function hashToken(token) {
  return createHash("sha256").update(token).digest();
}

function hasScope(scopes, requiredScope) {
  if (!requiredScope) {
    return true;
  }

  return scopes.includes("*") || scopes.includes(requiredScope);
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
