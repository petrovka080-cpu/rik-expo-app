import {
  AI_ESTIMATE_FINAL_READINESS_GREEN_STATUS,
  AI_ESTIMATE_FINAL_READINESS_WAVE,
  buildAiEstimateEnterpriseFinalReadinessReport,
} from "../../scripts/audit/runAiEstimateEnterpriseFinalReadinessGoNoGo";

const verified = {
  typecheckPassed: true,
  lintPassed: true,
  gitDiffCheckPassed: true,
  targetedTestsPassed: true,
  architectureTestsPassed: true,
  fullJestPassed: true,
  releaseVerifyPassed: true,
  commitCreated: true,
  branchPushed: true,
  finalWorktreeClean: true,
};

describe("AI estimate final readiness GO/NO-GO matrix", () => {
  it("aggregates all prerequisite green matrices into one internal-canary GO decision", () => {
    const report = buildAiEstimateEnterpriseFinalReadinessReport({
      verification: verified,
      ignoreNonArtifactDirtyPaths: true,
      now: "2026-05-29T00:00:00.000Z",
    });

    expect(report.matrix.wave).toBe(AI_ESTIMATE_FINAL_READINESS_WAVE);
    expect(report.matrix.final_status).toBe(AI_ESTIMATE_FINAL_READINESS_GREEN_STATUS);
    expect(report.matrix.go_no_go_decision).toBe("GO_INTERNAL_CANARY_NO_PRODUCTION_ROLLOUT");
    expect(report.matrix.all_required_matrices_green).toBe(true);
    expect(report.matrix.web_android_pdf_proof_present).toBe(true);
    expect(report.matrix.performance_cost_green).toBe(true);
    expect(report.matrix.rollback_ready).toBe(true);
    expect(report.matrix.kill_switches_ready).toBe(true);
    expect(report.matrix.observability_ready).toBe(true);
    expect(report.matrix.production_rollout_enabled).toBe(false);
    expect(report.matrix.fake_green_claimed).toBe(false);
    expect(report.matrix.blockers).toEqual([]);
  });

  it("blocks the GO decision when release verification is not confirmed", () => {
    const report = buildAiEstimateEnterpriseFinalReadinessReport({
      verification: { ...verified, releaseVerifyPassed: false },
      ignoreNonArtifactDirtyPaths: true,
      now: "2026-05-29T00:00:00.000Z",
    });

    expect(report.matrix.final_status).toBe("BLOCKED_AI_ESTIMATE_ENTERPRISE_FINAL_READINESS_AUDIT_GO_NO_GO");
    expect(report.matrix.go_no_go_decision).toBe("NO_GO");
    expect(report.matrix.blockers).toContain("BLOCKED_RELEASE_VERIFY_NOT_CONFIRMED");
    expect(report.matrix.fake_green_claimed).toBe(false);
  });
});
