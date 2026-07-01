// 外部大模型报告 provider 适配器。
//
// 这一层只做三件事：
// 1. 把 reportGenerator 产出的 generationContext 包装成稳定请求。
// 2. 调用调用方配置的 HTTP LLM endpoint。
// 3. 把返回内容解析成 reportDraft。
//
// 它不排盘、不补证据、不跳过 reportAuditor。provider 产出的草稿仍必须
// 经过报告审计和发布门禁，才能成为用户报告。

const DEFAULT_PROVIDER_ID = "external-llm-api";
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_COUNT = 1;
const DEFAULT_MAX_RESPONSE_BYTES = 200_000;

export function createExternalLLMReportProvider(config = {}) {
  const providerId = config.providerId ?? DEFAULT_PROVIDER_ID;

  return async ({ generationContext }) => {
    const providerOptions = normalizeProviderOptions(config);
    const startedAt = Date.now();
    const missingConfig = findMissingConfig(config);

    if (missingConfig.length > 0) {
      return {
        providerId,
        messages: [
          `外部大模型 provider 缺少配置：${missingConfig.join("、")}。`
        ]
      };
    }

    const fetchImpl = config.fetchImpl ?? globalThis.fetch;

    if (typeof fetchImpl !== "function") {
      return {
        providerId,
        messages: ["当前 Node 环境没有可用 fetch，且未传入 fetchImpl。"]
      };
    }

    const requestBody = JSON.stringify(buildExternalLLMRequest({
      model: config.model,
      generationContext,
      temperature: config.temperature ?? DEFAULT_TEMPERATURE
    }));
    const attempts = [];
    const maxAttempts = providerOptions.retryCount + 1;

    for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
      const attemptResult = await runExternalLLMAttempt({
        fetchImpl,
        config,
        requestBody,
        attemptNumber,
        providerOptions
      });

      attempts.push(summarizeAttempt(attemptResult));

      if (attemptResult.status === "success") {
        const reportDraft = extractReportDraft(attemptResult.responseBody);

        if (!reportDraft) {
          return {
            providerId,
            messages: ["外部大模型响应中未找到可解析的 reportDraft。"],
            diagnostics: buildDiagnostics({
              config,
              providerOptions,
              attempts,
              startedAt,
              finalStatus: "unparseable-response"
            })
          };
        }

        return {
          providerId,
          messages: ["外部大模型 provider 已返回报告草稿。"],
          diagnostics: buildDiagnostics({
            config,
            providerOptions,
            attempts,
            startedAt,
            finalStatus: "success"
          }),
          reportDraft
        };
      }

      if (!attemptResult.retryable || attemptNumber >= maxAttempts) {
        break;
      }
    }

    const finalAttempt = attempts.at(-1);

    if (finalAttempt?.status === "http-error") {
      return {
        providerId,
        messages: [
          `外部大模型请求失败：HTTP ${finalAttempt.statusCode}。`
        ],
        diagnostics: buildDiagnostics({
          config,
          providerOptions,
          attempts,
          startedAt,
          finalStatus: "http-error"
        })
      };
    }

    return {
      providerId,
      messages: [
        finalAttempt?.message ?? "外部大模型请求失败。"
      ],
      diagnostics: buildDiagnostics({
        config,
        providerOptions,
        attempts,
        startedAt,
        finalStatus: finalAttempt?.status ?? "request-error"
      })
    };
  };
}

export function buildExternalLLMRequest({
  model,
  generationContext,
  temperature = DEFAULT_TEMPERATURE
}) {
  return {
    model,
    temperature,
    response_format: {
      type: "json_object"
    },
    messages: [
      {
        role: "system",
        content: [
          "你是紫微斗数报告写作器，只能基于给定 generationContext 写作。",
          "不得新增排盘结果、不得补造文献来源、不得输出具体事件、应期、吉凶、婚恋结果、财富金额或职业结果。",
          "必须返回 JSON 对象，顶层字段为 reportDraft。"
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify({
          generationContext,
          outputContract: generationContext.outputContract,
          requiredShape: {
            reportDraft: {
              status: "drafted",
              title: "string",
              subject: generationContext.subject,
              introduction: generationContext.opening,
              sections: "array matching generationContext.sections",
              closing: "array"
            }
          }
        })
      }
    ]
  };
}

export function extractReportDraft(responseBody) {
  if (responseBody?.reportDraft) {
    return responseBody.reportDraft;
  }

  if (responseBody?.output?.reportDraft) {
    return responseBody.output.reportDraft;
  }

  const content = responseBody?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    return null;
  }

  try {
    return JSON.parse(content).reportDraft ?? null;
  } catch {
    return null;
  }
}

