import { softDeleteAiEstimateDraft } from "../../src/lib/ai/estimatePersistence";
import { persistenceRecord } from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate hard delete guard", () => {
  it("does not hard delete generated or user-deleted drafts", () => {
    const record = persistenceRecord();
    const deleted = softDeleteAiEstimateDraft({ record });

    expect(record.hard_deleted).toBe(false);
    expect(deleted.hard_deleted).toBe(false);
    expect(deleted.revision_state.revisions.length).toBe(record.revision_state.revisions.length);
  });
});
