import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { formatReportOutputMarkdown } from "../src/agent/reportMarkdownExporter.js";
import { runReportMarkdownExportCommand } from "../src/exportReportMarkdown.js";
import { buildChart } from "../src/chartBuilder.js";

test("formatReportOutputMarkdown renders a published report with traceability", () => {
  const markdown = formatReportOutputMarkdown(createReportOutput());

  assert.ok(markdown.includes("# 示例命主的紫微斗数本命盘分析报告"));
  assert.ok(markdown.includes("## 报告元信息"));
  assert.ok(markdown.includes("- 输出类型：ziwei-user-report"));
  assert.ok(markdown.includes("## 正文章节"));
  assert.ok(markdown.includes("### 命宫与三方四正"));
  assert.ok(markdown.includes("引用链：证据：`life-triad.life-palace`"));
  assert.ok(markdown.includes("## 可追溯附录"));
  assert.ok(markdown.includes("### 证据清单"));
  assert.ok(markdown.includes("`life-triad.life-palace`：命宫在巳。"));
  assert.ok(markdown.includes("### Traceability 汇总"));
  assert.ok(markdown.includes("- knowledgeSnippetRefs：无"));
  assert.ok(markdown.includes("## 发布门禁"));
});

test("formatReportOutputMarkdown can include a chart snapshot without adding interpretation", () => {
  const buildResult = buildChart(createSampleProfile());
  const markdown = formatReportOutputMarkdown(createReportOutput(), {
    chart: buildResult.chart
  });

  assert.ok(markdown.includes("## 命盘图"));
  assert.ok(markdown.includes("- 命宫：命宫（巳）"));
  assert.ok(markdown.includes("- 当前大限：34-43岁 子女宫（寅）"));
  assert.ok(!markdown.includes("undefined"));
  assert.ok(markdown.includes("| 宫位 | 地支 | 宫干 | 主星 | 辅星 | 煞曜 | 空曜 | 四化 |"));
  assert.ok(markdown.includes("| 命宫 | 巳 | 辛 |"));
  assert.ok(!markdown.includes("## 命盘图解读"));
});

test("formatReportOutputMarkdown does not present blocked reports as final output", () => {
  const markdown = formatReportOutputMarkdown({
    status: "blocked",
    messages: ["报告审计未通过，不能发布用户报告。"]
  });

  assert.ok(markdown.includes("# 用户报告暂不能发布"));
  assert.ok(markdown.includes("- 报告审计未通过，不能发布用户报告。"));
});

test("runReportMarkdownExportCommand writes markdown only after report publication", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-report-md-"));
  const profilePath = join(dir, "profile.json");
  const outputPath = join(dir, "report.md");
  await writeFile(profilePath, JSON.stringify(createSampleProfile()), "utf8");

  const result = await runReportMarkdownExportCommand([
    "--profile",
    profilePath,
    "--knowledge-store",
    "data/knowledge-snippets.example.json",
    "--query",
    "我想看婚姻、财富、事业和当前运势。",
    "--output",
    outputPath
  ], {});
  const payload = JSON.parse(result.output);
  const markdown = await readFile(outputPath, "utf8");

  assert.equal(result.exitCode, 0);
  assert.equal(payload.status, "exported");
  assert.equal(payload.reportOutputStatus, "published");
  assert.equal(payload.chartIncluded, true);
  assert.equal(existsSync(outputPath), true);
  assert.ok(markdown.includes("# 示例命主的紫微斗数本命盘分析报告"));
  assert.ok(markdown.includes("## 命盘图"));
  assert.ok(markdown.includes("婚姻"));
  assert.ok(markdown.includes("## 可追溯附录"));
});

test("runReportMarkdownExportCommand blocks incomplete input before writing markdown", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-report-md-blocked-"));
  const profilePath = join(dir, "profile.json");
  const outputPath = join(dir, "report.md");
  const incompleteProfile = createSampleProfile();
  delete incompleteProfile.birth_time;
  await writeFile(profilePath, JSON.stringify(incompleteProfile), "utf8");

  const result = await runReportMarkdownExportCommand([
    "--profile",
    profilePath,
    "--output",
    outputPath
  ], {});
  const payload = JSON.parse(result.output);

  assert.equal(result.exitCode, 1);
  assert.equal(payload.status, "blocked");
  assert.equal(payload.output, null);
  assert.equal(existsSync(outputPath), false);
});

