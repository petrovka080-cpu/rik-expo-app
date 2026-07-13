import {
  autosaveAiEstimateQuantityEdit,
  guardAiEstimateAutosaveConcurrency,
} from "../../src/lib/ai/estimatePersistence";
import { currentRevision, persistenceRecord } from "./aiEstimatePersistenceTestHelpers";

describe("AI estimate two-tab autosave guard", () => {
  it("detects stale base revision writes without silent overwrite", () => {
    const record = persistenceRecord();
    const baseRevisionId = currentRevision(record).revision_id;
    const tabOne = autosaveAiEstimateQuantityEdit({
      record,
      base_revision_id: baseRevisionId,
      row_key: "ai_row_1",
      quantity: 250,
      actor_id: "consumer_1",
    });
    const guarded = guardAiEstimateAutosaveConcurrency({
      record: tabOne,
      base_revision_id: baseRevisionId,
    });

    expect(guarded.ok).toBe(false);
    expect(guarded.conflict).toMatchObject({
      stale_base_revision_id: baseRevisionId,
      current_revision_id: currentRevision(tabOne).revision_id,
      silent_overwrite: false,
      merge_or_reload_prompt_required: true,
      fake_green_claimed: false,
    });
  });
});
