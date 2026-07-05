import { runProfessionalBoqTruthAudit10000 } from "../../scripts/estimate/auditProfessionalBoqTruth10000";

jest.setTimeout(180_000);

describe("professional BOQ truth audit 10000 + expanded catalog", () => {
  it("audits all 11610 templates and refuses to seal unproven expanded BOQ templates", () => {
    const result = runProfessionalBoqTruthAudit10000();
    const { summary, ledger } = result;

    expect(summary.final_status).toBe("STOP_AI_ESTIMATE_10K_PROFESSIONAL_BOQ_TRUTH_AUDIT_INCOMPLETE_NO_GREEN");
    expect(summary.catalog_total_templates).toBe(11610);
    expect(summary.templates_audited).toBe(11610);
    expect(ledger).toHaveLength(11610);
    expect(summary.base_templates_audited).toBe(10000);
    expect(summary.expanded_templates_audited).toBe(1610);
    expect(summary.ready_professional_boq_count).toBe(8358);
    expect(summary.blocked_templates_count).toBe(3252);
    expect(summary.base_templates_ready_professional_boq_count).toBe(8358);
    expect(summary.base_templates_blocked_count).toBe(1642);
    expect(summary.expanded_templates_ready_professional_boq_count).toBe(0);
    expect(summary.expanded_templates_blocked_not_ready_professional).toBe(1610);
    expect(summary.wrong_unit_rows_count).toBe(2854);
    expect(summary.full_10000_professional_boq_green_claimed).toBe(false);
    expect(summary.contradiction_explained).toBe(true);
    expect(summary.top_blocking_reasons.join("\n")).toContain("EXPANDED_TEMPLATE_NOT_SEALED");
    expect(summary.top_blocking_reasons.join("\n")).toContain("MISSING_NORM_PACK");
    expect(summary.top_blocking_reasons.join("\n")).toContain("WRONG_UNIT_ROWS");
    expect(summary.diamond_drilling_ready).toBe(true);
    expect(summary.profile_sheet_fence_ready).toBe(true);
    expect(summary.fake_green_claimed).toBe(false);
  });
});
