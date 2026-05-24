import { foundationPdfSummary, MANUAL_CATALOG_ITEM } from "./requestEstimateBoqCatalogTestHelpers";

describe("request PDF payload manual catalog items", () => {
  it("includes the selected catalog item id and localized unit in the PDF summary", () => {
    const summary = foundationPdfSummary();
    expect(summary).toContain(`catalogItemId: ${MANUAL_CATALOG_ITEM.catalogItemId}`);
    expect(summary).toContain("Бетон М300 из catalog_items");
    expect(summary).toContain("м³");
  });
});
