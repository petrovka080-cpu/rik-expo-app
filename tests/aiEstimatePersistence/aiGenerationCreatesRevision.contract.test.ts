import { currentRevision, persistenceRecord } from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate revision persistence", () => {
  it("creates revision one from the generated editable estimate snapshot", () => {
    const record = persistenceRecord();
    const revision = currentRevision(record);

    expect(record.revisions).toHaveLength(1);
    expect(record.revisions[0]).toMatchObject({
      revision_id: revision.revision_id,
      draft_id: record.draft.draft_id,
      version_number: 1,
      immutable: true,
      fake_green_claimed: false,
    });
    expect(revision.editable_estimate_snapshot.rows).toHaveLength(1);
  });
});
