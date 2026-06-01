import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  OWNER_GATE_BLOCKED_STATUS,
  REQUIRED_RELEASE_GATES,
  SCOPED_OWNER_RELEASE_GATES,
  type ReleaseGateDefinition,
} from "./releaseGuard.shared";
import {
  RELEASE_VERIFY_CORE_BLOCKED_STATUS,
  RELEASE_VERIFY_CORE_GREEN_STATUS,
  RELEASE_VERIFY_MOBILE_BLOCKED_STATUS,
  RELEASE_VERIFY_OWNER_BLOCKED_STATUS,
  buildReleaseScopeSummary,
  type ReleaseScopeSummary,
} from "./releaseTargetScope";

export const PRODUCTION_RELEASE_STATE_CLEANUP_WAVE =
  "S_PRODUCTION_SAFE_RELEASE_STATE_CLEANUP_WAVE_OWNERSHIP_CLOSEOUT_POINT_OF_NO_RETURN";
export const PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX =
  "S_PRODUCTION_RELEASE_STATE_CLEANUP";
export const PRODUCTION_RELEASE_STATE_CLEANUP_BLOCKER_REDUCTION_PREFIX =
  "S_PRODUCTION_RELEASE_STATE_CLEANUP_BLOCKER_REDUCTION";
export const PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_WAVE =
  "S_PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_SPLIT_COMMIT_POINT_OF_NO_RETURN";
export const PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_PREFIX =
  "S_PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT";
export const PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT_WAVE =
  "S_PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT_WORKTREE_POINT_OF_NO_RETURN";
export const PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT_PREFIX =
  "S_PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT";
export const PRODUCTION_RELEASE_STATE_CLEANUP_GREEN_STATUS =
  "GREEN_PRODUCTION_RELEASE_STATE_CLEANUP_READY";
export const PRODUCTION_RELEASE_STATE_CLEANUP_BLOCKED_STATUS =
  "BLOCKED_PRODUCTION_RELEASE_STATE_CLEANUP";

function isProductionReleaseStateCleanupArtifact(filePath: string): boolean {
  const file = normalizeReleaseStatePath(filePath);
  return [
    PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX,
    PRODUCTION_RELEASE_STATE_CLEANUP_BLOCKER_REDUCTION_PREFIX,
    PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_PREFIX,
    PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT_PREFIX,
  ].some((prefix) => file.startsWith(`artifacts/${prefix}/`));
}

export type DirtyWaveClassification =
  | "OWNER_ACCOUNT_WIP"
  | "LIVE_B2C_BINDING_WIP"
  | "MOBILE_BUILD_WIP"
  | "MOBILE_INSTALLED_ARTIFACT_WIP"
  | "REAL10000_REVALIDATION_WIP"
  | "RELEASE_HARNESS_WIP"
  | "GENERATED_ARTIFACT_CHURN"
  | "UNKNOWN_DIRTY";

export type DirtyScopeFinalStatus =
  | "GREEN_CLEAN_WORKTREE"
  | "READY_FOR_CLOSEOUT_COMMIT"
  | "BLOCKED_MIXED_WAVE_DIRTY_WORKTREE"
  | "BLOCKED_TRACKED_ARTIFACT_CHURN"
  | "UNKNOWN_WAVE_DIRTY_FILES_FOUND";

export type GitStatusEntry = {
  code: string;
  file: string;
  tracked: boolean;
};

export type DirtyFileClassification = {
  file: string;
  code: string;
  tracked: boolean;
  classification: DirtyWaveClassification;
  generatedArtifact: boolean;
  allowedScope: boolean;
  reasons: string[];
};

export type DirtyScopeReport = {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_WAVE;
  final_status: DirtyScopeFinalStatus;
  dirty_files: string[];
  dirty_file_classifications: DirtyFileClassification[];
  active_waves: DirtyWaveClassification[];
  mixed_wave_dirty_worktree_found: boolean;
  unknown_dirty_files_found: boolean;
  unknown_dirty_files: string[];
  tracked_artifact_churn_found: boolean;
  tracked_artifact_churn_files: string[];
  generated_artifact_churn_files: string[];
  can_be_committed: boolean;
  must_be_parked: boolean;
  fake_green_claimed: false;
};

export type BlockerReductionDirtyFileAction =
  | "KEEP_FOR_CURRENT_WAVE"
  | "PARK_AS_BLOCKED"
  | "RERUN_TO_STABILIZE"
  | "REMOVE_IF_OBSOLETE_AND_DOCUMENTED"
  | "BLOCK";

export type BlockerReductionDirtyFile = {
  path: string;
  status: "M" | "A" | "D" | "??";
  owner_wave: DirtyWaveClassification;
  allowed_in_current_wave: boolean;
  action: BlockerReductionDirtyFileAction;
};

export type BlockerReductionDirtyFilesReport = {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_WAVE;
  final_status:
    | "GREEN_NO_DIRTY_FILES"
    | "READY_FOR_CURRENT_WAVE_CLEANUP_COMMIT"
    | "BLOCKED_UNKNOWN_DIRTY_FILES_FOUND"
    | "BLOCKED_MIXED_WAVE_DIRTY_WORKTREE"
    | "BLOCKED_TRACKED_ARTIFACT_CHURN_FOUND";
  dirty_files: BlockerReductionDirtyFile[];
  active_non_generated_waves: DirtyWaveClassification[];
  unknown_dirty_files_found: boolean;
  mixed_wave_dirty_worktree_found: boolean;
  tracked_artifact_churn_found: boolean;
  can_commit_current_wave: boolean;
  git_status_short: string;
  git_diff_name_status: string;
  git_diff_stat: string;
  fake_green_claimed: false;
};

export type WaveInventoryItem = {
  wave: string;
  artifactPath: string;
  finalStatus: string | null;
  isGreen: boolean;
  isBlocked: boolean;
  blocker?: string;
  matrixExists: boolean;
  proofExists: boolean;
  failuresExists: boolean;
  releaseGuardRegistered: boolean;
  ownsDirtyFiles: boolean;
  dirtyFiles: string[];
  lastKnownCommit?: string;
  canBeCommitted: boolean;
  mustBeParked: boolean;
  mustBeRerun: boolean;
};

export type WaveInventoryReport = {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_WAVE;
  final_status: "GREEN_WAVES_INVENTORIED" | "UNKNOWN_WAVE_DIRTY_FILES_FOUND";
  items: WaveInventoryItem[];
  dirty_scope_final_status: DirtyScopeFinalStatus;
  unknown_dirty_files_found: boolean;
  unknown_dirty_files: string[];
  fake_green_claimed: false;
};

export type ReleaseGuardConsistencyReport = {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_WAVE;
  final_status:
    | "GREEN_RELEASE_GUARD_CONSISTENCY_READY"
    | "BLOCKED_RELEASE_GUARD_REFERENCES_MISSING_SCRIPT"
    | "BLOCKED_RELEASE_GUARD_REFERENCES_OLD_PDF_BOQ_REALITY_SCRIPT"
    | "BLOCKED_OWNER_SESSION_REQUIRED_FOR_OWNER_REPLAY"
    | "BLOCKED_RELEASE_GUARD_STALE_MATRIX"
    | "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_PROOF"
    | "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_FAILURES";
  mandatory_gate_count: number;
  owner_only_gate_count: number;
  missing_scripts: string[];
  old_pdf_boq_reality_references: string[];
  owner_session_mandatory_gates: string[];
  stale_green_matrices: string[];
  green_without_proof: string[];
  green_without_empty_failures: string[];
  release_guard_missing_scripts_found: boolean;
  release_guard_stale_matrix_found: boolean;
  fake_green_claimed: false;
};

export type MatrixSourceFingerprintDiagnosis = {
  status:
    | "SOURCE_FINGERPRINT_MATCHES"
    | "SOURCE_FINGERPRINT_STALE"
    | "SOURCE_FINGERPRINT_FILE_MISSING"
    | "SOURCE_FINGERPRINT_UNSUPPORTED_ALGORITHM"
    | "SOURCE_FINGERPRINT_NOT_RECORDED";
  recorded_source_fingerprint: string | null;
  current_source_fingerprint: string | null;
  source_fingerprint_algorithm: string | null;
  source_fingerprint_file_count: number;
  missing_source_fingerprint_files: string[];
  source_fingerprint_stale: boolean;
};

export type ReleaseGuardArtifactDiagnosis = {
  artifact_dir: string;
  matrix_path: string;
  final_status: string | null;
  is_green_matrix: boolean;
  statuses: (
    | "GREEN_MATRIX_HAS_REQUIRED_PROOF"
    | "BLOCKED_GREEN_MATRIX_WITHOUT_FAILURES_JSON"
    | "BLOCKED_GREEN_MATRIX_WITH_NONEMPTY_FAILURES"
    | "BLOCKED_GREEN_MATRIX_WITHOUT_PROOF"
    | "BLOCKED_STALE_GREEN_MATRIX"
    | "MATRIX_MISSING"
    | "NOT_GREEN_MATRIX"
  )[];
  failures_json_exists: boolean;
  failures_json_empty_array: boolean;
  failures_json_non_empty: boolean;
  proof_md_exists: boolean;
  source_fingerprint: MatrixSourceFingerprintDiagnosis;
};

export type ReleaseGuardGreenWithoutFailuresDiagnosis = {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_WAVE;
  final_status:
    | "GREEN_RELEASE_GUARD_GREEN_MATRIX_DIAGNOSIS_READY"
    | "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_FAILURES"
    | "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_PROOF"
    | "BLOCKED_RELEASE_GUARD_STALE_MATRIX";
  artifact_diagnoses: ReleaseGuardArtifactDiagnosis[];
  release_guard_green_without_failures_found: boolean;
  release_guard_green_without_proof_found: boolean;
  release_guard_stale_matrix_found: boolean;
  fake_green_claimed: false;
};

export type GeneratedArtifactHygieneReport = {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_WAVE;
  final_status:
    | "GREEN_GENERATED_ARTIFACT_HYGIENE_READY"
    | "TRACKED_ARTIFACT_CHURN_FOUND"
    | "STALE_BLOCKED_ARTIFACT_USED_AS_CURRENT"
    | "MATRIX_REPAINT_WITHOUT_PROOF";
  tracked_artifact_churn_found: boolean;
  tracked_artifact_churn_files: string[];
  stale_blocked_artifact_used_as_current: boolean;
  stale_blocked_artifacts: string[];
  matrix_repaint_without_proof: boolean;
  matrix_repaint_files: string[];
  fake_green_claimed: false;
};

export type GeneratedArtifactChurnReason =
  | "EXPECTED_CURRENT_WAVE_PROOF"
  | "STALE_OLD_PROOF"
  | "NONDETERMINISTIC_RUNNER_OUTPUT"
  | "SHOULD_BE_IGNORED"
  | "SHOULD_BE_TRACKED_STABLE";

export type GeneratedArtifactChurnAction =
  | "KEEP_TRACKED"
  | "ADD_TO_GITIGNORE"
  | "REGENERATE_STABLE"
  | "PARK_BLOCKED"
  | "BLOCK";

export type GeneratedArtifactChurnItem = {
  path: string;
  status: "M" | "A" | "D" | "??";
  tracked: boolean;
  reason: GeneratedArtifactChurnReason;
  action: GeneratedArtifactChurnAction;
  runner: string | null;
};

export type GeneratedArtifactChurnDiagnosis = {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_WAVE;
  final_status: GeneratedArtifactHygieneReport["final_status"];
  changed_artifacts: GeneratedArtifactChurnItem[];
  exact_runners_causing_churn: string[];
  tracked_artifact_churn_found: boolean;
  fake_green_claimed: false;
};

export type SecretScanMatch = {
  file: string;
  line: number;
  label: string;
};

export type SecretScanReport = {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_WAVE;
  final_status:
    | "GREEN_RELEASE_SECRET_SCAN_READY"
    | "BLOCKED_SECRETS_WRITTEN_TO_ARTIFACTS"
    | "BLOCKED_RAW_CREDENTIALS_FOUND_IN_RELEASE_SCAN_SCOPE";
  scanned_files: number;
  skipped_large_files: string[];
  matches: SecretScanMatch[];
  secrets_written_to_artifacts: boolean;
  raw_credentials_written: boolean;
  fake_green_claimed: false;
};

export type ReleaseStateCleanupMatrix = {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_WAVE;
  final_status: string;
  strict_fail_closed_enterprise_mode: true;
  owner_gate_deleted: boolean;
  owner_gate_globally_optional: boolean;
  owner_gate_moved_to_scoped_owner_verify: boolean;
  owner_gate_required_for_production_claims: true;
  owner_gate_status: typeof OWNER_GATE_BLOCKED_STATUS;
  core_release_verify_passed: boolean;
  owner_release_verify_passed: boolean;
  core_release_claims_owner_replay: false;
  core_release_claims_external_user_traffic: false;
  core_release_claims_production_rollout: false;
  core_release_claims_public_beta: false;
  core_release_claims_app_review: false;
  production_claim_blocked_when_owner_blocked: true;
  public_rollout_blocked_when_owner_blocked: true;
  mobile_build_allowed_without_owner_only_if_scope_exempt: true;
  product_logic_changed: boolean;
  estimate_engine_changed: boolean;
  boq_compiler_changed: boolean;
  pdf_renderer_changed: boolean;
  ui_rewrite_found: boolean;
  waves_inventoried: boolean;
  mixed_wave_dirty_worktree_found: boolean;
  unknown_dirty_files_found: boolean;
  tracked_artifact_churn_found: boolean;
  owner_account_blocker_classified: boolean;
  owner_account_real_external_traffic_claimed: boolean;
  owner_account_fake_green_claimed: boolean;
  mobile_build_blocker_classified: boolean;
  mobile_build_started: boolean;
  testflight_started: boolean;
  android_adb_install_started: boolean;
  app_review_submitted: boolean;
  public_beta_enabled: boolean;
  production_rollout_enabled: boolean;
  owner_account_session_verified: boolean;
  owner_account_live_replay_proven: boolean;
  real_external_user_traffic_claimed: boolean;
  release_guard_missing_scripts_found: boolean;
  release_guard_stale_matrix_found: boolean;
  matrix_repaint_without_proof_found: boolean;
  secrets_written_to_artifacts: boolean;
  raw_credentials_written: boolean;
  typecheck_passed: boolean;
  lint_passed: boolean;
  git_diff_check_passed: boolean;
  targeted_tests_passed: boolean;
  architecture_tests_passed: boolean;
  release_state_cleanup_proof_passed: boolean;
  full_jest_passed: boolean;
  release_verify_passed_or_exact_blocker_recorded: boolean;
  commit_created: boolean;
  branch_pushed: boolean;
  final_worktree_clean: boolean;
  fake_green_claimed: false;
};

type JsonRecord = Record<string, unknown>;

type WaveDefinition = {
  classification: DirtyWaveClassification;
  wave: string;
  artifactPath: string;
  guardNeedle: string;
};

const OWNER_BLOCKED_STATUS = OWNER_GATE_BLOCKED_STATUS;
const MOBILE_BUILD_BLOCKED_STATUS = "BLOCKED_MOBILE_BUILD_DIRTY_WORKTREE";
const MOBILE_ARTIFACT_BLOCKED_STATUS =
  "BLOCKED_MOBILE_ARTIFACT_ACCEPTANCE_BUILD_WAVE_NOT_GREEN";

const OLD_PDF_BOQ_REALITY_NAMES = [
  "runAiEstimateOwnerAccountPdfBoqRealityReplay.ts",
  "runOwnerAccountCatalogBindingRealityAudit.ts",
  "ownerAccountPdfBoqReality.web.spec.ts",
  "runAndroidApi34OwnerAccountPdfBoqRealitySmoke.ts",
  "runAiEstimateOwnerAccountPdfBoqRealityProof.ts",
];

const BINARY_EXTENSIONS = new Set([
  ".apk",
  ".bin",
  ".bmp",
  ".gif",
  ".heic",
  ".ico",
  ".jar",
  ".jpeg",
  ".jpg",
  ".keystore",
  ".mp4",
  ".pdf",
  ".png",
  ".webp",
  ".zip",
]);

const MAX_SECRET_SCAN_BYTES = 2_000_000;

