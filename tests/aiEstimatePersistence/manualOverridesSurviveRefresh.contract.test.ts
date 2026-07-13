import {
  autosaveAiEstimateQuantityEdit,
  autosaveAiEstimateUnitPriceEdit,
  recoverAiEstimateDraft,
} from "../../src/lib/ai/estimatePersistence";
import {
  currentRevision,
  firstRowKey,
  persistenceRecord,
} from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate manual overrides recovery", () => {
  it("restores manual quantity and price overrides after refresh", () => {
    const quantityEdited = autosaveAiEstimateQuantityEdit({
      record: persistenceRecord(),
      row_key: "ai_row_1",
      quantity: 250,
      actor_id: "consumer_1",
    });
    const priceEdited = autosaveAiEstimateUnitPriceEdit({
      record: quantityEdited,
      row_key: firstRowKey(quantityEdited),
      unit_price: 1500,
      actor_id: "consumer_1",
    });
    const recovered = recoverAiEstimateDraft({
      persisted_record: priceEdited,
      expected_revision_id: currentRevision(priceEdited).revision_id,
    });
    const row = currentRevision(recovered.record).editable_estimate_snapshot.rows[0];

    expect(recovered.recovery.manual_overrides_restored).toBe(true);
    expect(row?.quantity).toBe(250);
    expect(row?.quantitySource).toBe("user_override");
    expect(row?.manualPrice?.unitPrice).toBe(1500);
  });
});
