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
import {
  REPORT_APPROVAL_DECISIONS,
  REPORT_APPROVAL_MODES
} from "./reportApprovalGate.js";
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
  const reportApprovalOptions = resolveApiReportApprovalOptions(apiPayload);

  if (reportApprovalOptions.status !== "ready") {
    return jsonResponse(400, {
      status: "invalid_request",
      requestId,
      messages: reportApprovalOptions.messages
    });
  }

  const buildResult = buildChart(apiPayload.profile);
  const pipelineOptions = {
    ...buildPipelineOptionsFromRuntime({
      knowledgeSnippets: options.knowledgeSnippets ?? [],
      env
    }),
    queryIntent,
    ...reportApprovalOptions.value
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
      approval: pipelineResult.reportApproval,
      readiness: pipelineResult.readinessAudit
    },
    knowledgeMemory: pipelineResult.knowledgeMemory,
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

function resolveApiReportApprovalOptions(apiPayload) {
  const approvalPayload = apiPayload.reportApproval;

  if (approvalPayload === undefined) {
    return {
      status: "ready",
      value: {}
    };
  }

  if (!approvalPayload || typeof approvalPayload !== "object" || Array.isArray(approvalPayload)) {
    return invalidReportApproval("reportApproval 必须是对象。");
  }

  const mode = approvalPayload.mode;

  if (
    mode !== undefined &&
    !Object.values(REPORT_APPROVAL_MODES).includes(mode)
  ) {
    return invalidReportApproval("reportApproval.mode 只能是 auto 或 require-review。");
  }

  const decision = approvalPayload.decision;

  if (decision !== undefined) {
    if (!decision || typeof decision !== "object" || Array.isArray(decision)) {
      return invalidReportApproval("reportApproval.decision 必须是对象。");
    }

    if (!Object.values(REPORT_APPROVAL_DECISIONS).includes(decision.status)) {
      return invalidReportApproval("reportApproval.decision.status 只能是 approved、rejected 或 changes_requested。");
    }
  }

  return {
    status: "ready",
    value: {
      reportApprovalMode: mode,
      reportApprovalDecision: decision,
      reportApprovalReviewedAt: approvalPayload.reviewedAt
    }
  };
}

function invalidReportApproval(message) {
  return {
    status: "invalid_request",
    messages: [message]
  };
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
