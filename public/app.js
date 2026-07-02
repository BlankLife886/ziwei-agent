const form = document.querySelector("#profile-form");
const statusLine = document.querySelector("#status-line");
const chartView = document.querySelector("#chart-view");
const reportView = document.querySelector("#report-view");

const PALACE_ORDER = [
  "命宫",
  "兄弟宫",
  "夫妻宫",
  "子女宫",
  "财帛宫",
  "疾厄宫",
  "迁移宫",
  "仆役宫",
  "官禄宫",
  "田宅宫",
  "福德宫",
  "父母宫"
];

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  setStatus("生成中", "loading");

  try {
    const payload = buildRequestPayload(new FormData(form));
    const response = await fetch("/v1/reports", {
      method: "POST",
      headers: buildHeaders(payload.apiToken),
      body: JSON.stringify({
        profile: payload.profile,
        query: payload.query
      })
    });
    const body = await response.json();

    if (!response.ok || body.status !== "published") {
      renderBlocked(body);
      setStatus(`未发布：${body.status}`, "error");
      return;
    }

    renderChart(body.chart);
    renderReport(body.report);
    setStatus(`已发布 · ${body.requestId}`, "ready");
  } catch (error) {
    chartView.innerHTML = "";
    reportView.innerHTML = "";
    setStatus(`请求失败：${error.message}`, "error");
  } finally {
    submitButton.disabled = false;
  }
});

renderEmptyState();

function buildRequestPayload(formData) {
  // 前端只做字段收集和类型归一，完整校验仍由后端 intake/chartBuilder 执行。
  const profile = {
    name: textValue(formData, "name"),
    gender: textValue(formData, "gender"),
    calendar: textValue(formData, "calendar"),
    birth_date: textValue(formData, "birth_date"),
    birth_time: textValue(formData, "birth_time"),
    birth_place: textValue(formData, "birth_place"),
    timezone: textValue(formData, "timezone"),
    analysis_date: textValue(formData, "analysis_date"),
    use_true_solar_time: formData.get("use_true_solar_time") === "on",
    is_leap_month: formData.get("is_leap_month") === "on"
  };

  return {
    profile,
    query: textValue(formData, "query"),
    apiToken: textValue(formData, "api_token")
  };
}

function buildHeaders(apiToken) {
  const headers = {
    "content-type": "application/json"
  };

  if (apiToken) {
    headers.authorization = `Bearer ${apiToken}`;
  }

  return headers;
}

function renderEmptyState() {
  chartView.innerHTML = "";
  reportView.innerHTML = `
    <div class="empty-state">暂无报告</div>
  `;
}

function renderBlocked(body) {
  chartView.innerHTML = "";
  reportView.innerHTML = `
    <div class="report-section">
      <h2>报告未发布</h2>
      ${renderMessages(body.messages)}
      ${body.validation?.missingFields?.length ? `<p class="ref-line">缺失字段：${escapeHtml(body.validation.missingFields.join("、"))}</p>` : ""}
    </div>
  `;
}

function renderChart(chart) {
  const subject = chart.profileSummary ?? {};
  const palaces = [...(chart.palaces ?? [])].sort((left, right) => {
    return PALACE_ORDER.indexOf(left.name) - PALACE_ORDER.indexOf(right.name);
  });

  chartView.innerHTML = `
    <div class="chart-header">
      <div>
        <h2>命盘图</h2>
        <div class="subject-meta">${escapeHtml(subject.name ?? "")} · ${escapeHtml(subject.birthDate ?? "")} · ${escapeHtml(subject.birthTime ?? "")}</div>
      </div>
      <div class="subject-meta">命宫：${escapeHtml(chart.lifePalace?.name ?? "")} · 身宫：${escapeHtml(chart.bodyPalace?.name ?? "")}</div>
    </div>
    <div class="palace-grid">
      ${palaces.map(renderPalace).join("")}
    </div>
  `;
}

function renderPalace(palace) {
  const starRows = [
    renderStars(palace.mainStars, "main"),
    renderStars(palace.auxiliaryStars, "auxiliary"),
    renderStars(palace.maleficStars, "malefic"),
    renderStars(palace.voidStars, "void")
  ].filter(Boolean).join("");

  return `
    <article class="palace-card">
      <div class="palace-title">
        <span>${escapeHtml(palace.name)}</span>
        <span class="palace-branch">${escapeHtml(palace.stem ?? "")}${escapeHtml(palace.branch ?? "")}</span>
      </div>
      <div class="star-list">
        ${starRows || '<span class="palace-note">无已安星曜</span>'}
      </div>
      <div class="palace-note">${renderTransformations(palace.transformations)}</div>
    </article>
  `;
}

function renderStars(stars = [], kind) {
  if (!stars.length) {
    return "";
  }

  return `
    <div class="star-row">
      ${stars.map((star) => `<span class="tag" data-kind="${kind}">${escapeHtml(star.name ?? star)}</span>`).join("")}
    </div>
  `;
}

