import { confirmFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material price decisions", () => {
  it("can preserve existing row price while binding the product", () => {
    const { result } = confirmFixture({ priceDecision: "KEEP_EXISTING_PRICE" });

    expect(result.selectedRow.unitPrice).toBe(100);
    expect(result.selectedRow.priceStatus).toBe("CATALOG_PRICE_VERIFIED");
    expect(result.selectedRow.selectedProductBinding?.visibleName).toBe("Ceresit CM 11");
  });
});
