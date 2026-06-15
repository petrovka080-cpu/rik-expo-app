import { approveEstimateRevisionState, isEstimateRevisionFrozen } from "../../src/lib/ai/estimateRevisions";
import { currentRevision, estimateRevisionState, revisionEventTypes } from "./estimateRevisionTestHelpers";

describe("approved revision freeze", () => {
  it("marks approved revision frozen with exact hashes", () => {
    const approved = approveEstimateRevisionState({
      state: estimateRevisionState(),
      actor_id: "consumer-1",
      created_at: "2026-06-15T01:00:00.000Z",
    });
    const revision = currentRevision(approved);
    const freeze = approved.approval_freezes[0];

    expect(revision.status).toBe("APPROVED");
    expect(isEstimateRevisionFrozen(approved, revision.revision_id)).toBe(true);
    expect(freeze.approved_revision_id).toBe(revision.revision_id);
    expect(freeze.approved_full_snapshot_hash).toBe(revision.full_snapshot_hash);
    expect(freeze.immutable).toBe(true);
    expect(revisionEventTypes(approved)).toContain("APPROVED");
  });
});
