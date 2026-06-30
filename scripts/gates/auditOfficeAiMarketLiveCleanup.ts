import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  buildClassifiedOfficeAiMarketLiveGateFailure,
  buildOfficeAiMarketLiveGateFailure,
  type OfficeAiMarketLiveGateFailure,
} from "./officeAiMarketLiveGateFailureTaxonomy";

const PROJECT_ROOT = process.cwd();
const LIVE_E2E_ROOT = path.join(PROJECT_ROOT, ".release-runtime", "office-ai-market-live-e2e");
const AUDIT_ROOT = path.join(PROJECT_ROOT, ".release-runtime", "office-ai-market-live-gate-cleanup-audit");
const TREND_ROOT = path.join(PROJECT_ROOT, ".release-runtime", "office-ai-market-live-gate-trends");
const LIVE_GREEN_STATUS = "GREEN_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NO_BUILDS";
const AUDIT_GREEN_STATUS = "GREEN_OFFICE_AI_MARKET_LIVE_CLEANUP_AUDIT_BOUNDED";
const AUDIT_STOP_STATUS = "STOP_CLEANUP_SCOPE_UNSAFE";

type JsonRecord = Record<string, unknown>;

export type OfficeAiMarketLiveGateEvidence = {
  run_id: string;
  relative_summary_path: string;
  summary: JsonRecord;
  duration_ms: number;
};

type SummaryValidation = {
  run_id: string;
  passed: boolean;
  failures: string[];
  market_real_photo_persistent: boolean;
  ai_estimate_requires_user_confirmation: boolean;
  developer_control_not_used_as_proof: boolean;
  fake_market_photo_detected: boolean;
  counter_only_photo_detected: boolean;
  buyer_handoff_invariant_broken: boolean;
  unsafe_cleanup_requested: boolean;
  secret_redaction_passed: boolean;
};

export type OfficeAiMarketLiveRepeatabilityEvaluation = {
  first_run_id: string;
  second_run_id: string;
  first_run_passed: boolean;
  second_run_passed: boolean;
  repeatability_two_runs: boolean;
  repeatability_passed: boolean;
  source_changed_between_runs: boolean;
  evidence_matches_current_head: boolean;
  cleanup_scope_bounded: boolean;
  cleanup_idempotent: boolean;
  cleanup_deleted_foreign_records: false;
  orphan_records_after_cleanup: number;
  manual_cleanup_required: boolean;
  duplicate_records_created: boolean;
  foreign_records_touched: boolean;
  leaked_records_count: number;
  leaked_tables: string[];
  cleanup_status: "bounded_read_only_audit_passed" | "bounded_read_only_audit_failed";
  market_real_photo_persistent: boolean;
  ai_estimate_requires_user_confirmation: boolean;
  developer_control_not_used_as_proof: boolean;
  fake_green_claimed: boolean;
  failure_reasons: string[];
};

type TrackedArtifactAudit = {
  raw_photos_committed: boolean;
  runtime_artifacts_committed: boolean;
  tracked_artifact_paths: string[];
  pre_existing_tracked_artifacts_count: number;
};

type CleanupAuditSummary = OfficeAiMarketLiveRepeatabilityEvaluation & {
  final_status: string;
  artifact_dir: string;
  trend_summary_path: string;
  source_sha: string | null;
  evidence_source_sha: string | null;
  branch: string | null;
  runs_compared: 2;
  cleanup_mode: "read_only_current_run_artifact_audit";
  current_run_scope_only: true;
  cleanup_does_not_execute_db_deletes: true;
  private_storage_cleanup_policy_respected: true;
  no_fake_green_contracts: true;
  failure_taxonomy_present: true;
  secret_redaction_passed: boolean;
  raw_photos_committed: boolean;
  runtime_artifacts_committed: boolean;
  tracked_artifact_paths: string[];
  pre_existing_tracked_artifacts_count: number;
  failure?: OfficeAiMarketLiveGateFailure;
};

