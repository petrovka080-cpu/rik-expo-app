import { auditElectricalCalculatorP0 } from "../../src/features/estimates/calculator/families/electricalCalculator";

describe("electrical P0 calculator", () => {
  it("keeps electrical mechanics ready while unregistered catalog norms block professional readiness", () => {
    const audit = auditElectricalCalculatorP0();

    expect(audit.ready_professional).toBe(false);
    expect(audit.row_count).toBe(63);
    expect(audit.source_backed_row_count).toBe(0);
    expect(audit.expected_source_token_found).toBe(true);
    expect(audit.all_expected_units_present).toBe(true);
    expect(audit.formula_steps_saved_per_row).toBe(true);
    expect(audit.buyer_handoff_present).toBe(true);
    expect(audit.blocking_reasons).toEqual(["p0_calculator_rows_not_source_backed"]);
  });
});
