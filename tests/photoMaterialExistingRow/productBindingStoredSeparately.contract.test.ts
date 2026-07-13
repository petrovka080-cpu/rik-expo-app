import { confirmFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material selected product binding", () => {
  it("stores concrete selected product separately from requirement row", () => {
    const { result } = confirmFixture();

    expect(result.selectedRow.selectedProductBinding).toMatchObject({
      productId: "product_ceresit_cm11_25kg",
      visibleName: "Ceresit CM 11",
      packageLabel: "25 kg",
      source: "photo_material_scan",
      scanId: "scan_1",
    });
    expect(result.selectedRow.materialKey).toBe("market_c2te_adhesive");
  });
});
