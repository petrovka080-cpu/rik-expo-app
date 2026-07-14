import {
  applyEstimateRevisionQuantityEdit,
  detectEstimateRevisionConflict,
  recordEstimateRevisionConflict,
} from "../../src/lib/ai/estimateRevisions";
import { currentRevision, estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("two tab revision conflict", () => {
  it("detects a stale base revision and records an explicit conflict", () => {
    const initial = estimateRevisionState();
    const baseRevisionId = currentRevision(initial).revision_id;
    const advanced = applyEstimateRevisionQuantityEdit(initial, {
      row_key: "row_1",
      quantity: 12,
      created_at: "2026-06-15T01:00:00.000Z",
    });
    const conflict = detectEstimateRevisionConflict(advanced, baseRevisionId);
    const recorded = recordEstimateRevisionConflict(advanced, baseRevisionId);

    expect(conflict).toMatchObject({
      status: "REVISION_CONFLICT",
      stale_base_revision: 1,
      current_revision: 2,
      silent_overwrite: false,
      merge_or_reload_prompt_required: true,
      fake_green_claimed: false,
    });
    expect(recorded.conflict).toEqual(conflict);
    expect(recorded.state.conflicts).toHaveLength(1);
    expect(recorded.state.events.at(-1)?.event_type).toBe("REVISION_CONFLICT_DETECTED");
  });
});
