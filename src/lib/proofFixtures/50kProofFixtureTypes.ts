export type WholeApp50kProofRunId = `proof_${string}`;

export type WholeApp50kFixtureMode =
  | "smoke"
  | "verify"
  | "cleanup"
  | "verify-empty"
  | "full";

export type WholeApp50kFixturePolicy = {
  requiresProofRunId: true;
  requiresExplicitSeedFlag: true;
  allowRealUserCreation: false;
  allowDrop: false;
  allowTruncate: false;
  allowReset: false;
  allowDeleteBusinessRows: false;
  cleanupScope: "proof_run_id_only";
  fixtureMeansSyntheticRowsNotRealUsers: true;
};

export type WholeApp50kFixtureCounts = {
  b2cRequests: number;
  b2cRequestItems: number;
  mediaRows: number;
  pdfRows: number;
  marketplaceListings: number;
  events: number;
};

export type WholeApp50kFixtureMinimumRequired = {
  b2cRequests: 50000;
  b2cRequestItems: 250000;
  mediaRows: 100000;
  pdfRows: 50000;
  marketplaceListings: 50000;
  events: 1000000;
};

export type WholeApp50kFixtureBlocker =
  | "BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_DATA_REQUIRED"
  | "BLOCKED_EXTERNAL_ONLY_PROOF_OWNER_USER_REQUIRED";

export type WholeApp50kFixtureSufficiency = {
  fixtureSufficient: boolean;
  counts: WholeApp50kFixtureCounts;
  minimumRequired: WholeApp50kFixtureMinimumRequired;
  blocker?: WholeApp50kFixtureBlocker;
};

export type WholeApp50kTzLockMatrix = {
  wave: "S_50K_SYNTHETIC_FIXTURE_TZ_LOCK_CONTRACTS_CLOSEOUT";
  final_status: "GREEN_50K_SYNTHETIC_FIXTURE_TZ_LOCK_READY";
  new_product_feature_added: false;
  fixture_seed_executed: false;
  fifty_k_means_synthetic_rows_not_real_users: true;
  real_auth_users_required_for_50k: false;
  mass_auth_user_creation_allowed: false;
  proof_run_id_required: true;
  explicit_fixture_seed_flag_required: true;
  cleanup_scope: "proof_run_id_only";
  drop_allowed: false;
  truncate_allowed: false;
  reset_allowed: false;
  delete_business_rows_allowed: false;
  disable_rls_allowed: false;
  broad_public_policy_allowed: false;
  fixture_sufficiency_check_required: true;
  empty_db_status: "BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_DATA_REQUIRED";
  empty_db_marked_as_perf_failure: false;
  fake_green_on_empty_fixture_blocked: true;
  runner_modes_defined: WholeApp50kFixtureMode[];
  release_guard_requires_fixture_sufficient_for_final_9_2: true;
  full_jest_passed: boolean;
  release_verify_passed: boolean;
  fake_green_claimed: false;
};

export const WHOLE_APP_50K_FIXTURE_MODES = [
  "smoke",
  "verify",
  "cleanup",
  "verify-empty",
  "full",
] as const satisfies readonly WholeApp50kFixtureMode[];

export const WHOLE_APP_50K_MINIMUM_REQUIRED: WholeApp50kFixtureMinimumRequired = {
  b2cRequests: 50000,
  b2cRequestItems: 250000,
  mediaRows: 100000,
  pdfRows: 50000,
  marketplaceListings: 50000,
  events: 1000000,
};
