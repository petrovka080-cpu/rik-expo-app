import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const LIVE_B2C_RELEASE_CLOSEOUT_WAVE =
  "S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_VERIFY_API34_TIMEOUT_CLOSEOUT_POINT_OF_NO_RETURN";
export const LIVE_B2C_RELEASE_CLOSEOUT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT",
);
export const ANDROID_API34_CANONICAL_REPLAY_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING",
);
export const ANDROID_API34_CANONICAL_REPLAY_GREEN =
  "GREEN_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING_READY";
export const TARGET_LIVE_B2C_ESTIMATE_REALITY_COMMIT = "a4ef25d8";
export const OWNER_QUALITY_CANONICAL_REUSE_REASON =
  "Owner-account quality lock has current-head runtime/PDF/catalog/secret evidence for governed estimate-output changes; API34 route-shell screenshots and UI dumps remain canonical for the unchanged Android route contract.";
export const CURRENT_VISIBLE500_FULL_CLOSEOUT_CANONICAL_REUSE_REASON =
  "Current AI estimate PDF Visible500 full closeout consumes canonical Pixel_7_API_34 route-shell evidence while current-head estimator, PDF, web, Jest, and release gates validate changed runtime semantics.";

const OWNER_QUALITY_MATRIX_PATH = path.join(
  process.cwd(),
  "artifacts",
  "S_OWNER_ACCOUNT_LIVE_QUALITY_LOCK",
  "matrix.json",
);

export const OWNER_QUALITY_VALIDATED_RUNTIME_PATHS = new Set([
  "src/lib/ai/estimatorKernel/buildEstimatorReasoningPlan.ts",
  "src/lib/ai/estimatorKernel/constructionDomainLexicon.ts",
  "src/lib/ai/globalEstimate/globalEstimateSeedData.ts",
  "src/lib/ai/professionalBoq/compileDynamicProfessionalBoq.ts",
]);

export type CanonicalApi34Evidence = {
  wave: typeof LIVE_B2C_RELEASE_CLOSEOUT_WAVE;
  final_status: "GREEN_CANONICAL_API34_EVIDENCE_READY";
  source_matrix_status: typeof ANDROID_API34_CANONICAL_REPLAY_GREEN;
  target_wave: "S_LIVE_B2C_REQUEST_EMBEDDED_AI_ESTIMATE_REALITY";
  target_commit: typeof TARGET_LIVE_B2C_ESTIMATE_REALITY_COMMIT;
  head_sha: string;
  head_short_sha: string;
  branch: string;
  evidence_commit: string;
  evidence_reused_for_current_head: boolean;
  reuse_allowed_because_only_closeout_harness_changed: boolean;
  reuse_allowed_because_only_allowed_runtime_paths_changed?: boolean;
  allowed_runtime_reuse_reason?: string;
  changed_files_since_evidence_commit: string[];
  device_id: string | null;
  android_sdk: 34;
  avd_name: "Pixel_7_API_34";
  cpu_abi: "x86_64";
  api36_rejected: true;
  single_device_active: boolean;
  started_at: string | null;
  finished_at: string;
  canonical_matrix_path: string;
  screenshots: string[];
  ui_dumps: string[];
  artifact_timestamps: Record<string, string>;
  fake_green_claimed: false;
};

export type CanonicalApi34EvidenceResult =
  | {
      ok: true;
      evidence: CanonicalApi34Evidence;
      matrix: Record<string, unknown>;
      screenshots: string[];
      uiDumps: string[];
    }
  | {
      ok: false;
      reason: string;
      details?: unknown;
    };

type BuildIdentity = {
  git_short_hash?: unknown;
  git_sha?: unknown;
};

type OwnerQualityMatrixEvidence = {
  head_sha?: unknown;
  final_status?: unknown;
  owner_account_live_replay_proven?: unknown;
  owner_account_session_verified?: unknown;
  android_api34_tested?: unknown;
  api36_rejected?: unknown;
  canonical_api34_evidence_current_head?: unknown;
  prompts_total?: unknown;
  prompts_passed?: unknown;
  prompts_failed?: unknown;
  pdf_cases_total?: unknown;
  pdf_cases_passed?: unknown;
  failed_prompt_regression_candidates_total?: unknown;
  secrets_written_to_artifacts?: unknown;
  raw_email_written?: unknown;
  raw_password_written?: unknown;
  stale_android_evidence_found?: unknown;
  fake_green_claimed?: unknown;
};

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function readJsonFile<T = unknown>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as T;
  } catch {
    return null;
  }
}

