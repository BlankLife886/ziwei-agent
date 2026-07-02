import { buildChart } from "../chartBuilder.js";
import { buildPipelineOptionsFromRuntime } from "../runtimeOptions.js";
import {
  API_SCOPES,
  createApiAuthenticator,
  parseApiCredentialsFromRuntime,
  summarizeAuthResult
} from "./apiCredentials.js";
import {
  normalizeQueryIntent,
  parseQueryIntentFromText
} from "./queryIntentParser.js";
import { runZiweiPipelineAsync } from "./ziweiPipeline.js";

const DEFAULT_MAX_BODY_BYTES = 100_000;

export async function handleZiweiApiRequest(request, options = {}) {
  const startedAt = Date.now();
  const requestId = options.requestId ?? createRequestId();
  const method = String(request.method ?? "GET").toUpperCase();
  const path = normalizePath(request.path ?? request.url ?? "/");
  const env = options.env ?? process.env;
  const authenticator = options.authenticator ?? createApiAuthenticator({
    credentials: options.apiCredentials ?? parseApiCredentialsFromRuntime({
      env,
      legacyApiToken: options.apiToken
    })
  });

  if (method === "GET" && path === "/health") {
    return jsonResponse(200, {
      status: "ok",
      service: "ziwei-agent",
      requestId
    });
  }

  if (path !== "/v1/reports") {
    return jsonResponse(404, {
      status: "not_found",
      requestId,
      messages: ["未找到 API 路由。"]
    });
  }

  if (method !== "POST") {
    return jsonResponse(405, {
      status: "method_not_allowed",
      requestId,
      messages: ["请使用 POST /v1/reports。"]
    }, {
      allow: "POST"
    });
  }

  const authResult = authenticator.authenticate({
    headers: request.headers,
    requiredScope: API_SCOPES.REPORTS_WRITE
  });

  if (authResult.status === "unauthorized") {
    return jsonResponse(401, {
      status: "unauthorized",
      requestId,
      messages: [authResult.message],
      authorization: summarizeAuthResult(authResult)
    }, {
      "www-authenticate": "Bearer"
    });
  }

  if (authResult.status === "forbidden") {
    return jsonResponse(403, {
      status: "forbidden",
      requestId,
      messages: [authResult.message],
      authorization: summarizeAuthResult(authResult)
    });
  }

  const bodyRead = readJsonBody(request.body, {
    maxBodyBytes: options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES
  });

  if (bodyRead.status !== "ready") {
    return jsonResponse(bodyRead.statusCode, {
      status: bodyRead.status,
      requestId,
      messages: bodyRead.messages
    });
  }

  const apiPayload = bodyRead.value;

  if (!apiPayload.profile || typeof apiPayload.profile !== "object") {
    return jsonResponse(400, {
      status: "invalid_request",
      requestId,
      messages: ["请求体必须包含 profile 对象。"]
    });
  }

  const queryIntent = resolveApiQueryIntent(apiPayload);
  const buildResult = buildChart(apiPayload.profile);
  const pipelineOptions = {
    ...buildPipelineOptionsFromRuntime({
      knowledgeSnippets: options.knowledgeSnippets ?? [],
      env
    }),
    queryIntent
  };
  const pipelineResult = await runZiweiPipelineAsync(buildResult, pipelineOptions);
  const statusCode = chooseReportStatusCode(buildResult, pipelineResult);

  return jsonResponse(statusCode, {
    status: pipelineResult.status,
    requestId,
    chart: buildResult.chart,
    report: pipelineResult.reportOutput,
    validation: buildResult.validation,
    queryIntent: pipelineResult.queryIntent,
    audits: {
      knowledgeCoverage: pipelineResult.knowledgeCoverageAudit,
      report: pipelineResult.reportAudit,
      readiness: pipelineResult.readinessAudit
    },
    recovery: pipelineResult.recoveryPlan,
    diagnostics: {
      durationMs: Date.now() - startedAt,
      authorization: summarizeAuthResult(authResult),
      buildStatus: buildResult.status,
      reportPlanStatus: pipelineResult.reportPlan.status,
      reportGenerationStatus: pipelineResult.reportGeneration.status,
      reportOutputStatus: pipelineResult.reportOutput.status
    }
  });
}

function readJsonBody(body, { maxBodyBytes }) {
  const bodyText = typeof body === "string"
    ? body
    : JSON.stringify(body ?? {});
  const bodyBytes = Buffer.byteLength(bodyText, "utf8");

  if (bodyBytes > maxBodyBytes) {
    return {
      status: "payload_too_large",
      statusCode: 413,
      messages: [`请求体超过大小限制：${bodyBytes}/${maxBodyBytes} bytes。`]
    };
  }

  try {
    return {
      status: "ready",
      value: JSON.parse(bodyText)
    };
  } catch {
    return {
      status: "invalid_json",
      statusCode: 400,
      messages: ["请求体不是合法 JSON。"]
    };
  }
}

function resolveApiQueryIntent(apiPayload) {
  if (apiPayload.queryIntent) {
    return normalizeQueryIntent(apiPayload.queryIntent);
  }

  return parseQueryIntentFromText(apiPayload.query ?? "");
}

function chooseReportStatusCode(buildResult, pipelineResult) {
  if (buildResult.status === "invalid" || buildResult.status === "incomplete") {
    return 422;
  }

  return pipelineResult.status === "published" ? 200 : 409;
}

function jsonResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers
    },
    body
  };
}

function normalizePath(path) {
  return String(path).split("?")[0];
}

function createRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
