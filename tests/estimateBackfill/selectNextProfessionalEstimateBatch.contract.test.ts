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
    expect(selection.selected_batch_id).toBe("full-10000-verification");
    expect(selection.selected_batch_type).toBe("infrastructure_blocker_batch");
    expect(selection.template_count).toBe(10000);
    expect(selection.expected_ready_delta).toBe(0);
    expect(selection.expected_generic_reduction).toBe(0);
    expect(selection.expected_rendered_snapshot_count).toBe(10000);
    expect(selection.selected_by_priority_score).toBe(true);
    expect(selection.zero_delta_justified_by_full_green).toBe(true);
    expect(selection.fake_green_claimed).toBe(false);
    expect(selection.marketplace_touched).toBe(false);
    expect(selection.blockers).toEqual([]);

    expect(explanation.final_status).toBe(GREEN_AI_ESTIMATE_BATCH_PRIORITY_EXPLAINED_NO_BUILDS);
    expect(explanation.batch_id).toBe("full-10000-verification");
    expect(explanation.is_selected_batch).toBe(true);
    expect(explanation.priority_score).toBeGreaterThan(0);
    expect(explanation.expected_rendered_snapshot_count).toBe(10000);
    expect(explanation.zero_delta_justified_by_full_green).toBe(true);
    expect(explanation.reason).toContain("All 10000 templates are already ready professional");
    expect(explanation.fake_green_claimed).toBe(false);
    expect(explanation.marketplace_touched).toBe(false);
    expect(explanation.blockers).toEqual([]);
  });
});