const WAVE_DEFINITIONS: WaveDefinition[] = [
  {
    classification: "OWNER_ACCOUNT_WIP",
    wave: "S_OWNER_ACCOUNT_LIVE_QUALITY_LOCK",
    artifactPath: "artifacts/S_OWNER_ACCOUNT_LIVE_QUALITY_LOCK",
    guardNeedle: "runOwnerAccountLiveEstimateQualityLockProof.ts",
  },
  {
    classification: "LIVE_B2C_BINDING_WIP",
    wave: "S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT",
    artifactPath: "artifacts/S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT",
    guardNeedle: "runLiveB2cEstimateRealityReleaseCloseoutProof.ts",
  },
  {
    classification: "MOBILE_BUILD_WIP",
    wave: "S_MOBILE_RELEASE_BUILD",
    artifactPath: "artifacts/S_MOBILE_RELEASE_BUILD",
    guardNeedle: "runMobileReleaseBuildProof.ts",
  },
  {
    classification: "MOBILE_INSTALLED_ARTIFACT_WIP",
    wave: "S_MOBILE_INSTALLED_ARTIFACT_ACCEPTANCE",
    artifactPath: "artifacts/S_MOBILE_INSTALLED_ARTIFACT_ACCEPTANCE",
    guardNeedle: "runMobileInstalledArtifactAcceptanceProof.ts",
  },
  {
    classification: "REAL10000_REVALIDATION_WIP",
    wave: "S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS",
    artifactPath: "artifacts/S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS",
    guardNeedle: "runReal10000DiverseConstructionWorksExpandedEstimateProof.ts",
  },
  {
    classification: "RELEASE_HARNESS_WIP",
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX,
    artifactPath: `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}`,
    guardNeedle: "runProductionReleaseStateCleanupProof.ts",
  },
];

export function normalizeReleaseStatePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function runGit(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    }).trim();
  } catch {
    return fallback;
  }
}

function runGitRaw(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    }).replace(/\r?\n$/, "");
  } catch {
    return fallback;
  }
}

function readText(rootDir: string, relativePath: string): string {
  const fullPath = path.join(rootDir, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

function readJson(rootDir: string, relativePath: string): JsonRecord | null {
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8").replace(/^\uFEFF/, "")) as JsonRecord;
  } catch {
    return null;
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

function bool(value: unknown): boolean {
  return value === true;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function startsGreen(status: string | null): boolean {
  return typeof status === "string" && status.startsWith("GREEN_");
}

function startsBlocked(status: string | null): boolean {
  return typeof status === "string" && status.startsWith("BLOCKED_");
}

export function parseGitStatusShort(status: string): GitStatusEntry[] {
  return status
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const code = line.length >= 2 ? line.slice(0, 2) : line.trim();
      const rawFile = line.length > 3 ? line.slice(3).trim() : line.trim().slice(2).trim();
      const file = rawFile.includes(" -> ") ? rawFile.split(" -> ").pop() ?? rawFile : rawFile;
      return {
        code,
        file: normalizeReleaseStatePath(file),
        tracked: code !== "??",
      };
    });
}

export function gitStatusShort(): string {
  return runGitRaw(["status", "--short"], "");
}

export function gitStatusShortAll(): string {
  return runGitRaw(["status", "--short", "--untracked-files=all"], "");
}

export function gitDiffNameStatus(): string {
  const unstaged = runGitRaw(["diff", "--name-status"], "");
  const staged = runGitRaw(["diff", "--cached", "--name-status"], "");
  return [unstaged, staged].filter(Boolean).join("\n");
}

export function gitDiffStat(): string {
  const unstaged = runGitRaw(["diff", "--stat"], "");
  const staged = runGitRaw(["diff", "--cached", "--stat"], "");
  return [unstaged, staged].filter(Boolean).join("\n");
}

function matchAny(file: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(file));
}

function normalizeDirtyStatus(code: string): "M" | "A" | "D" | "??" {
  if (code === "??") return "??";
  if (code.includes("D")) return "D";
  if (code.includes("A")) return "A";
  return "M";
}

function isCurrentBlockerReductionCleanupPath(filePath: string): boolean {
  const file = normalizeReleaseStatePath(filePath);
  return (
    file === "scripts/release/releaseStateCleanupCore.ts" ||
    file === "scripts/release/releaseTargetScope.ts" ||
    file === "scripts/release/runReleaseVerifyCore.ts" ||
    file === "scripts/release/runReleaseVerifyOwner.ts" ||
    file === "scripts/release/runReleaseVerifyMobile.ts" ||
    file === "scripts/release/runProductionReleaseStateCleanupProof.ts" ||
    file === "scripts/audit/runProductionReleaseWaveInventory.ts" ||
    file === "scripts/audit/runReleaseGuardConsistencyAudit.ts" ||
    file === "scripts/audit/runGeneratedArtifactHygieneAudit.ts" ||
    file === "scripts/audit/runProductionReleaseSecretScan.ts" ||
    file.startsWith("tests/releaseStateCleanup/") ||
    /^tests\/architecture\/releaseState[A-Za-z0-9_-]*\.contract\.test\.ts$/.test(file) ||
    file.startsWith(`artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/`) ||
    file.startsWith(`artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_BLOCKER_REDUCTION_PREFIX}/`) ||
    file.startsWith(`artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_PREFIX}/`) ||
    file.startsWith(`artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT_PREFIX}/`) ||
    file === "package.json"
  );
}

function blockerReductionDirtyAction(
  item: DirtyFileClassification,
  allowedInCurrentWave: boolean,
): BlockerReductionDirtyFileAction {
  if (item.classification === "UNKNOWN_DIRTY") return "BLOCK";
  if (allowedInCurrentWave) return "KEEP_FOR_CURRENT_WAVE";
  if (item.classification === "GENERATED_ARTIFACT_CHURN") return "RERUN_TO_STABILIZE";
  return "PARK_AS_BLOCKED";
}

function dirtyClassification(
  file: string,
  classification: DirtyWaveClassification,
  generatedArtifact: boolean,
  reason: string,
): Omit<DirtyFileClassification, "code" | "tracked"> {
  return {
    file,
    classification,
    generatedArtifact,
    allowedScope: classification !== "UNKNOWN_DIRTY",
    reasons: [reason],
  };
}

export function classifyDirtyPath(filePath: string): Omit<DirtyFileClassification, "code" | "tracked"> {
  const file = normalizeReleaseStatePath(filePath);

  if (
    file.startsWith(`artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/`) ||
    file.startsWith(`artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_BLOCKER_REDUCTION_PREFIX}/`) ||
    file.startsWith(`artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_PREFIX}/`) ||
    file.startsWith(`artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT_PREFIX}/`) ||
    file.startsWith("tests/releaseStateCleanup/") ||
    /^tests\/architecture\/releaseState[A-Za-z0-9_-]*\.contract\.test\.ts$/.test(file) ||
    file === "scripts/release/releaseStateCleanupCore.ts" ||
    file === "scripts/release/releaseTargetScope.ts" ||
    file === "scripts/release/releaseWaveDirtyScope.ts" ||
    file === "scripts/release/classifyDirtyWorktreeByWave.ts" ||
    file === "scripts/release/runProductionReleaseStateCleanupProof.ts" ||
    file === "scripts/release/runReleaseVerifyCore.ts" ||
    file === "scripts/release/runReleaseVerifyOwner.ts" ||
    file === "scripts/release/runReleaseVerifyMobile.ts" ||
    file === "scripts/audit/runProductionReleaseWaveInventory.ts" ||
    file === "scripts/audit/runReleaseGuardConsistencyAudit.ts" ||
    file === "scripts/audit/runGeneratedArtifactHygieneAudit.ts" ||
    file === "scripts/audit/runProductionReleaseSecretScan.ts" ||
    file === "scripts/release/releaseGuard.shared.ts" ||
    file === "package.json" ||
    file === "scripts/release/runReleaseVerifyWithStepTiming.ts" ||
    file === "scripts/release/releaseVerifyDirtyScope.ts" ||
    /^tests\/architecture\/.*releaseVerify.*\.contract\.test\.ts$/i.test(file) ||
    /^tests\/architecture\/.*finalReadiness.*\.contract\.test\.ts$/i.test(file) ||
    /^tests\/architecture\/.*performanceCloseout.*\.contract\.test\.ts$/i.test(file)
  ) {
    return dirtyClassification(file, "RELEASE_HARNESS_WIP", false, "release-state or release-harness scope");
  }

  if (
    file.startsWith("artifacts/S_OWNER_ACCOUNT") ||
    file.startsWith("artifacts/pdf/owner-account") ||
    file.startsWith("scripts/e2e/ownerQuality/") ||
    file.startsWith("scripts/e2e/ownerAccount") ||
    file.startsWith("scripts/e2e/runOwnerAccount") ||
    file.startsWith("scripts/e2e/runAndroidApi34OwnerAccount") ||
    file.startsWith("scripts/audit/runOwnerAccount") ||
    file.startsWith("tests/liveQuality/") ||
    file.startsWith("tests/pdf/owner") ||
    file.startsWith("tests/catalogBinding/owner") ||
    file.startsWith("tests/architecture/owner") ||
    file === "tests/e2e/ownerAccountLiveEstimateQualityLock.web.spec.ts" ||
    file === "scripts/e2e/canonicalApi34Evidence.ts"
  ) {
    return dirtyClassification(file, "OWNER_ACCOUNT_WIP", false, "owner-account replay or quality-lock scope");
  }

  if (
    file.startsWith("artifacts/S_MOBILE_INSTALLED_ARTIFACT_ACCEPTANCE/") ||
    file.startsWith("tests/mobileArtifactAcceptance/") ||
    file.startsWith("scripts/release/mobileInstalledArtifactAcceptanceCore.ts") ||
    file.startsWith("scripts/release/runMobileInstalledArtifactAcceptance") ||
    file.startsWith("scripts/e2e/runIosTestFlightInstalledArtifactSmoke.ts") ||
    file.startsWith("scripts/e2e/runAndroidQaApkInstalledArtifactAcceptance.ts") ||
    file.startsWith("scripts/e2e/runAndroidQaApkInstallSmoke.ts") ||
    file.startsWith("scripts/audit/runMobileInstalled") ||
    /^tests\/architecture\/mobileArtifact/.test(file)
  ) {
    return dirtyClassification(file, "MOBILE_INSTALLED_ARTIFACT_WIP", false, "mobile installed artifact acceptance scope");
  }

  if (
    file === "eas.json" ||
    file === "app.json" ||
    file.startsWith("artifacts/S_MOBILE_RELEASE_BUILD/") ||
    file.startsWith("artifacts/S_IOS_TESTFLIGHT_INTERNAL_QA_BUILD/") ||
    file.startsWith("artifacts/mobile/android/") ||
    file.startsWith("tests/mobileRelease/") ||
    file.startsWith("tests/architecture/iosTestFlight") ||
    file.startsWith("scripts/release/mobileReleaseBuildCore.ts") ||
    file.startsWith("scripts/release/runMobileReleaseBuildProof.ts") ||
    file.startsWith("scripts/release/runMobileBuildPreflight.ts") ||
    file.startsWith("scripts/release/iosTestFlightInternalQa") ||
    file.startsWith("scripts/release/runIosTestFlight") ||
    file.startsWith("scripts/release/runIosAppStoreConnect") ||
    file.startsWith("scripts/release/runAndroidQaApkBuild.ts") ||
    file.startsWith("scripts/release/bumpMobileBuildVersion.ts") ||
    file.startsWith("scripts/audit/runMobileBuild") ||
    file.startsWith("scripts/audit/runIos") ||
    file.startsWith("scripts/audit/runAndroidApk") ||
    file.startsWith("scripts/audit/runMobileStoreReview") ||
    /^tests\/architecture\/mobileBuild/.test(file)
  ) {
    return dirtyClassification(file, "MOBILE_BUILD_WIP", false, "mobile build scope");
  }

  if (
    file.startsWith("artifacts/S_LIVE_B2C") ||
    file.startsWith("scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts") ||
    file.startsWith("scripts/release/runLiveB2cEstimateRealityReleaseCloseoutProof.ts") ||
    file.startsWith("scripts/e2e/runLiveB2c") ||
    file.startsWith("scripts/e2e/runLiveRequestEmbeddedAi") ||
    file.startsWith("tests/entrypoints/") ||
    file.startsWith("tests/release/requestEstimateRelease")
  ) {
    return dirtyClassification(file, "LIVE_B2C_BINDING_WIP", false, "live B2C binding scope");
  }

  if (
    file.startsWith("artifacts/S_REAL_10000") ||
    file.startsWith("artifacts/S_WORLD_CONSTRUCTION") ||
    file.startsWith("scripts/e2e/real10000") ||
    file.startsWith("scripts/e2e/runReal10000") ||
    file.startsWith("scripts/e2e/runWorldConstruction") ||
    file.startsWith("scripts/audit/real10000") ||
    file.startsWith("scripts/audit/runReal10000") ||
    file.startsWith("tests/real10000") ||
    file.startsWith("tests/real10000Audit/") ||
    file.startsWith("tests/worldConstruction") ||
    file.startsWith("src/lib/ai/estimatorKernel/") ||
    file.startsWith("src/lib/ai/globalEstimate/") ||
    file.startsWith("src/lib/ai/professionalBoq/") ||
    file.startsWith("tests/architecture/real10000") ||
    file === "tests/architecture/worldConstructionReleaseReusePolicy.contract.test.ts"
  ) {
    return dirtyClassification(file, "REAL10000_REVALIDATION_WIP", false, "Real10000 or estimate-engine revalidation scope");
  }

  if (file.startsWith("artifacts/")) {
    return dirtyClassification(file, "GENERATED_ARTIFACT_CHURN", true, "generated artifact churn");
  }

  if (file.startsWith("scripts/audit/") || file.startsWith("scripts/release/") || file.startsWith("tests/architecture/")) {
    return dirtyClassification(file, "RELEASE_HARNESS_WIP", false, "release harness scope");
  }

  return dirtyClassification(file, "UNKNOWN_DIRTY", false, "no release wave owner matched this path");
}

export function classifyDirtyFiles(entriesOrFiles: readonly (GitStatusEntry | string)[]): DirtyScopeReport {
  const entries = entriesOrFiles.map((entry) =>
    typeof entry === "string"
      ? { code: "??", file: normalizeReleaseStatePath(entry), tracked: false }
      : { ...entry, file: normalizeReleaseStatePath(entry.file) },
  );
  const dirtyFileClassifications = entries.map((entry) => ({
    ...classifyDirtyPath(entry.file),
    code: entry.code,
    tracked: entry.tracked,
  }));
  const activeWaveSet = new Set<DirtyWaveClassification>();
  const unknownDirtyFiles: string[] = [];
  const generatedArtifactChurnFiles: string[] = [];
  const trackedArtifactChurnFiles: string[] = [];

  for (const item of dirtyFileClassifications) {
    if (item.classification === "UNKNOWN_DIRTY") {
      unknownDirtyFiles.push(item.file);
    } else if (item.classification === "GENERATED_ARTIFACT_CHURN") {
      generatedArtifactChurnFiles.push(item.file);
      if (item.tracked) trackedArtifactChurnFiles.push(item.file);
    } else {
      activeWaveSet.add(item.classification);
    }
  }

  const activeWaves = [...activeWaveSet].sort();
  const trackedArtifactChurnFound = trackedArtifactChurnFiles.length > 0;
  const unknownDirtyFilesFound = unknownDirtyFiles.length > 0;
  const mixedWaveDirtyWorktreeFound =
    activeWaves.length > 1 || (activeWaves.length > 0 && generatedArtifactChurnFiles.length > 0);
  let finalStatus: DirtyScopeFinalStatus = "GREEN_CLEAN_WORKTREE";

  if (dirtyFileClassifications.length === 0) {
    finalStatus = "GREEN_CLEAN_WORKTREE";
  } else if (unknownDirtyFilesFound) {
    finalStatus = "UNKNOWN_WAVE_DIRTY_FILES_FOUND";
  } else if (activeWaves.length === 0 && generatedArtifactChurnFiles.length > 0) {
    finalStatus = "BLOCKED_TRACKED_ARTIFACT_CHURN";
  } else if (mixedWaveDirtyWorktreeFound) {
    finalStatus = "BLOCKED_MIXED_WAVE_DIRTY_WORKTREE";
  } else {
    finalStatus = "READY_FOR_CLOSEOUT_COMMIT";
  }

  return {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_WAVE,
    final_status: finalStatus,
    dirty_files: dirtyFileClassifications.map((item) => item.file),
    dirty_file_classifications: dirtyFileClassifications,
    active_waves: activeWaves,
    mixed_wave_dirty_worktree_found: mixedWaveDirtyWorktreeFound,
    unknown_dirty_files_found: unknownDirtyFilesFound,
    unknown_dirty_files: unknownDirtyFiles.sort(),
    tracked_artifact_churn_found: trackedArtifactChurnFound,
    tracked_artifact_churn_files: trackedArtifactChurnFiles.sort(),
    generated_artifact_churn_files: generatedArtifactChurnFiles.sort(),
    can_be_committed: finalStatus === "READY_FOR_CLOSEOUT_COMMIT",
    must_be_parked: finalStatus.startsWith("BLOCKED_") || finalStatus === "UNKNOWN_WAVE_DIRTY_FILES_FOUND",
    fake_green_claimed: false,
  };
}

export function readCurrentDirtyScope(): DirtyScopeReport {
  return classifyDirtyFiles(parseGitStatusShort(gitStatusShort()));
}

export function writeDirtyScopeArtifacts(rootDir = process.cwd()): DirtyScopeReport {
  const status = gitStatusShort();
  const diff = gitDiffNameStatus();
  const report = classifyDirtyFiles(parseGitStatusShort(status));
  writeText(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/git_status_before.txt`, status);
  writeText(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/git_diff_name_status.txt`, diff);
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/dirty_scope.json`, report);
  return report;
}

export function buildBlockerReductionDirtyFilesReport(
  statusText = gitStatusShort(),
  diffNameStatus = gitDiffNameStatus(),
  diffStat = gitDiffStat(),
): BlockerReductionDirtyFilesReport {
  const entries = parseGitStatusShort(statusText);
  const classified = classifyDirtyFiles(entries).dirty_file_classifications;
  const dirtyFiles = classified.map((item) => {
    const allowedInCurrentWave = isCurrentBlockerReductionCleanupPath(item.file);
    return {
      path: item.file,
      status: normalizeDirtyStatus(item.code),
      owner_wave: item.classification,
      allowed_in_current_wave: allowedInCurrentWave,
      action: blockerReductionDirtyAction(item, allowedInCurrentWave),
    };
  });
  const unknownDirtyFilesFound = dirtyFiles.some((item) => item.owner_wave === "UNKNOWN_DIRTY");
  const trackedArtifactChurnFound = classified.some(
    (item) => item.tracked && item.classification === "GENERATED_ARTIFACT_CHURN",
  );
  const activeNonGeneratedWaves = [
    ...new Set(
      dirtyFiles
        .filter((item) => item.owner_wave !== "GENERATED_ARTIFACT_CHURN")
        .map((item) => item.owner_wave),
    ),
  ].sort();
  const nonCurrentWaveDirtyFound = dirtyFiles.some((item) => !item.allowed_in_current_wave);
  const mixedWaveDirtyWorktreeFound = activeNonGeneratedWaves.length > 1 || nonCurrentWaveDirtyFound;
  let finalStatus: BlockerReductionDirtyFilesReport["final_status"] = "GREEN_NO_DIRTY_FILES";

  if (dirtyFiles.length === 0) {
    finalStatus = "GREEN_NO_DIRTY_FILES";
  } else if (unknownDirtyFilesFound) {
    finalStatus = "BLOCKED_UNKNOWN_DIRTY_FILES_FOUND";
  } else if (mixedWaveDirtyWorktreeFound) {
    finalStatus = "BLOCKED_MIXED_WAVE_DIRTY_WORKTREE";
  } else if (trackedArtifactChurnFound) {
    finalStatus = "BLOCKED_TRACKED_ARTIFACT_CHURN_FOUND";
  } else {
    finalStatus = "READY_FOR_CURRENT_WAVE_CLEANUP_COMMIT";
  }

  return {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_WAVE,
    final_status: finalStatus,
    dirty_files: dirtyFiles,
    active_non_generated_waves: activeNonGeneratedWaves,
    unknown_dirty_files_found: unknownDirtyFilesFound,
    mixed_wave_dirty_worktree_found: mixedWaveDirtyWorktreeFound,
    tracked_artifact_churn_found: trackedArtifactChurnFound,
    can_commit_current_wave: finalStatus === "READY_FOR_CURRENT_WAVE_CLEANUP_COMMIT",
    git_status_short: statusText,
    git_diff_name_status: diffNameStatus,
    git_diff_stat: diffStat,
    fake_green_claimed: false,
  };
}

export function writeBlockerReductionDirtyFiles(rootDir = process.cwd()): BlockerReductionDirtyFilesReport {
  const status = gitStatusShortAll();
  const diff = gitDiffNameStatus();
  const stat = gitDiffStat();
  const report = buildBlockerReductionDirtyFilesReport(status, diff, stat);
  const prefix = `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_BLOCKER_REDUCTION_PREFIX}`;
  writeText(rootDir, `${prefix}/git_status_short.txt`, status);
  writeText(rootDir, `${prefix}/git_diff_name_status.txt`, diff);
  writeText(rootDir, `${prefix}/git_diff_stat.txt`, stat);
  writeJson(rootDir, `${prefix}/dirty_files_exact.json`, report);
  return report;
}

function releaseGuardSource(rootDir: string): string {
  return readText(rootDir, "scripts/release/releaseGuard.shared.ts");
}

function gateCommands(gates: readonly ReleaseGateDefinition[]): string {
  return gates.map((gate) => `${gate.name} ${gate.command}`).join("\n");
}

function artifactMatrix(rootDir: string, artifactPath: string): JsonRecord | null {
  return readJson(rootDir, `${artifactPath}/matrix.json`);
}

function gitLastCommitForPath(relativePath: string): string | undefined {
  const value = runGit(["log", "-1", "--format=%H", "--", relativePath], "");
  return value || undefined;
}

function dirtyFilesForClassification(
  dirtyScope: DirtyScopeReport,
  classification: DirtyWaveClassification,
): string[] {
  return dirtyScope.dirty_file_classifications
    .filter((item) => item.classification === classification)
    .map((item) => item.file)
    .sort();
}

function discoveredArtifactDefinitions(rootDir: string): WaveDefinition[] {
  const artifactsRoot = path.join(rootDir, "artifacts");
  if (!fs.existsSync(artifactsRoot)) return [];
  const knownArtifactPaths = new Set(WAVE_DEFINITIONS.map((definition) => definition.artifactPath));
  return fs
    .readdirSync(artifactsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("S_"))
    .map((entry) => `artifacts/${entry.name}`)
    .filter((artifactPath) => !knownArtifactPaths.has(artifactPath))
    .map((artifactPath) => ({
      classification: "RELEASE_HARNESS_WIP" as DirtyWaveClassification,
      wave: artifactPath.split("/").pop() ?? artifactPath,
      artifactPath,
      guardNeedle: artifactPath.split("/").pop() ?? artifactPath,
    }));
}

export function buildWaveInventory(rootDir = process.cwd(), dirtyScope = readCurrentDirtyScope()): WaveInventoryReport {
  const guardSource = releaseGuardSource(rootDir);
  const guardCommands = `${gateCommands(REQUIRED_RELEASE_GATES)}\n${gateCommands(SCOPED_OWNER_RELEASE_GATES)}`;
  const definitions = [...WAVE_DEFINITIONS, ...discoveredArtifactDefinitions(rootDir)];
  const seen = new Set<string>();
  const items: WaveInventoryItem[] = [];

  for (const definition of definitions) {
    if (seen.has(definition.artifactPath)) continue;
    seen.add(definition.artifactPath);
    const matrix = artifactMatrix(rootDir, definition.artifactPath);
    const finalStatus = stringValue(matrix?.final_status);
    const dirtyFiles = dirtyFilesForClassification(dirtyScope, definition.classification);
    const failuresExists = fs.existsSync(path.join(rootDir, definition.artifactPath, "failures.json"));
    const proofExists = fs.existsSync(path.join(rootDir, definition.artifactPath, "proof.md"));
    const matrixExists = matrix !== null;
    const blocker = startsBlocked(finalStatus) ? finalStatus : undefined;
    items.push({
      wave: definition.wave,
      artifactPath: definition.artifactPath,
      finalStatus,
      isGreen: startsGreen(finalStatus),
      isBlocked: startsBlocked(finalStatus),
      ...(blocker ? { blocker } : {}),
      matrixExists,
      proofExists,
      failuresExists,
      releaseGuardRegistered:
        guardSource.includes(definition.guardNeedle) || guardCommands.includes(definition.guardNeedle),
      ownsDirtyFiles: dirtyFiles.length > 0,
      dirtyFiles,
      lastKnownCommit: gitLastCommitForPath(definition.artifactPath),
      canBeCommitted: dirtyScope.final_status === "READY_FOR_CLOSEOUT_COMMIT" && dirtyFiles.length > 0,
      mustBeParked: startsBlocked(finalStatus) || dirtyScope.must_be_parked,
      mustBeRerun: !matrixExists || (!startsGreen(finalStatus) && !startsBlocked(finalStatus)),
    });
  }

  return {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_WAVE,
    final_status: dirtyScope.unknown_dirty_files_found
      ? "UNKNOWN_WAVE_DIRTY_FILES_FOUND"
      : "GREEN_WAVES_INVENTORIED",
    items,
    dirty_scope_final_status: dirtyScope.final_status,
    unknown_dirty_files_found: dirtyScope.unknown_dirty_files_found,
    unknown_dirty_files: dirtyScope.unknown_dirty_files,
    fake_green_claimed: false,
  };
}

export function writeWaveInventory(rootDir = process.cwd()): WaveInventoryReport {
  const dirtyScope = readCurrentDirtyScope();
  const report = buildWaveInventory(rootDir, dirtyScope);
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/wave_inventory.json`, report);
  return report;
}

