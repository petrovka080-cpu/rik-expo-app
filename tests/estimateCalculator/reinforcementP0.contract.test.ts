import { auditReinforcementCalculatorP0 } from "../../src/features/estimates/calculator/families/reinforcementCalculator";

describe("reinforcement P0 calculator", () => {
  it("uses kg-based source-backed reinforcement rows", () => {
    const audit = auditReinforcementCalculatorP0();

    expect(audit.ready_professional).toBe(true);
    expect(audit.expected_source_token_found).toBe(true);
    expect(audit.all_expected_units_present).toBe(true);
    expect(audit.blocking_reasons).toEqual([]);
  });
});
