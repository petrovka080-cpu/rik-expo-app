import {
  WHOLE_APP_50K_FIXTURE_POLICY,
  WHOLE_APP_50K_SEED_FLAG_ENV,
  WHOLE_APP_50K_PROOF_RUN_ID_ENV,
} from "../../src/lib/proofFixtures/50kProofFixturePolicy";

describe("whole-app 50k proof fixture policy", () => {
  it("locks 50k as synthetic proof rows, not real users", () => {
    expect(WHOLE_APP_50K_FIXTURE_POLICY).toEqual({
      requiresProofRunId: true,
      requiresExplicitSeedFlag: true,
      allowRealUserCreation: false,
      allowDrop: false,
      allowTruncate: false,
      allowReset: false,
      allowDeleteBusinessRows: false,
      cleanupScope: "proof_run_id_only",
      fixtureMeansSyntheticRowsNotRealUsers: true,
    });
    expect(WHOLE_APP_50K_SEED_FLAG_ENV).toBe("ALLOW_WHOLE_APP_50K_FIXTURE_SEED");
    expect(WHOLE_APP_50K_PROOF_RUN_ID_ENV).toBe("WHOLE_APP_50K_PROOF_RUN_ID");
  });
});
