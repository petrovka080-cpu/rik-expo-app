import { confirmFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material governed catalog price", () => {
  it("can apply governed catalog price as verified", () => {
    const { result } = confirmFixture({ priceDecision: "APPLY_GOVERNED_CATALOG_PRICE" });

    expect(result.selectedRow.unitPrice).toBe(515);
    expect(result.selectedRow.priceStatus).toBe("CATALOG_PRICE_VERIFIED");
    expect(result.selectedRow.priceSource).toBe("catalog_item");
  });
});
