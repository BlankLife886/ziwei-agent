import assert from "node:assert/strict";
import test from "node:test";
import { createZiweiHttpServer } from "../src/server.js";

test("createZiweiHttpServer serves health responses", async () => {
  const server = createZiweiHttpServer({
    env: {},
    knowledgeSnippets: []
  });

  await new Promise((resolve) => {
    server.listen(0, resolve);
  });

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "ziwei-agent");
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
});
