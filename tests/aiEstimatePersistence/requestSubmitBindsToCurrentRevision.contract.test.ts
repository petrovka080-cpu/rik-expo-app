import {
  autosaveAiEstimateQuantityEdit,
  submitAiEstimateRequestFromCurrentRevision,
} from "../../src/lib/ai/estimatePersistence";
import {
  currentRevision,
  firstRowKey,
  persistenceRecord,
} from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate request revision binding", () => {
  it("submits the request from the current edited revision", () => {
    const edited = autosaveAiEstimateQuantityEdit({
      record: persistenceRecord(),
      row_key: "ai_row_1",
      quantity: 250,
      actor_id: "consumer_1",
      created_at: "2026-06-16T00:05:00.000Z",
    });
    const revision = currentRevision(edited);
    const submitted = submitAiEstimateRequestFromCurrentRevision({
      record: edited,
      request_payload_id: "request_payload_1",
      actor_id: "consumer_1",
      created_at: "2026-06-16T00:07:00.000Z",
    });

    expect(firstRowKey(submitted.record)).toBe("ai_row_1");
    expect(submitted.request_binding).toMatchObject({
      request_payload_id: "request_payload_1",
      request_revision_id: revision.revision_id,
      request_rows_hash: revision.rows_hash,
      request_recalculated_separately: false,
      request_created: true,
      approved_revision_immutable: true,
    });
  });
});
