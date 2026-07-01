import { createExternalLLMReportProvider } from "./agent/externalLLMReportProvider.js";
import { REPORT_GENERATOR_IDS } from "./agent/reportGenerator.js";

export function buildPipelineOptionsFromRuntime({
  knowledgeSnippets = [],
  env = process.env
} = {}) {
  const options = {
    knowledgeSnippets
  };

  if (env.ZIWEI_REPORT_PROVIDER !== REPORT_GENERATOR_IDS.EXTERNAL_LLM) {
    return options;
  }

  return {
    ...options,
    reportGeneratorId: REPORT_GENERATOR_IDS.EXTERNAL_LLM,
    externalReportDraftProvider: createExternalLLMReportProvider({
      endpoint: env.ZIWEI_LLM_ENDPOINT,
      apiKey: env.ZIWEI_LLM_API_KEY,
      model: env.ZIWEI_LLM_MODEL,
      providerId: env.ZIWEI_LLM_PROVIDER_ID,
      timeoutMs: parseOptionalInteger(env.ZIWEI_LLM_TIMEOUT_MS),
      retryCount: parseOptionalInteger(env.ZIWEI_LLM_RETRY_COUNT),
      maxResponseBytes: parseOptionalInteger(env.ZIWEI_LLM_MAX_RESPONSE_BYTES)
    })
  };
}

export function parseOptionalInteger(value) {
  if (value === undefined || value === "") {
    return undefined;
  }

  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) ? parsedValue : undefined;
}
