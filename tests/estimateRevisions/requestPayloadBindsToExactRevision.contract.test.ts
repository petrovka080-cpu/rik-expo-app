import { bindEstimateRevisionToRequestPayload } from "../../src/lib/ai/estimateRevisions";
import { currentRevision, estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("request payload revision binding", () => {
  it("binds submit payload to current revision hashes", () => {
    const state = estimateRevisionState();
    const revision = currentRevision(state);
    const bound = bindEstimateRevisionToRequestPayload({
      state,
      request_payload_id: "marketplace_demand_1",
      actor_id: "consumer-1",
      created_at: "2026-06-15T01:00:00.000Z",
    });

    expect(bound.binding.request_revision_id).toBe(revision.revision_id);
    expect(bound.binding.request_snapshot_id).toBe(revision.snapshot_id);
    expect(bound.binding.request_rows_hash).toBe(revision.rows_hash);
    expect(bound.binding.request_recalculated_separately).toBe(false);
    expect(bound.state.request_bindings[0]).toEqual(bound.binding);
  });
});
