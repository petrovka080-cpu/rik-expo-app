import { auditMetalworkCalculatorP0 } from "../../src/features/estimates/calculator/families/metalworkCalculator";

describe("metalwork P0 calculator", () => {
  it("uses source-backed metal frame catalog rows", () => {
    const audit = auditMetalworkCalculatorP0();

    expect(audit.ready_professional).toBe(true);
    expect(audit.work_family_id).toBe("metalwork");
    expect(audit.expected_source_token_found).toBe(true);
    expect(audit.blocking_reasons).toEqual([]);
  });
});
