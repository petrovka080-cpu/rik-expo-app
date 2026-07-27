import { auditMetalworkCalculatorP0 } from "../../src/features/estimates/calculator/families/metalworkCalculator";

describe("metalwork P0 calculator", () => {
  it("keeps metal-frame mechanics ready while unregistered catalog norms block professional readiness", () => {
    const audit = auditMetalworkCalculatorP0();

    expect(audit.ready_professional).toBe(false);
    expect(audit.work_family_id).toBe("metalwork");
    expect(audit.row_count).toBe(59);
    expect(audit.source_backed_row_count).toBe(0);
    expect(audit.expected_source_token_found).toBe(true);
    expect(audit.formula_steps_saved_per_row).toBe(true);
    expect(audit.buyer_handoff_present).toBe(true);
    expect(audit.blocking_reasons).toEqual(["p0_calculator_rows_not_source_backed"]);
  });
});
