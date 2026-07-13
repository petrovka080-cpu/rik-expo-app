import { confirmPhotoMaterialExistingRowBinding } from "../../src/lib/ai/photoMaterialExistingRow";
import { confirmFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material idempotency", () => {
  it("replays the same confirmation idempotently", () => {
    const first = confirmFixture();
    const second = confirmPhotoMaterialExistingRowBinding({
      session: first.result.session,
      recognition: first.fixture.recognition,
      state: first.result.state,
      snapshot: first.fixture.current.editable_estimate_snapshot,
      payload: first.payload,
      ledger: first.result.ledger,
    });

    expect(second.idempotentReplay).toBe(true);
    expect(second.createdRevisionId).toBe(first.result.createdRevisionId);
    expect(second.state.revisions).toHaveLength(first.result.state.revisions.length);
  });
});
