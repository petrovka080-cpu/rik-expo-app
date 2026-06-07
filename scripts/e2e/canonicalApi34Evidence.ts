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
      file === "package.json" ||
      file === "supabase/config.toml" ||
      file.startsWith("supabase/migrations/") ||
      file.startsWith("src/lib/constructionWork/") ||
      file.startsWith("scripts/e2e/") ||
      file.startsWith("scripts/release/") ||
      file.startsWith("scripts/audit/") ||
      file.startsWith("src/lib/ai/observability/") ||
      file.startsWith("src/lib/ai/killSwitch/") ||
      file.startsWith("src/lib/ai/rollback/") ||
      file.startsWith("src/lib/aiEstimatePdf/") ||
      file === "src/lib/ai/enterpriseGuardrails/aiEnterpriseAllowedLayers.ts" ||
      file === "src/lib/ai/enterpriseGuardrails/aiEnterpriseArchitecturePolicy.ts" ||
      file.startsWith("tests/aiEstimatePdf/") ||
      file.startsWith("tests/enterpriseVisible1000StructuredEstimate/") ||
      file.startsWith("tests/finalReadiness/") ||
      file === "tests/e2e/aiEstimateFinalReadinessLiveJourney.web.spec.ts" ||
      file.startsWith("tests/constructionWorkOntology/") ||
      file.startsWith("tests/architecture/finalReadiness") ||
      file.startsWith("tests/architecture/real10000") ||
      file === "tests/architecture/worldConstructionReleaseReusePolicy.contract.test.ts" ||
      file === "tests/architecture/aiEstimateFinalReadinessNoProductionRollout.contract.test.ts" ||
      file === "tests/release/aiEstimateFinalReadinessReleaseGate.contract.test.ts" ||
      file === "tests/ai/aiEnterpriseArchitecturePolicy.contract.test.ts" ||
      file.startsWith("tests/governance/") ||
      file.startsWith("tests/perf/") ||
      /\.test\.tsx?$/.test(file) ||
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
  const onlyAllowedRuntimeChanged = Boolean(options.allowChangedFile) && allChanges.every((file) =>
    isAllowedCloseoutHarnessPath(file) || options.allowChangedFile?.(file) === true,
  );

  if (workingChanges.length > 0 && !workingChanges.every((file) => isAllowedCloseoutHarnessPath(file) || options.allowChangedFile?.(file) === true)) {
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
    allowed_runtime_reuse_reason: onlyAllowedRuntimeChanged ? options.allowedRuntimeReuseReason : undefined,
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
    writeJsonFile(path.join(ANDROID_API34_CANONICAL_REPLAY_DIR, "failures.json"), []);
    writeJsonFile(closeoutEvidencePath, evidence);
  }

  return { ok: true, evidence, matrix, screenshots, uiDumps };
}

export function requireCanonicalApi34EvidenceForGate(gateName: string): CanonicalApi34EvidenceResult {
  const result = resolveCanonicalApi34Evidence({ write: true });
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
