import { evaluateAiEstimatePersistenceNoDesync } from "../../src/lib/ai/estimatePersistence";
import { persistenceRecord } from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate history source binding", () => {
  it("keeps history tied to the same estimate and current revision", () => {
    const record = persistenceRecord();
    const proof = evaluateAiEstimatePersistenceNoDesync(record);
    const item = record.history_items[0];

    expect(proof.history_reads_same_estimate_source).toBe(true);
    expect(item?.estimate_id).toBe(record.draft.estimate_id);
    expect(item?.current_revision_id).toBe(record.draft.current_revision_id);
  });
});
