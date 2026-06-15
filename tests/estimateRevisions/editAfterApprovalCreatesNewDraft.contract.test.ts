import {
  applyEstimateRevisionQuantityEdit,
  approveEstimateRevisionState,
} from "../../src/lib/ai/estimateRevisions";
import { currentRevision, estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("edit after approval", () => {
  it("creates a new draft revision parented to the approved frozen revision", () => {
    const approved = approveEstimateRevisionState({
      state: estimateRevisionState(),
      actor_id: "consumer-1",
      created_at: "2026-06-15T01:00:00.000Z",
    });
    const approvedRevision = currentRevision(approved);
    const edited = applyEstimateRevisionQuantityEdit(approved, {
      row_key: "row_1",
      quantity: 12,
      actor_id: "consumer-1",
      created_at: "2026-06-15T02:00:00.000Z",
    });
    const current = currentRevision(edited);

    expect(current.version_number).toBe(2);
    expect(current.status).toBe("DRAFT");
    expect(current.parent_revision_id).toBe(approvedRevision.revision_id);
    expect(edited.approval_freezes[0].approved_revision_id).toBe(approvedRevision.revision_id);
  });
});
