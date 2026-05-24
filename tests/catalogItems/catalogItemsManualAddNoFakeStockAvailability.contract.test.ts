import { foundationViewModel } from "../requestEstimate/requestEstimateBoqCatalogTestHelpers";

describe("manual catalog add stock discipline", () => {
  it("does not invent stock, supplier or availability for manual catalog items", () => {
    const item = foundationViewModel()?.manualCatalogItems[0] as unknown as Record<string, unknown>;
    expect(item.stock).toBeUndefined();
    expect(item.supplier).toBeUndefined();
    expect(item.availability).toBeUndefined();
  });
});
