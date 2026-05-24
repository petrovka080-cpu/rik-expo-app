import { foundationViewModel, MANUAL_CATALOG_ITEM } from "../requestEstimate/requestEstimateBoqCatalogTestHelpers";

describe("manual catalog add preserves catalog item id", () => {
  it("stores catalogItemId in the request estimate view model", () => {
    expect(foundationViewModel()?.manualCatalogItems[0]?.catalogItemId).toBe(MANUAL_CATALOG_ITEM.catalogItemId);
  });
});