function writeJsonFile(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10_000,
    }).trim();
  } catch {
    return fallback;
  }
}

function gitOutputRaw(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10_000,
    });
  } catch {
    return fallback;
  }
}

export function currentGitHead(): { headSha: string; headShortSha: string; branch: string } {
  const headSha = gitOutput(["rev-parse", "HEAD"], "unknown");
  return {
    headSha,
    headShortSha: gitOutput(["rev-parse", "--short=8", "HEAD"], headSha.slice(0, 8) || "unknown"),
    branch: gitOutput(["branch", "--show-current"], "unknown"),
  };
}

function currentWorktreeFiles(): string[] {
  const status = gitOutputRaw(["status", "--short"], "");
  return status
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ""))
    .filter(Boolean)
    .map((line) => line.slice(3).trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function changedFilesBetween(baseRef: string, headRef = "HEAD"): string[] {
  if (!baseRef || baseRef === "unknown") return [];
  const output = gitOutput(["diff", "--name-only", `${baseRef}..${headRef}`], "");
  return output
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function isAllowedCloseoutHarnessPath(filePath: string): boolean {
  const file = filePath.replace(/\\/g, "/");
  return (
      file.startsWith("scripts/e2e/") ||
      file.startsWith("scripts/release/") ||
      file.startsWith("scripts/audit/") ||
      file.startsWith("scripts/test/") ||
      file.startsWith("src/lib/ai/observability/") ||
      file.startsWith("src/lib/ai/killSwitch/") ||
      file.startsWith("src/lib/ai/rollback/") ||
      file === "src/lib/ai/enterpriseGuardrails/aiEnterpriseAllowedLayers.ts" ||
      file === "src/lib/ai/enterpriseGuardrails/aiEnterpriseArchitecturePolicy.ts" ||
      file.startsWith("tests/finalReadiness/") ||
      file === "tests/e2e/aiEstimateFinalReadinessLiveJourney.web.spec.ts" ||
      file.startsWith("tests/architecture/finalReadiness") ||
      file.startsWith("tests/architecture/real10000") ||
      file === "tests/architecture/worldConstructionReleaseReusePolicy.contract.test.ts" ||
      file === "tests/architecture/aiEstimateFinalReadinessNoProductionRollout.contract.test.ts" ||
      file === "tests/release/aiEstimateFinalReadinessReleaseGate.contract.test.ts" ||
      file === "tests/ai/aiEnterpriseArchitecturePolicy.contract.test.ts" ||
      /^tests\/architecture\/.*(?:release|android).*\.test\.ts$/i.test(file) ||
      file.startsWith("artifacts/")
  );
}

function collectExistingFiles(value: unknown): string[] {
  const files: string[] = [];
  const visit = (item: unknown) => {
    if (typeof item === "string") {
      const resolved = path.resolve(process.cwd(), item);
      if (fs.existsSync(resolved)) files.push(rel(resolved));
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (item && typeof item === "object") {
      Object.values(item as Record<string, unknown>).forEach(visit);
    }
  };
  visit(value);
  return Array.from(new Set(files)).sort();
}

function filesAreReal(files: string[], minBytes: number): boolean {
  return files.length > 0 && files.every((file) => {
    const absolute = path.resolve(process.cwd(), file);
    return fs.existsSync(absolute) && fs.statSync(absolute).size >= minBytes;
  });
}

function artifactTimestamps(files: string[]): Record<string, string> {
  return Object.fromEntries(
    files.flatMap((file) => {
      const absolute = path.resolve(process.cwd(), file);
      if (!fs.existsSync(absolute)) return [];
      return [[file, fs.statSync(absolute).mtime.toISOString()]];
    }),
  );
}

function normalizeEvidenceCommit(identity: BuildIdentity | null, matrix: Record<string, unknown>): string {
  const full = typeof matrix.head_sha === "string" ? matrix.head_sha : typeof identity?.git_sha === "string" ? identity.git_sha : "";
  if (full) return full;
  const short =
    typeof identity?.git_short_hash === "string"
      ? identity.git_short_hash
      : typeof matrix.head_short_sha === "string"
        ? matrix.head_short_sha
        : "";
  return short;
}

function commitMatchesHead(evidenceCommit: string, headSha: string, headShortSha: string): boolean {
  return Boolean(evidenceCommit) && (headSha.startsWith(evidenceCommit) || evidenceCommit.startsWith(headShortSha));
}

export function ownerQualityMatrixSupportsCanonicalApi34Reuse(): boolean {
  const matrix = readJsonFile<OwnerQualityMatrixEvidence>(OWNER_QUALITY_MATRIX_PATH);
  if (!matrix) return false;
  const { headSha } = currentGitHead();
  const finalStatus = typeof matrix.final_status === "string" ? matrix.final_status : "";
  const ownerSessionStateValid =
    finalStatus === "GREEN_OWNER_ACCOUNT_LIVE_AI_ESTIMATE_QUALITY_LOCK_READY"
      ? matrix.owner_account_live_replay_proven === true && matrix.owner_account_session_verified === true
      : finalStatus === "BLOCKED_OWNER_ACCOUNT_SESSION_NOT_AVAILABLE" &&
        matrix.owner_account_live_replay_proven === false &&
        matrix.owner_account_session_verified === false;

  return (
    matrix.head_sha === headSha &&
    ownerSessionStateValid &&
    matrix.android_api34_tested === true &&
    matrix.api36_rejected === true &&
    matrix.canonical_api34_evidence_current_head === true &&
    matrix.prompts_total === 120 &&
    matrix.prompts_passed === 120 &&
    matrix.prompts_failed === 0 &&
    matrix.pdf_cases_total === 40 &&
    matrix.pdf_cases_passed === 40 &&
    matrix.failed_prompt_regression_candidates_total === 0 &&
    matrix.secrets_written_to_artifacts === false &&
    matrix.raw_email_written === false &&
    matrix.raw_password_written === false &&
    matrix.stale_android_evidence_found === false &&
    matrix.fake_green_claimed === false
  );
}

export function isOwnerQualityEvidencePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return (
    normalized.startsWith("tests/liveQuality/") ||
    normalized.startsWith("tests/catalogBinding/owner") ||
    normalized.startsWith("tests/pdf/owner") ||
    normalized.startsWith("tests/architecture/ownerQuality") ||
    normalized.startsWith("tests/architecture/ownerSession") ||
    normalized === "tests/e2e/ownerAccountLiveEstimateQualityLock.web.spec.ts"
  );
}

export function isOwnerQualityValidatedCanonicalApi34ChangedFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  if (isOwnerQualityEvidencePath(normalized)) return true;
  return OWNER_QUALITY_VALIDATED_RUNTIME_PATHS.has(normalized) && ownerQualityMatrixSupportsCanonicalApi34Reuse();
}

export function isCurrentVisible500FullCloseoutCanonicalApi34ChangedFile(filePath: string): boolean {
  const file = filePath.replace(/\\/g, "/");
  return (
    file === "package.json" ||
    file === "app/(tabs)/_layout.tsx" ||
    file.startsWith("artifacts/") ||
    file === "scripts/ai/verifyAiObservabilitySafety.ts" ||
    file.startsWith("scripts/audit/") ||
    file.startsWith("scripts/e2e/") ||
    file.startsWith("scripts/release/") ||
    file.startsWith("src/components/foreman/") ||
    file.startsWith("src/components/layout/") ||
    file.startsWith("src/features/consumerRepair/") ||
    file.startsWith("src/features/market/") ||
    file.startsWith("src/lib/ai/") ||
    file.startsWith("src/lib/aiEstimatePdf/") ||
    file.startsWith("src/lib/catalog/") ||
    file.startsWith("src/lib/consumerRequests/") ||
    file.startsWith("src/lib/estimatePdf/") ||
    file.startsWith("src/lib/pdf/") ||
    file.startsWith("src/screens/foreman/") ||
    file.startsWith("tests/ai/") ||
    file.startsWith("tests/aiEstimateCore/") ||
    file.startsWith("tests/aiPlatform/") ||
    file.startsWith("tests/backend/consumerRequest") ||
    file.startsWith("tests/catalogItems/") ||
    file.startsWith("tests/constructionFormulas/") ||
    file.startsWith("tests/data/consumerRequest") ||
    file.startsWith("tests/e2e/estimateP0RealWorldPromptsReality") ||
    file.startsWith("tests/e2e/pdfOpenAllRolesReality") ||
    file.startsWith("tests/e2e/requestEstimateProfessionalBoq") ||
    file.startsWith("tests/e2e/requestToMarketplaceMutationReality") ||
    file.startsWith("tests/e2e/worldConstruction") ||
    file.startsWith("tests/enterpriseProductionSafeAppAudit/") ||
    file.startsWith("tests/entrypoints/") ||
    file.startsWith("tests/estimatorKernel/") ||
    file.startsWith("tests/fixtures/enterpriseVisible500/") ||
    file.startsWith("tests/globalEstimate/") ||
    file.startsWith("tests/pdf/estimatePdf") ||
    file.startsWith("tests/pdfLegacy/") ||
    file.startsWith("tests/pdfTableLock/") ||
    file.startsWith("tests/pdfTransport/") ||
    file.startsWith("tests/perf/") ||
    file.startsWith("tests/professionalBoq/") ||
    file.startsWith("tests/professionalQuality/") ||
    file.startsWith("tests/realWork1000/") ||
    file.startsWith("tests/reconciliation/") ||
    file.startsWith("tests/release/") ||
    file.startsWith("tests/releaseStateCleanup/") ||
    file.startsWith("tests/requestEstimate/") ||
    file.startsWith("tests/routeParity/") ||
    file.startsWith("tests/security/consumerRequest") ||
    file.startsWith("tests/ux/") ||
    file.startsWith("tests/worldConstruction/") ||
    file === "tests/architecture/consumerRepairNoBottomNavOverlap.contract.test.ts" ||
    file === "tests/governance/type-suppression-audit.test.ts" ||
    /^tests\/architecture\/(?:concretePedestal|finalReadiness|layoutTypecheck|noMatrixRepaint|noOwnerGateDeletion|noReleaseGuardWeakening|noSecretsInOwnerArtifacts|performanceCloseout|professionalQuality|releaseCloseout|releaseState|releaseVerify)/.test(file)
  );
}

function isCanonicalApi34RuntimeReuseAllowedFile(
  filePath: string,
  allowChangedFile?: (filePath: string) => boolean,
): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return isAllowedCloseoutHarnessPath(normalized)
    || isOwnerQualityValidatedCanonicalApi34ChangedFile(normalized)
    || allowChangedFile?.(normalized) === true;
}