function findMissingConfig(config) {
  return [
    ["endpoint", config.endpoint],
    ["apiKey", config.apiKey],
    ["model", config.model]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
}

function buildHeaders(config) {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${config.apiKey}`,
    ...(config.headers ?? {})
  };
}

function normalizeProviderOptions(config) {
  return {
    timeoutMs: normalizeNonNegativeInteger(config.timeoutMs, DEFAULT_TIMEOUT_MS),
    retryCount: normalizeNonNegativeInteger(config.retryCount, DEFAULT_RETRY_COUNT),
    maxResponseBytes: normalizePositiveInteger(config.maxResponseBytes, DEFAULT_MAX_RESPONSE_BYTES)
  };
}

async function runExternalLLMAttempt({
  fetchImpl,
  config,
  requestBody,
  attemptNumber,
  providerOptions
}) {
  const timeoutControl = createTimeoutControl(providerOptions.timeoutMs);

  try {
    const response = await fetchImpl(config.endpoint, {
      method: "POST",
      headers: buildHeaders(config),
      body: requestBody,
      ...(timeoutControl.signal ? { signal: timeoutControl.signal } : {})
    });

    if (!response?.ok) {
      return {
        status: "http-error",
        attemptNumber,
        statusCode: response?.status ?? null,
        retryable: isRetryableStatus(response?.status)
      };
    }

    const responseRead = await readJsonResponse(response, providerOptions.maxResponseBytes);

    if (responseRead.status !== "success") {
      return {
        status: responseRead.status,
        attemptNumber,
        statusCode: response.status ?? null,
        message: responseRead.message,
        retryable: false
      };
    }

    return {
      status: "success",
      attemptNumber,
      statusCode: response.status ?? 200,
      responseBody: responseRead.body,
      retryable: false
    };
  } catch (error) {
    return {
      status: isAbortError(error) ? "timeout" : "request-error",
      attemptNumber,
      message: isAbortError(error)
        ? `外部大模型请求超时：${providerOptions.timeoutMs}ms。`
        : `外部大模型请求异常：${error instanceof Error ? error.message : String(error)}。`,
      retryable: true
    };
  } finally {
    timeoutControl.clear();
  }
}

async function readJsonResponse(response, maxResponseBytes) {
  if (typeof response.text === "function") {
    const responseText = await response.text();
    const responseBytes = Buffer.byteLength(responseText, "utf8");

    if (responseBytes > maxResponseBytes) {
      return {
        status: "response-too-large",
        message: `外部大模型响应超过大小限制：${responseBytes}/${maxResponseBytes} bytes。`
      };
    }

    try {
      return {
        status: "success",
        body: JSON.parse(responseText)
      };
    } catch {
      return {
        status: "invalid-json",
        message: "外部大模型响应不是合法 JSON。"
      };
    }
  }

  if (typeof response.json === "function") {
    const responseBody = await response.json();
    const responseBytes = Buffer.byteLength(JSON.stringify(responseBody), "utf8");

    if (responseBytes > maxResponseBytes) {
      return {
        status: "response-too-large",
        message: `外部大模型响应超过大小限制：${responseBytes}/${maxResponseBytes} bytes。`
      };
    }

    return {
      status: "success",
      body: responseBody
    };
  }

  return {
    status: "invalid-response",
    message: "外部大模型响应缺少 text/json 读取接口。"
  };
}

function buildDiagnostics({
  config,
  providerOptions,
  attempts,
  startedAt,
  finalStatus
}) {
  return {
    finalStatus,
    endpointHost: getEndpointHost(config.endpoint),
    model: config.model,
    attempts: attempts.length,
    retryCount: providerOptions.retryCount,
    timeoutMs: providerOptions.timeoutMs,
    maxResponseBytes: providerOptions.maxResponseBytes,
    elapsedMs: Date.now() - startedAt,
    attemptLog: attempts
  };
}

function summarizeAttempt(attemptResult) {
  return {
    attemptNumber: attemptResult.attemptNumber,
    status: attemptResult.status,
    ...(attemptResult.statusCode ? { statusCode: attemptResult.statusCode } : {}),
    ...(attemptResult.message ? { message: attemptResult.message } : {}),
    retryable: attemptResult.retryable
  };
}

function createTimeoutControl(timeoutMs) {
  if (timeoutMs <= 0 || typeof AbortController === "undefined") {
    return {
      signal: null,
      clear: () => {}
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
    }
  };
}

function isRetryableStatus(statusCode) {
  return statusCode === undefined ||
    statusCode === null ||
    statusCode === 408 ||
    statusCode === 429 ||
    statusCode >= 500;
}

function isAbortError(error) {
  return error?.name === "AbortError";
}

function normalizeNonNegativeInteger(value, fallback) {
  if (!Number.isInteger(value) || value < 0) {
    return fallback;
  }

  return value;
}

function normalizePositiveInteger(value, fallback) {
  if (!Number.isInteger(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function getEndpointHost(endpoint) {
  try {
    return new URL(endpoint).host;
  } catch {
    return "invalid-endpoint";
  }
}
