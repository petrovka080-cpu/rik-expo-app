import { confirmFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material photo price status", () => {
  it("stores photo price as user-confirmed market price", () => {
    const { result } = confirmFixture({ priceDecision: "APPLY_PHOTO_PRICE" });

    expect(result.selectedRow.unitPrice).toBe(520);
    expect(result.selectedRow.priceStatus).toBe("USER_CONFIRMED_MARKET_PRICE");
    expect(result.selectedRow.priceSource).toBe("photo_material_scan");
  });
});
