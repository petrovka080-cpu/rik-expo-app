import { auditPlumbingCalculatorP0 } from "../../src/features/estimates/calculator/families/plumbingCalculator";

describe("plumbing P0 calculator", () => {
  it("uses source-backed plumbing catalog rows", () => {
    const audit = auditPlumbingCalculatorP0();

    expect(audit.ready_professional).toBe(true);
    expect(audit.expected_source_token_found).toBe(true);
    expect(audit.all_expected_units_present).toBe(true);
    expect(audit.blocking_reasons).toEqual([]);
  });
});
