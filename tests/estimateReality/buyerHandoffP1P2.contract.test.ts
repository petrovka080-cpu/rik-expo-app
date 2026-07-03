import {
  validateBuyerHandoff10000,
  GREEN_AI_ESTIMATE_10000_BUYER_HANDOFF_NO_BUILDS,
} from "../../scripts/estimate/validateBuyerHandoff10000";

jest.setTimeout(90000);

describe("buyer handoff P1/P2", () => {
  it("sends only procurement rows and keeps quantities equal to estimate rows", () => {
    const result = validateBuyerHandoff10000();

    expect(result.final_status).toBe(GREEN_AI_ESTIMATE_10000_BUYER_HANDOFF_NO_BUILDS);
    expect(result.buyer_receives_procurement_subset_only).toBe(true);
    expect(result.buyer_material_qty_matches_estimate).toBe(true);
    expect(result.buyer_work_rows_excluded).toBe(true);
  });
});
