import { PHASE1_PRODUCT_CASES } from "./phase1TestHelpers";

describe("built-in AI 50000 Phase 1 product policy", () => {
  it("forbids fake stock, supplier and availability in product cases", () => {
    expect(PHASE1_PRODUCT_CASES.length).toBeGreaterThan(0);
    expect(PHASE1_PRODUCT_CASES.every((testCase) =>
      testCase.productSearch?.fakeStockForbidden === true &&
      testCase.productSearch.fakeSupplierForbidden === true &&
      testCase.productSearch.fakeAvailabilityForbidden === true,
    )).toBe(true);
  });
});
