import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  FULL_JEST_CURRENT_EVIDENCE_DIR,
  FULL_JEST_CURRENT_EVIDENCE_PATH,
  buildFullJestEvidenceContext,
} from "./fullJestEvidence";

const WAVE = "S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT_CLOSEOUT_POINT_OF_NO_RETURN";
const COMMAND = "npm test -- --runInBand";

function parseTimeoutMs(): number {
  const parsed = Number(process.env.FULL_JEST_TIMEOUT_MS);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 7_200_000;
}

function relativeArtifactPath(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function main(): void {
  fs.mkdirSync(FULL_JEST_CURRENT_EVIDENCE_DIR, { recursive: true });

  const stdoutLog = path.join(FULL_JEST_CURRENT_EVIDENCE_DIR, "full_jest_current.stdout.log");
  const stderrLog = path.join(FULL_JEST_CURRENT_EVIDENCE_DIR, "full_jest_current.stderr.log");
  const contextBefore = buildFullJestEvidenceContext();
  const timeoutMs = parseTimeoutMs();
  const startedAt = Date.now();
  const outFd = fs.openSync(stdoutLog, "w");
  const errFd = fs.openSync(stderrLog, "w");

  let result!: ReturnType<typeof spawnSync>;
  try {
    result = spawnSync("npm", ["test", "--", "--runInBand"], {
      cwd: process.cwd(),
      stdio: ["ignore", outFd, errFd],
      shell: process.platform === "win32",
      timeout: timeoutMs,
    });
  } finally {
    fs.closeSync(outFd);
    fs.closeSync(errFd);
  }

  const durationMs = Date.now() - startedAt;
  const contextAfter = buildFullJestEvidenceContext();
  const workspaceUnchangedDuringRun = contextAfter.workspaceFingerprint === contextBefore.workspaceFingerprint
    && JSON.stringify(contextAfter.changedFiles) === JSON.stringify(contextBefore.changedFiles)
    && contextAfter.headSha === contextBefore.headSha
    && contextAfter.branch === contextBefore.branch;
  const errorCode = result.error && "code" in result.error ? String(result.error.code) : null;
  const timedOut = errorCode === "ETIMEDOUT" || result.signal === "SIGTERM";
  const passed = result.status === 0 && result.signal == null && workspaceUnchangedDuringRun;

  const evidence = {
    wave: WAVE,
    gate: "jest-run-in-band",
    command: COMMAND,
    passed,
    final_status: passed
      ? "GREEN_FULL_JEST_CURRENT_WORKSPACE_PASSED"
      : timedOut
        ? "BLOCKED_FULL_JEST_CURRENT_WORKSPACE_TIMEOUT"
        : "BLOCKED_FULL_JEST_CURRENT_WORKSPACE_FAILED",
    head_sha: contextAfter.headSha,
    branch: contextAfter.branch,
    changed_files: contextAfter.changedFiles,
    workspace_fingerprint: contextAfter.workspaceFingerprint,
    workspace_fingerprint_before: contextBefore.workspaceFingerprint,
    workspace_fingerprint_after: contextAfter.workspaceFingerprint,
    workspace_unchanged_during_run: workspaceUnchangedDuringRun,
    exit_code: result.status,
    signal: result.signal,
    error_code: errorCode,
    timed_out: timedOut,
    timeout_ms: timeoutMs,
    duration_ms: durationMs,
    stdout_log: relativeArtifactPath(stdoutLog),
    stderr_log: relativeArtifactPath(stderrLog),
    fake_green_claimed: false,
  };

  fs.writeFileSync(FULL_JEST_CURRENT_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({
    final_status: evidence.final_status,
    passed,
    exit_code: result.status,
    signal: result.signal,
    timed_out: timedOut,
    duration_ms: durationMs,
    evidence_path: relativeArtifactPath(FULL_JEST_CURRENT_EVIDENCE_PATH),
  }, null, 2));

  if (!passed) {
    process.exitCode = 1;
  }
}

main();
