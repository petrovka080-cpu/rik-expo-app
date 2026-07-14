import { applyEstimateRevisionQuantityEdit, restoreEstimateRevisionAsNewRevision } from "../../src/lib/ai/estimateRevisions";
import { currentRevision, estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("restore revision", () => {
  it("restores an old revision as a new current revision", () => {
    const initial = estimateRevisionState();
    const oldRevision = currentRevision(initial);
    const edited = applyEstimateRevisionQuantityEdit(initial, {
      row_key: "row_1",
      quantity: 12,
      created_at: "2026-06-15T01:00:00.000Z",
    });
    const restored = restoreEstimateRevisionAsNewRevision({
      state: edited,
      source_revision_id: oldRevision.revision_id,
      actor_id: "consumer-1",
      created_at: "2026-06-15T02:00:00.000Z",
    });

    expect(currentRevision(restored).version_number).toBe(3);
    expect(currentRevision(restored).source).toBe("RESTORED_FROM_REVISION");
    expect(currentRevision(restored).editable_estimate_snapshot.hash).toBe(oldRevision.editable_estimate_snapshot.hash);
    expect(restored.events.at(-1)?.event_type).toBe("REVISION_RESTORED");
  });
});
