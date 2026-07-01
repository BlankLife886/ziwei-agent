import assert from "node:assert/strict";
import test from "node:test";
import { createReportDraft } from "../src/agent/reportComposer.js";
import { createReportPlan } from "../src/agent/reportPlanner.js";
import { createZiweiAgentResponse } from "../src/agent/ziweiAgent.js";
import { buildChart } from "../src/chartBuilder.js";
import {
  formatAgentBriefing,
  formatBuildResult,
  formatKnowledgeCoverageAudit,
  formatReadinessAudit,
  formatReportAudit,
  formatReportDraft,
  formatReportOutput,
  formatReportPlan
} from "../src/formatters.js";

test("formatBuildResult renders the complete chart summary for CLI output", () => {
  const lines = formatBuildResult(buildChart(createSampleProfile()));

  assert.ok(lines.includes("资料校验通过"));
  assert.ok(lines.includes("命盘骨架已建立："));
  assert.ok(lines.includes("命宫：巳"));
  assert.ok(lines.includes("五行局：金四局（命宫辛巳，纳音白蜡金）"));
  assert.ok(lines.includes("天厨星曜：天厨寅"));
  assert.ok(lines.includes("截空星曜：正空午、副空未"));
  assert.ok(lines.includes("生年四化：化禄太阳、化权武曲、化科太阴、化忌天同"));
  assert.ok(lines.includes("大限："));
  assert.ok(lines.includes("- 4-13岁：命宫巳（逆行）"));
  assert.ok(
    lines.includes(
      "02. 兄弟宫：辰｜主星：太阳｜辅星：天姚｜四化：太阳化禄"
    )
  );
});

test("formatBuildResult renders validation errors", () => {
  const result = buildChart({
    ...createSampleProfile(),
    gender: "unknown"
  });

  assert.deepEqual(formatBuildResult(result), [
    "资料格式错误：",
    "- gender must be 'male' or 'female'"
  ]);
});

test("formatBuildResult renders current major period when analysis date exists", () => {
  const lines = formatBuildResult(buildChart({
    ...createSampleProfile(),
    analysis_date: "2026-06-30"
  }));

  assert.ok(lines.includes("当前大限定位："));
  assert.ok(lines.includes("- 分析日期：2026-06-30"));
  assert.ok(lines.includes("- 年龄口径：虚岁37岁"));
  assert.ok(lines.includes("- 所在大限：34-43岁：子女宫寅（逆行）"));
});

test("formatAgentBriefing renders evidence and focus areas", () => {
  const agentResult = createZiweiAgentResponse(buildChart(createSampleProfile()));
  const lines = formatAgentBriefing(agentResult);

  assert.ok(lines.includes("Agent 分析准备："));
  assert.ok(lines.includes("核心证据："));
  assert.ok(lines.includes("- 命宫在巳"));
  assert.ok(lines.includes("建议分析重点："));
  assert.ok(lines.some((line) => line.includes("命宫与三方四正")));
  assert.ok(lines.includes("当前限制："));
  assert.ok(lines.some((line) => line.includes("已接入生年四化与大限年龄段")));
});

test("formatAgentBriefing renders structured follow-up questions", () => {
  const profile = createSampleProfile();
  delete profile.birth_time;

  const agentResult = createZiweiAgentResponse(buildChart(profile));
  const lines = formatAgentBriefing(agentResult);

  assert.ok(lines.includes("Agent 状态：暂不能分析"));
  assert.ok(lines.includes("需要追问："));
  assert.ok(lines.some((line) => line.includes("请提供出生时间")));
  assert.ok(lines.includes("  字段：birth_time"));
  assert.ok(lines.includes("  示例：23:30"));
  assert.ok(lines.some((line) => line.includes("原因：出生时间用于换算时辰")));
});

test("formatReportPlan renders report sections and guardrails", () => {
  const agentResult = createZiweiAgentResponse(buildChart(createSampleProfile()));
  const lines = formatReportPlan(createReportPlan(agentResult));

  assert.ok(lines.includes("Agent 报告草稿规划："));
  assert.ok(lines.includes("章节："));
  assert.ok(lines.some((line) => line.includes("写作提示")));
  assert.ok(lines.some((line) => line.includes("关键问题")));
  assert.ok(lines.some((line) => line.includes("[life-triad.life-palace]")));
  assert.ok(lines.includes("  参考依据："));
  assert.ok(lines.some((line) => line.includes("[framework.life-triad]")));
  assert.ok(lines.includes("  解释条目："));
  assert.ok(lines.some((line) => line.includes("[interpretation.life-triad.structure]")));
  assert.ok(lines.some((line) => line.includes("[interpretation.star.tian-fu.career]")));
  assert.ok(lines.some((line) => line.includes("[interpretation.four-transformations.birth-year-static-only]")));
  assert.ok(lines.some((line) => line.includes("[interpretation.major-periods.structure-only]")));
  assert.ok(lines.includes("写作边界："));
});

test("formatReportDraft renders readable draft paragraphs", () => {
  const agentResult = createZiweiAgentResponse(buildChart(createSampleProfile()));
  const reportPlan = createReportPlan(agentResult);
  const lines = formatReportDraft(createReportDraft(reportPlan));

  assert.ok(lines.includes("Agent 报告正文草稿："));
  assert.ok(lines.includes("示例命主的紫微斗数本命盘分析草稿"));
  assert.ok(lines.includes("开篇："));
  assert.ok(lines.some((line) => line.includes("【草稿判断】")));
  assert.ok(lines.some((line) => line.includes("【解释依据】")));
  assert.ok(lines.some((line) => line.includes("证据：life-triad.life-palace")));
  assert.ok(lines.some((line) => line.includes("参考：framework.life-triad")));
  assert.ok(lines.some((line) => line.includes("解释：interpretation.life-triad.structure")));
  assert.ok(lines.some((line) => line.includes("解释：interpretation.life-triad.structure") && line.includes("interpretation.star.tian-fu.career")));
  assert.ok(lines.includes("收束："));
});

