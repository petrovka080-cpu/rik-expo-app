import { approveEstimateRevisionState } from "../../src/lib/ai/estimateRevisions";
import { confirmPhotoMaterialExistingRowBinding } from "../../src/lib/ai/photoMaterialExistingRow";
import { confirmationPayload, createReadyScanFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material approved revision immutability", () => {
  it("does not modify an approved revision in place", () => {
    const fixture = createReadyScanFixture();
    const approved = approveEstimateRevisionState({ state: fixture.record.revision_state });
    const payload = confirmationPayload({ recognition: fixture.recognition, session: fixture.session });

    expect(() => confirmPhotoMaterialExistingRowBinding({
      session: fixture.session,
      recognition: fixture.recognition,
      state: approved,
      snapshot: fixture.current.editable_estimate_snapshot,
      payload,
    })).toThrow("PHOTO_MATERIAL_APPROVED_REVISION_IMMUTABLE");
  });
});