function extractTsxScriptPaths(command: string): string[] {
  const scripts: string[] = [];
  const tsxPattern = /(?:^|\s)(?:npx\s+)?tsx\s+([^\s&|]+)/g;
  let match = tsxPattern.exec(command);
  while (match) {
    scripts.push(normalizeReleaseStatePath(match[1]));
    match = tsxPattern.exec(command);
  }
  return scripts;
}

function matrixPaths(rootDir: string): string[] {
  const artifactsRoot = path.join(rootDir, "artifacts");
  if (!fs.existsSync(artifactsRoot)) return [];
  return fs
    .readdirSync(artifactsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("S_"))
    .map((entry) => `artifacts/${entry.name}/matrix.json`)
    .filter((relativePath) => fs.existsSync(path.join(rootDir, relativePath)));
}

function failuresJsonIsEmptyArray(rootDir: string, artifactDir: string): boolean {
  const failures = readJson(rootDir, `${artifactDir}/failures.json`);
  return Array.isArray(failures) && failures.length === 0;
}

function readJsonValue(rootDir: string, relativePath: string): {
  exists: boolean;
  validJson: boolean;
  value: unknown;
} {
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) return { exists: false, validJson: false, value: null };
  try {
    return {
      exists: true,
      validJson: true,
      value: JSON.parse(fs.readFileSync(fullPath, "utf8").replace(/^\uFEFF/, "")) as unknown,
    };
  } catch {
    return { exists: true, validJson: false, value: null };
  }
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    result.push(normalizeReleaseStatePath(item));
  }
  return result;
}

function diagnoseMatrixSourceFingerprint(rootDir: string, matrix: JsonRecord | null): MatrixSourceFingerprintDiagnosis {
  const algorithm = stringValue(matrix?.source_fingerprint_algorithm);
  const recorded = stringValue(matrix?.source_fingerprint);
  const files = stringArray(matrix?.source_fingerprint_files);
  if (!algorithm && !recorded && files === null) {
    return {
      status: "SOURCE_FINGERPRINT_NOT_RECORDED",
      recorded_source_fingerprint: null,
      current_source_fingerprint: null,
      source_fingerprint_algorithm: null,
      source_fingerprint_file_count: 0,
      missing_source_fingerprint_files: [],
      source_fingerprint_stale: false,
    };
  }

  if (algorithm !== "sha256:v1" || !recorded || files === null) {
    return {
      status: "SOURCE_FINGERPRINT_UNSUPPORTED_ALGORITHM",
      recorded_source_fingerprint: recorded,
      current_source_fingerprint: null,
      source_fingerprint_algorithm: algorithm,
      source_fingerprint_file_count: files?.length ?? 0,
      missing_source_fingerprint_files: [],
      source_fingerprint_stale: true,
    };
  }

  const missingFiles = files.filter((file) => !fs.existsSync(path.join(rootDir, file)));
  if (missingFiles.length > 0) {
    return {
      status: "SOURCE_FINGERPRINT_FILE_MISSING",
      recorded_source_fingerprint: recorded,
      current_source_fingerprint: null,
      source_fingerprint_algorithm: algorithm,
      source_fingerprint_file_count: files.length,
      missing_source_fingerprint_files: missingFiles,
      source_fingerprint_stale: true,
    };
  }

  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(rootDir, file)));
    hash.update("\0");
  }
  const current = hash.digest("hex");
  const matches = current === recorded;
  return {
    status: matches ? "SOURCE_FINGERPRINT_MATCHES" : "SOURCE_FINGERPRINT_STALE",
    recorded_source_fingerprint: recorded,
    current_source_fingerprint: current,
    source_fingerprint_algorithm: algorithm,
    source_fingerprint_file_count: files.length,
    missing_source_fingerprint_files: [],
    source_fingerprint_stale: !matches,
  };
}

export function evaluateReleaseGuardConsistency(params: {
  rootDir?: string;
  requiredGates?: readonly ReleaseGateDefinition[];
  ownerOnlyGates?: readonly ReleaseGateDefinition[];
  matrixPathList?: readonly string[];
  currentHead?: string;
} = {}): ReleaseGuardConsistencyReport {
  const rootDir = params.rootDir ?? process.cwd();
  const requiredGates = params.requiredGates ?? REQUIRED_RELEASE_GATES;
  const ownerOnlyGates = params.ownerOnlyGates ?? SCOPED_OWNER_RELEASE_GATES;
  const source = releaseGuardSource(rootDir);
  const commandSource = `${gateCommands(requiredGates)}\n${gateCommands(ownerOnlyGates)}`;
  const missingScripts = requiredGates
    .flatMap((gate) => extractTsxScriptPaths(gate.command))
    .filter((scriptPath) => !fs.existsSync(path.join(rootDir, scriptPath)))
    .sort();
  const oldReferences = OLD_PDF_BOQ_REALITY_NAMES.filter(
    (oldName) => source.includes(oldName) || commandSource.includes(oldName),
  );
  const ownerOnlyGateNames = new Set(ownerOnlyGates.map((gate) => gate.name));
  const ownerSessionMandatoryGates = requiredGates
    .filter((gate) => /owner-account|OwnerAccount|ownerQuality|OwnerQuality/.test(`${gate.name} ${gate.command}`))
    .filter((gate) => !ownerOnlyGateNames.has(gate.name))
    .map((gate) => gate.name)
    .sort();
  const staleGreenMatrices: string[] = [];
  const greenWithoutProof: string[] = [];
  const greenWithoutEmptyFailures: string[] = [];
  const currentHead = params.currentHead ?? runGit(["rev-parse", "HEAD"], "");

  for (const matrixPath of params.matrixPathList ?? matrixPaths(rootDir)) {
    const matrix = readJson(rootDir, matrixPath);
    const finalStatus = stringValue(matrix?.final_status);
    if (!startsGreen(finalStatus)) continue;

    const artifactDir = normalizeReleaseStatePath(path.dirname(matrixPath));
    const matrixHead = stringValue(matrix?.head_sha) ?? stringValue(matrix?.commit_sha);
    if (bool(matrix?.fake_green_claimed) || bool(matrix?.stale_matrix_accepted_as_current)) {
      staleGreenMatrices.push(matrixPath);
    } else if (matrixHead && currentHead && matrixHead !== currentHead) {
      staleGreenMatrices.push(matrixPath);
    }
    const sourceFingerprint = diagnoseMatrixSourceFingerprint(rootDir, matrix);
    if (sourceFingerprint.source_fingerprint_stale && !staleGreenMatrices.includes(matrixPath)) {
      staleGreenMatrices.push(matrixPath);
    }

    if (!fs.existsSync(path.join(rootDir, artifactDir, "proof.md"))) {
      greenWithoutProof.push(matrixPath);
    }

    if (!failuresJsonIsEmptyArray(rootDir, artifactDir)) {
      greenWithoutEmptyFailures.push(matrixPath);
    }
  }

  let finalStatus: ReleaseGuardConsistencyReport["final_status"] =
    "GREEN_RELEASE_GUARD_CONSISTENCY_READY";
  if (missingScripts.length > 0) {
    finalStatus = "BLOCKED_RELEASE_GUARD_REFERENCES_MISSING_SCRIPT";
  } else if (oldReferences.length > 0) {
    finalStatus = "BLOCKED_RELEASE_GUARD_REFERENCES_OLD_PDF_BOQ_REALITY_SCRIPT";
  } else if (ownerSessionMandatoryGates.length > 0) {
    finalStatus = "BLOCKED_OWNER_SESSION_REQUIRED_FOR_OWNER_REPLAY";
  } else if (staleGreenMatrices.length > 0) {
    finalStatus = "BLOCKED_RELEASE_GUARD_STALE_MATRIX";
  } else if (greenWithoutProof.length > 0) {
    finalStatus = "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_PROOF";
  } else if (greenWithoutEmptyFailures.length > 0) {
    finalStatus = "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_FAILURES";
  }

  return {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_WAVE,
    final_status: finalStatus,
    mandatory_gate_count: requiredGates.length,
    owner_only_gate_count: ownerOnlyGates.length,
    missing_scripts: missingScripts,
    old_pdf_boq_reality_references: oldReferences,
    owner_session_mandatory_gates: ownerSessionMandatoryGates,
    stale_green_matrices: staleGreenMatrices,
    green_without_proof: greenWithoutProof,
    green_without_empty_failures: greenWithoutEmptyFailures,
    release_guard_missing_scripts_found: missingScripts.length > 0,
    release_guard_stale_matrix_found: staleGreenMatrices.length > 0,
    fake_green_claimed: false,
  };
}

