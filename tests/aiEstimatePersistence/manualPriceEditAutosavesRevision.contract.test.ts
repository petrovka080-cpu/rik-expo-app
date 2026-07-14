import { autosaveAiEstimateUnitPriceEdit } from "../../src/lib/ai/estimatePersistence";
import {
  currentRevision,
  firstRowKey,
  PERSISTENCE_EDIT_TIME,
  persistenceRecord,
} from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate price autosave", () => {
  it("creates a new revision and preserves the manual price override", () => {
    const record = persistenceRecord();
    const previous = currentRevision(record);
    const edited = autosaveAiEstimateUnitPriceEdit({
      record,
      base_revision_id: previous.revision_id,
      row_key: firstRowKey(record),
      unit_price: 1500,
      actor_id: "consumer_1",
      created_at: PERSISTENCE_EDIT_TIME,
    });
    const revision = currentRevision(edited);
    const row = revision.editable_estimate_snapshot.rows[0];

    expect(revision.version_number).toBe(2);
    expect(row?.unitPrice).toBe(1500);
    expect(row?.manualPrice?.unitPrice).toBe(1500);
    expect(row?.priceSource).toBe("user");
    expect(edited.history_items[0]?.current_revision_id).toBe(revision.revision_id);
  });
});
