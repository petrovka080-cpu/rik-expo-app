import { MARKET_PRICE_SOURCE_REGISTRY, marketPriceSourceRegistryIsProductionSafe } from "./marketPricebookTestHelpers";

describe("market price source registry", () => {
  it("registers production-allowed regional manual verified sources", () => {
    expect(MARKET_PRICE_SOURCE_REGISTRY).toHaveLength(6);
    expect(marketPriceSourceRegistryIsProductionSafe()).toBe(true);
  });
});
