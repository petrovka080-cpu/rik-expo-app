import { auditScreedCalculatorP0 } from "../../src/features/estimates/calculator/families/screedCalculator";

describe("screed P0 calculator", () => {
  it("uses the 100 m2 x 50 mm dedicated project group", () => {
    const audit = auditScreedCalculatorP0();

    expect(audit.ready_professional).toBe(true);
    expect(audit.sample_work_key).toBe("screed_cement_sand_50mm");
    expect(audit.expected_source_token_found).toBe(true);
    expect(audit.blocking_reasons).toEqual([]);
  });
});
