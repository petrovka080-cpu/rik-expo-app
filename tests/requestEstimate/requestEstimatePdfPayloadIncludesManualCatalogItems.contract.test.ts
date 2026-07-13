import { foundationPdfSummary, MANUAL_CATALOG_ITEM } from "./requestEstimateBoqCatalogTestHelpers";

describe("request PDF payload manual catalog items", () => {
  it("includes the selected catalog material without exposing raw catalog ids in the PDF summary", () => {
    const summary = foundationPdfSummary();
    expect(summary).not.toContain(`catalogItemId: ${MANUAL_CATALOG_ITEM.catalogItemId}`);
    expect(summary).not.toContain("catalogItemId:");
    expect(summary).toContain("Бетон М300 из catalog_items");
    expect(summary).toContain("материал из каталога: выбран");
    expect(summary).toContain("м³");
  });
});
