import {
  GREEN_AI_ESTIMATE_11610_WORK_OUTPUTS_AUDIT_READY,
  audit11610WorkEstimateOutputs,
} from "../../scripts/estimate/audit11610WorkEstimateOutputs";

jest.setTimeout(120_000);

describe("full 11610 work output audit", () => {
  it("builds every work passport from real BOQ content packs", () => {
    const result = audit11610WorkEstimateOutputs({
      writeLedger: false,
      writeSummary: false,
    });

    expect(result.summary.final_status).toBe(GREEN_AI_ESTIMATE_11610_WORK_OUTPUTS_AUDIT_READY);
    expect(result.summary.templates_audited).toBe(11610);
    expect(result.summary.templates_with_estimate_generated).toBe(11610);
    expect(result.summary.blocked_templates_count).toBe(0);
    expect(result.summary.template_only_rows_count).toBe(0);
    expect(result.summary.generic_rows_count).toBe(0);
    expect(result.summary.wrong_unit_rows_count).toBe(0);
    expect(result.summary.empty_estimate_count).toBe(0);
    expect(result.summary.pdf_missing_count).toBe(0);
    expect(result.summary.buyer_handoff_missing_count).toBe(0);
  });
});
