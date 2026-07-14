import { recoverAiEstimateDraft } from "../../src/lib/ai/estimatePersistence";
import { currentRevision, persistenceRecord } from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate draft recovery", () => {
  it("restores the same draft and revision after refresh", () => {
    const record = persistenceRecord();
    const revision = currentRevision(record);

    const recovered = recoverAiEstimateDraft({
      persisted_record: record,
      expected_estimate_id: record.draft.estimate_id,
      expected_revision_id: revision.revision_id,
    });

    expect(recovered.recovery).toMatchObject({
      draft_recovered: true,
      same_estimate_id: true,
      same_revision_id: true,
      rows_restored: true,
      fake_green_claimed: false,
    });
    expect(recovered.record.draft.current_revision_id).toBe(revision.revision_id);
  });
});
