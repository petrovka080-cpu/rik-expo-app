import { buildPhotoMaterialExistingRowAcceptanceMatrix } from "../../src/lib/ai/photoMaterialExistingRow";
import { confirmFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material photo price honesty", () => {
  it("never claims photo-observed price is verified catalog price", () => {
    const { fixture, result } = confirmFixture({ priceDecision: "APPLY_PHOTO_PRICE" });
    const matrix = buildPhotoMaterialExistingRowAcceptanceMatrix({
      recognition: fixture.recognition,
      confirmation: result,
      state: result.state,
    });

    expect(result.selectedRow.priceStatus).not.toBe("CATALOG_PRICE_VERIFIED");
    expect(result.selectedRow.priceStatus).not.toBe("PRICEBOOK_VERIFIED");
    expect(matrix.photo_price_claimed_verified).toBe(0);
  });
});
