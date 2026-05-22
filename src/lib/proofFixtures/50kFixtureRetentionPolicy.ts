import {
  WHOLE_APP_50K_FIXTURE_DATA_BLOCKER,
} from "./50kProofFixturePolicy";

export const WHOLE_APP_50K_FIXTURE_RETENTION_WAVE =
  "S_50K_FIXTURE_RETENTION_CLEANUP_POLICY_CLOSEOUT";
export const WHOLE_APP_50K_FIXTURE_RETENTION_GREEN_STATUS =
  "GREEN_50K_FIXTURE_RETENTION_CLEANUP_POLICY_READY";
export const WHOLE_APP_50K_FIXTURE_RETENTION_BLOCKED_STATUS =
  "BLOCKED_50K_FIXTURE_RETENTION_CLEANUP_POLICY_NOT_READY";
export const WHOLE_APP_50K_LIVE_FIXTURE_REQUIRED_ARCHIVED_ONLY_BLOCKER =
  "BLOCKED_EXTERNAL_ONLY_WHOLE_APP_50K_LIVE_FIXTURE_REQUIRED_ARCHIVED_EVIDENCE_ONLY";

export type WholeApp50kFixtureRetentionMode =
  | "retain_live_fixture_in_proof_db"
  | "archive_evidence_then_cleanup"
  | "move_to_dedicated_perf_db";

export type WholeApp50kFixtureEvidenceMode =
  | "live_fixture"
  | "archived_evidence_only"
  | "missing";

export type WholeApp50kFixtureRetentionPolicy = {
  selectedMode: "retain_live_fixture_in_proof_db";
  proofDbMayRetainFixtureAsBaseline: true;
  productionDbLongTermRetentionAllowed: false;
  cleanupAllowedWithoutArchivedEvidence: false;
  cleanupAllowedWhileReleaseGuardRequiresLiveFixture: false;
  cleanupScope: "proof_run_id_only";
  destructiveCleanupAllowed: false;
  requiresProofRunIdForCleanup: true;
  requiresOwnerDecisionBeforeCleanup: true;
  requiresArchivedArtifactsBeforeCleanup: true;
  requiresBusinessRowsDeletedZero: true;
  liveFixtureRequiredForCurrentReleaseGuard: true;
  archivedEvidenceMayReplaceLiveFixtureForFreshReleaseGreen: false;
  archivedEvidenceMayDocumentHistoricalBaseline: true;
};

export type WholeApp50kFixtureRetentionEvaluationInput = {
  final50kStatus: string;
  fixtureSufficient: boolean;
  proofRunId: string | null;
  wholeApp50kProofPassed: boolean;
  archivedArtifactsPresent: boolean;
  releaseGuardRequiresLiveFixture: boolean;
  cleanupRequested?: boolean;
  cleanupScope?: string;
  targetDatabaseKind?: "proof" | "staging" | "production" | "perf";
  ownerDecisionRecorded?: boolean;
  businessRowsDeleted?: number;
};

export type WholeApp50kFixtureRetentionMatrix = {
  wave: typeof WHOLE_APP_50K_FIXTURE_RETENTION_WAVE;
  final_status: typeof WHOLE_APP_50K_FIXTURE_RETENTION_GREEN_STATUS | typeof WHOLE_APP_50K_FIXTURE_RETENTION_BLOCKED_STATUS;
  selected_retention_mode: WholeApp50kFixtureRetentionMode;
  evidence_mode: WholeApp50kFixtureEvidenceMode;
  proof_run_id: string | null;
  proof_run_id_present: boolean;
  fixture_sufficient: boolean;
  whole_app_50k_proof_passed: boolean;
  archived_evidence_present: boolean;
  live_fixture_retained_as_baseline: boolean;
  cleanup_requested: boolean;
  cleanup_allowed_now: boolean;
  cleanup_scope: "proof_run_id_only";
  cleanup_requires_archived_evidence: true;
  cleanup_requires_owner_decision: true;
  cleanup_requires_release_guard_mode_update: true;
  cleanup_deletes_business_rows_allowed: false;
  business_rows_deleted: number;
  release_guard_uses_live_fixture_for_fresh_green: true;
  archived_evidence_only_can_claim_fresh_green: false;
  archived_evidence_only_status: typeof WHOLE_APP_50K_LIVE_FIXTURE_REQUIRED_ARCHIVED_ONLY_BLOCKER;
  production_db_long_term_retention_allowed: false;
  proof_db_baseline_retention_allowed: true;
  blockers: string[];
  fake_green_claimed: false;
};

