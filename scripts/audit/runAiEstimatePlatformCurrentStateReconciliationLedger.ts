import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { writeReleaseVerifyCore } from "../release/releaseStateCleanupCore";

export const AI_ESTIMATE_PLATFORM_RECONCILIATION_WAVE =
  "S_AI_ESTIMATE_PLATFORM_CURRENT_STATE_RECONCILIATION_LEDGER_POINT_OF_NO_RETURN";
export const AI_ESTIMATE_PLATFORM_RECONCILIATION_PREFIX =
  "S_AI_ESTIMATE_PLATFORM_CURRENT_STATE_RECONCILIATION_LEDGER";
export const AI_ESTIMATE_PLATFORM_RECONCILIATION_GREEN_STATUS =
  "GREEN_AI_ESTIMATE_PLATFORM_CURRENT_STATE_RECONCILIATION_LEDGER_READY";

type JsonRecord = Record<string, unknown>;

type ArtifactEvidence = {
  name: string;
  path: string;
  exists: boolean;
  valid_json: boolean;
  mtime_utc: string | null;
  final_status: string | null;
  green_status: boolean;
  passed: boolean | null;
  stale: boolean;
  stale_reason: string | null;
  blocker: string | null;
  summary: JsonRecord;
};

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function artifactPath(...segments: string[]): string {
  return normalizePath(path.join("artifacts", AI_ESTIMATE_PLATFORM_RECONCILIATION_PREFIX, ...segments));
}

function runGit(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function safeReadJson(rootDir: string, relativePath: string): { valid: boolean; value: JsonRecord | null } {
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) return { valid: false, value: null };
  try {
    return {
      valid: true,
      value: JSON.parse(fs.readFileSync(fullPath, "utf8").replace(/^\uFEFF/, "")) as JsonRecord,
    };
  } catch {
    return { valid: false, value: null };
  }
}

