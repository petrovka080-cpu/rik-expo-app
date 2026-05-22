import {
  WHOLE_APP_50K_FIXTURE_RETENTION_GREEN_STATUS,
  WHOLE_APP_50K_FIXTURE_RETENTION_POLICY,
  WHOLE_APP_50K_LIVE_FIXTURE_REQUIRED_ARCHIVED_ONLY_BLOCKER,
  classifyWholeApp50kFixtureEvidenceMode,
  evaluateWholeApp50kFixtureRetentionPolicy,
} from "../../src/lib/proofFixtures/50kFixtureRetentionPolicy";

describe("whole-app 50k fixture retention policy", () => {
  it("keeps the current 50k fixture as a live proof baseline instead of allowing ad hoc cleanup", () => {
    expect(WHOLE_APP_50K_FIXTURE_RETENTION_POLICY).toMatchObject({
      selectedMode: "retain_live_fixture_in_proof_db",
      proofDbMayRetainFixtureAsBaseline: true,
      cleanupAllowedWithoutArchivedEvidence: false,
      cleanupAllowedWhileReleaseGuardRequiresLiveFixture: false,
      cleanupScope: "proof_run_id_only",
      destructiveCleanupAllowed: false,
      liveFixtureRequiredForCurrentReleaseGuard: true,
      archivedEvidenceMayReplaceLiveFixtureForFreshReleaseGreen: false,
    });
  });

  it("marks live fixture evidence as green when final 50k proof is still present", () => {
    const matrix = evaluateWholeApp50kFixtureRetentionPolicy({
      final50kStatus: "GREEN_FINAL_50K_92_SCORE_REAUDIT_READY",
      fixtureSufficient: true,
      proofRunId: "proof_50k_live_001",
      wholeApp50kProofPassed: true,
      archivedArtifactsPresent: true,
      releaseGuardRequiresLiveFixture: true,
      cleanupRequested: false,
    });

    expect(matrix.final_status).toBe(WHOLE_APP_50K_FIXTURE_RETENTION_GREEN_STATUS);
    expect(matrix.evidence_mode).toBe("live_fixture");
    expect(matrix.live_fixture_retained_as_baseline).toBe(true);
    expect(matrix.cleanup_allowed_now).toBe(false);
    expect(matrix.release_guard_uses_live_fixture_for_fresh_green).toBe(true);
    expect(matrix.archived_evidence_only_can_claim_fresh_green).toBe(false);
    expect(matrix.blockers).toEqual([]);
  });

  it("distinguishes archived evidence from live fixture evidence", () => {
    expect(classifyWholeApp50kFixtureEvidenceMode({
      fixtureSufficient: false,
      proofRunId: "proof_50k_live_001",
      wholeApp50kProofPassed: false,
      archivedArtifactsPresent: true,
    })).toBe("archived_evidence_only");

    const matrix = evaluateWholeApp50kFixtureRetentionPolicy({
      final50kStatus: "GREEN_FINAL_50K_92_SCORE_REAUDIT_READY",
      fixtureSufficient: false,
      proofRunId: "proof_50k_live_001",
      wholeApp50kProofPassed: false,
      archivedArtifactsPresent: true,
      releaseGuardRequiresLiveFixture: true,
    });

    expect(matrix.final_status).toBe("BLOCKED_50K_FIXTURE_RETENTION_CLEANUP_POLICY_NOT_READY");
    expect(matrix.blockers).toContain(WHOLE_APP_50K_LIVE_FIXTURE_REQUIRED_ARCHIVED_ONLY_BLOCKER);
  });
});
