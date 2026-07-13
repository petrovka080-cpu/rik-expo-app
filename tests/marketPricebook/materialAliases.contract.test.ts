import { MARKET_MATERIAL_ALIASES } from "./marketPricebookTestHelpers";

describe("market material aliases", () => {
  it("provides broad alias coverage", () => {
    expect(MARKET_MATERIAL_ALIASES.length).toBeGreaterThanOrEqual(300);
  });
});
