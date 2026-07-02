import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import {
  createApiAuthenticator,
  parseApiCredentialsFromRuntime
} from "./agent/apiCredentials.js";
import { createApiObserver } from "./agent/apiObservability.js";
import { createFileApiQuotaStore } from "./agent/apiQuotaStore.js";
import { createApiRateLimiter } from "./agent/apiRateLimiter.js";
import { loadKnowledgeSnippetStore } from "./agent/knowledgeSnippetStore.js";
import { handleZiweiApiRequest } from "./agent/ziweiApiHandler.js";
import { REPORT_GENERATOR_IDS } from "./agent/reportGenerator.js";
import { parseOptionalInteger } from "./runtimeOptions.js";
import { resolveRuntimeEnv } from "./runtimeEnv.js";
import { buildServerRuntimeConfig } from "./serverRuntimeConfig.js";

const DEFAULT_PORT = 3000;
const DEFAULT_MAX_REQUEST_BYTES = 100_000;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 60;
const STATIC_ASSETS = new Map([
  ["/", {
    fileUrl: new URL("../public/index.html", import.meta.url),
    contentType: "text/html; charset=utf-8"
  }],
  ["/index.html", {
    fileUrl: new URL("../public/index.html", import.meta.url),
    contentType: "text/html; charset=utf-8"
  }],
  ["/styles.css", {
    fileUrl: new URL("../public/styles.css", import.meta.url),
    contentType: "text/css; charset=utf-8"
  }],
  ["/app.js", {
    fileUrl: new URL("../public/app.js", import.meta.url),
    contentType: "text/javascript; charset=utf-8"
  }]
]);

