import { getAi150Artifacts } from "../builtInAi150/ai150TestHelpers";

describe("built-in AI 150 architecture: no fake sources", () => {
  it("fails if any priced row lacks source evidence or fake availability appears", () => {
    const { matrix, productSearch } = getAi150Artifacts();

    expect(matrix.source_evidence_present_all_priced_rows).toBe(true);
    expect(matrix.fake_stock_or_availability_found).toBe(false);
    expect(matrix.fake_seller_found).toBe(false);
    expect(productSearch.fake_stock_or_availability_found).toBe(false);
  });
});