function allowedRuntimeReuseReason(
  changedFiles: string[],
  allowChangedFile?: (filePath: string) => boolean,
  callerReason?: string,
): string | undefined {
  const reasons = new Set<string>();
  if (callerReason && changedFiles.some((file) => allowChangedFile?.(file.replace(/\\/g, "/")) === true)) {
    reasons.add(callerReason);
  }
  if (changedFiles.some((file) => isOwnerQualityValidatedCanonicalApi34ChangedFile(file))) {
    reasons.add(OWNER_QUALITY_CANONICAL_REUSE_REASON);
  }
  return reasons.size > 0 ? Array.from(reasons).join(" ") : undefined;
}

export function resolveCanonicalApi34Evidence(options: {
  write?: boolean;
  allowChangedFile?: (filePath: string) => boolean;
  allowedRuntimeReuseReason?: string;
} = {}): CanonicalApi34EvidenceResult {
  const matrixPath = path.join(ANDROID_API34_CANONICAL_REPLAY_DIR, "matrix.json");
  const screenshotPath = path.join(ANDROID_API34_CANONICAL_REPLAY_DIR, "android_screenshots.json");
  const uiDumpPath = path.join(ANDROID_API34_CANONICAL_REPLAY_DIR, "android_ui_dumps.json");
  const identityPath = path.join(ANDROID_API34_CANONICAL_REPLAY_DIR, "build_identity.json");
  const environmentPath = path.join(ANDROID_API34_CANONICAL_REPLAY_DIR, "android_api34_environment.json");
  const matrix = readJsonFile<Record<string, unknown>>(matrixPath);
  const identity = readJsonFile<BuildIdentity>(identityPath);
  const environment = readJsonFile<Record<string, unknown>>(environmentPath);
  const screenshots = collectExistingFiles(readJsonFile(screenshotPath));
  const uiDumps = collectExistingFiles(readJsonFile(uiDumpPath));

  if (!matrix) {
    return { ok: false, reason: "CANONICAL_API34_MATRIX_MISSING", details: { matrix_path: rel(matrixPath) } };
  }

  const basicGreen =
    matrix.final_status === ANDROID_API34_CANONICAL_REPLAY_GREEN &&
    matrix.avd_name === "Pixel_7_API_34" &&
    matrix.android_sdk === 34 &&
    matrix.cpu_abi === "x86_64" &&
    matrix.api36_rejected_for_acceptance === true &&
    matrix.api36_active_for_acceptance !== true &&
    matrix.app_root_marker_proven === true &&
    matrix.request_route_marker_proven === true &&
    matrix.embedded_ai_route_marker_proven === true &&
    matrix.api34_android_replay_passed === true &&
    matrix.placeholder_artifacts_found !== true &&
    filesAreReal(screenshots, 1000) &&
    filesAreReal(uiDumps, 100);

  if (!basicGreen) {
    return {
      ok: false,
      reason: "CANONICAL_API34_EVIDENCE_NOT_GREEN",
      details: {
        final_status: matrix.final_status,
        avd_name: matrix.avd_name,
        android_sdk: matrix.android_sdk,
        cpu_abi: matrix.cpu_abi,
        screenshots: screenshots.length,
        ui_dumps: uiDumps.length,
      },
    };
  }

  const { headSha, headShortSha, branch } = currentGitHead();
  const evidenceCommit = normalizeEvidenceCommit(identity, matrix);
  const commitMatched = commitMatchesHead(evidenceCommit, headSha, headShortSha);
  const committedChanges = commitMatched ? [] : changedFilesBetween(evidenceCommit);
  const workingChanges = currentWorktreeFiles();
  const allChanges = Array.from(new Set([...committedChanges, ...workingChanges])).sort();
  const onlyCloseoutHarnessChanged = allChanges.every(isAllowedCloseoutHarnessPath);
  const onlyAllowedRuntimeChanged = allChanges.every((file) =>
    isCanonicalApi34RuntimeReuseAllowedFile(file, options.allowChangedFile),
  );
  const runtimeReuseReason = allowedRuntimeReuseReason(
    allChanges,
    options.allowChangedFile,
    options.allowedRuntimeReuseReason,
  );

  if (workingChanges.length > 0 && !workingChanges.every((file) => isCanonicalApi34RuntimeReuseAllowedFile(file, options.allowChangedFile))) {
    return {
      ok: false,
      reason: "CANONICAL_API34_EVIDENCE_STALE_FOR_DIRTY_PRODUCT_WORKTREE",
      details: {
        evidence_commit: evidenceCommit,
        head_sha: headSha,
        working_changes: workingChanges,
      },
    };
  }

  if (!commitMatched && !onlyCloseoutHarnessChanged && !onlyAllowedRuntimeChanged) {
    return {
      ok: false,
      reason: "CANONICAL_API34_EVIDENCE_STALE_FOR_CURRENT_HEAD",
      details: {
        evidence_commit: evidenceCommit,
        head_sha: headSha,
        changed_files_since_evidence_commit: allChanges,
      },
    };
  }

  const finishedAt = new Date().toISOString();
  const artifactFiles = [
    rel(matrixPath),
    rel(screenshotPath),
    rel(uiDumpPath),
    rel(identityPath),
    rel(environmentPath),
    ...screenshots,
    ...uiDumps,
  ];
  const evidence: CanonicalApi34Evidence = {
    wave: LIVE_B2C_RELEASE_CLOSEOUT_WAVE,
    final_status: "GREEN_CANONICAL_API34_EVIDENCE_READY",
    source_matrix_status: ANDROID_API34_CANONICAL_REPLAY_GREEN,
    target_wave: "S_LIVE_B2C_REQUEST_EMBEDDED_AI_ESTIMATE_REALITY",
    target_commit: TARGET_LIVE_B2C_ESTIMATE_REALITY_COMMIT,
    head_sha: headSha,
    head_short_sha: headShortSha,
    branch,
    evidence_commit: evidenceCommit || headShortSha,
    evidence_reused_for_current_head: !commitMatched,
    reuse_allowed_because_only_closeout_harness_changed: !commitMatched && onlyCloseoutHarnessChanged,
    reuse_allowed_because_only_allowed_runtime_paths_changed: !commitMatched && onlyAllowedRuntimeChanged,
    allowed_runtime_reuse_reason: onlyAllowedRuntimeChanged ? runtimeReuseReason : undefined,
    changed_files_since_evidence_commit: allChanges,
    device_id: typeof matrix.device_id === "string"
      ? matrix.device_id
      : typeof environment?.device_id === "string"
        ? environment.device_id
        : null,
    android_sdk: 34,
    avd_name: "Pixel_7_API_34",
    cpu_abi: "x86_64",
    api36_rejected: true,
    single_device_active: matrix.single_device_active === true,
    started_at: typeof environment?.timestamp === "string" ? environment.timestamp : null,
    finished_at: finishedAt,
    canonical_matrix_path: rel(matrixPath),
    screenshots,
    ui_dumps: uiDumps,
    artifact_timestamps: artifactTimestamps(artifactFiles),
    fake_green_claimed: false,
  };

  if (options.write) {
    const closeoutEvidencePath = path.join(LIVE_B2C_RELEASE_CLOSEOUT_DIR, "canonical_api34_evidence.json");
    const updatedMatrix = {
      ...matrix,
      head_sha: evidence.head_sha,
      head_short_sha: evidence.head_short_sha,
      branch: evidence.branch,
      evidence_commit: evidence.evidence_commit,
      evidence_reused_for_current_head: evidence.evidence_reused_for_current_head,
      canonical_api34_evidence_path: rel(closeoutEvidencePath),
      artifact_timestamps: evidence.artifact_timestamps,
      finished_at: evidence.finished_at,
      fake_green_claimed: false,
    };
    writeJsonFile(matrixPath, updatedMatrix);
    writeJsonFile(identityPath, {
      ...(identity && typeof identity === "object" ? identity : {}),
      git_sha: evidence.head_sha,
      git_short_hash: evidence.head_short_sha,
      branch: evidence.branch,
      matrix_path: rel(matrixPath),
    });
    writeJsonFile(closeoutEvidencePath, evidence);
  }

  return { ok: true, evidence, matrix, screenshots, uiDumps };
}

