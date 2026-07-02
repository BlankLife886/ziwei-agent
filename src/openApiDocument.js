export function buildOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Ziwei Agent API",
      version: "0.1.0",
      description: "紫微斗数命理师 agent 的 HTTP API 合同。"
    },
    paths: {
      "/health": {
        get: {
          summary: "Liveness probe",
          responses: {
            200: {
              description: "服务进程存活。",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/HealthResponse"
                  }
                }
              }
            }
          }
        }
      },
      "/ready": {
        get: {
          summary: "Readiness probe",
          responses: {
            200: {
              description: "实例可接收业务流量。",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ReadyResponse"
                  }
                }
              }
            },
            503: {
              description: "实例未就绪或正在 draining。",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ReadyResponse"
                  }
                }
              }
            }
          }
        }
      },
      "/v1/reports": {
        post: {
          summary: "Generate an audited Ziwei user report",
          security: [
            {
              bearerAuth: []
            }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ReportRequest"
                }
              }
            }
          },
          responses: {
            200: {
              description: "报告已通过审计并发布。",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ReportResponse"
                  }
                }
              }
            },
            400: {
              description: "请求 JSON 或结构不合法。",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            401: {
              description: "缺少或无效 bearer credential。",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            403: {
              description: "credential scope 不足。",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            409: {
              description: "报告生成或审计未通过。",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ReportResponse"
                  }
                }
              }
            },
            413: {
              description: "请求体超过大小限制。",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            422: {
              description: "出生资料缺失或不合法，需要补充输入。",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ReportResponse"
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer"
        }
      },
      schemas: {
        HealthResponse: responseSchema({
          status: {
            type: "string",
            const: "ok"
          }
        }),
        ReadyResponse: responseSchema({
          status: {
            type: "string",
            enum: ["ready", "not_ready"]
          },
          checks: {
            type: "object",
            additionalProperties: true
          }
        }),
        ReportRequest: {
          type: "object",
          required: ["profile"],
          additionalProperties: false,
          properties: {
            profile: {
              type: "object",
              required: ["name", "gender", "calendar", "birth_date", "birth_time"],
              additionalProperties: true,
              properties: {
                name: {
                  type: "string"
                },
                gender: {
                  type: "string",
                  enum: ["male", "female"]
                },
                calendar: {
                  type: "string",
                  enum: ["solar", "lunar"]
                },
                birth_date: {
                  type: "string",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$"
                },
                birth_time: {
                  type: "string",
                  pattern: "^\\d{2}:\\d{2}$"
                },
                birth_place: {
                  type: "string"
                },
                timezone: {
                  type: "string"
                },
                use_true_solar_time: {
                  type: "boolean"
                },
                is_leap_month: {
                  type: "boolean"
                },
                analysis_date: {
                  type: "string",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$"
                }
              }
            },
            query: {
              type: "string"
            },
            queryIntent: {
              type: "object",
              additionalProperties: true
            }
          }
        },
        ReportResponse: responseSchema({
          status: {
            type: "string"
          },
          chart: {
            type: ["object", "null"],
            additionalProperties: true
          },
          report: {
            type: "object",
            additionalProperties: true
          },
          validation: {
            type: "object",
            additionalProperties: true
          },
          queryIntent: {
            type: "object",
            additionalProperties: true
          },
          audits: {
            type: "object",
            additionalProperties: true
          },
          diagnostics: {
            type: "object",
            additionalProperties: true
          }
        }),
        ErrorResponse: responseSchema({
          status: {
            type: "string"
          },
          messages: {
            type: "array",
            items: {
              type: "string"
            }
          }
        })
      }
    }
  };
}

function responseSchema(properties) {
  return {
    type: "object",
    required: ["status", "requestId"],
    additionalProperties: true,
    properties: {
      status: {
        type: "string"
      },
      service: {
        type: "string"
      },
      requestId: {
        type: "string"
      },
      release: {
        type: "object",
        additionalProperties: true
      },
      ...properties
    }
  };
}