export function createZiweiHttpServer(options = {}) {
  const env = options.env ?? process.env;
  const authenticator = options.authenticator ?? createApiAuthenticator({
    credentials: options.apiCredentials ?? parseApiCredentialsFromRuntime({
      env,
      legacyApiToken: options.apiToken
    })
  });
  const observer = options.observer ?? createApiObserver({
    mode: options.observabilityMode ?? env.ZIWEI_API_OBSERVABILITY,
    logger: options.logger
  });
  const rateLimiter = options.rateLimiter ?? createApiRateLimiter({
    windowMs: options.rateLimitWindowMs ??
      parseOptionalInteger(env.ZIWEI_API_RATE_LIMIT_WINDOW_MS) ??
      DEFAULT_RATE_LIMIT_WINDOW_MS,
    maxRequests: options.rateLimitMaxRequests ??
      parseOptionalInteger(env.ZIWEI_API_RATE_LIMIT_MAX) ??
      DEFAULT_RATE_LIMIT_MAX,
    bucketStore: options.quotaStore ?? createQuotaStoreFromRuntime(env)
  });

  return createServer(async (request, response) => {
    const startedAt = Date.now();
    const requestId = createRequestId();
    const method = String(request.method ?? "GET").toUpperCase();
    const path = request.url ?? "/";

    emitApiEvent(observer, {
      type: "api.request.started",
      requestId,
      method,
      path,
      headers: request.headers
    });

    try {
      if (isHealthRequest(method, path)) {
        const apiResponse = createHealthResponse({
          requestId,
          method,
          knowledgeSnippetCount: options.knowledgeSnippets?.length ?? 0
        });

        emitApiEvent(observer, {
          type: "api.request.completed",
          requestId,
          method,
          path,
          statusCode: apiResponse.statusCode,
          durationMs: Date.now() - startedAt,
          responseStatus: apiResponse.body?.status
        });
        writeJsonResponse(response, apiResponse, requestId);
        return;
      }

      if (isReadyRequest(method, path)) {
        const apiResponse = createReadyResponse({
          requestId,
          method,
          env,
          knowledgeSnippetCount: options.knowledgeSnippets?.length ?? 0,
          knowledgeStoreStatus: options.knowledgeStoreStatus,
          knowledgeStoreIssues: options.knowledgeStoreIssues
        });

        emitApiEvent(observer, {
          type: "api.request.completed",
          requestId,
          method,
          path,
          statusCode: apiResponse.statusCode,
          durationMs: Date.now() - startedAt,
          responseStatus: apiResponse.body?.status
        });
        writeJsonResponse(response, apiResponse, requestId);
        return;
      }

      if (isStaticAssetRequest(method, path)) {
        const apiResponse = await createStaticAssetResponse({
          method,
          path
        });

        emitApiEvent(observer, {
          type: "api.request.completed",
          requestId,
          method,
          path,
          statusCode: apiResponse.statusCode,
          durationMs: Date.now() - startedAt,
          responseStatus: "static"
        });
        writeRawResponse(response, apiResponse, requestId);
        return;
      }

      const rateLimit = rateLimiter.check({
        headers: request.headers,
        remoteAddress: request.socket.remoteAddress
      });

      if (rateLimit.status === "blocked") {
        const apiResponse = {
          statusCode: 429,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "retry-after": String(Math.ceil(rateLimit.retryAfterMs / 1000))
          },
          body: {
            status: "rate_limited",
            requestId,
            messages: ["请求过于频繁。"],
            retryAfterMs: rateLimit.retryAfterMs
          }
        };

        emitApiEvent(observer, {
          type: "api.request.blocked",
          requestId,
          method,
          path,
          statusCode: apiResponse.statusCode,
          durationMs: Date.now() - startedAt,
          reason: "rate_limited",
          rateLimit: summarizeRateLimit(rateLimit)
        });
        writeJsonResponse(response, apiResponse, requestId);
        return;
      }

      const bodyRead = await readRequestBody(request, {
        maxBodyBytes: options.maxBodyBytes ?? DEFAULT_MAX_REQUEST_BYTES
      });

      if (bodyRead.status !== "ready") {
        const apiResponse = {
          statusCode: bodyRead.statusCode,
          headers: {
            "content-type": "application/json; charset=utf-8"
          },
          body: {
            status: bodyRead.status,
            requestId,
            messages: bodyRead.messages
          }
        };

        emitApiEvent(observer, {
          type: "api.request.blocked",
          requestId,
          method,
          path,
          statusCode: apiResponse.statusCode,
          durationMs: Date.now() - startedAt,
          reason: bodyRead.status
        });
        writeJsonResponse(response, apiResponse, requestId);
        return;
      }

      const apiResponse = await handleZiweiApiRequest({
        method: request.method,
        path: request.url,
        headers: request.headers,
        body: bodyRead.body
      }, {
        env,
        authenticator,
        knowledgeSnippets: options.knowledgeSnippets,
        maxBodyBytes: options.maxBodyBytes ?? DEFAULT_MAX_REQUEST_BYTES,
        requestId
      });

      emitApiEvent(observer, {
        type: "api.request.completed",
        requestId,
        method,
        path,
        statusCode: apiResponse.statusCode,
        durationMs: Date.now() - startedAt,
        responseStatus: apiResponse.body?.status,
        diagnostics: summarizeDiagnostics(apiResponse.body?.diagnostics),
        rateLimit: summarizeRateLimit(rateLimit)
      });
      writeJsonResponse(response, apiResponse, requestId);
    } catch {
      const apiResponse = {
        statusCode: 500,
        headers: {
          "content-type": "application/json; charset=utf-8"
        },
        body: {
          status: "internal_error",
          requestId,
          messages: ["API 处理失败。"]
        }
      };

      emitApiEvent(observer, {
        type: "api.request.failed",
        requestId,
        method,
        path,
        statusCode: apiResponse.statusCode,
        durationMs: Date.now() - startedAt,
        reason: "internal_error"
      });
      writeJsonResponse(response, apiResponse, requestId);
    }
  });
}

