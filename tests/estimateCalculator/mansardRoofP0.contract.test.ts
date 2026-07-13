import { auditMansardRoofCalculatorP0 } from "../../src/features/estimates/calculator/families/mansardRoofCalculator";

describe("mansard roof P0 calculator", () => {
  it("produces source-backed deterministic professional rows", () => {
    const audit = auditMansardRoofCalculatorP0();

    expect(audit.ready_professional).toBe(true);
    expect(audit.blocking_reasons).toEqual([]);
    expect(audit.all_expected_units_present).toBe(true);
    expect(audit.formula_steps_saved_per_row).toBe(true);
  });
});
