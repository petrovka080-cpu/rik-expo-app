import { auditDiamondDrillingCalculatorP0 } from "../../src/features/estimates/calculator/families/diamondDrillingCalculator";

describe("diamond drilling P0 calculator", () => {
  it("produces source-backed deterministic professional rows", () => {
    const audit = auditDiamondDrillingCalculatorP0();

    expect(audit.ready_professional).toBe(true);
    expect(audit.blocking_reasons).toEqual([]);
    expect(audit.source_backed_row_count).toBe(audit.row_count);
    expect(audit.same_input_same_output).toBe(true);
    expect(audit.missing_required_params_block_apply).toBe(true);
  });
});