async function main() {
  const runtimeEnv = resolveRuntimeEnv(process.env);
  const env = runtimeEnv.env;
  const runtimeConfig = buildServerRuntimeConfig(env);
  const runtimeIssues = [
    ...runtimeEnv.issues,
    ...runtimeConfig.issues
  ];

  if (runtimeEnv.status !== "ready" || runtimeConfig.status !== "ready") {
    for (const issue of runtimeIssues) {
      console.error(`Runtime config error: ${issue}`);
    }
    process.exitCode = 2;
    return;
  }

  const knowledgeStore = env.ZIWEI_KNOWLEDGE_STORE
    ? await loadKnowledgeSnippetStore(env.ZIWEI_KNOWLEDGE_STORE)
    : { snippets: [] };

  if (env.ZIWEI_KNOWLEDGE_STORE && knowledgeStore.status !== "ready") {
    for (const issue of knowledgeStore.issues ?? []) {
      const message = issue.snippetId
        ? `${issue.snippetId}: ${issue.message}`
        : issue.message;
      console.error(`Knowledge store error: ${message}`);
    }
    process.exitCode = 2;
    return;
  }

  const port = runtimeConfig.values.port;
  const maxBodyBytes = runtimeConfig.values.maxBodyBytes;
  const server = createZiweiHttpServer({
    env,
    knowledgeSnippets: knowledgeStore.snippets,
    knowledgeStoreStatus: knowledgeStore.status,
    knowledgeStoreIssues: knowledgeStore.issues,
    maxBodyBytes
  });

  server.listen(port, () => {
    console.log(`Ziwei Agent API listening on http://localhost:${port}`);
  });
}

function readRequestBody(request, { maxBodyBytes }) {
  return new Promise((resolve) => {
    const chunks = [];
    let bodyBytes = 0;
    let tooLarge = false;

    request.on("data", (chunk) => {
      bodyBytes += chunk.length;

      if (bodyBytes > maxBodyBytes) {
        tooLarge = true;
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => {
      if (tooLarge) {
        resolve({
          status: "payload_too_large",
          statusCode: 413,
          messages: [`请求体超过大小限制：${bodyBytes}/${maxBodyBytes} bytes。`]
        });
        return;
      }

      resolve({
        status: "ready",
        body: Buffer.concat(chunks).toString("utf8")
      });
    });

    request.on("error", () => {
      resolve({
        status: "request_error",
        statusCode: 400,
        messages: ["读取请求体失败。"]
      });
    });
  });
}

function writeJsonResponse(response, apiResponse, requestId) {
  response.writeHead(apiResponse.statusCode, {
    ...apiResponse.headers,
    "x-request-id": requestId
  });
  response.end(JSON.stringify(apiResponse.body));
}

function writeRawResponse(response, apiResponse, requestId) {
  response.writeHead(apiResponse.statusCode, {
    ...apiResponse.headers,
    "x-request-id": requestId
  });
  response.end(apiResponse.body);
}

function emitApiEvent(observer, event) {
  if (!observer?.emit) {
    return;
  }

  try {
    observer.emit(event);
  } catch {
    // Observability must never block the agent request path.
  }
}

function summarizeDiagnostics(diagnostics) {
  if (!diagnostics) {
    return undefined;
  }

  return {
    durationMs: diagnostics.durationMs,
    authorization: diagnostics.authorization,
    buildStatus: diagnostics.buildStatus,
    reportPlanStatus: diagnostics.reportPlanStatus,
    reportGenerationStatus: diagnostics.reportGenerationStatus,
    reportOutputStatus: diagnostics.reportOutputStatus
  };
}

function summarizeRateLimit(rateLimit) {
  return {
    status: rateLimit.status,
    reason: rateLimit.reason,
    limit: rateLimit.limit,
    remaining: rateLimit.remaining,
    retryAfterMs: rateLimit.retryAfterMs
  };
}

function isHealthRequest(method, path) {
  return (method === "GET" || method === "HEAD") &&
    normalizeRequestPath(path) === "/health";
}

function isReadyRequest(method, path) {
  return (method === "GET" || method === "HEAD") &&
    normalizeRequestPath(path) === "/ready";
}

function createHealthResponse({ requestId, method, knowledgeSnippetCount }) {
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    },
    body: method === "HEAD"
      ? undefined
      : {
        status: "ok",
        service: "ziwei-agent",
        requestId,
        checks: {
          http: "ok",
          agentEntry: "ready",
          knowledgeSnippetCount
        }
      }
  };
}