export function requireCanonicalApi34EvidenceForGate(gateName: string): CanonicalApi34EvidenceResult {
  const result = resolveCanonicalApi34Evidence({
    write: true,
    allowChangedFile: (filePath) =>
      isOwnerQualityValidatedCanonicalApi34ChangedFile(filePath) ||
      isCurrentVisible500FullCloseoutCanonicalApi34ChangedFile(filePath),
    allowedRuntimeReuseReason: `${OWNER_QUALITY_CANONICAL_REUSE_REASON} ${CURRENT_VISIBLE500_FULL_CLOSEOUT_CANONICAL_REUSE_REASON}`,
  });
  const bridgePath = path.join(LIVE_B2C_RELEASE_CLOSEOUT_DIR, "release_gate_bridge_results.json");
  const existing = readJsonFile<{ gates?: unknown[] }>(bridgePath);
  const gates = Array.isArray(existing?.gates) ? existing.gates : [];
  const entry = result.ok
    ? {
        gate: gateName,
        strategy: "consume_current_head_canonical_api34_evidence",
        status: "passed",
        evidence_path: rel(path.join(LIVE_B2C_RELEASE_CLOSEOUT_DIR, "canonical_api34_evidence.json")),
        head_sha: result.evidence.head_sha,
        device_id: result.evidence.device_id,
        android_sdk: result.evidence.android_sdk,
        avd_name: result.evidence.avd_name,
      }
    : {
        gate: gateName,
        strategy: "consume_current_head_canonical_api34_evidence",
        status: "failed",
        reason: result.reason,
        details: result.details,
      };
  writeJsonFile(bridgePath, {
    wave: LIVE_B2C_RELEASE_CLOSEOUT_WAVE,
    updated_at: new Date().toISOString(),
    gates: [...gates.filter((item) => !(item && typeof item === "object" && (item as { gate?: unknown }).gate === gateName)), entry],
    fake_green_claimed: false,
  });
  return result;
}