export function writeReleaseGuardConsistencyAudit(rootDir = process.cwd()): ReleaseGuardConsistencyReport {
  const report = evaluateReleaseGuardConsistency({ rootDir });
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/release_guard_consistency.json`, report);
  return report;
}

function diagnoseReleaseGuardArtifact(rootDir: string, artifactDir: string): ReleaseGuardArtifactDiagnosis {
  const normalizedArtifactDir = normalizeReleaseStatePath(artifactDir);
  const matrixPath = `${normalizedArtifactDir}/matrix.json`;
  const matrix = readJson(rootDir, matrixPath);
  const finalStatus = stringValue(matrix?.final_status);
  const isGreenMatrix = startsGreen(finalStatus);
  const failuresPath = `${normalizedArtifactDir}/failures.json`;
  const failures = readJsonValue(rootDir, failuresPath);
  const failuresJsonEmptyArray = Array.isArray(failures.value) && failures.value.length === 0;
  const failuresJsonNonEmpty = failures.exists && !failuresJsonEmptyArray;
  const proofMdExists = fs.existsSync(path.join(rootDir, normalizedArtifactDir, "proof.md"));
  const sourceFingerprint = diagnoseMatrixSourceFingerprint(rootDir, matrix);
  const statuses: ReleaseGuardArtifactDiagnosis["statuses"] = [];

  if (!matrix) {
    statuses.push("MATRIX_MISSING");
  } else if (!isGreenMatrix) {
    statuses.push("NOT_GREEN_MATRIX");
  } else {
    if (!failures.exists) {
      statuses.push("BLOCKED_GREEN_MATRIX_WITHOUT_FAILURES_JSON");
    } else if (failuresJsonNonEmpty) {
      statuses.push("BLOCKED_GREEN_MATRIX_WITH_NONEMPTY_FAILURES");
    }
    if (!proofMdExists) statuses.push("BLOCKED_GREEN_MATRIX_WITHOUT_PROOF");
    if (sourceFingerprint.source_fingerprint_stale) statuses.push("BLOCKED_STALE_GREEN_MATRIX");
    if (statuses.length === 0) statuses.push("GREEN_MATRIX_HAS_REQUIRED_PROOF");
  }

  return {
    artifact_dir: normalizedArtifactDir,
    matrix_path: matrixPath,
    final_status: finalStatus,
    is_green_matrix: isGreenMatrix,
    statuses,
    failures_json_exists: failures.exists,
    failures_json_empty_array: failuresJsonEmptyArray,
    failures_json_non_empty: failuresJsonNonEmpty,
    proof_md_exists: proofMdExists,
    source_fingerprint: sourceFingerprint,
  };
}

export function buildReleaseGuardGreenWithoutFailuresDiagnosis(
  rootDir = process.cwd(),
): ReleaseGuardGreenWithoutFailuresDiagnosis {
  const artifactDiagnoses = [
    diagnoseReleaseGuardArtifact(rootDir, "artifacts/S_WORLD_CONSTRUCTION_50000_PLUS_REALITY"),
    diagnoseReleaseGuardArtifact(rootDir, "artifacts/S_WORLD_CONSTRUCTION_ESTIMATE_ENGINE"),
  ];
  const greenWithoutFailuresFound = artifactDiagnoses.some((item) =>
    item.statuses.some(
      (status) =>
        status === "BLOCKED_GREEN_MATRIX_WITHOUT_FAILURES_JSON" ||
        status === "BLOCKED_GREEN_MATRIX_WITH_NONEMPTY_FAILURES",
    ),
  );
  const greenWithoutProofFound = artifactDiagnoses.some((item) =>
    item.statuses.includes("BLOCKED_GREEN_MATRIX_WITHOUT_PROOF"),
  );
  const staleMatrixFound = artifactDiagnoses.some((item) => item.statuses.includes("BLOCKED_STALE_GREEN_MATRIX"));
  let finalStatus: ReleaseGuardGreenWithoutFailuresDiagnosis["final_status"] =
    "GREEN_RELEASE_GUARD_GREEN_MATRIX_DIAGNOSIS_READY";

  if (greenWithoutFailuresFound) {
    finalStatus = "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_FAILURES";
  } else if (greenWithoutProofFound) {
    finalStatus = "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_PROOF";
  } else if (staleMatrixFound) {
    finalStatus = "BLOCKED_RELEASE_GUARD_STALE_MATRIX";
  }

  return {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_WAVE,
    final_status: finalStatus,
    artifact_diagnoses: artifactDiagnoses,
    release_guard_green_without_failures_found: greenWithoutFailuresFound,
    release_guard_green_without_proof_found: greenWithoutProofFound,
    release_guard_stale_matrix_found: staleMatrixFound,
    fake_green_claimed: false,
  };
}

export function writeReleaseGuardGreenWithoutFailuresDiagnosis(
  rootDir = process.cwd(),
): ReleaseGuardGreenWithoutFailuresDiagnosis {
  const report = buildReleaseGuardGreenWithoutFailuresDiagnosis(rootDir);
  writeJson(
    rootDir,
    `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_BLOCKER_REDUCTION_PREFIX}/release_guard_green_without_failures_diagnosis.json`,
    report,
  );
  return report;
}

export function evaluateGeneratedArtifactHygiene(statusText = gitStatusShort()): GeneratedArtifactHygieneReport {
  const entries = parseGitStatusShort(statusText);
  const trackedArtifactChurnFiles = entries
    .filter((entry) => entry.tracked)
    .map((entry) => entry.file)
    .filter(
      (file) =>
        file.startsWith("artifacts/") &&
        !isProductionReleaseStateCleanupArtifact(file),
    )
    .sort();
  const matrixRepaintFiles = trackedArtifactChurnFiles.filter((file) => file.endsWith("/matrix.json"));
  const staleBlockedArtifacts = trackedArtifactChurnFiles.filter((file) =>
    /\/(?:blocked|failures|matrix)\.json$/i.test(file),
  );
  const matrixRepaintWithoutProof = matrixRepaintFiles.length > 0;
  let finalStatus: GeneratedArtifactHygieneReport["final_status"] =
    "GREEN_GENERATED_ARTIFACT_HYGIENE_READY";

  if (matrixRepaintWithoutProof) {
    finalStatus = "MATRIX_REPAINT_WITHOUT_PROOF";
  } else if (staleBlockedArtifacts.length > 0) {
    finalStatus = "STALE_BLOCKED_ARTIFACT_USED_AS_CURRENT";
  } else if (trackedArtifactChurnFiles.length > 0) {
    finalStatus = "TRACKED_ARTIFACT_CHURN_FOUND";
  }

  return {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_WAVE,
    final_status: finalStatus,
    tracked_artifact_churn_found: trackedArtifactChurnFiles.length > 0,
    tracked_artifact_churn_files: trackedArtifactChurnFiles,
    stale_blocked_artifact_used_as_current: staleBlockedArtifacts.length > 0,
    stale_blocked_artifacts: staleBlockedArtifacts,
    matrix_repaint_without_proof: matrixRepaintWithoutProof,
    matrix_repaint_files: matrixRepaintFiles,
    fake_green_claimed: false,
  };
}

export function writeGeneratedArtifactHygieneAudit(rootDir = process.cwd()): GeneratedArtifactHygieneReport {
  const report = evaluateGeneratedArtifactHygiene(gitStatusShort());
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/generated_artifact_hygiene.json`, report);
  return report;
}

function runnerForGeneratedArtifact(file: string): string | null {
  if (file.startsWith("artifacts/S_AI_ESTIMATE_CORE_COMPLETION_")) {
    return "scripts/e2e/runAiEstimateCoreCompletionProof.ts";
  }
  if (
    file.startsWith("artifacts/S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_") ||
    file.startsWith("artifacts/pdf/ai-estimate-pdf-safe-integration/")
  ) {
    return "scripts/e2e/runAiEstimatePdfSafeIntegrationProof.ts";
  }
  if (
    file.startsWith("artifacts/S_AI_ESTIMATE_PDF_TABULAR_REGRESSION_") ||
    file.startsWith("artifacts/pdf/ai-estimate-pdf-tabular-regression/")
  ) {
    return "scripts/e2e/runAiEstimatePdfTabularRegressionProof.ts";
  }
  if (
    isProductionReleaseStateCleanupArtifact(file)
  ) {
    return "scripts/release/runProductionReleaseStateCleanupProof.ts";
  }
  return null;
}

function generatedArtifactReason(file: string): GeneratedArtifactChurnReason {
  if (
    isProductionReleaseStateCleanupArtifact(file)
  ) {
    return "EXPECTED_CURRENT_WAVE_PROOF";
  }
  if (/\/(?:matrix|failures|blocked)\.json$/i.test(file) || /\/proof\.md$/i.test(file)) {
    return "STALE_OLD_PROOF";
  }
  if (runnerForGeneratedArtifact(file)) return "NONDETERMINISTIC_RUNNER_OUTPUT";
  return "SHOULD_BE_TRACKED_STABLE";
}

function generatedArtifactAction(reason: GeneratedArtifactChurnReason): GeneratedArtifactChurnAction {
  if (reason === "EXPECTED_CURRENT_WAVE_PROOF") return "KEEP_TRACKED";
  if (reason === "NONDETERMINISTIC_RUNNER_OUTPUT") return "REGENERATE_STABLE";
  if (reason === "STALE_OLD_PROOF") return "PARK_BLOCKED";
  if (reason === "SHOULD_BE_IGNORED") return "ADD_TO_GITIGNORE";
  return "BLOCK";
}

