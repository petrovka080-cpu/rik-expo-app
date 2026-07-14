import { confirmFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material missing price", () => {
  it("allows product binding with missing price", () => {
    const { result } = confirmFixture({ priceDecision: "KEEP_PRICE_MISSING" });

    expect(result.selectedRow.selectedProductBinding?.visibleName).toBe("Ceresit CM 11");
    expect(result.selectedRow.unitPrice).toBeNull();
    expect(result.selectedRow.priceStatus).toBe("PRICE_MISSING");
  });
});
