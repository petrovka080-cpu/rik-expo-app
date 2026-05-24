import { foundationSendBundleWithManualCatalogItem, MANUAL_CATALOG_ITEM } from "./requestEstimateBoqCatalogTestHelpers";

describe("request send payload manual catalog items", () => {
  it("keeps manual catalog items after marketplace send", () => {
    const sent = foundationSendBundleWithManualCatalogItem();
    expect(sent.marketplaceLink.status).toBe("sent");
    expect(sent.items.some((item) => item.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId)).toBe(true);
  });
});
