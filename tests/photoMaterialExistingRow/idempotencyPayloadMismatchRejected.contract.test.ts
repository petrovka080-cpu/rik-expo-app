import { confirmPhotoMaterialExistingRowBinding } from "../../src/lib/ai/photoMaterialExistingRow";
import { confirmFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material idempotency mismatch", () => {
  it("rejects reused idempotency key with different payload", () => {
    const first = confirmFixture();
    const mismatchedPayload = { ...first.payload, priceDecision: "KEEP_EXISTING_PRICE" as const };

    expect(() => confirmPhotoMaterialExistingRowBinding({
      session: first.result.session,
      recognition: first.fixture.recognition,
      state: first.result.state,
      snapshot: first.fixture.current.editable_estimate_snapshot,
      payload: mismatchedPayload,
      ledger: first.result.ledger,
    })).toThrow("PHOTO_MATERIAL_IDEMPOTENCY_PAYLOAD_MISMATCH_REJECTED");
  });
});