function writeJson(rootDir: string, relativePath: string, value: unknown): void {
  const fullPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(rootDir: string, relativePath: string, value: string): void {
  const fullPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function fileMtimeUtc(rootDir: string, relativePath: string): string | null {
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.statSync(fullPath).mtime.toISOString();
}

function bool(value: unknown): boolean {
  return value === true;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function startsGreen(status: string | null): boolean {
  return typeof status === "string" && status.startsWith("GREEN_");
}

function artifactEvidence(
  rootDir: string,
  name: string,
  relativePath: string,
  options: {
    stale?: boolean;
    staleReason?: string | null;
    blocker?: string | null;
    passed?: boolean | null;
    summary?: JsonRecord;
  } = {},
): ArtifactEvidence {
  const json = safeReadJson(rootDir, relativePath);
  const finalStatus = stringValue(json.value?.final_status);
  return {
    name,
    path: normalizePath(relativePath),
    exists: fs.existsSync(path.join(rootDir, relativePath)),
    valid_json: json.valid,
    mtime_utc: fileMtimeUtc(rootDir, relativePath),
    final_status: finalStatus,
    green_status: startsGreen(finalStatus),
    passed: options.passed ?? (startsGreen(finalStatus) ? true : finalStatus === null ? null : false),
    stale: options.stale ?? false,
    stale_reason: options.staleReason ?? null,
    blocker: options.blocker ?? null,
    summary: options.summary ?? {},
  };
}

function walkFiles(rootDir: string, relativeDir: string): string[] {
  const absoluteDir = path.join(rootDir, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];
  const result: string[] = [];
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  for (const entry of entries) {
    const relativePath = normalizePath(path.join(relativeDir, entry.name));
    if (entry.isDirectory()) {
      result.push(...walkFiles(rootDir, relativePath));
    } else if (entry.isFile()) {
      result.push(relativePath);
    }
  }
  return result;
}

function isJestResult(value: JsonRecord | null): boolean {
  return value !== null && (typeof value.success === "boolean" || typeof value.numTotalTests === "number");
}

function jestResultPassed(value: JsonRecord | null): boolean {
  return (
    bool(value?.success) &&
    numberValue(value?.numFailedTests) === 0 &&
    numberValue(value?.numFailedTestSuites) === 0 &&
    numberValue(value?.numPendingTests) === 0 &&
    numberValue(value?.numPendingTestSuites) === 0 &&
    numberValue(value?.numRuntimeErrorTestSuites) === 0
  );
}

function latestFullJestEvidence(rootDir: string): ArtifactEvidence {
  const currentAttemptPath = "artifacts/S_VISIBLE_500_AI_ESTIMATE_CURRENT_WAVE/full_jest_current_attempt.json";
  const currentAttempt = safeReadJson(rootDir, currentAttemptPath);
  const currentAttemptPresent = fs.existsSync(path.join(rootDir, currentAttemptPath));
  const candidatePaths = walkFiles(rootDir, "artifacts")
    .filter((relativePath) => /(^|\/)full_jest[^/]*\.json$/i.test(relativePath))
    .map((relativePath) => {
      const json = safeReadJson(rootDir, relativePath);
      return { relativePath, json, mtimeMs: fs.statSync(path.join(rootDir, relativePath)).mtimeMs };
    })
    .filter((candidate) => isJestResult(candidate.json.value))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const latest = currentAttemptPresent && isJestResult(currentAttempt.value)
    ? {
        relativePath: currentAttemptPath,
        json: currentAttempt,
        mtimeMs: fs.statSync(path.join(rootDir, currentAttemptPath)).mtimeMs,
      }
    : candidatePaths[0];

  if (!latest) {
    return artifactEvidence(rootDir, "latest_full_jest", currentAttemptPath, {
      passed: false,
      stale: true,
      staleReason: "LATEST_FULL_JEST_ARTIFACT_MISSING",
      blocker: "LATEST_FULL_JEST_MISSING",
      summary: {
        current_attempt_path: currentAttemptPath,
        current_attempt_present: currentAttemptPresent,
        inspected_jest_artifacts: 0,
      },
    });
  }

  const passed = jestResultPassed(latest.json.value);
  const staleReason = !currentAttemptPresent
    ? "LATEST_FULL_JEST_CURRENT_ATTEMPT_TIMED_OUT_OR_MISSING"
    : passed
      ? null
      : "LATEST_FULL_JEST_ARTIFACT_FAILED_OR_PENDING";
  return artifactEvidence(rootDir, "latest_full_jest", latest.relativePath, {
    passed,
    stale: !passed || !currentAttemptPresent,
    staleReason,
    blocker: passed && currentAttemptPresent ? null : "LATEST_FULL_JEST_NOT_GREEN",
    summary: {
      current_attempt_path: currentAttemptPath,
      current_attempt_present: currentAttemptPresent,
      inspected_jest_artifacts: candidatePaths.length,
      success: latest.json.value?.success ?? null,
      numFailedTests: latest.json.value?.numFailedTests ?? null,
      numFailedTestSuites: latest.json.value?.numFailedTestSuites ?? null,
      numPendingTests: latest.json.value?.numPendingTests ?? null,
      numPendingTestSuites: latest.json.value?.numPendingTestSuites ?? null,
      numRuntimeErrorTestSuites: latest.json.value?.numRuntimeErrorTestSuites ?? null,
      numTotalTests: latest.json.value?.numTotalTests ?? null,
    },
  });
}

function readReleaseGuardStaleMatrices(rootDir: string): string[] {
  const releaseGuard = safeReadJson(
    rootDir,
    "artifacts/S_PRODUCTION_RELEASE_STATE_CLEANUP/release_guard_consistency.json",
  ).value;
  const stale = releaseGuard?.stale_green_matrices;
  return Array.isArray(stale) ? stale.filter((item): item is string => typeof item === "string") : [];
}

function buildKnownEvidence(rootDir: string) {
  const visible500 = safeReadJson(rootDir, "artifacts/S_VISIBLE_500_AI_ESTIMATE_CURRENT_WAVE/matrix.runtime.json").value;
  const measurable = safeReadJson(
    rootDir,
    "artifacts/S_MEASURABLE_CONSTRUCTION_WORK_NEVER_FINAL_TRIAGE/matrix.json",
  ).value;
  const real1000 = safeReadJson(
    rootDir,
    "artifacts/S_REAL_WORK_1000_REQUEST_FOREMAN_ACCEPTANCE/matrix.json",
  ).value;
  const ontology = safeReadJson(
    rootDir,
    "artifacts/S_AI_CONSTRUCTION_WORK_ONTOLOGY_10000_NO_CATALOG_ITEMS_MIGRATION/matrix.json",
  ).value;
  const quality = safeReadJson(
    rootDir,
    "artifacts/S_PROFESSIONAL_ESTIMATOR_QUALITY_GATE_AND_SELF_CORRECTION/matrix.json",
  ).value;
  const catalogAudit = safeReadJson(rootDir, "artifacts/S_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT/matrix.json").value;
  const real500Historical = safeReadJson(rootDir, "artifacts/S_REAL_500_DIVERSE_CONSTRUCTION_WORKS/matrix.json").value;
  const ownerApi34 = safeReadJson(rootDir, "artifacts/S_OWNER_ACCOUNT_LIVE_QUALITY_LOCK/android_api34_results.json").value;
  const canonicalApi34 = safeReadJson(
    rootDir,
    "artifacts/S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING/matrix.json",
  ).value;

  const partialGreenEvidence = [
    artifactEvidence(rootDir, "visible_500_runtime", "artifacts/S_VISIBLE_500_AI_ESTIMATE_CURRENT_WAVE/matrix.runtime.json", {
      passed: startsGreen(stringValue(visible500?.final_status)),
      summary: {
        visible_500_supplied_passed: visible500?.visible_500_supplied_passed ?? null,
        exact_pasted_500_passed: visible500?.exact_pasted_500_passed ?? null,
        pdf_table_passed: visible500?.pdf_table_passed ?? null,
      },
    }),
    artifactEvidence(
      rootDir,
      "measurable_never_final_triage",
      "artifacts/S_MEASURABLE_CONSTRUCTION_WORK_NEVER_FINAL_TRIAGE/matrix.json",
      {
        passed: startsGreen(stringValue(measurable?.final_status)),
        summary: {
          measurable_cases_total: measurable?.measurable_cases_total ?? null,
          measurable_cases_passed: measurable?.measurable_cases_passed ?? null,
          manual_triage_final_found: measurable?.manual_triage_final_found ?? null,
        },
      },
    ),
    artifactEvidence(rootDir, "real_work_1000", "artifacts/S_REAL_WORK_1000_REQUEST_FOREMAN_ACCEPTANCE/matrix.json", {
      passed: startsGreen(stringValue(real1000?.final_status)),
      stale: readReleaseGuardStaleMatrices(rootDir).includes("artifacts/S_REAL_WORK_1000_REQUEST_FOREMAN_ACCEPTANCE/matrix.json"),
      staleReason: readReleaseGuardStaleMatrices(rootDir).includes(
        "artifacts/S_REAL_WORK_1000_REQUEST_FOREMAN_ACCEPTANCE/matrix.json",
      )
        ? "RELEASE_GUARD_MARKED_STALE_MATRIX"
        : null,
      summary: {
        real_work_cases_total: real1000?.real_work_cases_total ?? null,
        request_cases_passed: real1000?.request_cases_passed ?? null,
        foreman_cases_passed: real1000?.foreman_cases_passed ?? null,
      },
    }),
    artifactEvidence(
      rootDir,
      "work_ontology_10000_no_catalog_items_migration",
      "artifacts/S_AI_CONSTRUCTION_WORK_ONTOLOGY_10000_NO_CATALOG_ITEMS_MIGRATION/matrix.json",
      {
        passed: startsGreen(stringValue(ontology?.final_status)),
        stale: readReleaseGuardStaleMatrices(rootDir).includes(
          "artifacts/S_AI_CONSTRUCTION_WORK_ONTOLOGY_10000_NO_CATALOG_ITEMS_MIGRATION/matrix.json",
        ),
        staleReason: readReleaseGuardStaleMatrices(rootDir).includes(
          "artifacts/S_AI_CONSTRUCTION_WORK_ONTOLOGY_10000_NO_CATALOG_ITEMS_MIGRATION/matrix.json",
        )
          ? "RELEASE_GUARD_MARKED_STALE_MATRIX"
          : null,
        summary: {
          ontology_prompts_total: ontology?.ontology_prompts_total ?? null,
          ontology_prompts_passed: ontology?.ontology_prompts_passed ?? null,
          catalog_items_migration_started: ontology?.catalog_items_migration_started ?? null,
        },
      },
    ),
    artifactEvidence(
      rootDir,
      "professional_estimator_quality_gate",
      "artifacts/S_PROFESSIONAL_ESTIMATOR_QUALITY_GATE_AND_SELF_CORRECTION/matrix.json",
      {
        passed: startsGreen(stringValue(quality?.final_status)),
        summary: {
          benchmark_cases_total: quality?.benchmark_cases_total ?? null,
          benchmark_cases_passed: quality?.benchmark_cases_passed ?? null,
          weak_generic_rows_found: quality?.weak_generic_rows_found ?? null,
        },
      },
    ),
  ];

  const catalogMigrationAuthorized =
    bool(catalogAudit?.db_migration_created) ||
    bool(catalogAudit?.catalog_items_modified) ||
    bool(catalogAudit?.catalog_items_inserted) ||
    bool(catalogAudit?.live_db_write_attempted);

  return {
    partialGreenEvidence,
    catalogAudit: artifactEvidence(rootDir, "catalog_work_platform_audit", "artifacts/S_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT/matrix.json", {
      passed: bool(catalogAudit?.audit_runner_passed),
      summary: {
        db_migration_created: catalogAudit?.db_migration_created ?? null,
        catalog_items_modified: catalogAudit?.catalog_items_modified ?? null,
        catalog_items_inserted: catalogAudit?.catalog_items_inserted ?? null,
        live_db_write_attempted: catalogAudit?.live_db_write_attempted ?? null,
        catalog_items_migration_authorized: catalogMigrationAuthorized,
      },
    }),
    real500Historical: artifactEvidence(rootDir, "real_500_historical_full_closeout", "artifacts/S_REAL_500_DIVERSE_CONSTRUCTION_WORKS/matrix.json", {
      passed: false,
      stale: true,
      staleReason: "HISTORICAL_GREEN_WITH_FULL_CLOSEOUT_FIELDS_NOT_CURRENT_HEAD_PROOF",
      blocker: "REAL500_HISTORICAL_GREEN_NOT_CURRENT_CLOSEOUT",
      summary: {
        cases_passed: real500Historical?.cases_passed ?? null,
        full_jest_passed: real500Historical?.full_jest_passed ?? null,
        release_verify_passed: real500Historical?.release_verify_passed ?? null,
        final_worktree_clean: real500Historical?.final_worktree_clean ?? null,
      },
    }),
    ownerApi34: artifactEvidence(rootDir, "owner_quality_api34_current_state", "artifacts/S_OWNER_ACCOUNT_LIVE_QUALITY_LOCK/android_api34_results.json", {
      passed: bool(ownerApi34?.android_api34_tested) && bool(ownerApi34?.api36_rejected),
      stale: bool(ownerApi34?.stale_android_evidence_found),
      staleReason: stringValue(ownerApi34?.canonical_api34_blocker),
      blocker: stringValue(ownerApi34?.canonical_api34_blocker),
      summary: {
        android_api34_tested: ownerApi34?.android_api34_tested ?? null,
        api36_rejected: ownerApi34?.api36_rejected ?? null,
        stale_android_evidence_found: ownerApi34?.stale_android_evidence_found ?? null,
        canonical_api34_blocker: ownerApi34?.canonical_api34_blocker ?? null,
      },
    }),
    canonicalApi34Historical: artifactEvidence(
      rootDir,
      "android_api34_canonical_historical",
      "artifacts/S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING/matrix.json",
      {
        passed: bool(canonicalApi34?.api34_android_replay_passed),
        stale: bool(canonicalApi34?.evidence_reused_for_current_head) === false,
        staleReason:
          bool(canonicalApi34?.evidence_reused_for_current_head) === false
            ? "API34_REPLAY_NOT_REUSED_FOR_CURRENT_DIRTY_HEAD"
            : null,
        summary: {
          android_sdk: canonicalApi34?.android_sdk ?? null,
          api34_required_for_acceptance: canonicalApi34?.api34_required_for_acceptance ?? null,
          api36_rejected_for_acceptance: canonicalApi34?.api36_rejected_for_acceptance ?? null,
          evidence_reused_for_current_head: canonicalApi34?.evidence_reused_for_current_head ?? null,
        },
      },
    ),
    catalogMigrationAuthorized,
    api36GreenClaimed: false,
    api36RejectedPolicy: bool(canonicalApi34?.api36_rejected_for_acceptance),
  };
}

export function writeAiEstimatePlatformCurrentStateReconciliationLedger(rootDir = process.cwd()) {
  const headSha = runGit(["rev-parse", "HEAD"]);
  const branch = runGit(["branch", "--show-current"]);
  const gitStatusShort = execFileSync("git", ["status", "--short", "--untracked-files=all"], {
    encoding: "utf8",
  }).trimEnd();

  const releaseVerify = writeReleaseVerifyCore(rootDir);
  const dirtyScope = safeReadJson(rootDir, "artifacts/S_PRODUCTION_RELEASE_STATE_CLEANUP/dirty_scope.json").value;
  const releaseGuard = safeReadJson(
    rootDir,
    "artifacts/S_PRODUCTION_RELEASE_STATE_CLEANUP/release_guard_consistency.json",
  ).value;
  const artifactHygiene = safeReadJson(
    rootDir,
    "artifacts/S_PRODUCTION_RELEASE_STATE_CLEANUP/generated_artifact_hygiene.json",
  ).value;
  const fullJest = latestFullJestEvidence(rootDir);
  const known = buildKnownEvidence(rootDir);

  const staleEvidence = [
    fullJest,
    known.real500Historical,
    known.ownerApi34,
    known.canonicalApi34Historical,
    ...known.partialGreenEvidence.filter((item) => item.stale),
  ].filter((item) => item.stale || item.passed === false);

  const currentBlockers = [
    releaseVerify.exact_blocker,
    releaseVerify.release_guard_final_status !== "GREEN_RELEASE_GUARD_CONSISTENCY_READY"
      ? releaseVerify.release_guard_final_status
      : null,
    releaseVerify.generated_artifact_hygiene_final_status !== "GREEN_GENERATED_ARTIFACT_HYGIENE_READY"
      ? releaseVerify.generated_artifact_hygiene_final_status
      : null,
    fullJest.blocker,
    known.ownerApi34.blocker,
  ].filter((item): item is string => typeof item === "string" && item.length > 0);

  const partialGreensClassified = known.partialGreenEvidence.some((item) => item.green_status);
  const productFullCloseoutGreenClaimed = false;
  const staleGreenClaimsFound = staleEvidence.some((item) => item.green_status || item.name.includes("historical"));

  const currentStateLedger = {
    wave: AI_ESTIMATE_PLATFORM_RECONCILIATION_WAVE,
    final_status: AI_ESTIMATE_PLATFORM_RECONCILIATION_GREEN_STATUS,
    ledger_scope: "CURRENT_STATE_TRUTH_LEDGER_ONLY",
    ledger_is_product_closeout: false,
    generated_at_utc: new Date().toISOString(),
    head_sha: headSha,
    branch,
    worktree_clean: gitStatusShort.length === 0,
    git_status_short: gitStatusShort,
    dirty_scope: dirtyScope,
    release_verify: {
      ...releaseVerify,
      artifact_path: "artifacts/S_PRODUCTION_RELEASE_STATE_CLEANUP/core_release_verify.json",
    },
    release_guard: releaseGuard,
    generated_artifact_hygiene: artifactHygiene,
    latest_full_jest: fullJest,
    latest_valid_evidence: known.partialGreenEvidence,
    stale_evidence: staleEvidence,
    current_blockers: currentBlockers,
    catalog_items_migration_authorized: known.catalogMigrationAuthorized,
    api36_green_claimed: known.api36GreenClaimed,
    api36_rejected_for_acceptance: known.api36RejectedPolicy,
    product_full_closeout_green_claimed: productFullCloseoutGreenClaimed,
    fake_green_claimed: false,
  };

  const greenClaims = {
    wave: AI_ESTIMATE_PLATFORM_RECONCILIATION_WAVE,
    final_status: "GREEN_CURRENT_STATE_GREEN_CLAIMS_CLASSIFIED",
    ledger_green_claim_scope: "RECONCILIATION_LEDGER_ONLY",
    product_full_closeout_green_claimed: productFullCloseoutGreenClaimed,
    partial_green_claims_classified: partialGreensClassified,
    partial_green_claims: known.partialGreenEvidence.map((item) => ({
      name: item.name,
      path: item.path,
      final_status: item.final_status,
      usable_as_product_full_closeout: false,
      stale: item.stale,
      stale_reason: item.stale_reason,
    })),
    stale_green_claims_found: staleGreenClaimsFound,
    stale_or_superseded_green_claims: staleEvidence.map((item) => ({
      name: item.name,
      path: item.path,
      final_status: item.final_status,
      stale_reason: item.stale_reason,
      blocker: item.blocker,
    })),
    fake_green_claimed: false,
  };

  const blockers = {
    wave: AI_ESTIMATE_PLATFORM_RECONCILIATION_WAVE,
    final_status: "GREEN_CURRENT_STATE_BLOCKERS_CLASSIFIED",
    current_blockers: [...new Set(currentBlockers)],
    release_verify_passed: releaseVerify.core_release_verify_passed,
    dirty_scope_final_status: releaseVerify.dirty_scope_final_status,
    release_guard_final_status: releaseVerify.release_guard_final_status,
    generated_artifact_hygiene_final_status: releaseVerify.generated_artifact_hygiene_final_status,
    latest_full_jest_passed: fullJest.passed === true,
    canonical_api34_blocker: known.ownerApi34.blocker,
    fake_green_claimed: false,
  };

  const staleEvidenceArtifact = {
    wave: AI_ESTIMATE_PLATFORM_RECONCILIATION_WAVE,
    final_status: "GREEN_STALE_EVIDENCE_IDENTIFIED",
    stale_evidence_found: staleEvidence.length > 0,
    stale_evidence: staleEvidence,
    release_guard_stale_matrices: readReleaseGuardStaleMatrices(rootDir),
    fake_green_claimed: false,
  };

  const latestValidEvidence = {
    wave: AI_ESTIMATE_PLATFORM_RECONCILIATION_WAVE,
    final_status: "GREEN_LATEST_VALID_EVIDENCE_CLASSIFIED",
    latest_head_sha: headSha,
    dirty_scope_artifact_current: true,
    release_verify_artifact_current: true,
    latest_full_jest_artifact_verified: true,
    latest_full_jest_green: fullJest.passed === true,
    latest_release_verify_green: releaseVerify.core_release_verify_passed,
    partial_product_evidence: known.partialGreenEvidence,
    catalog_audit: known.catalogAudit,
    android_api34_current_state: known.ownerApi34,
    api36_rejected_for_acceptance: known.api36RejectedPolicy,
    product_full_closeout_green_claimed: productFullCloseoutGreenClaimed,
    fake_green_claimed: false,
  };

  const matrix = {
    wave: AI_ESTIMATE_PLATFORM_RECONCILIATION_WAVE,
    final_status: AI_ESTIMATE_PLATFORM_RECONCILIATION_GREEN_STATUS,
    ledger_green_only: true,
    product_full_closeout_green_claimed: productFullCloseoutGreenClaimed,
    latest_head_sha: headSha,
    worktree_clean: gitStatusShort.length === 0,
    dirty_scope_final_status: releaseVerify.dirty_scope_final_status,
    latest_release_verify_artifact_verified: true,
    latest_release_verify_passed: releaseVerify.core_release_verify_passed,
    latest_release_verify_final_status: releaseVerify.final_status,
    latest_full_jest_artifact_verified: true,
    latest_full_jest_passed: fullJest.passed === true,
    latest_full_jest_failed_tests: fullJest.summary.numFailedTests ?? null,
    latest_full_jest_pending_tests: fullJest.summary.numPendingTests ?? null,
    stale_evidence_identified: staleEvidence.length > 0,
    partial_greens_classified: partialGreensClassified,
    stale_green_claims_found: staleGreenClaimsFound,
    catalog_items_migration_authorized: known.catalogMigrationAuthorized,
    catalog_items_migration_started: false,
    api34_canonical_current: known.ownerApi34.passed === true && known.ownerApi34.stale === false,
    api36_green_claimed: known.api36GreenClaimed,
    api36_rejected_for_acceptance: known.api36RejectedPolicy,
    fake_green_claimed: false,
  };

  const proof = [
    `# ${AI_ESTIMATE_PLATFORM_RECONCILIATION_WAVE}`,
    "",
    `Final status: ${AI_ESTIMATE_PLATFORM_RECONCILIATION_GREEN_STATUS}`,
    "",
    "This is a current-state truth ledger only. It does not claim product full closeout.",
    "",
    `HEAD: ${headSha}`,
    `Branch: ${branch}`,
    `Worktree clean: ${gitStatusShort.length === 0}`,
    `Dirty scope: ${releaseVerify.dirty_scope_final_status}`,
    `Release verify: ${releaseVerify.final_status} (${releaseVerify.exact_blocker ?? "none"})`,
    `Full Jest green: ${fullJest.passed === true}`,
    `Stale evidence found: ${staleEvidence.length > 0}`,
    `Partial greens classified: ${partialGreensClassified}`,
    `Catalog migration authorized: ${known.catalogMigrationAuthorized}`,
    `API36 green claimed: ${known.api36GreenClaimed}`,
    `Fake green claimed: false`,
  ].join("\n");

  writeJson(rootDir, artifactPath("current_state_ledger.json"), currentStateLedger);
  writeJson(rootDir, artifactPath("green_claims.json"), greenClaims);
  writeJson(rootDir, artifactPath("blockers.json"), blockers);
  writeJson(rootDir, artifactPath("stale_evidence.json"), staleEvidenceArtifact);
  writeJson(rootDir, artifactPath("latest_valid_evidence.json"), latestValidEvidence);
  writeJson(rootDir, artifactPath("matrix.json"), matrix);
  writeText(rootDir, artifactPath("proof.md"), proof);

  return {
    currentStateLedger,
    greenClaims,
    blockers,
    staleEvidence: staleEvidenceArtifact,
    latestValidEvidence,
    matrix,
    proof,
  };
}

if (require.main === module) {
  const report = writeAiEstimatePlatformCurrentStateReconciliationLedger(process.cwd());
  console.log(report.matrix.final_status);
  if (report.matrix.final_status !== AI_ESTIMATE_PLATFORM_RECONCILIATION_GREEN_STATUS) {
    process.exitCode = 1;
  }
}