test("runReportMarkdownExportCommand blocks invalid knowledge stores before writing markdown", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ziwei-report-md-store-blocked-"));
  const profilePath = join(dir, "profile.json");
  const storePath = join(dir, "knowledge.json");
  const outputPath = join(dir, "report.md");
  await writeFile(profilePath, JSON.stringify(createSampleProfile()), "utf8");
  await writeFile(storePath, JSON.stringify({ snippets: "invalid" }), "utf8");

  const result = await runReportMarkdownExportCommand([
    "--profile",
    profilePath,
    "--knowledge-store",
    storePath,
    "--output",
    outputPath
  ], {});
  const payload = JSON.parse(result.output);

  assert.equal(result.exitCode, 1);
  assert.equal(payload.status, "blocked");
  assert.equal(payload.reason, "knowledge-store-not-ready");
  assert.equal(payload.knowledgeStoreStatus, "invalid");
  assert.equal(existsSync(outputPath), false);
});

test("runReportMarkdownExportCommand rejects missing option values", async () => {
  await assert.rejects(
    () => runReportMarkdownExportCommand(["--profile", "--output", "report.md"], {}),
    /参数 --profile 缺少取值。/u
  );
});

function createReportOutput() {
  return {
    status: "published",
    title: "示例命主的紫微斗数本命盘分析报告",
    metadata: {
      outputType: "ziwei-user-report",
      reportStatus: "published",
      auditStatus: "passed",
      approvalStatus: "approved",
      queryIntent: {
        topics: ["基础命盘"]
      },
      sectionIds: ["life-triad"],
      evidenceRefs: ["life-triad.life-palace"],
      referenceRefs: ["framework.life-triad"],
      sourceRefs: ["source.local.analysis-frameworks"],
      knowledgeSnippetRefs: [],
      interpretationRefs: ["interpretation.life-triad.structure"]
    },
    brief: {
      mode: "foundation",
      paragraphs: [
        {
          text: "【报告总览】本次生成基础版命盘报告。",
          evidenceRefs: [],
          referenceRefs: [],
          interpretationRefs: []
        }
      ],
      sectionSummaries: [
        {
          title: "命宫与三方四正",
          evidenceCount: 1,
          referenceCount: 1,
          knowledgeSnippetCount: 0,
          interpretationCount: 1
        }
      ]
    },
    introduction: ["本报告以示例命主的本命盘为分析对象。"],
    sections: [
      {
        id: "life-triad",
        title: "命宫与三方四正",
        evidenceRefs: ["life-triad.life-palace"],
        referenceRefs: ["framework.life-triad"],
        sourceRefs: ["source.local.analysis-frameworks"],
        knowledgeSnippetRefs: [],
        interpretationRefs: ["interpretation.life-triad.structure"],
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
    appendix: {
      evidence: [
        {
          id: "life-triad.life-palace",
          text: "命宫在巳。",
          sectionIds: ["life-triad"]
        }
      ],
      references: [
        {
          id: "framework.life-triad",
          title: "命宫与三方四正分析框架",
          sectionIds: ["life-triad"]
        }
      ],
      sources: [
        {
          id: "source.local.analysis-frameworks",
          title: "本地分析框架目录",
          status: "verified",
          sectionIds: ["life-triad"]
        }
      ],
      knowledgeSnippets: [],
      interpretations: [
        {
          id: "interpretation.life-triad.structure",
          title: "命宫三方四正结构解释",
          riskLevel: "low",
          sectionIds: ["life-triad"]
        }
      ],
      traceability: {
        evidenceRefs: ["life-triad.life-palace"],
        referenceRefs: ["framework.life-triad"],
        sourceRefs: ["source.local.analysis-frameworks"],
        knowledgeSnippetRefs: [],
        interpretationRefs: ["interpretation.life-triad.structure"]
      }
    },
    closing: ["以上草稿只使用当前排盘已经生成的证据。"],
    audit: {
      status: "passed"
    },
    approval: {
      status: "approved"
    }
  };
}

function createSampleProfile() {
  return {
    name: "示例命主",
    gender: "female",
    calendar: "solar",
    birth_date: "1990-05-18",
    analysis_date: "2026-06-30",
    birth_time: "23:30",
    birth_place: "Shanghai, China",
    timezone: "Asia/Shanghai",
    use_true_solar_time: false,
    is_leap_month: false
  };
}
