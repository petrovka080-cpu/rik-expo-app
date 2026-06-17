import {
  isAiEstimateDraftActive,
  listActiveAiEstimateHistoryItems,
  recoverLatestActiveAiEstimateDraft,
  submitAiEstimateRequestFromCurrentRevision,
} from "../../src/lib/ai/estimatePersistence";
import { persistenceRecord } from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate reload active workspace selection", () => {
  it("does not recover the latest approved estimate as an active draft", () => {
    const draft = persistenceRecord();
    const { record: approved } = submitAiEstimateRequestFromCurrentRevision({
      record: draft,
      request_payload_id: "request_payload_laminate",
      actor_id: "consumer_1",
      created_at: "2026-06-16T00:10:00.000Z",
    });

    const recovered = recoverLatestActiveAiEstimateDraft([approved]);
    const history = listActiveAiEstimateHistoryItems([approved]);

    expect(approved.draft.status).toBe("APPROVED");
    expect(isAiEstimateDraftActive(approved)).toBe(false);
    expect(recovered).toBeNull();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      draft_id: approved.draft.draft_id,
      status: "APPROVED",
      visible_in_history: true,
    });
    expect(history[0].current_revision_id).toBe(approved.draft.current_revision_id);
  });
});
