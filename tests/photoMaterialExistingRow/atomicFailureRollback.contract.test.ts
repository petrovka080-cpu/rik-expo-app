import { confirmPhotoMaterialExistingRowBinding } from "../../src/lib/ai/photoMaterialExistingRow";
import { confirmationPayload, createReadyScanFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material atomic rollback", () => {
  it("leaves state unchanged when apply fails after validation", () => {
    const fixture = createReadyScanFixture();
    const payload = confirmationPayload({ recognition: fixture.recognition, session: fixture.session });

    expect(() => confirmPhotoMaterialExistingRowBinding({
      session: fixture.session,
      recognition: fixture.recognition,
      state: fixture.record.revision_state,
      snapshot: fixture.current.editable_estimate_snapshot,
      payload,
      simulateFailureAfterValidation: true,
    })).toThrow("PHOTO_MATERIAL_ATOMIC_SIMULATED_FAILURE");
    expect(fixture.record.revision_state.revisions).toHaveLength(1);
    expect(fixture.record.revision_state.current_revision_id).toBe(fixture.current.revision_id);
  });
});
