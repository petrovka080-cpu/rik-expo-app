import type { WholeApp50kFixturePolicy } from "./50kProofFixtureTypes";

export const WHOLE_APP_50K_SEED_FLAG_ENV = "ALLOW_WHOLE_APP_50K_FIXTURE_SEED";
export const WHOLE_APP_50K_PROOF_RUN_ID_ENV = "WHOLE_APP_50K_PROOF_RUN_ID";
export const WHOLE_APP_50K_FIXTURE_DATA_BLOCKER = "BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_DATA_REQUIRED";
export const WHOLE_APP_50K_PROOF_OWNER_BLOCKER = "BLOCKED_EXTERNAL_ONLY_PROOF_OWNER_USER_REQUIRED";
export const WHOLE_APP_50K_TZ_LOCK_WAVE = "S_50K_SYNTHETIC_FIXTURE_TZ_LOCK_CONTRACTS_CLOSEOUT";
export const WHOLE_APP_50K_TZ_LOCK_GREEN_STATUS = "GREEN_50K_SYNTHETIC_FIXTURE_TZ_LOCK_READY";

export const WHOLE_APP_50K_FIXTURE_POLICY: WholeApp50kFixturePolicy = {
  requiresProofRunId: true,
  requiresExplicitSeedFlag: true,
  allowRealUserCreation: false,
  allowDrop: false,
  allowTruncate: false,
  allowReset: false,
  allowDeleteBusinessRows: false,
  cleanupScope: "proof_run_id_only",
  fixtureMeansSyntheticRowsNotRealUsers: true,
};
