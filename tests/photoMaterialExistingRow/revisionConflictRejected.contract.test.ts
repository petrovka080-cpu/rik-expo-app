import { applyEstimateRevisionQuantityEdit } from "../../src/lib/ai/estimateRevisions";
import { confirmPhotoMaterialExistingRowBinding } from "../../src/lib/ai/photoMaterialExistingRow";
import { confirmationPayload, createReadyScanFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material revision conflict", () => {
  it("rejects stale base revision confirmation", () => {
    const fixture = createReadyScanFixture();
    const changedState = applyEstimateRevisionQuantityEdit(fixture.record.revision_state, {
      row_key: "mat_c2te",
      quantity: 241,
    });
    const payload = confirmationPayload({ recognition: fixture.recognition, session: fixture.session });

    expect(() => confirmPhotoMaterialExistingRowBinding({
      session: fixture.session,
      recognition: fixture.recognition,
      state: changedState,
      snapshot: fixture.current.editable_estimate_snapshot,
      payload,
    })).toThrow("REVISION_CONFLICT");
  });
});
