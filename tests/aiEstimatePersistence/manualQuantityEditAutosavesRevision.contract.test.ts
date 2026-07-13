import { autosaveAiEstimateQuantityEdit } from "../../src/lib/ai/estimatePersistence";
import {
  currentRevision,
  firstRowKey,
  PERSISTENCE_EDIT_TIME,
  persistenceRecord,
} from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate quantity autosave", () => {
  it("creates a new revision and updates history after manual quantity edit", () => {
    const record = persistenceRecord();
    const previous = currentRevision(record);
    const edited = autosaveAiEstimateQuantityEdit({
      record,
      base_revision_id: previous.revision_id,
      row_key: firstRowKey(record),
      quantity: 250,
      actor_id: "consumer_1",
      created_at: PERSISTENCE_EDIT_TIME,
    });
    const revision = currentRevision(edited);

    expect(revision.revision_id).not.toBe(previous.revision_id);
    expect(revision.version_number).toBe(2);
    expect(revision.editable_estimate_snapshot.rows[0]?.quantity).toBe(250);
    expect(revision.editable_estimate_snapshot.rows[0]?.quantitySource).toBe("user_override");
    expect(edited.history_items[0]?.current_revision_id).toBe(revision.revision_id);
    expect(edited.history_items[0]?.updated_at).toBe(PERSISTENCE_EDIT_TIME);
  });
});
