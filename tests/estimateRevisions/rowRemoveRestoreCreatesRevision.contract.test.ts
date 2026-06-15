import {
  applyEstimateRevisionRowRemoval,
  applyEstimateRevisionRowRestore,
} from "../../src/lib/ai/estimateRevisions";
import { currentRevision, estimateRevisionState, revisionEventTypes } from "./estimateRevisionTestHelpers";

describe("row remove and restore revisions", () => {
  it("creates separate revisions for remove and restore", () => {
    const removed = applyEstimateRevisionRowRemoval(estimateRevisionState(), {
      row_key: "row_1",
      actor_id: "consumer-1",
      created_at: "2026-06-15T01:00:00.000Z",
    });
    const restored = applyEstimateRevisionRowRestore(removed, {
      row_key: "row_1",
      actor_id: "consumer-1",
      created_at: "2026-06-15T02:00:00.000Z",
    });

    expect(currentRevision(removed).editable_estimate_snapshot.rows[0].removed).toBe(true);
    expect(currentRevision(restored).editable_estimate_snapshot.rows[0].removed).toBe(false);
    expect(currentRevision(restored).version_number).toBe(3);
    expect(revisionEventTypes(restored)).toEqual([
      "AI_ESTIMATE_CREATED",
      "ROW_REMOVED",
      "ROW_RESTORED",
    ]);
  });
});
