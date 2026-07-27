import {
  explainEstimateBatchPriority,
  GREEN_AI_ESTIMATE_BATCH_PRIORITY_EXPLAINED_NO_BUILDS,
} from "../../scripts/estimate/explainEstimateBatchPriority";
import {
  GREEN_AI_ESTIMATE_AUTONOMOUS_NEXT_BATCH_SELECTED_NO_BUILDS,
  selectNextProfessionalEstimateBatch,
} from "../../scripts/estimate/selectNextProfessionalEstimateBatch";

jest.setTimeout(180000);

describe("select next professional estimate batch", () => {
  it("exposes deterministic autonomous selection and explains why it is not a fake easy green", () => {
    const selection = selectNextProfessionalEstimateBatch({
      writeFiles: false,
      writeRuntime: false,
    });
    const explanation = explainEstimateBatchPriority({
      batchId: selection.selected_batch_id,
      writeRuntime: false,
    });

    expect(selection.final_status).toBe(GREEN_AI_ESTIMATE_AUTONOMOUS_NEXT_BATCH_SELECTED_NO_BUILDS);
    expect(selection.selected_batch_id).toBe("professional-backfill-electrical");
    expect(selection.selected_batch_type).toBe("professional_backfill_batch");
    expect(selection.template_count).toBe(750);
    expect(selection.expected_ready_delta).toBe(750);
    expect(selection.expected_generic_reduction).toBe(0);
    expect(selection.expected_rendered_snapshot_count).toBe(750);
    expect(selection.selected_by_priority_score).toBe(true);
    expect(selection.zero_delta_justified_by_full_green).toBe(false);
    expect(selection.fake_green_claimed).toBe(false);
    expect(selection.marketplace_touched).toBe(false);
    expect(selection.blockers).toEqual([]);

    expect(explanation.final_status).toBe(GREEN_AI_ESTIMATE_BATCH_PRIORITY_EXPLAINED_NO_BUILDS);
    expect(explanation.batch_id).toBe("professional-backfill-electrical");
    expect(explanation.is_selected_batch).toBe(true);
    expect(explanation.priority_score).toBeGreaterThan(0);
    expect(explanation.expected_rendered_snapshot_count).toBe(750);
    expect(explanation.zero_delta_justified_by_full_green).toBe(false);
    expect(explanation.reason).toContain("remaining not-ready/generic counters");
    expect(explanation.fake_green_claimed).toBe(false);
    expect(explanation.marketplace_touched).toBe(false);
    expect(explanation.blockers).toEqual([]);
  });
});
