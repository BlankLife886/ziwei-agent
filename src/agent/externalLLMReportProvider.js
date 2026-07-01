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

export function createExternalLLMReportProvider(config = {}) {
  const providerId = config.providerId ?? DEFAULT_PROVIDER_ID;

  return async ({ generationContext }) => {
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

    const response = await fetchImpl(config.endpoint, {
      method: "POST",
      headers: buildHeaders(config),
      body: JSON.stringify(buildExternalLLMRequest({
        model: config.model,
        generationContext,
        temperature: config.temperature ?? DEFAULT_TEMPERATURE
      }))
    });

    if (!response?.ok) {
      return {
        providerId,
        messages: [
          `外部大模型请求失败：HTTP ${response?.status ?? "unknown"}。`
        ]
      };
    }

    const responseBody = await response.json();
    const reportDraft = extractReportDraft(responseBody);

    if (!reportDraft) {
      return {
        providerId,
        messages: ["外部大模型响应中未找到可解析的 reportDraft。"]
      };
    }

    return {
      providerId,
      messages: ["外部大模型 provider 已返回报告草稿。"],
      reportDraft
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
