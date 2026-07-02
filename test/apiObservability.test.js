import assert from "node:assert/strict";
import test from "node:test";
import {
  createApiObserver,
  sanitizeApiEvent
} from "../src/agent/apiObservability.js";

test("sanitizeApiEvent redacts secrets and full request bodies", () => {
  const event = sanitizeApiEvent({
    type: "api.request.started",
    headers: {
      authorization: "Bearer secret-token",
      "content-type": "application/json"
    },
    body: {
      profile: {
        name: "用户"
      }
    },
    apiKey: "model-secret"
  });

  assert.equal(event.headers.authorization, "[redacted]");
  assert.equal(event.headers["content-type"], "application/json");
  assert.equal(event.body, "[redacted]");
  assert.equal(event.apiKey, "[redacted]");
});

test("createApiObserver emits structured stdout events when enabled", () => {
  const lines = [];
  const observer = createApiObserver({
    mode: "stdout",
    logger: (line) => {
      lines.push(JSON.parse(line));
    }
  });

  const emitted = observer.emit({
    type: "api.request.completed",
    requestId: "req-test",
    statusCode: 200
  });

  assert.equal(lines.length, 1);
  assert.equal(lines[0].type, "api.request.completed");
  assert.equal(lines[0].requestId, "req-test");
  assert.equal(lines[0].statusCode, 200);
  assert.equal(emitted.timestamp, lines[0].timestamp);
});
