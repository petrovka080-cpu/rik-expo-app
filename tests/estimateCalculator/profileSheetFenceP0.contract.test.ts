import { auditProfileSheetFenceCalculatorP0 } from "../../src/features/estimates/calculator/families/profileSheetFenceCalculator";

describe("profile sheet fence P0 calculator", () => {
  it("produces source-backed deterministic professional rows", () => {
    const audit = auditProfileSheetFenceCalculatorP0();

    expect(audit.ready_professional).toBe(true);
    expect(audit.blocking_reasons).toEqual([]);
    expect(audit.source_backed_row_count).toBe(audit.row_count);
    expect(audit.buyer_handoff_present).toBe(true);
    expect(audit.price_policy_missing_price_state).toBe(true);
  });
});
