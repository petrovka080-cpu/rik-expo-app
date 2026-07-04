import {
  ingestEstimatorFeedback,
  runEstimatorFeedbackMutationGates,
} from "../../scripts/estimate/ingestEstimatorFeedback";

describe("estimator feedback workflow", () => {
  it("requires revision-linked quantity changes", () => {
    const accepted = ingestEstimatorFeedback({
      feedback_id: "feedback-1",
      estimate_id: "estimate-1",
      revision_id: "revision-1",
      reviewer_id: "expert-1",
      decision: "request_change",
      row_changes: [{
        row_id: "row-1",
        change_type: "quantity_changed",
        reason_ru: "expert correction",
        before_quantity: 1,
        after_quantity: 2,
        revision_link_id: "revision-event-1",
      }],
    });
    expect(accepted.accepted).toBe(true);
    expect(runEstimatorFeedbackMutationGates()).toMatchObject({
      silent_quantity_change_rejected: true,
      valid_feedback_accepted: true,
    });
  });
});
