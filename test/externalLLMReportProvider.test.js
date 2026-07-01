import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExternalLLMRequest,
  createExternalLLMReportProvider,
  extractReportDraft
} from "../src/agent/externalLLMReportProvider.js";
import { createReportDraft } from "../src/agent/reportComposer.js";
import { createReportGenerationContext } from "../src/agent/reportGenerator.js";
import { createReportPlan } from "../src/agent/reportPlanner.js";
import { createZiweiAgentResponse } from "../src/agent/ziweiAgent.js";
import { buildChart } from "../src/chartBuilder.js";

test("buildExternalLLMRequest keeps the model inside the generation context contract", () => {
  const generationContext = createGenerationContext();
  const request = buildExternalLLMRequest({
    model: "test-model",
    generationContext
  });
  const userPayload = JSON.parse(request.messages[1].content);

  assert.equal(request.model, "test-model");
  assert.equal(request.response_format.type, "json_object");
  assert.ok(request.messages[0].content.includes("只能基于给定 generationContext"));
  assert.equal(userPayload.generationContext.version, "report-generation-context.v1");
  assert.equal(userPayload.outputContract.auditGate, "reportAuditor");
  assert.ok(
    userPayload.generationContext.sections.some((section) => {
      return section.topicRefinements.length > 0;
    })
  );
});

test("createExternalLLMReportProvider blocks missing HTTP configuration before fetch", async () => {
  let fetchCalled = false;
  const provider = createExternalLLMReportProvider({
    providerId: "missing-config-provider",
    fetchImpl: async () => {
      fetchCalled = true;
      return { ok: true };
    }
  });
  const result = await provider({
    generationContext: createGenerationContext()
  });

  assert.equal(result.providerId, "missing-config-provider");
  assert.equal(fetchCalled, false);
  assert.ok(result.messages[0].includes("endpoint"));
  assert.ok(result.messages[0].includes("apiKey"));
  assert.ok(result.messages[0].includes("model"));
  assert.equal(result.reportDraft, undefined);
});

test("createExternalLLMReportProvider posts generation context and parses direct reportDraft responses", async () => {
  const reportPlan = createReportPlan(
    createZiweiAgentResponse(buildChart(createSampleProfile()))
  );
  const generationContext = createReportGenerationContext(reportPlan);
  const expectedDraft = createReportDraft(reportPlan);
  let capturedUrl = "";
  let capturedRequest = null;
  const provider = createExternalLLMReportProvider({
    endpoint: "https://llm.example.test/report",
    apiKey: "test-key",
    model: "test-model",
    providerId: "http-test-provider",
    fetchImpl: async (url, request) => {
      capturedUrl = url;
      capturedRequest = request;

      return {
        ok: true,
        status: 200,
        json: async () => {
          return {
            reportDraft: expectedDraft
          };
        }
      };
    }
  });
  const result = await provider({ generationContext });
  const requestBody = JSON.parse(capturedRequest.body);
  const userPayload = JSON.parse(requestBody.messages[1].content);

  assert.equal(capturedUrl, "https://llm.example.test/report");
  assert.equal(capturedRequest.method, "POST");
  assert.equal(capturedRequest.headers.authorization, "Bearer test-key");
  assert.equal(requestBody.model, "test-model");
  assert.equal(userPayload.generationContext.outputContract.publishGate, "reportPublisher");
  assert.equal(result.providerId, "http-test-provider");
  assert.equal(result.diagnostics.endpointHost, "llm.example.test");
  assert.equal(result.diagnostics.finalStatus, "success");
  assert.equal(result.diagnostics.attempts, 1);
  assert.equal(result.diagnostics.apiKey, undefined);
  assert.equal(result.reportDraft.title, expectedDraft.title);
});

