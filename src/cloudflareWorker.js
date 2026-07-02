import { createApiRateLimiter } from "./agent/apiRateLimiter.js";
import { createMemoryApiQuotaStore } from "./agent/memoryApiQuotaStore.js";
import { auditKnowledgeSnippet } from "./agent/knowledgeSnippetCatalog.js";
import { handleZiweiApiRequest } from "./agent/ziweiApiHandler.js";
import { REPORT_GENERATOR_IDS } from "./agent/reportGenerator.js";
import { buildOpenApiDocument } from "./openApiDocument.js";
import { parseOptionalInteger } from "./runtimeOptions.js";
import {
  buildReleaseMetadata,
  buildServerRuntimeConfig
} from "./serverRuntimeConfig.js";
import defaultKnowledgeSnippetStore from "../data/knowledge-snippets.example.json" with { type: "json" };

const DEFAULT_MAX_REQUEST_BYTES = 100_000;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 60;
const STATIC_ASSET_PATHS = new Set(["/", "/index.html", "/styles.css", "/app.js"]);

// Cloudflare Workers do not have a writable local filesystem, so their rate
// quota can only be in-memory unless a Durable Object/KV binding is added later.
// Keeping the store at module scope preserves buckets across warm requests in
// the same isolate without changing the Node server's file-backed quota path.
const workerQuotaStore = createMemoryApiQuotaStore();

export default {
  async fetch(request, env = {}) {
    return handleCloudflareWorkerRequest(request, {
      env,
      assets: env.ASSETS
    });
  }
};

export async function handleCloudflareWorkerRequest(request, options = {}) {
  const startedAt = Date.now();
  const requestId = createRequestId();
  const env = normalizeWorkerEnv(options.env ?? {});
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (isStaticAssetRequest(method, path)) {
      return fetchStaticAsset(request, {
        assets: options.assets,
        requestId
      });
    }

    if (isHealthRequest(method, path)) {
      return writeJsonResponse(createHealthResponse({
        method,
        requestId,
        env,
        knowledgeSnippets: parseKnowledgeSnippetsFromWorkerEnv(env).snippets
      }), requestId);
    }

    if (isReadyRequest(method, path)) {
      return writeJsonResponse(createReadyResponse({
        method,
        requestId,
        env,
        knowledgeStore: parseKnowledgeSnippetsFromWorkerEnv(env)
      }), requestId);
    }

    if (isOpenApiRequest(method, path)) {
      return writeJsonResponse({
        statusCode: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        },
        body: method === "HEAD" ? undefined : buildOpenApiDocument()
      }, requestId);
    }

    const runtimeConfig = buildServerRuntimeConfig(env);
    const knowledgeStore = parseKnowledgeSnippetsFromWorkerEnv(env);
    const runtimeIssues = [
      ...runtimeConfig.issues,
      ...knowledgeStore.issues.map((issue) => {
        return issue.snippetId
          ? `${issue.snippetId}: ${issue.message}`
          : issue.message;
      })
    ];

    // Business routes should fail closed when production credentials, provider
    // config, or inline knowledge payloads are invalid. Readiness exposes the
    // same details before traffic is sent to the Worker.
    if (runtimeConfig.status !== "ready" || knowledgeStore.status !== "ready") {
      return writeJsonResponse({
        statusCode: 503,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        },
        body: {
          status: "not_ready",
          service: "ziwei-agent",
          requestId,
          messages: runtimeIssues
        }
      }, requestId);
    }

    const rateLimit = createWorkerRateLimiter(env).check({
      headers: headersToObject(request.headers),
      remoteAddress: request.headers.get("cf-connecting-ip") ?? "unknown"
    });

    if (rateLimit.status === "blocked") {
      return writeJsonResponse({
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
      }, requestId);
    }

    const apiResponse = await handleZiweiApiRequest({
      method,
      path,
      headers: headersToObject(request.headers),
      body: await request.text()
    }, {
      env,
      knowledgeSnippets: knowledgeStore.snippets,
      maxBodyBytes: runtimeConfig.values.maxBodyBytes ?? DEFAULT_MAX_REQUEST_BYTES,
      requestId
    });

    emitWorkerEvent(env, {
      type: "cloudflare.request.completed",
      requestId,
      method,
      path,
      statusCode: apiResponse.statusCode,
      durationMs: Date.now() - startedAt,
      responseStatus: apiResponse.body?.status,
      rateLimit: summarizeRateLimit(rateLimit)
    });

    return writeJsonResponse(apiResponse, requestId);
  } catch {
    return writeJsonResponse({
      statusCode: 500,
      headers: {
        "content-type": "application/json; charset=utf-8"
      },
      body: {
        status: "internal_error",
        requestId,
        messages: ["Cloudflare Worker API 处理失败。"]
      }
    }, requestId);
  }
}

