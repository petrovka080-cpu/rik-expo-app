import {
  isMarketPricebookReleaseNeutralPath,
} from "../../scripts/release/marketPricebookReleaseReusePolicy";

describe("market pricebook release reuse policy", () => {
  it("allows only backend market pricebook proof paths", () => {
    expect(isMarketPricebookReleaseNeutralPath("src/lib/ai/marketPricebook/regionalPricebookResolver.ts")).toBe(true);
    expect(isMarketPricebookReleaseNeutralPath("artifacts/S_REAL_MARKET_MATERIAL_PRICEBOOK_COVERAGE_CORE/matrix.json")).toBe(true);
    expect(isMarketPricebookReleaseNeutralPath("app/(tabs)/request/index.tsx")).toBe(false);
  });
});