test("createExternalLLMReportProvider retries transient HTTP failures without leaking secrets", async () => {
  const expectedDraft = createReportDraft(
    createReportPlan(
      createZiweiAgentResponse(buildChart(createSampleProfile()))
    )
  );
  let fetchCalls = 0;
  const provider = createExternalLLMReportProvider({
    endpoint: "https://llm.example.test/report",
    apiKey: "secret-key",
    model: "test-model",
    retryCount: 1,
    fetchImpl: async () => {
      fetchCalls += 1;

      if (fetchCalls === 1) {
        return {
          ok: false,
          status: 503,
          text: async () => ""
        };
      }

      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ reportDraft: expectedDraft })
      };
    }
  });
  const result = await provider({
    generationContext: createGenerationContext()
  });

  assert.equal(fetchCalls, 2);
  assert.equal(result.reportDraft.title, expectedDraft.title);
  assert.equal(result.diagnostics.attempts, 2);
  assert.equal(result.diagnostics.attemptLog[0].status, "http-error");
  assert.equal(result.diagnostics.attemptLog[0].statusCode, 503);
  assert.equal(JSON.stringify(result.diagnostics).includes("secret-key"), false);
});

test("createExternalLLMReportProvider does not retry non-retryable HTTP failures", async () => {
  let fetchCalls = 0;
  const provider = createExternalLLMReportProvider({
    endpoint: "https://llm.example.test/report",
    apiKey: "test-key",
    model: "test-model",
    retryCount: 3,
    fetchImpl: async () => {
      fetchCalls += 1;

      return {
        ok: false,
        status: 400,
        text: async () => ""
      };
    }
  });
  const result = await provider({
    generationContext: createGenerationContext()
  });

  assert.equal(fetchCalls, 1);
  assert.equal(result.reportDraft, undefined);
  assert.equal(result.diagnostics.finalStatus, "http-error");
  assert.equal(result.messages[0], "外部大模型请求失败：HTTP 400。");
});

test("createExternalLLMReportProvider blocks oversized and malformed responses", async () => {
  const oversizedProvider = createExternalLLMReportProvider({
    endpoint: "https://llm.example.test/report",
    apiKey: "test-key",
    model: "test-model",
    maxResponseBytes: 10,
    fetchImpl: async () => {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          reportDraft: {
            status: "drafted",
            title: "这个响应会超过限制"
          }
        })
      };
    }
  });
  const oversizedResult = await oversizedProvider({
    generationContext: createGenerationContext()
  });
  const malformedProvider = createExternalLLMReportProvider({
    endpoint: "https://llm.example.test/report",
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: async () => {
      return {
        ok: true,
        status: 200,
        text: async () => "{not-json"
      };
    }
  });
  const malformedResult = await malformedProvider({
    generationContext: createGenerationContext()
  });

  assert.equal(oversizedResult.reportDraft, undefined);
  assert.equal(oversizedResult.diagnostics.finalStatus, "response-too-large");
  assert.ok(oversizedResult.messages[0].includes("超过大小限制"));
  assert.equal(malformedResult.reportDraft, undefined);
  assert.equal(malformedResult.diagnostics.finalStatus, "invalid-json");
  assert.equal(malformedResult.messages[0], "外部大模型响应不是合法 JSON。");
});

test("createExternalLLMReportProvider reports timeout attempts as blocked diagnostics", async () => {
  const provider = createExternalLLMReportProvider({
    endpoint: "https://llm.example.test/report",
    apiKey: "test-key",
    model: "test-model",
    timeoutMs: 1,
    retryCount: 0,
    fetchImpl: async (_url, request) => {
      await new Promise((resolve, reject) => {
        request.signal.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    }
  });
  const result = await provider({
    generationContext: createGenerationContext()
  });

  assert.equal(result.reportDraft, undefined);
  assert.equal(result.diagnostics.finalStatus, "timeout");
  assert.equal(result.diagnostics.attempts, 1);
  assert.ok(result.messages[0].includes("请求超时"));
});

test("extractReportDraft supports chat content JSON and rejects malformed responses", () => {
  const reportDraft = {
    status: "drafted",
    title: "测试草稿",
    sections: []
  };

  assert.deepEqual(extractReportDraft({
    choices: [
      {
        message: {
          content: JSON.stringify({ reportDraft })
        }
      }
    ]
  }), reportDraft);
  assert.equal(extractReportDraft({
    choices: [
      {
        message: {
          content: "not-json"
        }
      }
    ]
  }), null);
});

function createGenerationContext() {
  return createReportGenerationContext(
    createReportPlan(
      createZiweiAgentResponse(buildChart(createSampleProfile()))
    )
  );
}

function createSampleProfile() {
  return {
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  };
}
