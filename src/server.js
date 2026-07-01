import { createServer } from "node:http";
import { loadKnowledgeSnippetStore } from "./agent/knowledgeSnippetStore.js";
import { handleZiweiApiRequest } from "./agent/ziweiApiHandler.js";
import { parseOptionalInteger } from "./runtimeOptions.js";

const DEFAULT_PORT = 3000;
const DEFAULT_MAX_REQUEST_BYTES = 100_000;

export function createZiweiHttpServer(options = {}) {
  return createServer(async (request, response) => {
    try {
      const bodyRead = await readRequestBody(request, {
        maxBodyBytes: options.maxBodyBytes ?? DEFAULT_MAX_REQUEST_BYTES
      });

      if (bodyRead.status !== "ready") {
        writeJsonResponse(response, {
          statusCode: bodyRead.statusCode,
          headers: {
            "content-type": "application/json; charset=utf-8"
          },
          body: {
            status: bodyRead.status,
            messages: bodyRead.messages
          }
        });
        return;
      }

      const apiResponse = await handleZiweiApiRequest({
        method: request.method,
        path: request.url,
        headers: request.headers,
        body: bodyRead.body
      }, {
        env: options.env ?? process.env,
        apiToken: options.apiToken,
        knowledgeSnippets: options.knowledgeSnippets,
        maxBodyBytes: options.maxBodyBytes ?? DEFAULT_MAX_REQUEST_BYTES
      });

      writeJsonResponse(response, apiResponse);
    } catch {
      writeJsonResponse(response, {
        statusCode: 500,
        headers: {
          "content-type": "application/json; charset=utf-8"
        },
        body: {
          status: "internal_error",
          messages: ["API 处理失败。"]
        }
      });
    }
  });
}

async function main() {
  const env = process.env;
  const knowledgeStore = env.ZIWEI_KNOWLEDGE_STORE
    ? await loadKnowledgeSnippetStore(env.ZIWEI_KNOWLEDGE_STORE)
    : { snippets: [] };
  const port = parseOptionalInteger(env.PORT) ?? DEFAULT_PORT;
  const maxBodyBytes = parseOptionalInteger(env.ZIWEI_API_MAX_BODY_BYTES) ??
    DEFAULT_MAX_REQUEST_BYTES;
  const server = createZiweiHttpServer({
    env,
    apiToken: env.ZIWEI_API_TOKEN,
    knowledgeSnippets: knowledgeStore.snippets,
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

function writeJsonResponse(response, apiResponse) {
  response.writeHead(apiResponse.statusCode, apiResponse.headers);
  response.end(JSON.stringify(apiResponse.body));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 2;
  });
}
