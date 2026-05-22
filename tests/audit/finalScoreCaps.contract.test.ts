import { buildFinal50k92ScoreReaudit } from "../../scripts/audit/final50k92ScoreReaudit.shared";

describe("final 50k 9.2 score caps", () => {
  it("applies exact score caps for missing live evidence and removes them after live proofs", () => {
    const report = buildFinal50k92ScoreReaudit();
    const capNames = report.scoreCaps.active_caps.map((cap) => cap.name);
    const liveProofsPassed = report.matrix.rls_dynamic_proof_passed === true
      && report.matrix.whole_app_50k_proof_passed === true;

    expect(report.scoreCaps.score_caps_applied).toBe(true);
    if (liveProofsPassed) {
      expect(capNames).not.toContain("rls_dynamic_incomplete");
      expect(capNames).not.toContain("whole_app_50k_missing");
      expect(report.scorecard.new_score_out_of_10_gte_9_2).toBe(true);
      expect(report.matrix.new_score_out_of_10_gte_9_2).toBe(true);
      return;
    }

    if (!report.matrix.rls_dynamic_proof_passed) {
      expect(capNames).toContain("rls_dynamic_incomplete");
    }
    if (!report.matrix.whole_app_50k_proof_passed) {
      expect(capNames).toContain("whole_app_50k_missing");
    }
    expect(report.scorecard.new_score_out_of_10).toBeLessThanOrEqual(report.scoreCaps.effective_max_score);
    expect(report.scorecard.new_score_out_of_10_gte_9_2).toBe(false);
    expect(report.matrix.new_score_out_of_10_gte_9_2).toBe(false);
  });
});
