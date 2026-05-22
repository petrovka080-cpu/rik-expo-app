import {
  WHOLE_APP_50K_FIXTURE_DATA_BLOCKER,
  WHOLE_APP_50K_FIXTURE_POLICY,
  WHOLE_APP_50K_PROOF_OWNER_BLOCKER,
  WHOLE_APP_50K_TZ_LOCK_GREEN_STATUS,
  WHOLE_APP_50K_TZ_LOCK_WAVE,
} from "./50kProofFixturePolicy";
import {
  WHOLE_APP_50K_FIXTURE_MODES,
  WHOLE_APP_50K_MINIMUM_REQUIRED,
  type WholeApp50kFixtureCounts,
  type WholeApp50kFixtureSufficiency,
  type WholeApp50kTzLockMatrix,
} from "./50kProofFixtureTypes";

const ZERO_COUNTS: WholeApp50kFixtureCounts = {
  b2cRequests: 0,
  b2cRequestItems: 0,
  mediaRows: 0,
  pdfRows: 0,
  marketplaceListings: 0,
  events: 0,
};

export function normalizeWholeApp50kFixtureCounts(
  counts: Partial<WholeApp50kFixtureCounts> = {},
): WholeApp50kFixtureCounts {
  return {
    b2cRequests: Number(counts.b2cRequests ?? 0),
    b2cRequestItems: Number(counts.b2cRequestItems ?? 0),
    mediaRows: Number(counts.mediaRows ?? 0),
    pdfRows: Number(counts.pdfRows ?? 0),
    marketplaceListings: Number(counts.marketplaceListings ?? 0),
    events: Number(counts.events ?? 0),
  };
}

export function isWholeApp50kFixtureSufficient(counts: WholeApp50kFixtureCounts): boolean {
  return counts.b2cRequests >= WHOLE_APP_50K_MINIMUM_REQUIRED.b2cRequests
    && counts.b2cRequestItems >= WHOLE_APP_50K_MINIMUM_REQUIRED.b2cRequestItems
    && counts.mediaRows >= WHOLE_APP_50K_MINIMUM_REQUIRED.mediaRows
    && counts.pdfRows >= WHOLE_APP_50K_MINIMUM_REQUIRED.pdfRows
    && counts.marketplaceListings >= WHOLE_APP_50K_MINIMUM_REQUIRED.marketplaceListings
    && counts.events >= WHOLE_APP_50K_MINIMUM_REQUIRED.events;
}

export function evaluateWholeApp50kFixtureSufficiency(params: {
  counts?: Partial<WholeApp50kFixtureCounts>;
  proofOwnerUserPresent?: boolean;
} = {}): WholeApp50kFixtureSufficiency {
  const counts = normalizeWholeApp50kFixtureCounts(params.counts ?? ZERO_COUNTS);
  const proofOwnerUserPresent = params.proofOwnerUserPresent !== false;
  const fixtureSufficient = proofOwnerUserPresent && isWholeApp50kFixtureSufficient(counts);

  return {
    fixtureSufficient,
    counts,
    minimumRequired: WHOLE_APP_50K_MINIMUM_REQUIRED,
    blocker: proofOwnerUserPresent
      ? fixtureSufficient ? undefined : WHOLE_APP_50K_FIXTURE_DATA_BLOCKER
      : WHOLE_APP_50K_PROOF_OWNER_BLOCKER,
  };
}

export function assertFixtureMissingIsNotPerformanceFailure(params: {
  fixtureSufficient: boolean;
  p95FailureClaimed: boolean;
}): void {
  if (!params.fixtureSufficient && params.p95FailureClaimed) {
    throw new Error("fixtureSufficient=false must report BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_DATA_REQUIRED, not a p95 failure.");
  }
}

export function buildWholeApp50kTzLockMatrix(params: {
  fullJestPassed?: boolean;
  releaseVerifyPassed?: boolean;
} = {}): WholeApp50kTzLockMatrix {
  return {
    wave: WHOLE_APP_50K_TZ_LOCK_WAVE,
    final_status: WHOLE_APP_50K_TZ_LOCK_GREEN_STATUS,
    new_product_feature_added: false,
    fixture_seed_executed: false,
    fifty_k_means_synthetic_rows_not_real_users: WHOLE_APP_50K_FIXTURE_POLICY.fixtureMeansSyntheticRowsNotRealUsers,
    real_auth_users_required_for_50k: false,
    mass_auth_user_creation_allowed: WHOLE_APP_50K_FIXTURE_POLICY.allowRealUserCreation,
    proof_run_id_required: WHOLE_APP_50K_FIXTURE_POLICY.requiresProofRunId,
    explicit_fixture_seed_flag_required: WHOLE_APP_50K_FIXTURE_POLICY.requiresExplicitSeedFlag,
    cleanup_scope: WHOLE_APP_50K_FIXTURE_POLICY.cleanupScope,
    drop_allowed: WHOLE_APP_50K_FIXTURE_POLICY.allowDrop,
    truncate_allowed: WHOLE_APP_50K_FIXTURE_POLICY.allowTruncate,
    reset_allowed: WHOLE_APP_50K_FIXTURE_POLICY.allowReset,
    delete_business_rows_allowed: WHOLE_APP_50K_FIXTURE_POLICY.allowDeleteBusinessRows,
    disable_rls_allowed: false,
    broad_public_policy_allowed: false,
    fixture_sufficiency_check_required: true,
    empty_db_status: WHOLE_APP_50K_FIXTURE_DATA_BLOCKER,
    empty_db_marked_as_perf_failure: false,
    fake_green_on_empty_fixture_blocked: true,
    runner_modes_defined: [...WHOLE_APP_50K_FIXTURE_MODES],
    release_guard_requires_fixture_sufficient_for_final_9_2: true,
    full_jest_passed: params.fullJestPassed === true,
    release_verify_passed: params.releaseVerifyPassed === true,
    fake_green_claimed: false,
  };
}
