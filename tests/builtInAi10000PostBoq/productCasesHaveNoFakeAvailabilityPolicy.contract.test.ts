import { BUILT_IN_AI_10000_POST_BOQ_PRODUCT_CASES } from "../../src/lib/ai/builtInAi10000";
import { getAi10000PostBoqArtifacts } from "./ai10000PostBoqTestHelpers";

describe("built-in AI 10000 post-BOQ product governance", () => {
  it("forbids stock, supplier, and availability invention in product cases", async () => {
    const artifacts = await getAi10000PostBoqArtifacts();

    expect(BUILT_IN_AI_10000_POST_BOQ_PRODUCT_CASES.length).toBeGreaterThan(0);
    expect(BUILT_IN_AI_10000_POST_BOQ_PRODUCT_CASES.every((testCase) => testCase.productSearch?.fakeStockForbidden === true)).toBe(true);
    expect(BUILT_IN_AI_10000_POST_BOQ_PRODUCT_CASES.every((testCase) => testCase.productSearch?.fakeSupplierForbidden === true)).toBe(true);
    expect(BUILT_IN_AI_10000_POST_BOQ_PRODUCT_CASES.every((testCase) => testCase.productSearch?.fakeAvailabilityForbidden === true)).toBe(true);
    expect(artifacts.matrix.fake_stock_found).toBe(false);
    expect(artifacts.matrix.fake_supplier_found).toBe(false);
    expect(artifacts.matrix.fake_availability_found).toBe(false);
  });
});
