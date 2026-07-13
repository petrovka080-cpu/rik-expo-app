import { applyEstimateRevisionQuantityEdit } from "../../src/lib/ai/estimateRevisions";
import { currentRevision, estimateRevisionState, revisionEventTypes } from "./estimateRevisionTestHelpers";

describe("manual quantity edit revision", () => {
  it("creates a new immutable revision and recalculates totals", () => {
    const initial = estimateRevisionState();
    const previous = currentRevision(initial);
    const next = applyEstimateRevisionQuantityEdit(initial, {
      row_key: "row_1",
      quantity: 12,
      actor_id: "consumer-1",
      created_at: "2026-06-15T01:00:00.000Z",
    });
    const revision = currentRevision(next);

    expect(next.revisions).toHaveLength(2);
    expect(revision.version_number).toBe(2);
    expect(revision.parent_revision_id).toBe(previous.revision_id);
    expect(revision.editable_estimate_snapshot.rows[0].quantity).toBe(12);
    expect(revision.editable_estimate_snapshot.rows[0].totalPrice).toBe(6000);
    expect(previous.rows_hash).toBe(initial.revisions[0].rows_hash);
    expect(revisionEventTypes(next)).toContain("QUANTITY_CHANGED");
  });
});
