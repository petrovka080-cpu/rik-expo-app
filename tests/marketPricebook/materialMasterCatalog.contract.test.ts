import { MARKET_MATERIAL_MASTER_CATALOG, materialSummary } from "./marketPricebookTestHelpers";

describe("market material master catalog", () => {
  it("covers the required material master size and families", () => {
    const summary = materialSummary();
    expect(MARKET_MATERIAL_MASTER_CATALOG.length).toBeGreaterThanOrEqual(120);
    expect(summary.required_material_families_covered).toBe(true);
    expect(summary.fake_green_claimed).toBe(false);
  });
});
