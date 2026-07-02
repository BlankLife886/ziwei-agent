import assert from "node:assert/strict";
import test from "node:test";
import { buildOpenApiDocument } from "../src/openApiDocument.js";

test("buildOpenApiDocument describes the public HTTP contract", () => {
  const document = buildOpenApiDocument();

  assert.equal(document.openapi, "3.1.0");
  assert.equal(document.info.title, "Ziwei Agent API");
  assert.ok(document.paths["/health"].get);
  assert.ok(document.paths["/ready"].get);
  assert.ok(document.paths["/v1/reports"].post);
  assert.equal(document.paths["/v1/reports"].post.requestBody.required, true);
  assert.equal(
    document.paths["/v1/reports"].post.responses[200].content["application/json"].schema.$ref,
    "#/components/schemas/ReportResponse"
  );
  assert.equal(document.components.securitySchemes.bearerAuth.scheme, "bearer");
});