export const WHOLE_APP_50K_FIXTURE_RETENTION_REQUIRED_ARCHIVE_ARTIFACTS = [
  "artifacts/S_50K_SYNTHETIC_FIXTURE_matrix.json",
  "artifacts/S_50K_SYNTHETIC_FIXTURE_proof.md",
  "artifacts/S_WHOLE_APP_50K_matrix.json",
  "artifacts/S_WHOLE_APP_50K_live_query_results.json",
  "artifacts/S_WHOLE_APP_50K_query_plans.json",
  "artifacts/S_WHOLE_APP_50K_p95_summary.json",
  "artifacts/S_WHOLE_APP_50K_proof.md",
  "artifacts/S_FINAL_50K_92_SCORE_matrix.json",
  "artifacts/S_FINAL_50K_92_SCORE_scorecard.json",
  "artifacts/S_FINAL_50K_92_SCORE_proof.md",
] as const;

export const WHOLE_APP_50K_FIXTURE_RETENTION_POLICY: WholeApp50kFixtureRetentionPolicy = {
  selectedMode: "retain_live_fixture_in_proof_db",
  proofDbMayRetainFixtureAsBaseline: true,
  productionDbLongTermRetentionAllowed: false,
  cleanupAllowedWithoutArchivedEvidence: false,
  cleanupAllowedWhileReleaseGuardRequiresLiveFixture: false,
  cleanupScope: "proof_run_id_only",
  destructiveCleanupAllowed: false,
  requiresProofRunIdForCleanup: true,
  requiresOwnerDecisionBeforeCleanup: true,
  requiresArchivedArtifactsBeforeCleanup: true,
  requiresBusinessRowsDeletedZero: true,
  liveFixtureRequiredForCurrentReleaseGuard: true,
  archivedEvidenceMayReplaceLiveFixtureForFreshReleaseGreen: false,
  archivedEvidenceMayDocumentHistoricalBaseline: true,
};

export function classifyWholeApp50kFixtureEvidenceMode(params: {
  fixtureSufficient: boolean;
  proofRunId: string | null;
  wholeApp50kProofPassed: boolean;
  archivedArtifactsPresent: boolean;
}): WholeApp50kFixtureEvidenceMode {
  if (params.fixtureSufficient && params.proofRunId && params.wholeApp50kProofPassed) return "live_fixture";
  if (params.archivedArtifactsPresent) return "archived_evidence_only";
  return "missing";
}