function createReadyResponse({
  requestId,
  method,
  env,
  knowledgeSnippetCount,
  knowledgeStoreStatus,
  knowledgeStoreIssues
}) {
  const reportProvider = buildReportProviderReadiness(env);
  const knowledge = {
    status: knowledgeStoreStatus ?? "ready",
    count: knowledgeSnippetCount,
    issues: summarizeKnowledgeStoreIssues(knowledgeStoreIssues)
  };
  const checks = {
    runtime: {
      status: "ready"
    },
    agentEntry: {
      status: "ready",
      pipeline: "buildChart -> runZiweiPipelineAsync -> reportAuditor -> reportPublisher"
    },
    knowledge,
    reportProvider
  };
  const ready = Object.values(checks).every((check) => {
    return check.status === "ready";
  });

  return {
    statusCode: ready ? 200 : 503,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    },
    body: method === "HEAD"
      ? undefined
      : {
        status: ready ? "ready" : "not_ready",
        service: "ziwei-agent",
        requestId,
        checks
      }
  };
}

function buildReportProviderReadiness(env) {
  const providerId = env.ZIWEI_REPORT_PROVIDER || REPORT_GENERATOR_IDS.DETERMINISTIC_TEMPLATE;

  if (providerId === REPORT_GENERATOR_IDS.DETERMINISTIC_TEMPLATE) {
    return {
      status: "ready",
      providerId,
      mode: "deterministic"
    };
  }

  if (providerId === REPORT_GENERATOR_IDS.EXTERNAL_LLM) {
    const missing = [
      ["ZIWEI_LLM_ENDPOINT", env.ZIWEI_LLM_ENDPOINT],
      ["ZIWEI_LLM_API_KEY", env.ZIWEI_LLM_API_KEY],
      ["ZIWEI_LLM_MODEL", env.ZIWEI_LLM_MODEL]
    ].filter(([, value]) => !value).map(([name]) => name);

    return {
      status: missing.length === 0 ? "ready" : "not_ready",
      providerId,
      mode: "external-llm",
      missing
    };
  }

  return {
    status: "not_ready",
    providerId,
    mode: "unknown",
    missing: ["supported ZIWEI_REPORT_PROVIDER"]
  };
}

function summarizeKnowledgeStoreIssues(issues = []) {
  return issues.map((issue) => {
    return issue.snippetId
      ? `${issue.snippetId}: ${issue.message}`
      : issue.message;
  });
}

function normalizeRequestPath(path) {
  return String(path ?? "/").split("?")[0];
}

function isStaticAssetRequest(method, path) {
  return (method === "GET" || method === "HEAD") &&
    STATIC_ASSETS.has(normalizeRequestPath(path));
}

async function createStaticAssetResponse({ method, path }) {
  const asset = STATIC_ASSETS.get(normalizeRequestPath(path));
  const body = method === "HEAD" ? undefined : await readFile(asset.fileUrl);

  return {
    statusCode: 200,
    headers: {
      "content-type": asset.contentType,
      "cache-control": "no-store"
    },
    body
  };
}

function createQuotaStoreFromRuntime(env) {
  if (!env.ZIWEI_API_QUOTA_STORE) {
    return undefined;
  }

  return createFileApiQuotaStore({
    filePath: env.ZIWEI_API_QUOTA_STORE
  });
}

function createRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 2;
  });
}
