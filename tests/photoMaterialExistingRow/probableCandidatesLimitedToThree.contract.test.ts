import { createReadyScanFixture, c2teCatalogProduct, probableObservations } from "./photoMaterialExistingRowTestHelpers";

describe("photo material probable candidates", () => {
  it("limits probable matches to three", () => {
    const catalog = Array.from({ length: 6 }, (_, index) =>
      c2teCatalogProduct({
        productId: `product_probable_${index}`,
        catalogItemId: `catalog_probable_${index}`,
        barcode: null,
        visibleName: `Ceresit tile adhesive variant ${index}`,
      })
    );
    const fixture = createReadyScanFixture({ catalog, observations: probableObservations("scan_1") });

    expect(fixture.recognition.candidates.length).toBeLessThanOrEqual(3);
    expect(fixture.recognition.candidates.every((candidate) => candidate.source !== "EXACT_BARCODE")).toBe(true);
  });
});
