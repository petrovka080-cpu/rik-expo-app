import {
  evaluateWholeApp50kFixtureRetentionPolicy,
} from "../../src/lib/proofFixtures/50kFixtureRetentionPolicy";

describe("whole-app 50k fixture cleanup retention gate", () => {
  it("blocks cleanup while release guard still requires the live fixture", () => {
    const matrix = evaluateWholeApp50kFixtureRetentionPolicy({
      final50kStatus: "GREEN_FINAL_50K_92_SCORE_REAUDIT_READY",
      fixtureSufficient: true,
      proofRunId: "proof_50k_live_001",
      wholeApp50kProofPassed: true,
      archivedArtifactsPresent: true,
      releaseGuardRequiresLiveFixture: true,
      cleanupRequested: true,
      cleanupScope: "proof_run_id_only",
      ownerDecisionRecorded: true,
      businessRowsDeleted: 0,
      targetDatabaseKind: "proof",
    });

    expect(matrix.cleanup_allowed_now).toBe(false);
    expect(matrix.blockers).toContain("BLOCKED_50K_FIXTURE_CLEANUP_RELEASE_GUARD_STILL_REQUIRES_LIVE_FIXTURE");
  });

  it("blocks cleanup without archived artifacts and exact proof_run_id scoping", () => {
    const matrix = evaluateWholeApp50kFixtureRetentionPolicy({
      final50kStatus: "GREEN_FINAL_50K_92_SCORE_REAUDIT_READY",
      fixtureSufficient: true,
      proofRunId: null,
      wholeApp50kProofPassed: true,
      archivedArtifactsPresent: false,
      releaseGuardRequiresLiveFixture: false,
      cleanupRequested: true,
      cleanupScope: "all_rows",
      ownerDecisionRecorded: false,
      businessRowsDeleted: 1,
      targetDatabaseKind: "production",
    });

    expect(matrix.cleanup_allowed_now).toBe(false);
    expect(matrix.cleanup_deletes_business_rows_allowed).toBe(false);
    expect(matrix.blockers).toEqual(expect.arrayContaining([
      "BLOCKED_50K_FIXTURE_ARCHIVED_EVIDENCE_REQUIRED_BEFORE_RETENTION_CLOSEOUT",
      "BLOCKED_50K_FIXTURE_CLEANUP_PROOF_RUN_ID_REQUIRED",
      "BLOCKED_50K_FIXTURE_CLEANUP_SCOPE_MUST_BE_PROOF_RUN_ID_ONLY",
      "BLOCKED_50K_FIXTURE_CLEANUP_OWNER_DECISION_REQUIRED",
      "BLOCKED_50K_FIXTURE_CLEANUP_PRODUCTION_DB_REQUIRES_SEPARATE_SIGNOFF",
      "BLOCKED_50K_FIXTURE_CLEANUP_TOUCHED_BUSINESS_ROWS",
    ]));
  });
});