test("formatReportAudit renders passed, skipped, and failed audit states", () => {
  assert.deepEqual(formatReportAudit({
    status: "passed",
    issues: [],
    warnings: []
  }), [
    "Agent 报告审计：通过",
    "审计问题：无",
    "审计警告：无"
  ]);

  assert.deepEqual(formatReportAudit({
    status: "skipped",
    issues: [],
    warnings: []
  }), [
    "Agent 报告审计：已跳过",
    "- 报告规划或正文草稿尚未完成，暂不执行输出审计。"
  ]);

  assert.deepEqual(formatReportAudit({
    status: "failed",
    issues: [
      {
        id: "paragraph-ref-outside-section",
        message: "段落引用了不属于本章节的 evidenceRefs。"
      }
    ],
    warnings: [
      {
        id: "risk-language.event-timing",
        message: "出现时间或事件断语。"
      }
    ]
  }), [
    "Agent 报告审计：未通过",
    "审计问题：",
    "- [paragraph-ref-outside-section] 段落引用了不属于本章节的 evidenceRefs。",
    "审计警告：",
    "- [risk-language.event-timing] 出现时间或事件断语。"
  ]);
});

test("formatKnowledgeCoverageAudit renders insufficient and skipped states", () => {
  assert.deepEqual(formatKnowledgeCoverageAudit({
    status: "skipped",
    summary: "报告规划尚未完成，暂不审计知识覆盖。",
    sections: [],
    recommendations: []
  }), [
    "知识覆盖审计：已跳过",
    "- 报告规划尚未完成，暂不审计知识覆盖。"
  ]);

  const lines = formatKnowledgeCoverageAudit({
    status: "insufficient",
    summary: "1 个报告章节中有 1 个尚无 verified 外部知识片段。",
    sections: [
      {
        sectionId: "career-palace",
        title: "事业专题",
        message: "本章节尚无 verified 外部知识片段，目前只能使用本地规则、证据和受控解释。",
        referenceRefs: ["framework.career-palace"],
        knowledgeSnippetRefs: []
      }
    ],
    recommendations: ["优先从已研读的书籍、PDF或笔记中录入可复核摘录。"]
  });

  assert.ok(lines.includes("知识覆盖审计：不足"));
  assert.ok(lines.some((line) => line.includes("事业专题")));
  assert.ok(lines.includes("  知识片段：无"));
  assert.ok(lines.includes("补齐建议："));
});

test("formatReadinessAudit renders progress and priorities", () => {
  const lines = formatReadinessAudit({
    status: "in_progress",
    percent: 52,
    items: [
      {
        status: "complete",
        title: "报告发布门禁",
        weight: 10,
        message: "已能发布保守报告。"
      },
      {
        status: "partial",
        title: "外部知识库覆盖",
        weight: 14,
        message: "仍缺 verified 外部知识片段。"
      }
    ],
    nextPriorities: ["外部知识库覆盖：仍缺 verified 外部知识片段。"]
  });

  assert.ok(lines.includes("Agent 完整度审计："));
  assert.ok(lines.includes("- 进度：52%"));
  assert.ok(lines.some((line) => line.includes("[partial] 外部知识库覆盖")));
  assert.ok(lines.includes("下一步优先级："));
});

test("formatReportOutput renders only published user reports", () => {
  assert.deepEqual(formatReportOutput({
    status: "blocked",
    messages: ["报告审计未通过，不能发布用户报告。"],
    sections: []
  }), [
    "用户报告：暂不能发布",
    "- 报告审计未通过，不能发布用户报告。"
  ]);

  const lines = formatReportOutput({
    status: "published",
    title: "示例命主的紫微斗数本命盘分析草稿",
    metadata: {
      outputType: "ziwei-user-report",
      sectionIds: ["life-triad"],
      evidenceRefs: ["life-triad.life-palace"],
      referenceRefs: ["framework.life-triad"],
      sourceRefs: ["source.local.analysis-frameworks"],
      knowledgeSnippetRefs: [],
      interpretationRefs: ["interpretation.life-triad.structure"]
    },
    introduction: ["本报告以示例命主的本命盘为分析对象。"],
    sections: [
      {
        title: "命宫与三方四正",
        paragraphs: [
          {
            text: "【草稿判断】当前只写结构底稿。",
            evidenceRefs: ["life-triad.life-palace"],
            referenceRefs: ["framework.life-triad"],
            interpretationRefs: ["interpretation.life-triad.structure"]
          }
        ]
      }
    ],
    closing: ["以上草稿只使用当前排盘已经生成的证据。"],
    audit: {
      status: "passed"
    }
  });

  assert.ok(lines.includes("用户报告："));
  assert.ok(lines.includes("示例命主的紫微斗数本命盘分析草稿"));
  assert.ok(lines.includes("报告元信息："));
  assert.ok(lines.includes("- 输出类型：ziwei-user-report"));
  assert.ok(lines.includes("- 章节：life-triad"));
  assert.ok(lines.includes("- 证据引用：1 项"));
  assert.ok(lines.includes("- 来源引用：1 项"));
  assert.ok(lines.includes("- 知识片段引用：0 项"));
  assert.ok(lines.some((line) => line.includes("证据：life-triad.life-palace")));
  assert.ok(lines.includes("发布门禁：报告审计通过"));
});

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
