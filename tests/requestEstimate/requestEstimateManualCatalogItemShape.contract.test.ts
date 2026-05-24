import { foundationViewModel, MANUAL_CATALOG_ITEM } from "./requestEstimateBoqCatalogTestHelpers";

describe("manual catalog item shape", () => {
  it("preserves catalog item identity, source and localized unit label", () => {
    const item = foundationViewModel()?.manualCatalogItems[0];
    expect(item).toMatchObject({
      source: "catalog_item",
      catalogItemId: MANUAL_CATALOG_ITEM.catalogItemId,
      unitLabel: "м³",
      sourceId: "catalog_items",
      sourceLabel: "catalog_items",
      confidence: "high",
      addedBy: "user",
    });
  });
});
