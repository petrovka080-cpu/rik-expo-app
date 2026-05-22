import {
  FINAL_50K_92_BLOCKED_STATUS,
  FINAL_50K_92_BLOCKED_PREFIX,
  FINAL_50K_92_GREEN_STATUS,
  buildFinal50k92ScoreReaudit,
} from "../../scripts/audit/final50k92ScoreReaudit.shared";

describe("final 50k readiness", () => {
  it("allows 9.2 readiness only when live RLS and 50k database proofs are present", () => {
    const report = buildFinal50k92ScoreReaudit();
    const liveProofsPassed = report.matrix.rls_dynamic_proof_passed === true
      && report.matrix.whole_app_50k_proof_passed === true;

    expect(report.matrix.p0_remaining).toBe(0);
    expect(report.matrix.query_boundary_resolved).toBe(true);
    expect(report.matrix.media_storage_100k_passed).toBe(true);
    expect(report.matrix.release_pipeline_passed).toBe(true);
    expect(report.matrix.fake_green_claimed).toBe(false);

    if (liveProofsPassed) {
      expect(report.matrix.final_status).toBe(FINAL_50K_92_GREEN_STATUS);
      expect(report.matrix.p1_remaining).toBe(0);
      expect(report.matrix.external_blockers).toEqual([]);
      expect(report.matrix.new_score_out_of_10_gte_9_2).toBe(true);
      return;
    }

    expect([
      FINAL_50K_92_BLOCKED_STATUS,
      String(report.matrix.final_status).startsWith(FINAL_50K_92_BLOCKED_PREFIX)
        ? report.matrix.final_status
        : null,
    ]).toContain(report.matrix.final_status);
    expect(report.matrix.p1_remaining).toBeGreaterThan(0);
    expect(report.matrix.new_score_out_of_10_gte_9_2).toBe(false);
    expect(report.matrix.external_blockers).toEqual(report.riskRegister.risks.map((risk) => risk.external_blocker));
  });
});
