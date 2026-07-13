import { confirmPhotoMaterialExistingRowBinding } from "../../src/lib/ai/photoMaterialExistingRow";
import { confirmationPayload, createReadyScanFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material candidate tampering", () => {
  it("rejects modified candidate payload", () => {
    const fixture = createReadyScanFixture();
    const payload = confirmationPayload({ recognition: fixture.recognition, session: fixture.session });
    const recognition = {
      ...fixture.recognition,
      candidates: [{ ...fixture.recognition.candidates[0], visibleName: "Tampered product" }],
    };

    expect(() => confirmPhotoMaterialExistingRowBinding({
      session: fixture.session,
      recognition,
      state: fixture.record.revision_state,
      snapshot: fixture.current.editable_estimate_snapshot,
      payload,
    })).toThrow("PHOTO_MATERIAL_CANDIDATE_TAMPERING_REJECTED");
  });
});
