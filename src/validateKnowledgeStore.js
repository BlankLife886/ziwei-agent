import { loadKnowledgeSnippetStore } from "./agent/knowledgeSnippetStore.js";
import { auditKnowledgeStoreCoverage } from "./agent/knowledgeStoreCoverageAuditor.js";
import {
  formatKnowledgeStoreCoverage,
  formatKnowledgeStoreValidation
} from "./agent/knowledgeStoreFormatter.js";

// 知识库文件校验入口。
//
// 用法：
//   node src/validateKnowledgeStore.js data/knowledge-snippets.example.json
//
// 这个命令只验证知识库片段是否能作为 agent 的 verified 外部依据；
// 不排盘、不生成报告，便于未来在 CI 或录入流程中单独执行。

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error("用法：node src/validateKnowledgeStore.js data/knowledge-snippets.example.json");
    return 2;
  }

  const store = await loadKnowledgeSnippetStore(filePath);
  const coverageAudit = auditKnowledgeStoreCoverage(store);
  const lines = [
    ...formatKnowledgeStoreValidation(store, filePath),
    "",
    ...formatKnowledgeStoreCoverage(coverageAudit)
  ];

  for (const line of lines) {
    console.log(line);
  }

  return store.status === "ready" ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 2;
  });