function renderTransformations(transformations = []) {
  if (!transformations.length) {
    return "四化：无";
  }

  return `四化：${escapeHtml(transformations.map((item) => `${item.type ?? ""}${item.starName ?? ""}`).join("、"))}`;
}

function renderReport(report) {
  reportView.innerHTML = `
    <section class="report-intro">
      <h2>${escapeHtml(report.title)}</h2>
      <p>${escapeHtml(report.introduction)}</p>
      <div class="ref-line">审计：${escapeHtml(report.audit?.status ?? "")} · 输出：${escapeHtml(report.metadata?.outputType ?? "")}</div>
    </section>
    ${renderReportBrief(report.brief)}
    ${report.sections.map(renderReportSection).join("")}
    ${renderReportAppendix(report.appendix)}
    <section class="report-closing">
      <p>${escapeHtml(report.closing)}</p>
    </section>
  `;
}

function renderReportBrief(brief) {
  if (!brief) {
    return "";
  }

  const sectionSummaries = brief.sectionSummaries ?? [];
  const paragraphs = brief.paragraphs ?? [];

  return `
    <section class="report-brief">
      <div class="brief-heading">
        <h3>报告摘要</h3>
        <span class="brief-mode">${escapeHtml(brief.mode ?? "")}</span>
      </div>
      <div class="brief-paragraphs">
        ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph.text)}</p>`).join("")}
      </div>
      <div class="brief-summary-list">
        ${sectionSummaries.map(renderBriefSummary).join("")}
      </div>
    </section>
  `;
}

function renderBriefSummary(summary) {
  return `
    <div class="brief-summary-item">
      <strong>${escapeHtml(summary.title)}</strong>
      <span>证据 ${escapeHtml(summary.evidenceCount)} · 规则 ${escapeHtml(summary.referenceCount)} · 知识片段 ${escapeHtml(summary.knowledgeSnippetCount)} · 解释 ${escapeHtml(summary.interpretationCount)}</span>
    </div>
  `;
}

function renderReportAppendix(appendix) {
  if (!appendix) {
    return "";
  }

  return `
    <section class="report-appendix">
      <h3>可追溯附录</h3>
      <div class="appendix-counts">
        ${renderAppendixCount("证据", appendix.evidence)}
        ${renderAppendixCount("规则", appendix.references)}
        ${renderAppendixCount("来源", appendix.sources)}
        ${renderAppendixCount("知识片段", appendix.knowledgeSnippets)}
        ${renderAppendixCount("解释", appendix.interpretations)}
      </div>
      ${renderAppendixGroup("证据清单", appendix.evidence)}
      ${renderAppendixGroup("规则/框架清单", appendix.references)}
      ${renderAppendixGroup("来源清单", appendix.sources)}
      ${renderAppendixGroup("知识片段清单", appendix.knowledgeSnippets)}
      ${renderAppendixGroup("解释条目清单", appendix.interpretations)}
    </section>
  `;
}

function renderAppendixCount(label, items = []) {
  return `
    <div class="appendix-count">
      <strong>${escapeHtml(items.length)}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function renderAppendixGroup(title, items = []) {
  if (!items.length) {
    return "";
  }

  return `
    <details class="appendix-group">
      <summary>${escapeHtml(title)} · ${escapeHtml(items.length)} 项</summary>
      <div class="appendix-list">
        ${items.slice(0, 8).map(renderAppendixItem).join("")}
      </div>
    </details>
  `;
}

function renderAppendixItem(item) {
  const label = item.title ?? item.text ?? item.id;
  const sectionIds = item.sectionIds?.length ? item.sectionIds.join("、") : "";
  const subline = [
    item.type,
    item.status,
    item.riskLevel,
    item.citation,
    sectionIds ? `章节 ${sectionIds}` : ""
  ].filter(Boolean).join(" · ");

  return `
    <div class="appendix-item">
      <strong>${escapeHtml(label)}</strong>
      <code>${escapeHtml(item.id)}</code>
      ${subline ? `<span>${escapeHtml(subline)}</span>` : ""}
    </div>
  `;
}

function renderReportSection(section) {
  return `
    <article class="report-section">
      <h3>${escapeHtml(section.title)}</h3>
      ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph.text)}</p>`).join("")}
      <div class="ref-line">evidenceRefs ${section.evidenceRefs.length} · referenceRefs ${section.referenceRefs.length} · knowledgeSnippetRefs ${section.knowledgeSnippetRefs.length}</div>
    </article>
  `;
}

function renderMessages(messages = []) {
  return messages.map((message) => `<p>${escapeHtml(message)}</p>`).join("");
}

function setStatus(message, state) {
  statusLine.textContent = message;
  statusLine.dataset.state = state;
}

function textValue(formData, fieldName) {
  return String(formData.get(fieldName) ?? "").trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
