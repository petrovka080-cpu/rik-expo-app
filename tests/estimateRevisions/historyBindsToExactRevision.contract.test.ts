import { bindEstimateRevisionToHistoryEntry } from "../../src/lib/ai/estimateRevisions";
import { currentRevision, estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("history revision binding", () => {
  it("binds history row to current revision hashes", () => {
    const state = estimateRevisionState();
    const revision = currentRevision(state);
    const bound = bindEstimateRevisionToHistoryEntry({
      state,
      history_entry_id: "history_1",
      created_at: "2026-06-15T01:00:00.000Z",
    });

    expect(bound.binding.history_revision_id).toBe(revision.revision_id);
    expect(bound.binding.history_snapshot_id).toBe(revision.snapshot_id);
    expect(bound.binding.history_rows_hash).toBe(revision.rows_hash);
    expect(bound.binding.history_recalculated_separately).toBe(false);
    expect(bound.state.history_bindings[0]).toEqual(bound.binding);
  });
});