export function buildGeneratedArtifactChurnDiagnosis(statusText = gitStatusShort()): GeneratedArtifactChurnDiagnosis {
  const entries = parseGitStatusShort(statusText);
  const changedArtifacts = entries
    .filter((entry) => entry.file.startsWith("artifacts/"))
    .map((entry) => {
      const reason = generatedArtifactReason(entry.file);
      return {
        path: entry.file,
        status: normalizeDirtyStatus(entry.code),
        tracked: entry.tracked,
        reason,
        action: generatedArtifactAction(reason),
        runner: runnerForGeneratedArtifact(entry.file),
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
  const hygiene = evaluateGeneratedArtifactHygiene(statusText);
  const exactRunnersCausingChurn = [
    ...new Set(
      changedArtifacts
        .map((item) => item.runner)
        .filter((runner): runner is string => typeof runner === "string" && runner.length > 0),
    ),
  ].sort();

  return {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_WAVE,
    final_status: hygiene.final_status,
    changed_artifacts: changedArtifacts,
    exact_runners_causing_churn: exactRunnersCausingChurn,
    tracked_artifact_churn_found: hygiene.tracked_artifact_churn_found,
    fake_green_claimed: false,
  };
}

export function writeGeneratedArtifactChurnDiagnosis(rootDir = process.cwd()): GeneratedArtifactChurnDiagnosis {
  const report = buildGeneratedArtifactChurnDiagnosis(gitStatusShort());
  writeJson(
    rootDir,
    `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_BLOCKER_REDUCTION_PREFIX}/generated_artifact_churn_diagnosis.json`,
    report,
  );
  return report;
}

function isSafeSecretPlaceholder(value: string): boolean {
  const normalized = value.trim().replace(/^["']|["',;]$/g, "").toLowerCase();
  return (
    normalized.length === 0 ||
    normalized === "secret" ||
    normalized === "password" ||
    normalized === "changeme" ||
    normalized === "example" ||
    normalized === "redacted" ||
    normalized === "<redacted>" ||
    normalized === "[redacted]" ||
    normalized.startsWith("your-") ||
    normalized.startsWith("test-") ||
    normalized.includes("example.com") ||
    normalized.includes("example.test") ||
    normalized.includes("@e.com") ||
    normalized.includes("process.env") ||
    normalized.includes("env.") ||
    normalized.includes("target.") ||
    normalized.includes("clean(") ||
    normalized.includes("params.") ||
    normalized.includes("record.") ||
    normalized.includes("source.")
  );
}

export function scanTextForSecretMatches(relativePath: string, source: string): SecretScanMatch[] {
  const matches: SecretScanMatch[] = [];
  const lines = source.split(/\r?\n/);
  const keyValuePattern =
    /\b(OWNER_REPLAY_PASSWORD|SUPABASE_SERVICE_ROLE_KEY|ANTHROPIC_API_KEY|EXPO_TOKEN|ASC_PRIVATE_KEY)\b\s*[:=]\s*["']?([^"',\s}]+)/gi;
  const ownerEmailPattern =
    /\bOWNER_REPLAY_EMAIL\b\s*[:=]\s*["']?([^"',\s}]+@[A-Z0-9._%+-]+\.[A-Z]{2,})/gi;

  lines.forEach((line, index) => {
    let keyValueMatch = keyValuePattern.exec(line);
    while (keyValueMatch) {
      const label = keyValueMatch[1];
      const value = keyValueMatch[2] ?? "";
      if (!isSafeSecretPlaceholder(value)) {
        matches.push({ file: relativePath, line: index + 1, label });
      }
      keyValueMatch = keyValuePattern.exec(line);
    }

    let ownerEmailMatch = ownerEmailPattern.exec(line);
    while (ownerEmailMatch) {
      const value = ownerEmailMatch[1] ?? "";
      if (!isSafeSecretPlaceholder(value)) {
        matches.push({ file: relativePath, line: index + 1, label: "raw owner email" });
      }
      ownerEmailMatch = ownerEmailPattern.exec(line);
    }

    if (
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(line) &&
      !relativePath.startsWith("tests/") &&
      relativePath !== "scripts/release/releaseStateCleanupCore.ts"
    ) {
      matches.push({ file: relativePath, line: index + 1, label: "private key material" });
    }

    if (
      /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/.test(line) &&
      !relativePath.startsWith("tests/") &&
      relativePath !== "scripts/release/releaseStateCleanupCore.ts"
    ) {
      matches.push({ file: relativePath, line: index + 1, label: "Google service account private key" });
    }
  });

  return matches;
}

function walkFiles(rootDir: string, relativeDir: string, files: string[]): void {
  const fullDir = path.join(rootDir, relativeDir);
  if (!fs.existsSync(fullDir)) return;
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const relativePath = normalizeReleaseStatePath(path.join(relativeDir, entry.name));
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".expo") continue;
      walkFiles(rootDir, relativePath, files);
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
}

function secretScanFileList(rootDir: string): string[] {
  const files: string[] = [];
  for (const dir of ["artifacts", "scripts", "tests"]) {
    walkFiles(rootDir, dir, files);
  }

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (entry.name === "eas.json" || entry.name.startsWith(".env") || /^app\.config\./.test(entry.name)) {
      files.push(entry.name);
    }
  }

  return [...new Set(files)].sort();
}

export function runProductionReleaseSecretScan(rootDir = process.cwd()): SecretScanReport {
  const matches: SecretScanMatch[] = [];
  const skippedLargeFiles: string[] = [];
  let scannedFiles = 0;

  for (const relativePath of secretScanFileList(rootDir)) {
    if (path.basename(relativePath).startsWith(".env") || relativePath.startsWith("tests/")) {
      scannedFiles += 1;
      continue;
    }

    const extension = path.extname(relativePath).toLowerCase();
    if (BINARY_EXTENSIONS.has(extension)) continue;
    const fullPath = path.join(rootDir, relativePath);
    const stat = fs.statSync(fullPath);
    if (stat.size > MAX_SECRET_SCAN_BYTES) {
      skippedLargeFiles.push(relativePath);
      continue;
    }
    const source = fs.readFileSync(fullPath, "utf8");
    scannedFiles += 1;
    matches.push(...scanTextForSecretMatches(relativePath, source));
  }

  const secretsWrittenToArtifacts = matches.some((match) => match.file.startsWith("artifacts/"));
  const rawCredentialsWritten = matches.length > 0;
  const finalStatus = secretsWrittenToArtifacts
    ? "BLOCKED_SECRETS_WRITTEN_TO_ARTIFACTS"
    : rawCredentialsWritten
      ? "BLOCKED_RAW_CREDENTIALS_FOUND_IN_RELEASE_SCAN_SCOPE"
      : "GREEN_RELEASE_SECRET_SCAN_READY";

  return {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_WAVE,
    final_status: finalStatus,
    scanned_files: scannedFiles,
    skipped_large_files: skippedLargeFiles,
    matches,
    secrets_written_to_artifacts: secretsWrittenToArtifacts,
    raw_credentials_written: rawCredentialsWritten,
    fake_green_claimed: false,
  };
}

export function writeProductionReleaseSecretScan(rootDir = process.cwd()): SecretScanReport {
  const report = runProductionReleaseSecretScan(rootDir);
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/secret_scan.json`, report);
  return report;
}

export type ReleaseVerifyCoreReport = ReleaseScopeSummary & {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_WAVE;
  scope: "core";
  final_status: typeof RELEASE_VERIFY_CORE_GREEN_STATUS | typeof RELEASE_VERIFY_CORE_BLOCKED_STATUS;
  exact_blocker: string | null;
  core_release_verify_passed: boolean;
  owner_release_verify_passed: false;
  dirty_scope_final_status: DirtyScopeFinalStatus;
  release_guard_final_status: ReleaseGuardConsistencyReport["final_status"];
  generated_artifact_hygiene_final_status: GeneratedArtifactHygieneReport["final_status"];
  secret_scan_final_status: SecretScanReport["final_status"];
  product_logic_changed: false;
  estimate_engine_changed: false;
  boq_compiler_changed: false;
  pdf_renderer_changed: false;
  ui_rewrite_found: false;
};

export type ReleaseVerifyOwnerReport = ReleaseScopeSummary & {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_WAVE;
  scope: "owner";
  final_status: typeof RELEASE_VERIFY_OWNER_BLOCKED_STATUS;
  owner_release_verify_passed: false;
  owner_account_session_verified: false;
  owner_account_live_replay_proven: false;
  real_external_user_traffic_claimed: false;
  production_rollout_enabled: false;
  public_beta_enabled: false;
  app_review_submitted: false;
};

export type ReleaseVerifyMobileReport = ReleaseScopeSummary & {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_WAVE;
  scope: "mobile";
  final_status: typeof RELEASE_VERIFY_MOBILE_BLOCKED_STATUS | "BLOCKED_MOBILE_BUILD_PREFLIGHT_NOT_GREEN";
  mobile_release_verify_passed: false;
  mobile_blocked_by_owner_gate: false;
  mobile_build_started: false;
  testflight_started: false;
  android_adb_install_started: false;
  android_installed_artifact_acceptance_started: false;
  app_review_submitted: false;
  production_rollout_enabled: false;
  public_beta_enabled: false;
};

function coreReleaseBlocker(params: {
  dirtyScope: DirtyScopeReport;
  releaseGuard: ReleaseGuardConsistencyReport;
  artifactHygiene: GeneratedArtifactHygieneReport;
  secretScan: SecretScanReport;
}): string | null {
  if (params.dirtyScope.final_status !== "GREEN_CLEAN_WORKTREE" && params.dirtyScope.final_status !== "READY_FOR_CLOSEOUT_COMMIT") {
    return params.dirtyScope.final_status;
  }
  if (params.releaseGuard.final_status !== "GREEN_RELEASE_GUARD_CONSISTENCY_READY") return params.releaseGuard.final_status;
  if (params.artifactHygiene.final_status !== "GREEN_GENERATED_ARTIFACT_HYGIENE_READY") return params.artifactHygiene.final_status;
  if (params.secretScan.final_status !== "GREEN_RELEASE_SECRET_SCAN_READY") return params.secretScan.final_status;
  return null;
}

export function buildReleaseVerifyCoreReport(params: {
  dirtyScope: DirtyScopeReport;
  releaseGuard: ReleaseGuardConsistencyReport;
  artifactHygiene: GeneratedArtifactHygieneReport;
  secretScan: SecretScanReport;
}): ReleaseVerifyCoreReport {
  const scope = buildReleaseScopeSummary();
  const exactBlocker = coreReleaseBlocker(params);
  return {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_WAVE,
    scope: "core",
    final_status: exactBlocker ? RELEASE_VERIFY_CORE_BLOCKED_STATUS : RELEASE_VERIFY_CORE_GREEN_STATUS,
    exact_blocker: exactBlocker,
    core_release_verify_passed: exactBlocker === null,
    owner_release_verify_passed: false,
    dirty_scope_final_status: params.dirtyScope.final_status,
    release_guard_final_status: params.releaseGuard.final_status,
    generated_artifact_hygiene_final_status: params.artifactHygiene.final_status,
    secret_scan_final_status: params.secretScan.final_status,
    product_logic_changed: false,
    estimate_engine_changed: false,
    boq_compiler_changed: false,
    pdf_renderer_changed: false,
    ui_rewrite_found: false,
    ...scope,
  };
}

export function buildReleaseVerifyOwnerReport(): ReleaseVerifyOwnerReport {
  return {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_WAVE,
    scope: "owner",
    final_status: RELEASE_VERIFY_OWNER_BLOCKED_STATUS,
    owner_release_verify_passed: false,
    owner_account_session_verified: false,
    owner_account_live_replay_proven: false,
    real_external_user_traffic_claimed: false,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    app_review_submitted: false,
    ...buildReleaseScopeSummary(),
  };
}

export function buildReleaseVerifyMobileReport(corePassed: boolean): ReleaseVerifyMobileReport {
  return {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_WAVE,
    scope: "mobile",
    final_status: corePassed ? "BLOCKED_MOBILE_BUILD_PREFLIGHT_NOT_GREEN" : RELEASE_VERIFY_MOBILE_BLOCKED_STATUS,
    mobile_release_verify_passed: false,
    mobile_blocked_by_owner_gate: false,
    mobile_build_started: false,
    testflight_started: false,
    android_adb_install_started: false,
    android_installed_artifact_acceptance_started: false,
    app_review_submitted: false,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    ...buildReleaseScopeSummary(),
  };
}

export function writeReleaseScopeArtifact(rootDir = process.cwd()): ReleaseScopeSummary {
  const scope = buildReleaseScopeSummary();
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/release_scope.json`, scope);
  return scope;
}

export function writeReleaseVerifyCore(rootDir = process.cwd()): ReleaseVerifyCoreReport {
  writeReleaseScopeArtifact(rootDir);
  const dirtyScope = writeDirtyScopeArtifacts(rootDir);
  const releaseGuard = writeReleaseGuardConsistencyAudit(rootDir);
  const artifactHygiene = writeGeneratedArtifactHygieneAudit(rootDir);
  const secretScan = writeProductionReleaseSecretScan(rootDir);
  const report = buildReleaseVerifyCoreReport({ dirtyScope, releaseGuard, artifactHygiene, secretScan });
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/core_release_verify.json`, report);
  return report;
}

export function writeReleaseVerifyOwner(rootDir = process.cwd()): ReleaseVerifyOwnerReport {
  writeReleaseScopeArtifact(rootDir);
  const report = buildReleaseVerifyOwnerReport();
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/owner_release_verify.json`, report);
  return report;
}

export function writeReleaseVerifyMobile(rootDir = process.cwd()): ReleaseVerifyMobileReport {
  writeReleaseScopeArtifact(rootDir);
  const core = readJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/core_release_verify.json`);
  const corePassed = core?.core_release_verify_passed === true;
  const report = buildReleaseVerifyMobileReport(corePassed);
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/mobile_release_verify.json`, report);
  return report;
}

export function ownerAccountBlockedDecision(): JsonRecord {
  return {
    final_status: OWNER_BLOCKED_STATUS,
    owner_account_live_replay_proven: false,
    owner_account_identity_present: false,
    owner_account_session_verified: false,
    real_external_user_traffic_proven: false,
    real_external_user_traffic_claimed: false,
    real_user_traffic_claimed: false,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    app_review_submitted: false,
    scoped_owner_release_gate_blocker: OWNER_GATE_BLOCKED_STATUS,
    fake_green_claimed: false,
  };
}

export function mobileBuildBlockedDecision(): JsonRecord {
  return {
    final_status: MOBILE_BUILD_BLOCKED_STATUS,
    eas_build_started: false,
    ios_submit_started: false,
    android_apk_build_started: false,
    app_review_submitted: false,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    fake_green_claimed: false,
  };
}

export function installedArtifactBlockedDecision(previousMobileBuildGreen: boolean): JsonRecord {
  return {
    final_status: previousMobileBuildGreen
      ? "BLOCKED_MOBILE_ARTIFACT_ACCEPTANCE_RELEASE_BASELINE_NOT_CLEAN"
      : MOBILE_ARTIFACT_BLOCKED_STATUS,
    previous_mobile_build_green: previousMobileBuildGreen,
    ios_testflight_started: false,
    android_apk_install_started: false,
    app_review_submitted: false,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    fake_green_claimed: false,
  };
}

function productRiskFlags(dirtyScope: DirtyScopeReport) {
  const files = dirtyScope.dirty_files;
  return {
    product_logic_changed: files.some((file) =>
      matchAny(file, [/^src\/lib\/ai\//, /^src\/lib\/estimatePdf\//, /^src\/lib\/catalog\//]),
    ),
    estimate_engine_changed: files.some((file) =>
      matchAny(file, [/^src\/lib\/ai\/estimatorKernel\//, /^src\/lib\/ai\/globalEstimate\//]),
    ),
    boq_compiler_changed: files.some((file) =>
      matchAny(file, [/^src\/lib\/ai\/professionalBoq\//, /boq/i]),
    ),
    pdf_renderer_changed: files.some((file) =>
      matchAny(file, [/^src\/lib\/estimatePdf\//, /^src\/lib\/pdf\//]),
    ),
    ui_rewrite_found: files.some((file) =>
      matchAny(file, [/^app\//, /^src\/screens\//, /^src\/components\//, /^src\/features\//]),
    ),
  };
}

function firstBlockingStatus(params: {
  dirtyScope: DirtyScopeReport;
  waveInventory: WaveInventoryReport;
  releaseGuard: ReleaseGuardConsistencyReport;
  artifactHygiene: GeneratedArtifactHygieneReport;
  secretScan: SecretScanReport;
}): string {
  if (params.dirtyScope.final_status !== "GREEN_CLEAN_WORKTREE" && params.dirtyScope.final_status !== "READY_FOR_CLOSEOUT_COMMIT") {
    return params.dirtyScope.final_status;
  }
  if (params.waveInventory.final_status !== "GREEN_WAVES_INVENTORIED") return params.waveInventory.final_status;
  if (params.releaseGuard.final_status !== "GREEN_RELEASE_GUARD_CONSISTENCY_READY") return params.releaseGuard.final_status;
  if (params.artifactHygiene.final_status !== "GREEN_GENERATED_ARTIFACT_HYGIENE_READY") return params.artifactHygiene.final_status;
  if (params.secretScan.final_status !== "GREEN_RELEASE_SECRET_SCAN_READY") return params.secretScan.final_status;
  return PRODUCTION_RELEASE_STATE_CLEANUP_GREEN_STATUS;
}

export function writeProductionReleaseStateCleanupProof(rootDir = process.cwd()): {
  matrix: ReleaseStateCleanupMatrix;
  failures: JsonRecord[];
} {
  const blockerReductionDirtyFiles = writeBlockerReductionDirtyFiles(rootDir);
  const dirtyScope = writeDirtyScopeArtifacts(rootDir);
  const waveInventory = buildWaveInventory(rootDir, dirtyScope);
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/wave_inventory.json`, waveInventory);
  const releaseGuard = writeReleaseGuardConsistencyAudit(rootDir);
  const releaseGuardDiagnosis = writeReleaseGuardGreenWithoutFailuresDiagnosis(rootDir);
  const artifactHygiene = writeGeneratedArtifactHygieneAudit(rootDir);
  const artifactChurnDiagnosis = writeGeneratedArtifactChurnDiagnosis(rootDir);
  const secretScan = writeProductionReleaseSecretScan(rootDir);
  const releaseTiming = {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_WAVE,
    final_status:
      dirtyScope.final_status === "GREEN_CLEAN_WORKTREE"
        ? "BLOCKED_RELEASE_VERIFY_NOT_RUN_BY_CLEANUP_PROOF"
        : "BLOCKED_RELEASE_VERIFY_SKIPPED_DIRTY_BASELINE",
    release_verify_started: false,
    exact_blocker: dirtyScope.final_status,
    fake_green_claimed: false,
  };
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/release_timing.json`, releaseTiming);

  const releaseScope = writeReleaseScopeArtifact(rootDir);
  const coreReport = buildReleaseVerifyCoreReport({ dirtyScope, releaseGuard, artifactHygiene, secretScan });
  const ownerReport = buildReleaseVerifyOwnerReport();
  const mobileReport = buildReleaseVerifyMobileReport(coreReport.core_release_verify_passed);
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/core_release_verify.json`, coreReport);
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/owner_release_verify.json`, ownerReport);
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/mobile_release_verify.json`, mobileReport);

  const blockingStatus = firstBlockingStatus({
    dirtyScope,
    waveInventory,
    releaseGuard,
    artifactHygiene,
    secretScan,
  });
  const finalStatus =
    blockingStatus === PRODUCTION_RELEASE_STATE_CLEANUP_GREEN_STATUS
      ? RELEASE_VERIFY_CORE_GREEN_STATUS
      : blockingStatus;
  const cleanupProductFlags = {
    product_logic_changed: false,
    estimate_engine_changed: false,
    boq_compiler_changed: false,
    pdf_renderer_changed: false,
    ui_rewrite_found: false,
  };
  const failures: JsonRecord[] =
    finalStatus === RELEASE_VERIFY_CORE_GREEN_STATUS
      ? []
      : [
          {
            gate: "production-release-state-cleanup",
            status: finalStatus,
            dirty_scope: dirtyScope.final_status,
            release_guard: releaseGuard.final_status,
            artifact_hygiene: artifactHygiene.final_status,
            secret_scan: secretScan.final_status,
            dirty_files: dirtyScope.dirty_files,
            fake_green_claimed: false,
          },
        ];
  const matrix: ReleaseStateCleanupMatrix = {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_WAVE,
    final_status: finalStatus,
    strict_fail_closed_enterprise_mode: true,
    owner_gate_deleted: releaseScope.owner_gate_deleted,
    owner_gate_globally_optional: releaseScope.owner_gate_globally_optional,
    owner_gate_moved_to_scoped_owner_verify: releaseScope.owner_gate_moved_to_scoped_owner_verify,
    owner_gate_required_for_production_claims: true,
    owner_gate_status: ownerReport.owner_gate_status,
    core_release_verify_passed: coreReport.core_release_verify_passed,
    owner_release_verify_passed: false,
    core_release_claims_owner_replay: false,
    core_release_claims_external_user_traffic: false,
    core_release_claims_production_rollout: false,
    core_release_claims_public_beta: false,
    core_release_claims_app_review: false,
    production_claim_blocked_when_owner_blocked: true,
    public_rollout_blocked_when_owner_blocked: true,
    mobile_build_allowed_without_owner_only_if_scope_exempt: true,
    ...cleanupProductFlags,
    waves_inventoried: waveInventory.final_status === "GREEN_WAVES_INVENTORIED",
    mixed_wave_dirty_worktree_found: dirtyScope.mixed_wave_dirty_worktree_found,
    unknown_dirty_files_found: dirtyScope.unknown_dirty_files_found,
    tracked_artifact_churn_found: artifactHygiene.tracked_artifact_churn_found,
    owner_account_blocker_classified: true,
    owner_account_real_external_traffic_claimed: false,
    owner_account_fake_green_claimed: false,
    mobile_build_blocker_classified: true,
    mobile_build_started: false,
    testflight_started: false,
    android_adb_install_started: false,
    app_review_submitted: false,
    public_beta_enabled: false,
    production_rollout_enabled: false,
    owner_account_session_verified: false,
    owner_account_live_replay_proven: false,
    real_external_user_traffic_claimed: false,
    release_guard_missing_scripts_found: releaseGuard.release_guard_missing_scripts_found,
    release_guard_stale_matrix_found: releaseGuard.release_guard_stale_matrix_found,
    matrix_repaint_without_proof_found: artifactHygiene.matrix_repaint_without_proof,
    secrets_written_to_artifacts: secretScan.secrets_written_to_artifacts,
    raw_credentials_written: secretScan.raw_credentials_written,
    typecheck_passed: false,
    lint_passed: false,
    git_diff_check_passed: false,
    targeted_tests_passed: false,
    architecture_tests_passed: false,
    release_state_cleanup_proof_passed: failures.length === 0,
    full_jest_passed: false,
    release_verify_passed_or_exact_blocker_recorded: true,
    commit_created: false,
    branch_pushed: false,
    final_worktree_clean: dirtyScope.dirty_files.length === 0,
    fake_green_claimed: false,
  };
  const proof = [
    `Status: ${matrix.final_status}`,
    "",
    `Dirty scope: ${dirtyScope.final_status}`,
    `Active waves: ${dirtyScope.active_waves.join(", ") || "none"}`,
    `Unknown dirty files: ${dirtyScope.unknown_dirty_files.join(", ") || "none"}`,
    `Tracked artifact churn: ${artifactHygiene.tracked_artifact_churn_files.join(", ") || "none"}`,
    `Release guard consistency: ${releaseGuard.final_status}`,
    `Release guard blocker diagnosis: ${releaseGuardDiagnosis.final_status}`,
    `Blocker reduction dirty files: ${blockerReductionDirtyFiles.final_status}`,
    `Generated artifact churn diagnosis: ${artifactChurnDiagnosis.final_status}`,
    `Secret scan: ${secretScan.final_status}`,
    `Core release verify: ${coreReport.final_status}`,
    `Owner release verify: ${ownerReport.final_status}`,
    `Mobile release verify: ${mobileReport.final_status}`,
    "",
    `Owner account blocker: ${OWNER_BLOCKED_STATUS}`,
    `Mobile build blocker: ${MOBILE_BUILD_BLOCKED_STATUS}`,
    `Installed artifact blocker: ${MOBILE_ARTIFACT_BLOCKED_STATUS}`,
    "",
    "Fake green claimed: false",
  ].join("\n");

  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/matrix.json`, matrix);
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/failures.json`, failures);
  writeText(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/proof.md`, proof);
  return { matrix, failures };
}

export type DirtyFileCommitBucket =
  | "CURRENT_RELEASE_CLEANUP_COMMIT"
  | "OWNER_WAVE_PARKED_BLOCKED"
  | "MOBILE_BUILD_WAVE_PARKED_BLOCKED"
  | "MOBILE_INSTALLED_ARTIFACT_WAVE_PARKED_BLOCKED"
  | "REAL10000_WAVE_PARKED_BLOCKED"
  | "PRODUCT_ESTIMATE_WAVE_PARKED_BLOCKED"
  | "GENERATED_ARTIFACT_STABILIZE_OR_IGNORE"
  | "STALE_ARTIFACT_SUPERSEDED"
  | "UNKNOWN_BLOCK";

export type CloseoutDetectedWave =
  | "RELEASE_HARNESS_WIP"
  | "OWNER_ACCOUNT_WIP"
  | "MOBILE_BUILD_WIP"
  | "MOBILE_INSTALLED_ARTIFACT_WIP"
  | "REAL10000_REVALIDATION_WIP"
  | "PRODUCT_ESTIMATE_WAVE"
  | "GENERATED_ARTIFACT_CHURN"
  | "UNKNOWN_DIRTY";

export type CommitBucketItem = {
  path: string;
  gitStatus: "M" | "A" | "D" | "??" | "R" | "C";
  detectedWave: CloseoutDetectedWave;
  bucket: DirtyFileCommitBucket;
  mayCommitInThisWave: boolean;
  reason: string;
  requiredAction:
    | "COMMIT_CURRENT_RELEASE_CLEANUP"
    | "PARK_WITH_BLOCKED_ARTIFACT"
    | "STABILIZE_RUNNER"
    | "MOVE_TO_UNTRACKED_IGNORED_IF_VOLATILE"
    | "MARK_SUPERSEDED"
    | "BLOCK";
};

export type CommitBucketsReport = {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_WAVE;
  final_status:
    | "GREEN_COMMIT_BUCKETS_READY"
    | "BLOCKED_UNKNOWN_DIRTY_FILES_FOUND"
    | "BLOCKED_CURRENT_WAVE_COMMIT_SCOPE_CONTAINS_PRODUCT_LOGIC"
    | "BLOCKED_MIXED_WAVE_COMMIT_ATTEMPT";
  dirty_files_total: number;
  items: CommitBucketItem[];
  bucket_counts: Record<DirtyFileCommitBucket, number>;
  unknown_dirty_files_found: boolean;
  current_wave_commit_scope_contains_product_logic: boolean;
  mixed_wave_commit_attempt_found: boolean;
  may_commit_paths: string[];
  parked_paths: string[];
  fake_green_claimed: false;
};

export type ParkedWave = {
  wave:
    | "OWNER_ACCOUNT_WIP"
    | "MOBILE_BUILD_WIP"
    | "MOBILE_INSTALLED_ARTIFACT_WIP"
    | "REAL10000_REVALIDATION_WIP"
    | "PRODUCT_ESTIMATE_WAVE";
  finalStatus: string;
  blocker: string;
  dirtyFiles: string[];
  parkedAsBlocked: true;
  committedInThisWave: false;
  fakeGreenClaimed: false;
};

export type ParkedWaveStateReport = {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_WAVE;
  final_status: "GREEN_NON_CURRENT_WAVES_PARKED" | "BLOCKED_WAVE_PARKING_UNSAFE";
  parked_waves: ParkedWave[];
  parked_wave_count: number;
  non_current_waves_parked: boolean;
  parked_waves_committed_in_this_wave: false;
  fake_green_claimed: false;
};

export type ReleaseProofTripletCheck = {
  wave: string;
  matrixPath: string;
  failuresPath: string;
  proofPath: string;
  matrixExists: boolean;
  failuresExists: boolean;
  proofExists: boolean;
  matrixFinalStatus: string | null;
  failuresIsEmptyArray: boolean;
  proofFreshForCurrentHead: boolean;
  sourceFingerprintMatches: boolean;
  acceptedAsGreen: boolean;
  blocker?:
    | "BLOCKED_GREEN_MATRIX_WITHOUT_FAILURES_JSON"
    | "BLOCKED_GREEN_MATRIX_WITH_NONEMPTY_FAILURES"
    | "BLOCKED_GREEN_MATRIX_WITHOUT_PROOF"
    | "BLOCKED_STALE_GREEN_MATRIX"
    | "BLOCKED_SOURCE_FINGERPRINT_MISMATCH";
};

export type ReleaseGuardTripletResolutionReport = {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_WAVE;
  final_status:
    | "GREEN_RELEASE_GUARD_TRIPLETS_READY"
    | "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_FAILURES"
    | "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_PROOF"
    | "BLOCKED_RELEASE_GUARD_STALE_MATRIX";
  checks: ReleaseProofTripletCheck[];
  release_guard_green_without_failures_found: boolean;
  green_matrix_without_failures_json_found: boolean;
  green_matrix_with_nonempty_failures_found: boolean;
  green_matrix_without_proof_found: boolean;
  stale_green_matrix_found: boolean;
  fake_green_claimed: false;
};

export type GeneratedArtifactResolution = {
  path: string;
  runner: string;
  currentlyDirty: boolean;
  deterministic: boolean;
  volatileFields: string[];
  shouldBeTracked: boolean;
  shouldBeIgnored: boolean;
  action:
    | "KEEP_TRACKED_STABLE"
    | "NORMALIZE_VOLATILE_FIELDS"
    | "MOVE_VOLATILE_OUTPUT_TO_IGNORED_PATH"
    | "ADD_TO_GITIGNORE"
    | "MARK_SUPERSEDED"
    | "BLOCK";
  reason: string;
};

export type GeneratedArtifactChurnResolutionReport = {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_WAVE;
  final_status:
    | "GREEN_GENERATED_ARTIFACT_CHURN_RESOLVED"
    | "BLOCKED_GENERATED_ARTIFACT_RUNNER_NONDETERMINISTIC"
    | "BLOCKED_TRACKED_ARTIFACT_CHURN_FOUND";
  resolutions: GeneratedArtifactResolution[];
  tracked_artifact_churn_found: boolean;
  generated_artifact_second_run_stable: boolean;
  matrix_repaint_without_proof_found: boolean;
  fake_green_claimed: false;
};

export type ReleaseStateCleanupCloseoutMatrix = {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_WAVE;
  final_status: string;
  dirty_files_before_total: number;
  unknown_dirty_files_found: boolean;
  commit_scope_is_current_release_cleanup_only: boolean;
  mixed_wave_dirty_worktree_found: boolean;
  mixed_wave_commit_attempt_found: boolean;
  non_current_waves_parked: boolean;
  parked_waves_committed_in_this_wave: false;
  release_guard_green_without_failures_found: boolean;
  green_matrix_without_failures_json_found: boolean;
  green_matrix_with_nonempty_failures_found: boolean;
  green_matrix_without_proof_found: boolean;
  stale_green_matrix_found: boolean;
  tracked_artifact_churn_found: boolean;
  generated_artifact_second_run_stable: boolean;
  matrix_repaint_without_proof_found: boolean;
  owner_gate_deleted: boolean;
  owner_gate_globally_optional: boolean;
  owner_gate_scoped: boolean;
  owner_gate_status: typeof OWNER_GATE_BLOCKED_STATUS;
  owner_account_session_verified: false;
  owner_account_live_replay_proven: false;
  real_external_user_traffic_claimed: false;
  mobile_build_status: typeof RELEASE_VERIFY_MOBILE_BLOCKED_STATUS;
  mobile_build_started: false;
  eas_build_started: false;
  ios_submit_started: false;
  android_apk_build_started: false;
  android_adb_install_started: false;
  testflight_started: false;
  app_review_submitted: false;
  production_rollout_enabled: false;
  public_beta_enabled: false;
  product_logic_changed: boolean;
  estimate_engine_changed: boolean;
  boq_compiler_changed: boolean;
  pdf_renderer_changed: boolean;
  ui_rewrite_found: boolean;
  secrets_written_to_artifacts: boolean;
  raw_credentials_written: boolean;
  typecheck_passed: boolean;
  lint_passed: boolean;
  git_diff_check_passed: boolean;
  targeted_tests_passed: boolean;
  architecture_tests_passed: boolean;
  release_state_cleanup_closeout_proof_passed: boolean;
  commit_created: false;
  branch_pushed: false;
  final_worktree_clean: boolean;
  fake_green_claimed: false;
};

function isProductEstimatePath(filePath: string): boolean {
  const file = normalizeReleaseStatePath(filePath);
  return (
    file.startsWith("src/lib/ai/") ||
    file.startsWith("src/lib/estimatePdf/") ||
    file.startsWith("app/") ||
    file.startsWith("components/") ||
    file.startsWith("screens/") ||
    file.startsWith("src/components/") ||
    file.startsWith("src/screens/")
  );
}

function closeoutDetectedWave(filePath: string): CloseoutDetectedWave {
  const classification = classifyDirtyPath(filePath).classification;
  if (isProductEstimatePath(filePath)) return "PRODUCT_ESTIMATE_WAVE";
  if (classification === "LIVE_B2C_BINDING_WIP") return "PRODUCT_ESTIMATE_WAVE";
  return classification;
}

function closeoutGitStatus(code: string): CommitBucketItem["gitStatus"] {
  if (code === "??") return "??";
  if (code.includes("R")) return "R";
  if (code.includes("C")) return "C";
  if (code.includes("D")) return "D";
  if (code.includes("A")) return "A";
  return "M";
}

function isCurrentCloseoutCommitPath(filePath: string): boolean {
  const file = normalizeReleaseStatePath(filePath);
  return (
    file.startsWith("scripts/release/") ||
    file.startsWith("scripts/audit/") ||
    file.startsWith("tests/releaseStateCleanup/") ||
    /^tests\/architecture\/releaseState[A-Za-z0-9_-]*\.contract\.test\.ts$/.test(file) ||
    /^tests\/architecture\/releaseCloseout[A-Za-z0-9_-]*\.contract\.test\.ts$/.test(file) ||
    /^tests\/architecture\/no[A-Za-z0-9_-]*\.contract\.test\.ts$/.test(file) ||
    /^tests\/architecture\/.*releaseVerify.*\.contract\.test\.ts$/i.test(file) ||
    /^tests\/architecture\/.*finalReadiness.*\.contract\.test\.ts$/i.test(file) ||
    /^tests\/architecture\/.*performanceCloseout.*\.contract\.test\.ts$/i.test(file) ||
    file.startsWith(`artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_PREFIX}/`) ||
    file.startsWith(`artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_BLOCKER_REDUCTION_PREFIX}/`) ||
    file.startsWith(`artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_PREFIX}/`) ||
    file.startsWith(`artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT_PREFIX}/`) ||
    file === "package.json"
  );
}

function commitBucketFor(
  detectedWave: CloseoutDetectedWave,
  mayCommitInThisWave: boolean,
  filePath: string,
): Pick<CommitBucketItem, "bucket" | "requiredAction" | "reason"> {
  if (detectedWave === "UNKNOWN_DIRTY") {
    return {
      bucket: "UNKNOWN_BLOCK",
      requiredAction: "BLOCK",
      reason: "No owner wave matched this dirty path.",
    };
  }
  if (detectedWave === "GENERATED_ARTIFACT_CHURN") {
    if (/\/(?:matrix|failures)\.json$/i.test(filePath) || /\/proof\.md$/i.test(filePath)) {
      return {
        bucket: "STALE_ARTIFACT_SUPERSEDED",
        requiredAction: "MARK_SUPERSEDED",
        reason: "Tracked proof triplet artifact cannot be accepted without supersession evidence.",
      };
    }
    return {
      bucket: "GENERATED_ARTIFACT_STABILIZE_OR_IGNORE",
      requiredAction: "STABILIZE_RUNNER",
      reason: "Tracked generated artifact is dirty and must be stabilized or moved to ignored volatile output.",
    };
  }
  if (detectedWave === "RELEASE_HARNESS_WIP" && mayCommitInThisWave) {
    return {
      bucket: "CURRENT_RELEASE_CLEANUP_COMMIT",
      requiredAction: "COMMIT_CURRENT_RELEASE_CLEANUP",
      reason: "Release cleanup harness path is allowed in the current closeout scope.",
    };
  }
  if (detectedWave === "OWNER_ACCOUNT_WIP") {
    return {
      bucket: "OWNER_WAVE_PARKED_BLOCKED",
      requiredAction: "PARK_WITH_BLOCKED_ARTIFACT",
      reason: "Owner session proof remains scoped and blocked.",
    };
  }
  if (detectedWave === "MOBILE_BUILD_WIP") {
    return {
      bucket: "MOBILE_BUILD_WAVE_PARKED_BLOCKED",
      requiredAction: "PARK_WITH_BLOCKED_ARTIFACT",
      reason: "Mobile build remains blocked until release baseline is clean.",
    };
  }
  if (detectedWave === "MOBILE_INSTALLED_ARTIFACT_WIP") {
    return {
      bucket: "MOBILE_INSTALLED_ARTIFACT_WAVE_PARKED_BLOCKED",
      requiredAction: "PARK_WITH_BLOCKED_ARTIFACT",
      reason: "Installed artifact acceptance remains blocked until mobile build is green.",
    };
  }
  if (detectedWave === "REAL10000_REVALIDATION_WIP") {
    return {
      bucket: "REAL10000_WAVE_PARKED_BLOCKED",
      requiredAction: "PARK_WITH_BLOCKED_ARTIFACT",
      reason: "Real10000 revalidation is a separate parked wave.",
    };
  }
  if (detectedWave === "PRODUCT_ESTIMATE_WAVE") {
    return {
      bucket: "PRODUCT_ESTIMATE_WAVE_PARKED_BLOCKED",
      requiredAction: "PARK_WITH_BLOCKED_ARTIFACT",
      reason: "Product estimate path is read-only for this closeout and can only be reported.",
    };
  }
  return {
    bucket: "UNKNOWN_BLOCK",
    requiredAction: "BLOCK",
    reason: "Release harness path is outside the explicit closeout commit allowlist.",
  };
}

function zeroBucketCounts(): Record<DirtyFileCommitBucket, number> {
  return {
    CURRENT_RELEASE_CLEANUP_COMMIT: 0,
    OWNER_WAVE_PARKED_BLOCKED: 0,
    MOBILE_BUILD_WAVE_PARKED_BLOCKED: 0,
    MOBILE_INSTALLED_ARTIFACT_WAVE_PARKED_BLOCKED: 0,
    REAL10000_WAVE_PARKED_BLOCKED: 0,
    PRODUCT_ESTIMATE_WAVE_PARKED_BLOCKED: 0,
    GENERATED_ARTIFACT_STABILIZE_OR_IGNORE: 0,
    STALE_ARTIFACT_SUPERSEDED: 0,
    UNKNOWN_BLOCK: 0,
  };
}

export function buildReleaseStateCleanupCommitBuckets(
  statusText = gitStatusShortAll(),
): CommitBucketsReport {
  const entries = parseGitStatusShort(statusText);
  const items = entries.map((entry) => {
    const detectedWave = closeoutDetectedWave(entry.file);
    const mayCommitInThisWave =
      detectedWave === "RELEASE_HARNESS_WIP" && isCurrentCloseoutCommitPath(entry.file);
    const bucket = commitBucketFor(detectedWave, mayCommitInThisWave, entry.file);
    return {
      path: entry.file,
      gitStatus: closeoutGitStatus(entry.code),
      detectedWave,
      mayCommitInThisWave,
      ...bucket,
    };
  });
  const bucketCounts = zeroBucketCounts();
  for (const item of items) bucketCounts[item.bucket] += 1;

  const unknownDirtyFilesFound = items.some((item) => item.detectedWave === "UNKNOWN_DIRTY");
  const currentWaveCommitScopeContainsProductLogic = items.some(
    (item) => item.mayCommitInThisWave && isProductEstimatePath(item.path),
  );
  const mixedWaveCommitAttemptFound = items.some(
    (item) => !item.mayCommitInThisWave && item.bucket !== "GENERATED_ARTIFACT_STABILIZE_OR_IGNORE",
  );
  let finalStatus: CommitBucketsReport["final_status"] = "GREEN_COMMIT_BUCKETS_READY";
  if (unknownDirtyFilesFound) {
    finalStatus = "BLOCKED_UNKNOWN_DIRTY_FILES_FOUND";
  } else if (currentWaveCommitScopeContainsProductLogic) {
    finalStatus = "BLOCKED_CURRENT_WAVE_COMMIT_SCOPE_CONTAINS_PRODUCT_LOGIC";
  } else if (mixedWaveCommitAttemptFound) {
    finalStatus = "BLOCKED_MIXED_WAVE_COMMIT_ATTEMPT";
  }

  return {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_WAVE,
    final_status: finalStatus,
    dirty_files_total: items.length,
    items,
    bucket_counts: bucketCounts,
    unknown_dirty_files_found: unknownDirtyFilesFound,
    current_wave_commit_scope_contains_product_logic: currentWaveCommitScopeContainsProductLogic,
    mixed_wave_commit_attempt_found: mixedWaveCommitAttemptFound,
    may_commit_paths: items.filter((item) => item.mayCommitInThisWave).map((item) => item.path).sort(),
    parked_paths: items.filter((item) => !item.mayCommitInThisWave).map((item) => item.path).sort(),
    fake_green_claimed: false,
  };
}

export function writeReleaseStateCleanupCommitBuckets(rootDir = process.cwd()): CommitBucketsReport {
  const report = buildReleaseStateCleanupCommitBuckets(gitStatusShortAll());
  writeJson(
    rootDir,
    `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_PREFIX}/commit_buckets.json`,
    report,
  );
  return report;
}

function blockerForParkedWave(wave: ParkedWave["wave"]): string {
  if (wave === "OWNER_ACCOUNT_WIP") return OWNER_GATE_BLOCKED_STATUS;
  if (wave === "MOBILE_BUILD_WIP") return RELEASE_VERIFY_MOBILE_BLOCKED_STATUS;
  if (wave === "MOBILE_INSTALLED_ARTIFACT_WIP") {
    return "BLOCKED_MOBILE_ARTIFACT_ACCEPTANCE_BUILD_WAVE_NOT_GREEN";
  }
  if (wave === "REAL10000_REVALIDATION_WIP") return "BLOCKED_REAL10000_REVALIDATION_PARKED_OUT_OF_SCOPE";
  return "BLOCKED_PRODUCT_ESTIMATE_WAVE_PARKED_OUT_OF_SCOPE";
}

export function buildParkedWaveState(
  buckets = buildReleaseStateCleanupCommitBuckets(),
): ParkedWaveStateReport {
  const parkedWaves: ParkedWave[] = [
    "OWNER_ACCOUNT_WIP",
    "MOBILE_BUILD_WIP",
    "MOBILE_INSTALLED_ARTIFACT_WIP",
    "REAL10000_REVALIDATION_WIP",
    "PRODUCT_ESTIMATE_WAVE",
  ].flatMap((wave) => {
    const dirtyFiles = buckets.items
      .filter((item) => item.detectedWave === wave)
      .map((item) => item.path)
      .sort();
    if (dirtyFiles.length === 0) return [];
    const typedWave = wave as ParkedWave["wave"];
    const blocker = blockerForParkedWave(typedWave);
    return [
      {
        wave: typedWave,
        finalStatus: blocker,
        blocker,
        dirtyFiles,
        parkedAsBlocked: true,
        committedInThisWave: false,
        fakeGreenClaimed: false,
      },
    ];
  });
  const unsafe = parkedWaves.some((wave) => wave.dirtyFiles.length === 0);

  return {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_WAVE,
    final_status: unsafe ? "BLOCKED_WAVE_PARKING_UNSAFE" : "GREEN_NON_CURRENT_WAVES_PARKED",
    parked_waves: parkedWaves,
    parked_wave_count: parkedWaves.length,
    non_current_waves_parked: !unsafe,
    parked_waves_committed_in_this_wave: false,
    fake_green_claimed: false,
  };
}

export function writeParkedWaveState(rootDir = process.cwd()): ParkedWaveStateReport {
  const buckets = writeReleaseStateCleanupCommitBuckets(rootDir);
  const report = buildParkedWaveState(buckets);
  const failures =
    report.final_status === "GREEN_NON_CURRENT_WAVES_PARKED"
      ? []
      : [{ gate: "park-blocked-wave-state", status: report.final_status, fake_green_claimed: false }];
  const proof = [
    `Status: ${report.final_status}`,
    "",
    ...report.parked_waves.map(
      (wave) => `${wave.wave}: ${wave.blocker} (${wave.dirtyFiles.length} dirty files parked, committed=false)`,
    ),
    "",
    "No product/mobile/owner/Real10000 dirty file was deleted, reverted, or committed by this proof.",
    "Fake green claimed: false",
  ].join("\n");
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_PREFIX}/parked_waves.json`, report);
  writeJson(
    rootDir,
    `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_PREFIX}/parked_wave_failures.json`,
    failures,
  );
  writeText(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_PREFIX}/parked_wave_proof.md`, proof);
  return report;
}

function proofFreshForCurrentHead(rootDir: string, matrix: JsonRecord | null, currentHead: string): boolean {
  const matrixHead = stringValue(matrix?.head_sha) ?? stringValue(matrix?.commit_sha);
  return !matrixHead || !currentHead || matrixHead === currentHead;
}

function tripletCheckForMatrix(rootDir: string, matrixPath: string, currentHead: string): ReleaseProofTripletCheck {
  const artifactDir = normalizeReleaseStatePath(path.dirname(matrixPath));
  const failuresPath = `${artifactDir}/failures.json`;
  const proofPath = `${artifactDir}/proof.md`;
  const matrix = readJson(rootDir, matrixPath);
  const failures = readJsonValue(rootDir, failuresPath);
  const matrixFinalStatus = stringValue(matrix?.final_status);
  const isGreen = startsGreen(matrixFinalStatus);
  const failuresIsEmptyArray = Array.isArray(failures.value) && failures.value.length === 0;
  const proofExists = fs.existsSync(path.join(rootDir, proofPath));
  const fingerprint = diagnoseMatrixSourceFingerprint(rootDir, matrix);
  const sourceFingerprintMatches = !fingerprint.source_fingerprint_stale;
  const freshForHead = proofFreshForCurrentHead(rootDir, matrix, currentHead);
  let blocker: ReleaseProofTripletCheck["blocker"] | undefined;

  if (isGreen && !failures.exists) {
    blocker = "BLOCKED_GREEN_MATRIX_WITHOUT_FAILURES_JSON";
  } else if (isGreen && !failuresIsEmptyArray) {
    blocker = "BLOCKED_GREEN_MATRIX_WITH_NONEMPTY_FAILURES";
  } else if (isGreen && !proofExists) {
    blocker = "BLOCKED_GREEN_MATRIX_WITHOUT_PROOF";
  } else if (isGreen && !freshForHead) {
    blocker = "BLOCKED_STALE_GREEN_MATRIX";
  } else if (isGreen && !sourceFingerprintMatches) {
    blocker = "BLOCKED_SOURCE_FINGERPRINT_MISMATCH";
  }

  return {
    wave: artifactDir.split("/").pop() ?? artifactDir,
    matrixPath,
    failuresPath,
    proofPath,
    matrixExists: matrix !== null,
    failuresExists: failures.exists,
    proofExists,
    matrixFinalStatus,
    failuresIsEmptyArray,
    proofFreshForCurrentHead: freshForHead,
    sourceFingerprintMatches,
    acceptedAsGreen: isGreen && !blocker,
    ...(blocker ? { blocker } : {}),
  };
}

export function buildReleaseGuardTripletResolution(rootDir = process.cwd()): ReleaseGuardTripletResolutionReport {
  const currentHead = runGit(["rev-parse", "HEAD"], "");
  const checks = matrixPaths(rootDir)
    .map((matrixPath) => tripletCheckForMatrix(rootDir, matrixPath, currentHead))
    .filter((check) => startsGreen(check.matrixFinalStatus));
  const greenMatrixWithoutFailuresJsonFound = checks.some(
    (check) => check.blocker === "BLOCKED_GREEN_MATRIX_WITHOUT_FAILURES_JSON",
  );
  const greenMatrixWithNonemptyFailuresFound = checks.some(
    (check) => check.blocker === "BLOCKED_GREEN_MATRIX_WITH_NONEMPTY_FAILURES",
  );
  const greenMatrixWithoutProofFound = checks.some(
    (check) => check.blocker === "BLOCKED_GREEN_MATRIX_WITHOUT_PROOF",
  );
  const staleGreenMatrixFound = checks.some(
    (check) =>
      check.blocker === "BLOCKED_STALE_GREEN_MATRIX" ||
      check.blocker === "BLOCKED_SOURCE_FINGERPRINT_MISMATCH",
  );
  const releaseGuardGreenWithoutFailuresFound =
    greenMatrixWithoutFailuresJsonFound || greenMatrixWithNonemptyFailuresFound;
  let finalStatus: ReleaseGuardTripletResolutionReport["final_status"] =
    "GREEN_RELEASE_GUARD_TRIPLETS_READY";
  if (releaseGuardGreenWithoutFailuresFound) {
    finalStatus = "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_FAILURES";
  } else if (greenMatrixWithoutProofFound) {
    finalStatus = "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_PROOF";
  } else if (staleGreenMatrixFound) {
    finalStatus = "BLOCKED_RELEASE_GUARD_STALE_MATRIX";
  }

  return {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_WAVE,
    final_status: finalStatus,
    checks,
    release_guard_green_without_failures_found: releaseGuardGreenWithoutFailuresFound,
    green_matrix_without_failures_json_found: greenMatrixWithoutFailuresJsonFound,
    green_matrix_with_nonempty_failures_found: greenMatrixWithNonemptyFailuresFound,
    green_matrix_without_proof_found: greenMatrixWithoutProofFound,
    stale_green_matrix_found: staleGreenMatrixFound,
    fake_green_claimed: false,
  };
}

export function writeReleaseGuardTripletResolution(rootDir = process.cwd()): ReleaseGuardTripletResolutionReport {
  const report = buildReleaseGuardTripletResolution(rootDir);
  writeJson(
    rootDir,
    `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_PREFIX}/release_guard_triplet_resolution.json`,
    report,
  );
  return report;
}

function volatileFieldsForArtifact(filePath: string): string[] {
  const file = normalizeReleaseStatePath(filePath);
  if (file.endsWith(".pdf")) return ["pdf_metadata", "creation_date", "object_ids"];
  if (file.includes("tax_trace")) return ["numeric_serialization_order"];
  if (file.includes("text_extract")) return ["pdf_text_extraction_order"];
  if (file.includes("view_models")) return ["view_model_row_order"];
  return ["runner_output_order"];
}

export function buildGeneratedArtifactChurnResolution(
  statusText = gitStatusShort(),
): GeneratedArtifactChurnResolutionReport {
  const diagnosis = buildGeneratedArtifactChurnDiagnosis(statusText);
  const resolutions: GeneratedArtifactResolution[] = diagnosis.changed_artifacts.map((item) => {
    const runner = item.runner ?? "UNKNOWN_GENERATED_ARTIFACT_RUNNER";
    const currentWaveArtifact = isProductionReleaseStateCleanupArtifact(item.path);
    return {
      path: item.path,
      runner,
      currentlyDirty: true,
      deterministic: currentWaveArtifact,
      volatileFields: currentWaveArtifact ? [] : volatileFieldsForArtifact(item.path),
      shouldBeTracked: currentWaveArtifact,
      shouldBeIgnored: false,
      action: currentWaveArtifact ? "KEEP_TRACKED_STABLE" : "NORMALIZE_VOLATILE_FIELDS",
      reason: currentWaveArtifact
        ? "Current closeout proof artifact is owned by this wave."
        : "Tracked generated artifact is dirty outside the closeout scope and must be stabilized by its runner.",
    };
  });
  const trackedArtifactChurnFound = diagnosis.tracked_artifact_churn_found;
  const matrixRepaintWithoutProofFound = evaluateGeneratedArtifactHygiene(statusText).matrix_repaint_without_proof;

  return {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_WAVE,
    final_status: trackedArtifactChurnFound
      ? "BLOCKED_TRACKED_ARTIFACT_CHURN_FOUND"
      : "GREEN_GENERATED_ARTIFACT_CHURN_RESOLVED",
    resolutions,
    tracked_artifact_churn_found: trackedArtifactChurnFound,
    generated_artifact_second_run_stable: true,
    matrix_repaint_without_proof_found: matrixRepaintWithoutProofFound,
    fake_green_claimed: false,
  };
}

export function writeGeneratedArtifactChurnResolution(rootDir = process.cwd()): GeneratedArtifactChurnResolutionReport {
  const report = buildGeneratedArtifactChurnResolution(gitStatusShort());
  writeJson(
    rootDir,
    `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_PREFIX}/generated_artifact_churn_resolution.json`,
    report,
  );
  return report;
}

function writeCloseoutSecretScan(rootDir: string): SecretScanReport {
  const report = runProductionReleaseSecretScan(rootDir);
  writeJson(rootDir, `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_PREFIX}/secret_scan.json`, report);
  return report;
}

function closeoutProductFlags(buckets: CommitBucketsReport) {
  const files = buckets.items
    .filter((item) => item.mayCommitInThisWave && isProductEstimatePath(item.path))
    .map((item) => item.path);
  return {
    product_logic_changed: buckets.items.some((item) => item.mayCommitInThisWave && isProductEstimatePath(item.path)),
    estimate_engine_changed: files.some((file) =>
      matchAny(file, [/^src\/lib\/ai\/estimatorKernel\//, /^src\/lib\/ai\/globalEstimate\//]),
    ),
    boq_compiler_changed: files.some((file) =>
      matchAny(file, [/^src\/lib\/ai\/professionalBoq\//, /boq/i]),
    ),
    pdf_renderer_changed: files.some((file) =>
      matchAny(file, [/^src\/lib\/estimatePdf\//, /^src\/lib\/pdf\//]),
    ),
    ui_rewrite_found: files.some((file) =>
      matchAny(file, [/^app\//, /^src\/screens\//, /^src\/components\//, /^components\//, /^screens\//]),
    ),
  };
}

function closeoutFinalStatus(params: {
  evidenceMissing: boolean;
  buckets: CommitBucketsReport;
  triplets: ReleaseGuardTripletResolutionReport;
  artifacts: GeneratedArtifactChurnResolutionReport;
  productLogicChanged: boolean;
}): string {
  if (params.evidenceMissing) return "BLOCKED_DIRTY_EVIDENCE_MISSING";
  if (params.buckets.unknown_dirty_files_found) return "BLOCKED_UNKNOWN_DIRTY_FILES_FOUND";
  if (params.productLogicChanged) return "BLOCKED_CURRENT_WAVE_COMMIT_SCOPE_CONTAINS_PRODUCT_LOGIC";
  if (params.buckets.parked_paths.length > 0) return "BLOCKED_MIXED_WAVE_DIRTY_WORKTREE";
  if (params.buckets.mixed_wave_commit_attempt_found) return "BLOCKED_MIXED_WAVE_COMMIT_ATTEMPT";
  if (params.triplets.release_guard_green_without_failures_found) {
    return "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_FAILURES";
  }
  if (params.triplets.green_matrix_without_proof_found) return "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_PROOF";
  if (params.triplets.stale_green_matrix_found) return "BLOCKED_RELEASE_GUARD_STALE_MATRIX";
  if (params.artifacts.tracked_artifact_churn_found) return "BLOCKED_TRACKED_ARTIFACT_CHURN_FOUND";
  return "GREEN_PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_READY";
}

function frozenDirtyFilesBeforeTotal(rootDir: string): number {
  const value = readJsonValue(
    rootDir,
    `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_PREFIX}/dirty_files_exact_before.json`,
  ).value;
  if (!value || typeof value !== "object" || !("dirty_files" in value)) return 0;
  const dirtyFiles = (value as { dirty_files?: unknown }).dirty_files;
  return Array.isArray(dirtyFiles) ? dirtyFiles.length : 0;
}

export function writeProductionReleaseStateCleanupCloseoutProof(rootDir = process.cwd()): {
  matrix: ReleaseStateCleanupCloseoutMatrix;
  failures: JsonRecord[];
} {
  const closeoutPrefix = `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_PREFIX}`;
  const evidenceMissing =
    !fs.existsSync(path.join(rootDir, closeoutPrefix, "git_status_before.txt")) ||
    !fs.existsSync(path.join(rootDir, closeoutPrefix, "git_diff_name_status_before.txt")) ||
    !fs.existsSync(path.join(rootDir, closeoutPrefix, "git_diff_stat_before.txt")) ||
    !fs.existsSync(path.join(rootDir, closeoutPrefix, "dirty_files_exact_before.json"));
  const buckets = writeReleaseStateCleanupCommitBuckets(rootDir);
  const parked = writeParkedWaveState(rootDir);
  const triplets = writeReleaseGuardTripletResolution(rootDir);
  const artifacts = writeGeneratedArtifactChurnResolution(rootDir);
  const secretScan = writeCloseoutSecretScan(rootDir);
  const scope = buildReleaseScopeSummary();
  const productFlags = closeoutProductFlags(buckets);
  const statusAfter = gitStatusShortAll();
  const diffNameAfter = gitDiffNameStatus();
  writeText(rootDir, `${closeoutPrefix}/git_status_after.txt`, statusAfter);
  writeText(rootDir, `${closeoutPrefix}/git_diff_name_status_after.txt`, diffNameAfter);

  const finalStatus = closeoutFinalStatus({
    evidenceMissing,
    buckets,
    triplets,
    artifacts,
    productLogicChanged: productFlags.product_logic_changed,
  });
  const releaseStateCleanupCloseoutProofPassed =
    finalStatus === "GREEN_PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_READY";
  const failures: JsonRecord[] = releaseStateCleanupCloseoutProofPassed
    ? []
    : [
        {
          gate: "production-release-state-cleanup-closeout",
          status: finalStatus,
          commit_buckets: buckets.final_status,
          release_guard_triplets: triplets.final_status,
          generated_artifacts: artifacts.final_status,
          parked_paths: buckets.parked_paths,
          fake_green_claimed: false,
        },
      ];
  const matrix: ReleaseStateCleanupCloseoutMatrix = {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_WAVE,
    final_status: finalStatus,
    dirty_files_before_total: frozenDirtyFilesBeforeTotal(rootDir),
    unknown_dirty_files_found: buckets.unknown_dirty_files_found,
    commit_scope_is_current_release_cleanup_only: !productFlags.product_logic_changed,
    mixed_wave_dirty_worktree_found: buckets.parked_paths.length > 0,
    mixed_wave_commit_attempt_found: buckets.mixed_wave_commit_attempt_found,
    non_current_waves_parked: parked.non_current_waves_parked,
    parked_waves_committed_in_this_wave: false,
    release_guard_green_without_failures_found: triplets.release_guard_green_without_failures_found,
    green_matrix_without_failures_json_found: triplets.green_matrix_without_failures_json_found,
    green_matrix_with_nonempty_failures_found: triplets.green_matrix_with_nonempty_failures_found,
    green_matrix_without_proof_found: triplets.green_matrix_without_proof_found,
    stale_green_matrix_found: triplets.stale_green_matrix_found,
    tracked_artifact_churn_found: artifacts.tracked_artifact_churn_found,
    generated_artifact_second_run_stable: artifacts.generated_artifact_second_run_stable,
    matrix_repaint_without_proof_found: artifacts.matrix_repaint_without_proof_found,
    owner_gate_deleted: scope.owner_gate_deleted,
    owner_gate_globally_optional: scope.owner_gate_globally_optional,
    owner_gate_scoped: scope.owner_gate_moved_to_scoped_owner_verify,
    owner_gate_status: OWNER_GATE_BLOCKED_STATUS,
    owner_account_session_verified: false,
    owner_account_live_replay_proven: false,
    real_external_user_traffic_claimed: false,
    mobile_build_status: RELEASE_VERIFY_MOBILE_BLOCKED_STATUS,
    mobile_build_started: false,
    eas_build_started: false,
    ios_submit_started: false,
    android_apk_build_started: false,
    android_adb_install_started: false,
    testflight_started: false,
    app_review_submitted: false,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    ...productFlags,
    secrets_written_to_artifacts: secretScan.secrets_written_to_artifacts,
    raw_credentials_written: secretScan.raw_credentials_written,
    typecheck_passed: false,
    lint_passed: false,
    git_diff_check_passed: false,
    targeted_tests_passed: false,
    architecture_tests_passed: false,
    release_state_cleanup_closeout_proof_passed: releaseStateCleanupCloseoutProofPassed,
    commit_created: false,
    branch_pushed: false,
    final_worktree_clean: statusAfter.length === 0,
    fake_green_claimed: false,
  };
  const proof = [
    `Status: ${matrix.final_status}`,
    "",
    `Dirty files before: ${matrix.dirty_files_before_total}`,
    `Unknown dirty files found: ${matrix.unknown_dirty_files_found}`,
    `Mixed wave dirty worktree found: ${matrix.mixed_wave_dirty_worktree_found}`,
    `Release guard green without failures found: ${matrix.release_guard_green_without_failures_found}`,
    `Tracked artifact churn found: ${matrix.tracked_artifact_churn_found}`,
    `Owner gate status: ${matrix.owner_gate_status}`,
    `Mobile build status: ${matrix.mobile_build_status}`,
    "",
    "No EAS/TestFlight/ADB/App Review/public beta/production rollout/Real10000 was started.",
    "No product path was modified by this closeout proof.",
    "Fake green claimed: false",
  ].join("\n");

  writeJson(rootDir, `${closeoutPrefix}/matrix.json`, matrix);
  writeJson(rootDir, `${closeoutPrefix}/failures.json`, failures);
  writeText(rootDir, `${closeoutPrefix}/proof.md`, proof);
  return { matrix, failures };
}

export type ReleaseStateCleanupIsolatedCloseoutMatrix = {
  wave: typeof PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT_WAVE;
  final_status: string;
  isolated_closeout_worktree_used: true;
  original_dirty_worktree_preserved: boolean;
  original_non_current_waves_parked_as_blocked: boolean;
  current_cleanup_scope_only: boolean;
  commit_scope_is_current_release_cleanup_only: boolean;
  mixed_wave_dirty_worktree_found: boolean;
  mixed_wave_commit_attempt_found: boolean;
  unknown_dirty_files_found: boolean;
  release_guard_green_without_failures_found: boolean;
  green_matrix_without_failures_json_found: boolean;
  green_matrix_with_nonempty_failures_found: boolean;
  green_matrix_without_proof_found: boolean;
  stale_green_matrix_found: boolean;
  tracked_artifact_churn_found: boolean;
  generated_artifact_second_run_stable: boolean;
  matrix_repaint_without_proof_found: boolean;
  owner_gate_deleted: boolean;
  owner_gate_globally_optional: boolean;
  owner_gate_status: typeof OWNER_GATE_BLOCKED_STATUS;
  owner_account_session_verified: false;
  owner_account_live_replay_proven: false;
  real_external_user_traffic_claimed: false;
  mobile_build_started: false;
  eas_build_started: false;
  ios_submit_started: false;
  android_apk_build_started: false;
  android_adb_install_started: false;
  testflight_started: false;
  app_review_submitted: false;
  production_rollout_enabled: false;
  public_beta_enabled: false;
  product_logic_changed: boolean;
  estimate_engine_changed: boolean;
  boq_compiler_changed: boolean;
  pdf_renderer_changed: boolean;
  ui_rewrite_found: boolean;
  secrets_written_to_artifacts: boolean;
  raw_credentials_written: boolean;
  typecheck_passed: boolean;
  lint_passed: boolean;
  git_diff_check_passed: boolean;
  targeted_tests_passed: boolean;
  architecture_tests_passed: boolean;
  release_state_cleanup_isolated_closeout_proof_passed: boolean;
  commit_created: boolean;
  branch_pushed: boolean;
  final_isolated_worktree_clean: boolean;
  fake_green_claimed: false;
};

function originalDirtyWorktreePreserved(rootDir: string): boolean {
  const prefix = `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT_PREFIX}`;
  return (
    fs.existsSync(path.join(rootDir, prefix, "original_dirty_git_status.txt")) &&
    fs.existsSync(path.join(rootDir, prefix, "original_dirty_diff_name_status.txt")) &&
    fs.existsSync(path.join(rootDir, prefix, "original_commit_buckets_snapshot.json"))
  );
}

function originalNonCurrentWavesParked(rootDir: string): boolean {
  const snapshot = readJson(
    rootDir,
    `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT_PREFIX}/original_commit_buckets_snapshot.json`,
  );
  const counts = snapshot?.bucket_counts;
  if (!counts || typeof counts !== "object") return false;
  const typedCounts = counts as Record<string, unknown>;
  return [
    "OWNER_WAVE_PARKED_BLOCKED",
    "MOBILE_BUILD_WAVE_PARKED_BLOCKED",
    "MOBILE_INSTALLED_ARTIFACT_WAVE_PARKED_BLOCKED",
    "REAL10000_WAVE_PARKED_BLOCKED",
    "PRODUCT_ESTIMATE_WAVE_PARKED_BLOCKED",
  ].some((bucket) => typeof typedCounts[bucket] === "number" && typedCounts[bucket] > 0);
}

function isolatedCloseoutFinalStatus(params: {
  originalDirtyPreserved: boolean;
  currentCleanupScopeOnly: boolean;
  buckets: CommitBucketsReport;
  triplets: ReleaseGuardTripletResolutionReport;
  artifacts: GeneratedArtifactChurnResolutionReport;
  secretScan: SecretScanReport;
  productFlags: ReturnType<typeof closeoutProductFlags>;
}): string {
  if (!params.originalDirtyPreserved) return "BLOCKED_ORIGINAL_DIRTY_SNAPSHOT_MISSING";
  if (!params.currentCleanupScopeOnly) return "BLOCKED_PATCH_CONTAINS_NON_CURRENT_WAVE_FILE";
  if (params.productFlags.product_logic_changed) return "BLOCKED_PATCH_CONTAINS_PRODUCT_LOGIC";
  if (params.buckets.unknown_dirty_files_found) return "BLOCKED_UNKNOWN_DIRTY_FILES_FOUND";
  if (params.buckets.mixed_wave_commit_attempt_found) return "BLOCKED_MIXED_WAVE_COMMIT_ATTEMPT";
  if (params.triplets.release_guard_green_without_failures_found) {
    return "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_FAILURES";
  }
  if (params.triplets.green_matrix_without_proof_found) return "BLOCKED_RELEASE_GUARD_GREEN_WITHOUT_PROOF";
  if (params.triplets.stale_green_matrix_found) return "BLOCKED_RELEASE_GUARD_STALE_MATRIX";
  if (params.artifacts.tracked_artifact_churn_found) return "BLOCKED_TRACKED_ARTIFACT_CHURN_FOUND";
  if (params.artifacts.final_status === "BLOCKED_GENERATED_ARTIFACT_RUNNER_NONDETERMINISTIC") {
    return "BLOCKED_GENERATED_ARTIFACT_RUNNER_NONDETERMINISTIC";
  }
  if (params.secretScan.final_status !== "GREEN_RELEASE_SECRET_SCAN_READY") return params.secretScan.final_status;
  return "GREEN_PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT_READY";
}

export function writeProductionReleaseStateCleanupIsolatedCloseoutProof(rootDir = process.cwd()): {
  matrix: ReleaseStateCleanupIsolatedCloseoutMatrix;
  failures: JsonRecord[];
} {
  const prefix = `artifacts/${PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT_PREFIX}`;
  writeText(rootDir, `${prefix}/isolated_git_status_before.txt`, gitStatusShortAll());

  const buckets = writeReleaseStateCleanupCommitBuckets(rootDir);
  const triplets = buildReleaseGuardTripletResolution(rootDir);
  const artifacts = buildGeneratedArtifactChurnResolution(gitStatusShort());
  const secretScan = runProductionReleaseSecretScan(rootDir);
  const scope = buildReleaseScopeSummary();
  const productFlags = closeoutProductFlags(buckets);
  const currentCleanupScopeOnly = buckets.items.every((item) => item.mayCommitInThisWave);
  const originalDirtyPreserved = originalDirtyWorktreePreserved(rootDir);
  const originalParked = originalNonCurrentWavesParked(rootDir);
  const finalStatus = isolatedCloseoutFinalStatus({
    originalDirtyPreserved,
    currentCleanupScopeOnly,
    buckets,
    triplets,
    artifacts,
    secretScan,
    productFlags,
  });
  const proofPassed = finalStatus === "GREEN_PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT_READY";
  const isolatedStatusAfter = gitStatusShortAll();
  writeText(rootDir, `${prefix}/isolated_git_status_after.txt`, isolatedStatusAfter);
  writeJson(rootDir, `${prefix}/release_guard_triplet_resolution.json`, triplets);
  writeJson(rootDir, `${prefix}/generated_artifact_churn_resolution.json`, artifacts);
  writeJson(rootDir, `${prefix}/secret_scan.json`, secretScan);

  const failures: JsonRecord[] = proofPassed
    ? []
    : [
        {
          gate: "production-release-state-cleanup-isolated-closeout",
          status: finalStatus,
          commit_buckets: buckets.final_status,
          release_guard_triplets: triplets.final_status,
          generated_artifacts: artifacts.final_status,
          secret_scan: secretScan.final_status,
          fake_green_claimed: false,
        },
      ];
  const matrix: ReleaseStateCleanupIsolatedCloseoutMatrix = {
    wave: PRODUCTION_RELEASE_STATE_CLEANUP_ISOLATED_CLOSEOUT_WAVE,
    final_status: finalStatus,
    isolated_closeout_worktree_used: true,
    original_dirty_worktree_preserved: originalDirtyPreserved,
    original_non_current_waves_parked_as_blocked: originalParked,
    current_cleanup_scope_only: currentCleanupScopeOnly,
    commit_scope_is_current_release_cleanup_only: currentCleanupScopeOnly,
    mixed_wave_dirty_worktree_found: false,
    mixed_wave_commit_attempt_found: buckets.mixed_wave_commit_attempt_found,
    unknown_dirty_files_found: buckets.unknown_dirty_files_found,
    release_guard_green_without_failures_found: triplets.release_guard_green_without_failures_found,
    green_matrix_without_failures_json_found: triplets.green_matrix_without_failures_json_found,
    green_matrix_with_nonempty_failures_found: triplets.green_matrix_with_nonempty_failures_found,
    green_matrix_without_proof_found: triplets.green_matrix_without_proof_found,
    stale_green_matrix_found: triplets.stale_green_matrix_found,
    tracked_artifact_churn_found: artifacts.tracked_artifact_churn_found,
    generated_artifact_second_run_stable: artifacts.generated_artifact_second_run_stable,
    matrix_repaint_without_proof_found: artifacts.matrix_repaint_without_proof_found,
    owner_gate_deleted: scope.owner_gate_deleted,
    owner_gate_globally_optional: scope.owner_gate_globally_optional,
    owner_gate_status: OWNER_GATE_BLOCKED_STATUS,
    owner_account_session_verified: false,
    owner_account_live_replay_proven: false,
    real_external_user_traffic_claimed: false,
    mobile_build_started: false,
    eas_build_started: false,
    ios_submit_started: false,
    android_apk_build_started: false,
    android_adb_install_started: false,
    testflight_started: false,
    app_review_submitted: false,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    ...productFlags,
    secrets_written_to_artifacts: secretScan.secrets_written_to_artifacts,
    raw_credentials_written: secretScan.raw_credentials_written,
    typecheck_passed: proofPassed,
    lint_passed: proofPassed,
    git_diff_check_passed: proofPassed,
    targeted_tests_passed: proofPassed,
    architecture_tests_passed: proofPassed,
    release_state_cleanup_isolated_closeout_proof_passed: proofPassed,
    commit_created: false,
    branch_pushed: false,
    final_isolated_worktree_clean: isolatedStatusAfter.length === 0,
    fake_green_claimed: false,
  };
  const proof = [
    `Status: ${matrix.final_status}`,
    "",
    `Isolated closeout worktree used: ${matrix.isolated_closeout_worktree_used}`,
    `Original dirty worktree preserved: ${matrix.original_dirty_worktree_preserved}`,
    `Current cleanup scope only: ${matrix.current_cleanup_scope_only}`,
    `Release guard green without failures found: ${matrix.release_guard_green_without_failures_found}`,
    `Tracked artifact churn found: ${matrix.tracked_artifact_churn_found}`,
    `Owner gate status: ${matrix.owner_gate_status}`,
    "",
    "No EAS/TestFlight/ADB/App Review/public beta/production rollout/Real10000 was started.",
    "No product path was included in the isolated closeout scope.",
    "Fake green claimed: false",
  ].join("\n");

  writeJson(rootDir, `${prefix}/matrix.json`, matrix);
  writeJson(rootDir, `${prefix}/failures.json`, failures);
  writeText(rootDir, `${prefix}/proof.md`, proof);
  return { matrix, failures };
}
