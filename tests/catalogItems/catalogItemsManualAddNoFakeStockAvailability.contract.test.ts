import { foundationViewModel } from "../requestEstimate/requestEstimateBoqCatalogTestHelpers";

describe("manual catalog add stock discipline", () => {
  it("does not invent stock, supplier or availability for manual catalog items", () => {
    const item = foundationViewModel()?.manualCatalogItems[0];
    expect(Object.prototype.hasOwnProperty.call(item, "stock")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(item, "supplier")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(item, "availability")).toBe(false);
  });
});
