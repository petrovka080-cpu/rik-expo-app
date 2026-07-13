import { runProfessionalBoqTruthAudit10000 } from "../../scripts/estimate/auditProfessionalBoqTruth10000";

jest.setTimeout(180_000);

describe("base catalog wrong-units remediation", () => {
  it("keeps Wave2B wrong-unit blockers closed after expanded catalog seal", () => {
    const { summary } = runProfessionalBoqTruthAudit10000();

    expect(summary.final_status).toBe("STOP_AI_ESTIMATE_10K_PROFESSIONAL_BOQ_TRUTH_AUDIT_INCOMPLETE_NO_GREEN");
    expect(summary.ready_professional_boq_count).toBe(11610);
    expect(summary.blocked_templates_count).toBe(0);
    expect(summary.base_templates_ready_professional_boq_count).toBe(10000);
    expect(summary.base_templates_blocked_count).toBe(0);
    expect(summary.expanded_templates_ready_professional_boq_count).toBe(1610);
    expect(summary.expanded_templates_blocked_not_ready_professional).toBe(0);
    expect(summary.wrong_unit_rows_count).toBe(0);
    expect(summary.unknown_unit_rows_count).toBe(0);
    expect(summary.full_10000_professional_boq_green_claimed).toBe(false);
    expect(summary.top_blocking_reasons.join("\n")).not.toContain("WRONG_UNIT_ROWS");
  });
});