function normalizeWorkerEnv(env) {
  const normalizedEnv = {};

  for (const [key, value] of Object.entries(env)) {
    if (key === "ASSETS") {
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    normalizedEnv[key] = typeof value === "string" ? value : JSON.stringify(value);
  }

  return normalizedEnv;
}

function parseKnowledgeSnippetsFromWorkerEnv(env) {
  if (!env.ZIWEI_KNOWLEDGE_SNIPPETS) {
    return parseKnowledgeSnippetPayload(defaultKnowledgeSnippetStore, "bundled-default");
  }

  try {
    return parseKnowledgeSnippetPayload(
      JSON.parse(env.ZIWEI_KNOWLEDGE_SNIPPETS),
      "env"
    );
  } catch {
    return {
      status: "invalid",
      snippets: [],
      issues: [
        {
          id: "cloudflare-knowledge.json.invalid",
          message: "ZIWEI_KNOWLEDGE_SNIPPETS 必须是合法 JSON。"
        }
      ]
    };
  }
}

function parseKnowledgeSnippetPayload(payload, source) {
  const snippets = Array.isArray(payload) ? payload : payload?.snippets;

  if (!Array.isArray(snippets)) {
    return {
      status: "invalid",
      source,
      snippets: [],
      issues: [
        {
          id: "cloudflare-knowledge.snippets.required",
          message: "ZIWEI_KNOWLEDGE_SNIPPETS 必须是 snippets 数组或包含 snippets 数组的 JSON object。"
        }
      ]
    };
  }

  const audits = snippets.map((snippet) => {
    return {
      snippetId: snippet?.id ?? null,
      audit: auditKnowledgeSnippet(snippet)
    };
  });
  const issues = audits.flatMap((item) => {
    return item.audit.issues.map((issue) => ({
      ...issue,
      snippetId: item.snippetId
    }));
  });

  return {
    status: issues.length === 0 ? "ready" : "invalid",
    source,
    snippets: snippets.filter((_, index) => audits[index].audit.status === "passed"),
    issues
  };
}

function createWorkerRateLimiter(env) {
  return createApiRateLimiter({
    windowMs: parseOptionalInteger(env.ZIWEI_API_RATE_LIMIT_WINDOW_MS) ??
      DEFAULT_RATE_LIMIT_WINDOW_MS,
    maxRequests: parseOptionalInteger(env.ZIWEI_API_RATE_LIMIT_MAX) ??
      DEFAULT_RATE_LIMIT_MAX,
    bucketStore: workerQuotaStore
  });
}

async function fetchStaticAsset(request, { assets, requestId }) {
  if (!assets?.fetch) {
    return new Response(JSON.stringify({
      status: "not_found",
      requestId,
      messages: ["Cloudflare Assets binding 未配置。"]
    }), {
      status: 404,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-request-id": requestId
      }
    });
  }

  const url = new URL(request.url);
  if (url.pathname === "/") {
    url.pathname = "/index.html";
  }

  const assetResponse = await assets.fetch(new Request(url, request));
  const headers = new Headers(assetResponse.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-request-id", requestId);

  return new Response(request.method === "HEAD" ? null : assetResponse.body, {
    status: assetResponse.status,
    headers
  });
}

function createHealthResponse({ method, requestId, env, knowledgeSnippets }) {
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
        release: buildReleaseMetadata(env),
        checks: {
          http: "ok",
          platform: "cloudflare-workers",
          agentEntry: "ready",
          knowledgeSnippetCount: knowledgeSnippets.length
        }
      }
  };
}

function createReadyResponse({ method, requestId, env, knowledgeStore }) {
  const runtimeConfig = buildServerRuntimeConfig(env);
  const checks = {
    runtime: {
      status: runtimeConfig.status === "ready" ? "ready" : "not_ready",
      platform: "cloudflare-workers",
      issues: runtimeConfig.issues
    },
    agentEntry: {
      status: "ready",
      pipeline: "buildChart -> runZiweiPipelineAsync -> reportAuditor -> reportPublisher"
    },
    knowledge: {
      status: knowledgeStore.status,
      count: knowledgeStore.snippets.length,
      issues: knowledgeStore.issues.map((issue) => {
        return issue.snippetId
          ? `${issue.snippetId}: ${issue.message}`
          : issue.message;
      })
    },
    reportProvider: buildReportProviderReadiness(env)
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
        release: buildReleaseMetadata(env),
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

function writeJsonResponse(apiResponse, requestId) {
  const headers = new Headers(apiResponse.headers);
  headers.set("x-request-id", requestId);

  return new Response(
    apiResponse.body === undefined ? null : JSON.stringify(apiResponse.body),
    {
      status: apiResponse.statusCode,
      headers
    }
  );
}

function headersToObject(headers) {
  return Object.fromEntries(headers.entries());
}

function isStaticAssetRequest(method, path) {
  return (method === "GET" || method === "HEAD") && STATIC_ASSET_PATHS.has(path);
}

function isHealthRequest(method, path) {
  return (method === "GET" || method === "HEAD") && path === "/health";
}

function isReadyRequest(method, path) {
  return (method === "GET" || method === "HEAD") && path === "/ready";
}

function isOpenApiRequest(method, path) {
  return (method === "GET" || method === "HEAD") && path === "/openapi.json";
}

function emitWorkerEvent(env, event) {
  if (env.ZIWEI_API_OBSERVABILITY !== "stdout") {
    return;
  }

  console.log(JSON.stringify(event));
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

function createRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
