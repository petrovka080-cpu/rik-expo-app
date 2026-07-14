import { persistenceRecord } from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate draft persistence", () => {
  it("creates a durable draft immediately after AI generation", () => {
    const record = persistenceRecord();

    expect(record.draft).toMatchObject({
      estimate_id: "ai_estimate_1",
      draft_id: "ai_draft_1",
      status: "DRAFT",
      source: "AI_GENERATED",
      fake_green_claimed: false,
    });
    expect(record.draft.current_revision_id).toBe(record.revision_state.current_revision_id);
    expect(record.hard_deleted).toBe(false);
  });
});
