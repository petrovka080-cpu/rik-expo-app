import {
  autosaveAiEstimateUnitPriceEdit,
  bindAiEstimatePdfToCurrentRevision,
} from "../../src/lib/ai/estimatePersistence";
import {
  currentRevision,
  firstRowKey,
  PERSISTENCE_EDIT_TIME,
  persistenceRecord,
} from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate PDF revision binding", () => {
  it("binds PDF export to current revision without recalculating separately", () => {
    const edited = autosaveAiEstimateUnitPriceEdit({
      record: persistenceRecord(),
      row_key: "ai_row_1",
      unit_price: 1500,
      actor_id: "consumer_1",
      created_at: PERSISTENCE_EDIT_TIME,
    });
    const revision = currentRevision(edited);
    const bound = bindAiEstimatePdfToCurrentRevision({
      record: edited,
      pdf_id: "pdf_1",
      actor_id: "consumer_1",
      created_at: "2026-06-16T00:06:00.000Z",
    });

    expect(firstRowKey(bound.record)).toBe("ai_row_1");
    expect(bound.pdf_export.pdf_export_revision_id).toBe(revision.revision_id);
    expect(bound.pdf_export.pdf_rows_hash).toBe(revision.rows_hash);
    expect(bound.pdf_export.pdf_recalculated_separately).toBe(false);
  });
});
