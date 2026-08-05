import { auditScreedCalculatorP0 } from "../../src/features/estimates/calculator/families/screedCalculator";

describe("screed P0 calculator", () => {
  it("keeps the 100 m2 x 50 mm mechanics while unregistered catalog norms block professional readiness", () => {
    const audit = auditScreedCalculatorP0();

    expect(audit.ready_professional).toBe(false);
    expect(audit.sample_work_key).toBe("screed_cement_sand_50mm");
    expect(audit.row_count).toBe(59);
    expect(audit.source_backed_row_count).toBe(2);
    expect(audit.expected_source_token_found).toBe(true);
    expect(audit.formula_steps_saved_per_row).toBe(true);
    expect(audit.buyer_handoff_present).toBe(true);
    expect(audit.blocking_reasons).toEqual(["p0_calculator_rows_not_source_backed"]);
  });
});
