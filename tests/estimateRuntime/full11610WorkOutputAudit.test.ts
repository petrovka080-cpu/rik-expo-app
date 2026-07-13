import { runEstimateRuntimeAuditSummary } from "./estimateRuntimeAuditTestHelpers";

jest.setTimeout(120_000);

const GREEN_AI_ESTIMATE_11610_WORK_OUTPUTS_AUDIT_READY =
  "GREEN_AI_ESTIMATE_11610_WORK_OUTPUTS_AUDIT_READY";

describe("full 11610 work output audit", () => {
  it("builds every work passport from real BOQ content packs", () => {
    const summary = runEstimateRuntimeAuditSummary<Record<string, unknown>>("full-11610-output-audit");

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_11610_WORK_OUTPUTS_AUDIT_READY);
    expect(summary.templates_audited).toBe(11610);
    expect(summary.templates_with_estimate_generated).toBe(11610);
    expect(summary.blocked_templates_count).toBe(0);
    expect(summary.template_only_rows_count).toBe(0);
    expect(summary.generic_rows_count).toBe(0);
    expect(summary.wrong_unit_rows_count).toBe(0);
    expect(summary.empty_estimate_count).toBe(0);
    expect(summary.pdf_missing_count).toBe(0);
    expect(summary.buyer_handoff_missing_count).toBe(0);
  });
});
