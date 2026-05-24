import { foundationDraftWithManualCatalogItem, MANUAL_CATALOG_ITEM, updateManualQuantity } from "./requestEstimateBoqCatalogTestHelpers";

describe("manual catalog item totals", () => {
  it("recalculates totals when quantity changes", () => {
    const updated = updateManualQuantity(foundationDraftWithManualCatalogItem(), 3);
    const item = updated.items.find((row) => row.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId);
    expect(item?.quantity).toBe(3);
    expect(item?.totalPrice).toBe(15000);
  });
});
