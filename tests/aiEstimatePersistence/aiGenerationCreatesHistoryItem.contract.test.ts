import { persistenceRecord } from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate history persistence", () => {
  it("creates a visible history item from the same generated draft", () => {
    const record = persistenceRecord();
    const item = record.history_items[0];

    expect(item).toMatchObject({
      estimate_id: record.draft.estimate_id,
      draft_id: record.draft.draft_id,
      current_revision_id: record.draft.current_revision_id,
      status: "DRAFT",
      visible_in_history: true,
      fake_green_claimed: false,
    });
  });
});
