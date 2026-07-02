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
  assert.ok(document.components.schemas.ReportRequest.properties.reportApproval);
  assert.deepEqual(
    document.components.schemas.ReportRequest.properties.reportApproval.properties.mode.enum,
    ["auto", "require-review"]
  );
  assert.deepEqual(
    document.components.schemas.ReportRequest.properties.outputFormats.items.enum,
    ["markdown"]
  );
  assert.equal(
    document.components.schemas.ReportResponse.properties.report.$ref,
    "#/components/schemas/ReportOutput"
  );
  assert.equal(
    document.components.schemas.ReportResponse.properties.artifacts.$ref,
    "#/components/schemas/ReportArtifacts"
  );
  assert.equal(
    document.components.schemas.ReportArtifacts.properties.markdown.properties.contentType.const,
    "text/markdown; charset=utf-8"
  );
  assert.ok(document.components.schemas.ReportOutput.properties.appendix);
  assert.equal(
    document.components.schemas.ReportAppendix.properties.kind.const,
    "report-appendix"
  );
  assert.ok(document.components.schemas.ReportResponse.properties.knowledgeMemory);
  assert.equal(document.components.securitySchemes.bearerAuth.scheme, "bearer");
});
