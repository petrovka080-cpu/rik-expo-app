import { applyEstimateRevisionQuantityEdit } from "../../src/lib/ai/estimateRevisions";
import { currentRevision, estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("old revision immutability", () => {
  it("keeps the previous revision content and hashes unchanged", () => {
    const initial = estimateRevisionState();
    const old = currentRevision(initial);
    const oldRow = old.editable_estimate_snapshot.rows[0];
    const next = applyEstimateRevisionQuantityEdit(initial, {
      row_key: "row_1",
      quantity: 12,
      created_at: "2026-06-15T01:00:00.000Z",
    });

    expect(next.revisions[0].revision_id).toBe(old.revision_id);
    expect(next.revisions[0].rows_hash).toBe(old.rows_hash);
    expect(next.revisions[0].editable_estimate_snapshot.rows[0]).toEqual(oldRow);
    expect(next.revisions[0].immutable).toBe(true);
  });
});
