import { auditConcreteCalculatorP0 } from "../../src/features/estimates/calculator/families/concreteCalculator";

describe("concrete P0 calculator", () => {
  it("uses volume-based source-backed concrete rows", () => {
    const audit = auditConcreteCalculatorP0();

    expect(audit.ready_professional).toBe(true);
    expect(audit.expected_source_token_found).toBe(true);
    expect(audit.all_expected_units_present).toBe(true);
    expect(audit.blocking_reasons).toEqual([]);
  });
});
