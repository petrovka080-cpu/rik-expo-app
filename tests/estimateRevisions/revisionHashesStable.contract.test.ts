import {
  applyEstimateRevisionQuantityEdit,
  computeEstimateRevisionFullSnapshotHash,
  computeEstimateRevisionRowsHash,
  computeEstimateRevisionTotalsHash,
} from "../../src/lib/ai/estimateRevisions";
import { currentRevision, estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("revision hashes stable", () => {
  it("recomputes to the stored rows/totals/full hashes", () => {
    const state = applyEstimateRevisionQuantityEdit(estimateRevisionState(), {
      row_key: "row_1",
      quantity: 12,
      created_at: "2026-06-15T01:00:00.000Z",
    });
    const revision = currentRevision(state);

    expect(computeEstimateRevisionRowsHash(revision.editable_estimate_snapshot)).toBe(revision.rows_hash);
    expect(computeEstimateRevisionTotalsHash(revision.editable_estimate_snapshot)).toBe(revision.totals_hash);
    expect(computeEstimateRevisionFullSnapshotHash({
      estimate_id: revision.estimate_id,
      request_id: revision.request_id,
      selected_work_key: revision.selected_work_key,
      region: revision.region,
      currency: revision.currency,
      editable_estimate_snapshot: revision.editable_estimate_snapshot,
    })).toBe(revision.full_snapshot_hash);
  });
});
