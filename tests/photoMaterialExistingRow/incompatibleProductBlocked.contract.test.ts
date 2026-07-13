import { confirmPhotoMaterialExistingRowBinding } from "../../src/lib/ai/photoMaterialExistingRow";
import { confirmationPayload, createReadyScanFixture, incompatibleCatalogProduct } from "./photoMaterialExistingRowTestHelpers";

describe("photo material compatibility", () => {
  it("blocks incompatible products before revision creation", () => {
    const fixture = createReadyScanFixture({
      catalog: [incompatibleCatalogProduct()],
      observations: [
        {
          observationId: "obs_wrong_barcode",
          scanId: "scan_1",
          imageId: "image_barcode",
          source: "BARCODE",
          field: "barcode",
          value: "4860000000999",
          confidence: 0.99,
        },
      ],
    });
    const payload = confirmationPayload({ recognition: fixture.recognition, session: fixture.session });

    expect(() => confirmPhotoMaterialExistingRowBinding({
      session: fixture.session,
      recognition: fixture.recognition,
      state: fixture.record.revision_state,
      snapshot: fixture.current.editable_estimate_snapshot,
      payload,
    })).toThrow("PRODUCT_INCOMPATIBLE_WITH_ESTIMATE_ROW");
    expect(fixture.record.revision_state.revisions).toHaveLength(1);
  });
});
