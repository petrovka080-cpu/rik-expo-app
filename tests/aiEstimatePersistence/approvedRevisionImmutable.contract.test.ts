import { submitAiEstimateRequestFromCurrentRevision } from "../../src/lib/ai/estimatePersistence";
import { currentRevision, persistenceRecord } from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate approved revision freeze", () => {
  it("marks the approved current revision immutable and frozen", () => {
    const submitted = submitAiEstimateRequestFromCurrentRevision({
      record: persistenceRecord(),
      request_payload_id: "request_payload_1",
      actor_id: "consumer_1",
      created_at: "2026-06-16T00:07:00.000Z",
    });
    const revision = currentRevision(submitted.record);

    expect(submitted.record.draft.status).toBe("APPROVED");
    expect(revision.status).toBe("APPROVED");
    expect(revision.immutable).toBe(true);
    expect(submitted.record.revision_state.approval_freezes[0]?.approved_revision_id).toBe(revision.revision_id);
  });
});
