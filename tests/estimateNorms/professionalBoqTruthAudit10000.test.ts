import { runProfessionalBoqTruthAudit10000 } from "../../scripts/estimate/auditProfessionalBoqTruth10000";

jest.setTimeout(180_000);

describe("professional BOQ truth audit 10000 + expanded catalog", () => {
  it("audits all 11610 templates and proves expanded BOQ rows without fake prices", () => {
    const result = runProfessionalBoqTruthAudit10000();
    const { summary, ledger } = result;

    expect(summary.final_status).toBe("STOP_AI_ESTIMATE_10K_PROFESSIONAL_BOQ_TRUTH_AUDIT_INCOMPLETE_NO_GREEN");
    expect(summary.catalog_total_templates).toBe(11610);
    expect(summary.templates_audited).toBe(11610);
    expect(ledger).toHaveLength(11610);
    expect(summary.base_templates_audited).toBe(10000);
    expect(summary.expanded_templates_audited).toBe(1610);
    expect(summary.ready_professional_boq_count).toBe(1610);
    expect(summary.blocked_templates_count).toBe(10000);
    expect(summary.base_templates_ready_professional_boq_count).toBe(0);
    expect(summary.base_templates_blocked_count).toBe(10000);
    expect(summary.expanded_templates_ready_professional_boq_count).toBe(1610);
    expect(summary.expanded_templates_blocked_not_ready_professional).toBe(0);
    expect(summary.generic_rows_count).toBe(0);
    expect(summary.template_only_generic_rows_count).toBe(0);
    expect(summary.wrong_unit_rows_count).toBe(0);
    expect(summary.unknown_unit_rows_count).toBe(0);
    expect(summary.empty_estimate_count).toBe(0);
    expect(summary.missing_material_rows_count).toBe(0);
    expect(summary.missing_pdf_mapping_count).toBe(0);
    expect(summary.missing_buyer_handoff_mapping_count).toBe(0);
    expect(summary.fake_price_count).toBe(0);
    expect(summary.fake_final_total_count).toBe(0);
    expect(summary.minimum_professional_row_count).toBe(45);
    expect(summary.short_professional_boq_count).toBe(0);
    expect(summary.templates_below_professional_depth_count).toBe(0);
    expect(summary.min_row_count).toBeGreaterThanOrEqual(45);
    expect(summary.full_10000_professional_boq_green_claimed).toBe(false);
    expect(summary.contradiction_explained).toBe(true);
    expect(summary.top_blocking_reasons).toEqual(["NO_NORM_SOURCE:10000"]);
    expect(summary.top_blocking_reasons.join("\n")).not.toContain("WRONG_UNIT_ROWS");
    expect(summary.diamond_drilling_ready).toBe(true);
    expect(summary.profile_sheet_fence_ready).toBe(true);
    expect(summary.fake_green_claimed).toBe(false);
  });
});
