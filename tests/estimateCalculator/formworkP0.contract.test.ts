import { auditFormworkCalculatorP0 } from "../../src/features/estimates/calculator/families/formworkCalculator";

describe("formwork P0 calculator", () => {
  it("uses contact-area source-backed formwork rows", () => {
    const audit = auditFormworkCalculatorP0();

    expect(audit.ready_professional).toBe(true);
    expect(audit.expected_source_token_found).toBe(true);
    expect(audit.all_expected_units_present).toBe(true);
    expect(audit.blocking_reasons).toEqual([]);
  });
});
