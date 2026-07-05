import { auditProfileSheetFenceCalculatorP0 } from "../../src/features/estimates/calculator/families/profileSheetFenceCalculator";

describe("profile sheet fence professional BOQ calculator", () => {
  it("calculates sheet area, posts, rails, concrete and buyer handoff material rows", () => {
    const audit = auditProfileSheetFenceCalculatorP0();

    expect(audit.ready_professional).toBe(true);
    expect(audit.blocking_reasons).toEqual([]);
    expect(audit.all_expected_units_present).toBe(true);
    expect(audit.material_row_count).toBeGreaterThanOrEqual(4);
    expect(audit.labor_row_count).toBeGreaterThan(0);
    expect(audit.buyer_handoff_present).toBe(true);
    expect(audit.price_policy_missing_price_state).toBe(true);
  });
});
