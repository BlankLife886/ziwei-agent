export function formatKnowledgeStoreValidation(store, filePath) {
  const header = [
    "知识库校验：",
    `- 文件：${filePath}`,
    `- 状态：${store.status}`,
    `- 可用片段：${store.snippets.length} 项`,
    `- 问题：${store.issues.length} 项`
  ];

  if (store.issues.length === 0) {
    return [
      ...header,
      "- 结果：通过"
    ];
  }

  return [
    ...header,
    "问题列表：",
    ...store.issues.map((issue) => {
      const snippetLabel = issue.snippetId ? `片段 ${issue.snippetId}` : "知识库文件";

      return `- [${issue.id}] ${snippetLabel}：${issue.message}`;
    })
  ];
}