export function evaluateWholeApp50kFixtureRetentionPolicy(
  input: WholeApp50kFixtureRetentionEvaluationInput,
): WholeApp50kFixtureRetentionMatrix {
  const cleanupRequested = input.cleanupRequested === true;
  const businessRowsDeleted = Number(input.businessRowsDeleted ?? 0);
  const cleanupScope = input.cleanupScope ?? WHOLE_APP_50K_FIXTURE_RETENTION_POLICY.cleanupScope;
  const evidenceMode = classifyWholeApp50kFixtureEvidenceMode({
    fixtureSufficient: input.fixtureSufficient,
    proofRunId: input.proofRunId,
    wholeApp50kProofPassed: input.wholeApp50kProofPassed,
    archivedArtifactsPresent: input.archivedArtifactsPresent,
  });
  const blockers: string[] = [];

  if (evidenceMode === "missing") blockers.push(WHOLE_APP_50K_FIXTURE_DATA_BLOCKER);
  if (evidenceMode === "archived_evidence_only" && input.final50kStatus.startsWith("GREEN_")) {
    blockers.push(WHOLE_APP_50K_LIVE_FIXTURE_REQUIRED_ARCHIVED_ONLY_BLOCKER);
  }

  if (!input.archivedArtifactsPresent) {
    blockers.push("BLOCKED_50K_FIXTURE_ARCHIVED_EVIDENCE_REQUIRED_BEFORE_RETENTION_CLOSEOUT");
  }

  if (cleanupRequested) {
    if (!input.proofRunId) blockers.push("BLOCKED_50K_FIXTURE_CLEANUP_PROOF_RUN_ID_REQUIRED");
    if (cleanupScope !== WHOLE_APP_50K_FIXTURE_RETENTION_POLICY.cleanupScope) {
      blockers.push("BLOCKED_50K_FIXTURE_CLEANUP_SCOPE_MUST_BE_PROOF_RUN_ID_ONLY");
    }
    if (input.releaseGuardRequiresLiveFixture) {
      blockers.push("BLOCKED_50K_FIXTURE_CLEANUP_RELEASE_GUARD_STILL_REQUIRES_LIVE_FIXTURE");
    }
    if (!input.ownerDecisionRecorded) {
      blockers.push("BLOCKED_50K_FIXTURE_CLEANUP_OWNER_DECISION_REQUIRED");
    }
    if (input.targetDatabaseKind === "production") {
      blockers.push("BLOCKED_50K_FIXTURE_CLEANUP_PRODUCTION_DB_REQUIRES_SEPARATE_SIGNOFF");
    }
    if (businessRowsDeleted !== 0) {
      blockers.push("BLOCKED_50K_FIXTURE_CLEANUP_TOUCHED_BUSINESS_ROWS");
    }
  }

  const cleanupAllowedNow = cleanupRequested && blockers.length === 0;
  const liveFixtureRetainedAsBaseline =
    !cleanupRequested
    && evidenceMode === "live_fixture"
    && WHOLE_APP_50K_FIXTURE_RETENTION_POLICY.selectedMode === "retain_live_fixture_in_proof_db";

  return {
    wave: WHOLE_APP_50K_FIXTURE_RETENTION_WAVE,
    final_status: blockers.length === 0
      ? WHOLE_APP_50K_FIXTURE_RETENTION_GREEN_STATUS
      : WHOLE_APP_50K_FIXTURE_RETENTION_BLOCKED_STATUS,
    selected_retention_mode: WHOLE_APP_50K_FIXTURE_RETENTION_POLICY.selectedMode,
    evidence_mode: evidenceMode,
    proof_run_id: input.proofRunId,
    proof_run_id_present: Boolean(input.proofRunId),
    fixture_sufficient: input.fixtureSufficient,
    whole_app_50k_proof_passed: input.wholeApp50kProofPassed,
    archived_evidence_present: input.archivedArtifactsPresent,
    live_fixture_retained_as_baseline: liveFixtureRetainedAsBaseline,
    cleanup_requested: cleanupRequested,
    cleanup_allowed_now: cleanupAllowedNow,
    cleanup_scope: WHOLE_APP_50K_FIXTURE_RETENTION_POLICY.cleanupScope,
    cleanup_requires_archived_evidence: true,
    cleanup_requires_owner_decision: true,
    cleanup_requires_release_guard_mode_update: true,
    cleanup_deletes_business_rows_allowed: false,
    business_rows_deleted: businessRowsDeleted,
    release_guard_uses_live_fixture_for_fresh_green: true,
    archived_evidence_only_can_claim_fresh_green: false,
    archived_evidence_only_status: WHOLE_APP_50K_LIVE_FIXTURE_REQUIRED_ARCHIVED_ONLY_BLOCKER,
    production_db_long_term_retention_allowed: false,
    proof_db_baseline_retention_allowed: true,
    blockers: [...new Set(blockers)],
    fake_green_claimed: false,
  };
}
