import { confirmPhotoMaterialExistingRowBinding } from "../../src/lib/ai/photoMaterialExistingRow";
import { c2teCatalogProduct, confirmationPayload, createReadyScanFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material currency guard", () => {
  it("rejects silent currency conversions", () => {
    const fixture = createReadyScanFixture({ catalog: [c2teCatalogProduct({ currency: "KZT" })] });
    const payload = confirmationPayload({ recognition: fixture.recognition, session: fixture.session });

    expect(() => confirmPhotoMaterialExistingRowBinding({
      session: fixture.session,
      recognition: fixture.recognition,
      state: fixture.record.revision_state,
      snapshot: fixture.current.editable_estimate_snapshot,
      payload,
    })).toThrow("PHOTO_MATERIAL_CURRENCY_MISMATCH:KZT->KGS");
  });
});
