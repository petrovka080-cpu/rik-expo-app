import { listActiveAiEstimateHistoryItems, softDeleteAiEstimateDraft } from "../../src/lib/ai/estimatePersistence";
import { persistenceRecord } from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate draft delete", () => {
  it("marks draft deleted without physically removing revision history", () => {
    const record = persistenceRecord();
    const deleted = softDeleteAiEstimateDraft({
      record,
      deleted_at: "2026-06-16T00:08:00.000Z",
    });

    expect(deleted.draft.status).toBe("DELETED_BY_USER");
    expect(deleted.draft.deleted_at).toBe("2026-06-16T00:08:00.000Z");
    expect(deleted.hard_deleted).toBe(false);
    expect(deleted.revisions).toHaveLength(record.revisions.length);
    expect(listActiveAiEstimateHistoryItems([deleted])).toHaveLength(0);
  });
});
