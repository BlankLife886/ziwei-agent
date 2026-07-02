import assert from "node:assert/strict";
import test from "node:test";
import {
  REPORT_APPROVAL_DECISIONS,
  REPORT_APPROVAL_MODES,
  evaluateReportApproval
} from "../src/agent/reportApprovalGate.js";

test("evaluateReportApproval auto-approves audited drafts by default", () => {
  const approval = evaluateReportApproval({
    reportDraft: {
      status: "drafted"
    },
    reportAudit: {
      status: "passed"
    }
  });

  assert.equal(approval.status, "approved");
  assert.equal(approval.mode, REPORT_APPROVAL_MODES.AUTO);
  assert.equal(approval.required, false);
  assert.equal(approval.decision.status, REPORT_APPROVAL_DECISIONS.APPROVED);
});

test("evaluateReportApproval blocks require-review mode without a human decision", () => {
  const approval = evaluateReportApproval({
    reportDraft: {
      status: "drafted"
    },
    reportAudit: {
      status: "passed"
    }
  }, {
    mode: REPORT_APPROVAL_MODES.REQUIRE_REVIEW
  });

  assert.equal(approval.status, "blocked");
  assert.equal(approval.required, true);
  assert.equal(approval.decision, null);
  assert.ok(approval.messages[0].includes("人工确认"));
});

test("evaluateReportApproval accepts approved human decisions", () => {
  const approval = evaluateReportApproval({
    reportDraft: {
      status: "drafted"
    },
    reportAudit: {
      status: "passed"
    }
  }, {
    mode: REPORT_APPROVAL_MODES.REQUIRE_REVIEW,
    decision: {
      status: REPORT_APPROVAL_DECISIONS.APPROVED,
      reviewerId: "reviewer-1",
      reason: "证据链和边界已复核。",
      reviewedAt: "2026-07-02T00:00:00.000Z"
    }
  });

  assert.equal(approval.status, "approved");
  assert.equal(approval.required, true);
  assert.equal(approval.decision.reviewerId, "reviewer-1");
});

test("evaluateReportApproval blocks rejected or change-requested decisions", () => {
  const rejected = evaluateReportApproval({
    reportDraft: {
      status: "drafted"
    },
    reportAudit: {
      status: "passed"
    }
  }, {
    mode: REPORT_APPROVAL_MODES.REQUIRE_REVIEW,
    decision: {
      status: REPORT_APPROVAL_DECISIONS.REJECTED,
      reviewerId: "reviewer-1"
    }
  });
  const changesRequested = evaluateReportApproval({
    reportDraft: {
      status: "drafted"
    },
    reportAudit: {
      status: "passed"
    }
  }, {
    mode: REPORT_APPROVAL_MODES.REQUIRE_REVIEW,
    decision: {
      status: REPORT_APPROVAL_DECISIONS.CHANGES_REQUESTED,
      reviewerId: "reviewer-1"
    }
  });

  assert.equal(rejected.status, "blocked");
  assert.ok(rejected.messages[0].includes("拒绝"));
  assert.equal(changesRequested.status, "blocked");
  assert.ok(changesRequested.messages[0].includes("修改"));
});
