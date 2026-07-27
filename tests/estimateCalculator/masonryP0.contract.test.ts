import { auditMasonryCalculatorP0 } from "../../src/features/estimates/calculator/families/masonryCalculator";

describe("masonry P0 calculator", () => {
  it("keeps the 400 m2 gas-block mechanics while unregistered catalog norms block professional readiness", () => {
    const audit = auditMasonryCalculatorP0();

    expect(audit.ready_professional).toBe(false);
    expect(audit.sample_work_key).toBe("masonry_interior_gas_block_lay_standard");
    expect(audit.row_count).toBe(59);
    expect(audit.source_backed_row_count).toBe(3);
    expect(audit.all_expected_units_present).toBe(true);
    expect(audit.formula_steps_saved_per_row).toBe(true);
    expect(audit.buyer_handoff_present).toBe(true);
    expect(audit.blocking_reasons).toEqual(["p0_calculator_rows_not_source_backed"]);
  });
});
