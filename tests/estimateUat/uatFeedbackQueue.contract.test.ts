import {
  runApprovedUatCorrectionDryRun,
  validateApprovedUatCorrection,
} from "../../scripts/estimate/applyApprovedUatCorrection";
import { validateUatFeedbackQueue } from "../../scripts/estimate/buildRoleBasedUatDashboard";

describe("role based UAT feedback queue", () => {
  it("links feedback to scenario/revision and rejects unversioned corrections", () => {
    const validation = validateUatFeedbackQueue();
    const dryRun = runApprovedUatCorrectionDryRun();
    const invalid = validateApprovedUatCorrection({
      feedback_id: "UAT-FB-P2-001",
      scenario_id: "UAT-CORE_REPAIR-001",
      revision_id: "revision-1",
      approved_by_owner: true,
      changed_artifact: "formula",
      previous_version: "1.0.0",
      next_version: "1.0.0",
      correction_reason: "bad test",
      prompt_specific_hardcode: true,
      llm_quantity_correction: true,
      silent_correction: true,
    });

    expect(validation.blockers).toEqual([]);
    expect(validation.feedback_links_to_revision).toBe(true);
    expect(validation.feedback_severity_defined).toBe(true);
    expect(validation.approved_correction_requires_version_bump).toBe(true);
    expect(dryRun.summary.final_status).toBe("GREEN_AI_ESTIMATE_UAT_APPROVED_CORRECTION_GATE");
    expect(invalid.approved_correction_valid).toBe(false);
    expect(invalid.blockers).toEqual(expect.arrayContaining([
      "approved_correction_requires_version_bump",
      "prompt_specific_hardcode_rejected",
      "llm_quantity_correction_rejected",
      "silent_correction_rejected",
    ]));
  });
});
