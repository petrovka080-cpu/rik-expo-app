import { applyEstimateRevisionQuantityEdit } from "../../src/lib/ai/estimateRevisions";
import { currentRevision, estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("no silent overwrite", () => {
  it("blocks writes against a stale base revision", () => {
    const initial = estimateRevisionState();
    const baseRevisionId = currentRevision(initial).revision_id;
    const advanced = applyEstimateRevisionQuantityEdit(initial, {
      row_key: "row_1",
      quantity: 12,
      created_at: "2026-06-15T01:00:00.000Z",
    });

    expect(() => applyEstimateRevisionQuantityEdit(advanced, {
      base_revision_id: baseRevisionId,
      row_key: "row_1",
      quantity: 14,
      created_at: "2026-06-15T02:00:00.000Z",
    })).toThrow("ESTIMATE_REVISION_CONFLICT:1->2");
  });
});