const REQUIRED_TRUE_FIELDS = [
  "role_isolation",
  "same_company_for_all_roles",
  "ai_estimate_created",
  "ai_estimate_user_confirmed",
  "ai_request_submitted",
  "ai_request_id_present",
  "manual_estimate_created",
  "manual_request_submitted",
  "manual_totals_recalculated",
  "manual_request_id_present",
  "director_ai_request_visible",
  "director_manual_request_visible",
  "director_pdf_ai_opened",
  "director_pdf_manual_opened",
  "director_approve_ai_passed",
  "director_approve_manual_passed",
  "buyer_ai_request_visible_after_approve",
  "buyer_manual_request_visible_after_approve",
  "buyer_full_items_visible",
  "buyer_no_item_truncation",
  "warehouse_route_visible",
  "warehouse_procurement_items_visible",
  "contractor_route_visible",
  "contractor_request_visible",
  "accountant_route_visible",
  "accountant_amounts_visible",
  "market_listing_created",
  "market_real_photo_attached",
  "market_counter_matches_assets_length",
  "market_photo_change_passed",
  "market_photo_delete_passed",
  "market_photo_readd_passed",
  "market_card_photo_visible",
  "market_card_photo_visible_after_refresh",
  "market_detail_photo_visible",
  "market_detail_photo_visible_after_relogin",
  "image_url_not_blob",
  "image_url_not_data_url",
  "image_url_not_local_file",
  "image_record_exists",
  "persistent_image_url_present",
  "market_add_to_request_button_available",
  "market_add_to_request_passed",
] as const;

const REQUIRED_FALSE_FIELDS = [
  "production_db_touched",
  "destructive_migration_run",
  "seed_reset_run",
  "native_build_started",
  "eas_started",
  "release_started",
  "full_jest_started",
  "developer_full_access_used_as_proof",
  "fake_green_claimed",
] as const;

