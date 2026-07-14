import {
  AI_ESTIMATE_FINAL_READINESS_GREEN_STATUS,
  AI_ESTIMATE_FINAL_READINESS_WAVE,
  buildAiEstimateEnterpriseFinalReadinessReport,
} from "../../scripts/audit/runAiEstimateEnterpriseFinalReadinessGoNoGo";
import { isIosTestFlightInternalQaScopedRun } from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

const verified = {
  typecheckPassed: true,
  lintPassed: true,
  gitDiffCheckPassed: true,
  targetedTestsPassed: true,
  architectureTestsPassed: true,
  playwrightWebPassed: true,
  androidApi34SmokePassed: true,
  pdfFinalProofPassed: true,
  runtimeProofPassed: true,
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
    if (isIosTestFlightInternalQaScopedRun()) {
      expect(report.matrix.final_status).not.toBe(AI_ESTIMATE_FINAL_READINESS_GREEN_STATUS);
      expect(report.matrix.go_no_go_decision).toBe("NO_GO");
      expect(report.matrix.all_prerequisites_green).toBe(false);
      expect(report.matrix.matrix_ledger_passed).toBe(false);
      expect(report.matrix.production_rollout_enabled).toBe(false);
      expect(report.matrix.fake_green_claimed).toBe(false);
      expect(report.matrix.blockers.length).toBeGreaterThan(0);
      return;
    }

    expect(report.matrix.final_status).toBe(AI_ESTIMATE_FINAL_READINESS_GREEN_STATUS);
    expect(report.matrix.go_no_go_decision).toBe("GO_INTERNAL_CANARY_ONLY");
    expect(report.matrix.all_prerequisites_green).toBe(true);
    expect(report.matrix.matrix_ledger_passed).toBe(true);
    expect(report.matrix.live_web_journey_passed).toBe(true);
    expect(report.matrix.android_api34_passed).toBe(true);
    expect(report.matrix.pdf_final_proof_passed).toBe(true);
    expect(report.matrix.performance_cost_green).toBe(true);
    expect(report.matrix.rollback_ready).toBe(true);
    expect(report.matrix.kill_switch_ready).toBe(true);
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

    expect(report.matrix.final_status).toBe(
      report.matrix.all_prerequisites_green
        ? "NO_GO_AI_ESTIMATE_ENTERPRISE_FINAL_READINESS"
        : "NO_GO_PREREQUISITE_NOT_GREEN",
    );
    expect(report.matrix.go_no_go_decision).toBe("NO_GO");
    expect(report.matrix.blockers).toContain("RELEASE_VERIFY_NOT_CONFIRMED");
    expect(report.matrix.fake_green_claimed).toBe(false);
  });
});