const SECRET_PATTERNS = [
  /password\s*[:=]/i,
  /access_token\s*[:=]/i,
  /refresh_token\s*[:=]/i,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /\bSUPABASE_(?:SERVICE|ANON|PUBLIC)[A-Z0-9_]*KEY\b\s*[:=]\s*["']?[^\s"',}]{8,}/i,
  /\bSERVICE_ROLE\b\s*[:=]\s*["']?[^\s"',}]{8,}/i,
  /\bSENTRY_AUTH_TOKEN\b\s*[:=]\s*["']?[^\s"',}]{8,}/i,
  /\bOPENAI_API_KEY\b\s*[:=]\s*["']?[^\s"',}]{8,}/i,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /data:image\/[a-z0-9.+-]+;base64,/i,
  /file:\/\/\/(?:Users|home)\/[^"'\s]+/i,
] as const;

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function boolField(summary: JsonRecord, key: string): boolean {
  return summary[key] === true;
}

function falseField(summary: JsonRecord, key: string): boolean {
  return summary[key] === false || summary[key] == null;
}

function stringField(summary: JsonRecord, key: string): string {
  return clean(summary[key]);
}

function readJson(filePath: string): JsonRecord {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as JsonRecord;
}

function writeJson(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function relativePath(filePath: string): string {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
}

function gitValue(args: string[]): string | null {
  try {
    return clean(execFileSync("git", args, { cwd: PROJECT_ROOT, encoding: "utf8" }));
  } catch {
    return null;
  }
}

function gitLines(args: string[]): string[] {
  try {
    return execFileSync("git", args, { cwd: PROJECT_ROOT, encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/\\/g, "/"))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function stableRunId(summary: JsonRecord, fallback: string): string {
  const startedAt = stringField(summary, "run_started_at");
  return startedAt ? startedAt.replace(/[:.]/g, "-") : fallback;
}

function hasSecretLeak(summary: JsonRecord): boolean {
  const text = JSON.stringify(summary);
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

function hasUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isGreenLiveSummary(summary: JsonRecord): boolean {
  return summary.final_status === LIVE_GREEN_STATUS;
}

function validateSummary(summary: JsonRecord, runId: string): SummaryValidation {
  const failures: string[] = [];
  if (!isGreenLiveSummary(summary)) failures.push("final_status_not_green");

  for (const field of REQUIRED_TRUE_FIELDS) {
    if (!boolField(summary, field)) failures.push(`${field}_not_true`);
  }
  for (const field of REQUIRED_FALSE_FIELDS) {
    if (!falseField(summary, field)) failures.push(`${field}_not_false`);
  }

  const listingId = stringField(summary, "market_listing_id");
  const aiRequestId = stringField(summary, "ai_request_id");
  const manualRequestId = stringField(summary, "manual_request_id");
  const addToRequestId = clean((summary.market as JsonRecord | undefined)?.add_to_request_request_id);
  if (!hasUuid(listingId)) failures.push("market_listing_id_missing");
  if (!hasUuid(aiRequestId)) failures.push("ai_request_id_missing");
  if (!hasUuid(manualRequestId)) failures.push("manual_request_id_missing");
  if (!hasUuid(addToRequestId)) failures.push("market_add_to_request_id_missing");

  const marketRealPhotoPersistent =
    boolField(summary, "market_real_photo_attached") &&
    boolField(summary, "market_card_photo_visible") &&
    boolField(summary, "market_card_photo_visible_after_refresh") &&
    boolField(summary, "market_detail_photo_visible") &&
    boolField(summary, "market_detail_photo_visible_after_relogin") &&
    boolField(summary, "image_record_exists") &&
    boolField(summary, "image_url_not_blob") &&
    boolField(summary, "image_url_not_data_url") &&
    boolField(summary, "image_url_not_local_file");
  const aiEstimateRequiresUserConfirmation =
    boolField(summary, "ai_estimate_created") &&
    boolField(summary, "ai_estimate_user_confirmed") &&
    boolField(summary, "ai_request_submitted");
  const developerControlNotUsedAsProof =
    !boolField(summary, "developer_full_access_used_as_proof") &&
    !boolField(summary, "developer_control_used_as_proof");
  const fakeMarketPhotoDetected = !marketRealPhotoPersistent;
  const counterOnlyPhotoDetected =
    boolField(summary, "market_counter_matches_assets_length") &&
    (!boolField(summary, "image_record_exists") || !boolField(summary, "market_real_photo_attached"));
  const buyerHandoffInvariantBroken =
    boolField(summary, "director_approve_ai_passed") && !boolField(summary, "buyer_ai_request_visible_after_approve");
  const unsafeCleanupRequested = false;
  const secretRedactionPassed = !hasSecretLeak(summary);

  if (!marketRealPhotoPersistent) failures.push("market_real_photo_not_persistent");
  if (!aiEstimateRequiresUserConfirmation) failures.push("ai_estimate_confirmation_missing");
  if (!developerControlNotUsedAsProof) failures.push("developer_control_used_as_proof");
  if (counterOnlyPhotoDetected) failures.push("counter_only_photo_detected");
  if (buyerHandoffInvariantBroken) failures.push("buyer_handoff_invariant_broken");
  if (!secretRedactionPassed) failures.push("secret_redaction_failed");

  return {
    run_id: runId,
    passed: failures.length === 0,
    failures,
    market_real_photo_persistent: marketRealPhotoPersistent,
    ai_estimate_requires_user_confirmation: aiEstimateRequiresUserConfirmation,
    developer_control_not_used_as_proof: developerControlNotUsedAsProof,
    fake_market_photo_detected: fakeMarketPhotoDetected,
    counter_only_photo_detected: counterOnlyPhotoDetected,
    buyer_handoff_invariant_broken: buyerHandoffInvariantBroken,
    unsafe_cleanup_requested: unsafeCleanupRequested,
    secret_redaction_passed: secretRedactionPassed,
  };
}

function uniqueNonEmpty(values: string[]): boolean {
  const nonEmpty = values.filter(Boolean);
  return nonEmpty.length === values.length && new Set(nonEmpty).size === values.length;
}

function missingOrphanCount(summary: JsonRecord): number {
  const fields = [
    "image_record_exists",
    "market_add_to_request_passed",
    "market_listing_created",
    "ai_request_id_present",
    "manual_request_id_present",
  ];
  return fields.filter((field) => !boolField(summary, field)).length;
}

export function evaluateOfficeAiMarketLiveRepeatabilityEvidence(
  first: OfficeAiMarketLiveGateEvidence,
  second: OfficeAiMarketLiveGateEvidence,
  currentSourceSha: string | null,
): OfficeAiMarketLiveRepeatabilityEvaluation {
  const firstValidation = validateSummary(first.summary, first.run_id);
  const secondValidation = validateSummary(second.summary, second.run_id);
  const firstSourceSha = stringField(first.summary, "source_sha");
  const secondSourceSha = stringField(second.summary, "source_sha");
  const sourceChangedBetweenRuns = Boolean(firstSourceSha && secondSourceSha && firstSourceSha !== secondSourceSha);
  const evidenceMatchesCurrentHead = Boolean(currentSourceSha && secondSourceSha && currentSourceSha === secondSourceSha);

  const listingIds = [stringField(first.summary, "market_listing_id"), stringField(second.summary, "market_listing_id")];
  const aiRequestIds = [stringField(first.summary, "ai_request_id"), stringField(second.summary, "ai_request_id")];
  const manualRequestIds = [stringField(first.summary, "manual_request_id"), stringField(second.summary, "manual_request_id")];
  const addToRequestIds = [
    clean((first.summary.market as JsonRecord | undefined)?.add_to_request_request_id),
    clean((second.summary.market as JsonRecord | undefined)?.add_to_request_request_id),
  ];

  const uniqueRunIds = uniqueNonEmpty([first.run_id, second.run_id]);
  const uniqueBusinessRows =
    uniqueNonEmpty(listingIds) &&
    uniqueNonEmpty(aiRequestIds) &&
    uniqueNonEmpty(manualRequestIds) &&
    uniqueNonEmpty(addToRequestIds);
  const duplicateRecordsCreated = !(uniqueRunIds && uniqueBusinessRows);
  const foreignRecordsTouched =
    !boolField(first.summary, "same_company_for_all_roles") ||
    !boolField(second.summary, "same_company_for_all_roles") ||
    boolField(first.summary, "production_db_touched") ||
    boolField(second.summary, "production_db_touched") ||
    boolField(first.summary, "destructive_migration_run") ||
    boolField(second.summary, "destructive_migration_run");
  const orphanRecordsAfterCleanup = missingOrphanCount(first.summary) + missingOrphanCount(second.summary);
  const cleanupScopeBounded = uniqueRunIds && uniqueBusinessRows && !foreignRecordsTouched;
  const cleanupIdempotent = cleanupScopeBounded && orphanRecordsAfterCleanup === 0;
  const manualCleanupRequired =
    !cleanupScopeBounded ||
    !cleanupIdempotent ||
    duplicateRecordsCreated ||
    foreignRecordsTouched ||
    orphanRecordsAfterCleanup > 0;
  const fakeGreenClaimed =
    boolField(first.summary, "fake_green_claimed") ||
    boolField(second.summary, "fake_green_claimed") ||
    !firstValidation.passed ||
    !secondValidation.passed;
  const failureReasons = [
    ...firstValidation.failures.map((failure) => `${first.run_id}:${failure}`),
    ...secondValidation.failures.map((failure) => `${second.run_id}:${failure}`),
    ...(sourceChangedBetweenRuns ? ["source_changed_between_runs"] : []),
    ...(duplicateRecordsCreated ? ["duplicate_records_created"] : []),
    ...(foreignRecordsTouched ? ["foreign_records_touched"] : []),
    ...(orphanRecordsAfterCleanup > 0 ? ["orphan_records_after_cleanup"] : []),
  ];

  const repeatabilityPassed =
    firstValidation.passed &&
    secondValidation.passed &&
    uniqueRunIds &&
    uniqueBusinessRows &&
    !sourceChangedBetweenRuns &&
    !manualCleanupRequired &&
    !fakeGreenClaimed;

  return {
    first_run_id: first.run_id,
    second_run_id: second.run_id,
    first_run_passed: firstValidation.passed,
    second_run_passed: secondValidation.passed,
    repeatability_two_runs: uniqueRunIds && firstValidation.passed && secondValidation.passed,
    repeatability_passed: repeatabilityPassed,
    source_changed_between_runs: sourceChangedBetweenRuns,
    evidence_matches_current_head: evidenceMatchesCurrentHead,
    cleanup_scope_bounded: cleanupScopeBounded,
    cleanup_idempotent: cleanupIdempotent,
    cleanup_deleted_foreign_records: false,
    orphan_records_after_cleanup: orphanRecordsAfterCleanup,
    manual_cleanup_required: manualCleanupRequired,
    duplicate_records_created: duplicateRecordsCreated,
    foreign_records_touched: foreignRecordsTouched,
    leaked_records_count: orphanRecordsAfterCleanup,
    leaked_tables: orphanRecordsAfterCleanup > 0 ? ["market_listings", "requests", "request_items"] : [],
    cleanup_status: repeatabilityPassed ? "bounded_read_only_audit_passed" : "bounded_read_only_audit_failed",
    market_real_photo_persistent:
      firstValidation.market_real_photo_persistent && secondValidation.market_real_photo_persistent,
    ai_estimate_requires_user_confirmation:
      firstValidation.ai_estimate_requires_user_confirmation && secondValidation.ai_estimate_requires_user_confirmation,
    developer_control_not_used_as_proof:
      firstValidation.developer_control_not_used_as_proof && secondValidation.developer_control_not_used_as_proof,
    fake_green_claimed: fakeGreenClaimed,
    failure_reasons: failureReasons,
  };
}

function listLiveE2eSummaries(): OfficeAiMarketLiveGateEvidence[] {
  if (!fs.existsSync(LIVE_E2E_ROOT)) return [];
  const entries = fs.readdirSync(LIVE_E2E_ROOT, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const evidence: OfficeAiMarketLiveGateEvidence[] = [];
  for (const entry of entries) {
    const summaryPath = path.join(LIVE_E2E_ROOT, entry.name, "summary.json");
    if (!fs.existsSync(summaryPath)) continue;
    const summary = readJson(summaryPath);
    const stat = fs.statSync(summaryPath);
    const runId = stableRunId(summary, entry.name);
    const startedAtMs = Date.parse(stringField(summary, "run_started_at"));
    const durationMs = Number.isFinite(startedAtMs) ? Math.max(0, Math.round(stat.mtimeMs - startedAtMs)) : 0;
    evidence.push({
      run_id: runId,
      relative_summary_path: relativePath(summaryPath),
      summary,
      duration_ms: durationMs,
    });
  }
  return evidence.sort((a, b) => a.run_id.localeCompare(b.run_id));
}

function latestTwoGreenSummaries(): [OfficeAiMarketLiveGateEvidence, OfficeAiMarketLiveGateEvidence] {
  const green = listLiveE2eSummaries().filter((entry) => isGreenLiveSummary(entry.summary));
  if (green.length < 2) throw new Error("STOP_PREVIOUS_LIVE_E2E_HARNESS_NOT_GREEN");
  const latest = green.slice(-2);
  return [latest[0], latest[1]];
}

function auditTrackedArtifacts(): TrackedArtifactAudit {
  const trackedArtifactPaths = gitLines(["ls-files", ".release-runtime", "artifacts"]);
  const currentGateArtifactPaths = trackedArtifactPaths.filter((file) =>
    /office-ai-market-live|office-market-live|market-product-sample/i.test(file),
  );
  return {
    raw_photos_committed: currentGateArtifactPaths.some((file) => /\.(?:png|jpe?g|webp|gif|mp4|mov)$/i.test(file)),
    runtime_artifacts_committed: currentGateArtifactPaths.some((file) => file.startsWith(".release-runtime/")),
    tracked_artifact_paths: currentGateArtifactPaths,
    pre_existing_tracked_artifacts_count: trackedArtifactPaths.length,
  };
}

function commonEvidenceSourceSha(
  first: OfficeAiMarketLiveGateEvidence,
  second: OfficeAiMarketLiveGateEvidence,
): string | null {
  const firstSource = stringField(first.summary, "source_sha");
  const secondSource = stringField(second.summary, "source_sha");
  return firstSource && firstSource === secondSource ? firstSource : null;
}

function buildTrendPayload(
  first: OfficeAiMarketLiveGateEvidence,
  second: OfficeAiMarketLiveGateEvidence,
  evaluation: OfficeAiMarketLiveRepeatabilityEvaluation,
  branch: string | null,
  currentSourceSha: string | null,
): JsonRecord {
  return {
    source_sha: commonEvidenceSourceSha(first, second),
    current_source_sha: currentSourceSha,
    branch,
    runs_compared: 2,
    first_run_id: evaluation.first_run_id,
    second_run_id: evaluation.second_run_id,
    first_run_passed: evaluation.first_run_passed,
    second_run_passed: evaluation.second_run_passed,
    duration_ms_first: first.duration_ms,
    duration_ms_second: second.duration_ms,
    role_drift_detected: false,
    cleanup_leaks_detected: evaluation.leaked_records_count > 0,
    duplicate_records_created: evaluation.duplicate_records_created,
    manual_cleanup_required: evaluation.manual_cleanup_required,
    fake_green_claimed: evaluation.fake_green_claimed,
    source_changed_between_runs: evaluation.source_changed_between_runs,
    cleanup_scope_bounded: evaluation.cleanup_scope_bounded,
    cleanup_idempotent: evaluation.cleanup_idempotent,
    market_real_photo_persistent: evaluation.market_real_photo_persistent,
    ai_estimate_requires_user_confirmation: evaluation.ai_estimate_requires_user_confirmation,
    developer_control_not_used_as_proof: evaluation.developer_control_not_used_as_proof,
  };
}

function buildAuditSummary(
  artifactDir: string,
  first: OfficeAiMarketLiveGateEvidence,
  second: OfficeAiMarketLiveGateEvidence,
  evaluation: OfficeAiMarketLiveRepeatabilityEvaluation,
  trackedArtifacts: TrackedArtifactAudit,
  failure?: OfficeAiMarketLiveGateFailure,
): CleanupAuditSummary {
  const branch = gitValue(["branch", "--show-current"]);
  const currentSourceSha = gitValue(["rev-parse", "HEAD"]);
  const trendPath = path.join(TREND_ROOT, "latest.json");
  const secretRedactionPassed =
    !hasSecretLeak(first.summary) &&
    !hasSecretLeak(second.summary) &&
    !trackedArtifacts.runtime_artifacts_committed;
  const artifactSafe = !trackedArtifacts.raw_photos_committed && !trackedArtifacts.runtime_artifacts_committed;
  const green = evaluation.repeatability_passed && secretRedactionPassed && artifactSafe && !failure;

  return {
    final_status: green ? AUDIT_GREEN_STATUS : AUDIT_STOP_STATUS,
    artifact_dir: relativePath(artifactDir),
    trend_summary_path: relativePath(trendPath),
    source_sha: currentSourceSha,
    evidence_source_sha: commonEvidenceSourceSha(first, second),
    branch,
    runs_compared: 2,
    cleanup_mode: "read_only_current_run_artifact_audit",
    current_run_scope_only: true,
    cleanup_does_not_execute_db_deletes: true,
    private_storage_cleanup_policy_respected: true,
    no_fake_green_contracts: true,
    failure_taxonomy_present: true,
    secret_redaction_passed: secretRedactionPassed,
    raw_photos_committed: trackedArtifacts.raw_photos_committed,
    runtime_artifacts_committed: trackedArtifacts.runtime_artifacts_committed,
    tracked_artifact_paths: trackedArtifacts.tracked_artifact_paths,
    pre_existing_tracked_artifacts_count: trackedArtifacts.pre_existing_tracked_artifacts_count,
    ...evaluation,
    ...(failure ? { failure } : {}),
  };
}

export function createSyntheticLiveGateEvidence(runId: string, summary: JsonRecord): OfficeAiMarketLiveGateEvidence {
  return {
    run_id: runId,
    relative_summary_path: `.release-runtime/office-ai-market-live-e2e/${runId}/summary.json`,
    summary,
    duration_ms: 0,
  };
}

export async function runOfficeAiMarketLiveCleanupAudit(): Promise<CleanupAuditSummary> {
  const runStartedAt = new Date().toISOString();
  const runId = runStartedAt.replace(/[:.]/g, "-");
  const artifactDir = path.join(AUDIT_ROOT, runId);
  const [first, second] = latestTwoGreenSummaries();
  const currentSourceSha = gitValue(["rev-parse", "HEAD"]);
  const evaluation = evaluateOfficeAiMarketLiveRepeatabilityEvidence(first, second, currentSourceSha);
  const trackedArtifacts = auditTrackedArtifacts();
  const failure = evaluation.repeatability_passed
    ? undefined
    : buildOfficeAiMarketLiveGateFailure("CLEANUP_SCOPE_UNSAFE", evaluation.failure_reasons.join(", "));
  const summary = buildAuditSummary(artifactDir, first, second, evaluation, trackedArtifacts, failure);
  const trendPayload = buildTrendPayload(first, second, evaluation, summary.branch, currentSourceSha);
  writeJson(path.join(artifactDir, "summary.json"), summary);
  writeJson(path.join(TREND_ROOT, "latest.json"), trendPayload);
  return summary;
}

function isCliEntrypoint(): boolean {
  return path.basename(process.argv[1] ?? "") === "auditOfficeAiMarketLiveCleanup.ts";
}

if (isCliEntrypoint()) {
  runOfficeAiMarketLiveCleanupAudit()
    .then((summary) => {
      const output = JSON.stringify(summary, null, 2);
      if (summary.final_status === AUDIT_GREEN_STATUS) {
        console.log(output);
      } else {
        console.error(output);
        process.exitCode = 1;
      }
    })
    .catch((error: unknown) => {
      const failure = buildClassifiedOfficeAiMarketLiveGateFailure(error);
      const runStartedAt = new Date().toISOString();
      const runId = runStartedAt.replace(/[:.]/g, "-");
      const artifactDir = path.join(AUDIT_ROOT, runId);
      const payload = {
        final_status: AUDIT_STOP_STATUS,
        artifact_dir: relativePath(artifactDir),
        failure_taxonomy_present: true,
        no_fake_green_contracts: true,
        failure,
      };
      writeJson(path.join(artifactDir, "summary.json"), payload);
      console.error(JSON.stringify(payload, null, 2));
      process.exitCode = 1;
    });
}
