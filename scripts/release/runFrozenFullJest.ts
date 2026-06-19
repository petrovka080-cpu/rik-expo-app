import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { assertSourceFrozen } from "./assertSourceFrozen";
import { assertReleaseCandidateState, loadReleaseCandidate, writeReleaseCandidate } from "./releaseCandidateState";

function processList(): string {
  const command = process.platform === "win32" ? "powershell" : "ps";
  const args = process.platform === "win32"
    ? ["-NoProfile", "-Command", "Get-CimInstance Win32_Process | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress"]
    : ["-eo", "pid,args"];
  const result = spawnSync(command, args, { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return result.stdout || "";
}

function assertNoDuplicateJest(): void {
  const text = processList();
  const matches = (text.match(/jest(\.js)?\b/g) ?? []).length;
  if (matches > 1) {
    throw new Error("BLOCKED_DUPLICATE_FULL_JEST_PROCESS");
  }
}

function assertNoWorktreeChanges(): void {
  const result = spawnSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) throw new Error(result.stderr.trim() || "git status failed");
  if (result.stdout.trim()) throw new Error("BLOCKED_FULL_JEST_REQUIRES_CLEAN_WORKTREE");
}

function main(): void {
  assertReleaseCandidateState("FOCUSED_GREEN");
  assertSourceFrozen();
  assertNoWorktreeChanges();
  assertNoDuplicateJest();

  const candidate = loadReleaseCandidate();
  const outDir = path.join(os.tmpdir(), "rik-release", candidate.sourceTreeHash);
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "full_jest.json");
  const stdoutPath = path.join(outDir, "stdout.log");
  const stderrPath = path.join(outDir, "stderr.log");
  const stdoutFd = fs.openSync(stdoutPath, "w");
  const stderrFd = fs.openSync(stderrPath, "w");
  const startedAt = Date.now();
  let result: ReturnType<typeof spawnSync>;
  try {
    result = spawnSync(
      "npm",
      ["test", "--", "--runInBand", "--forceExit", "--json", "--outputFile", jsonPath],
      {
        cwd: process.cwd(),
        stdio: ["ignore", stdoutFd, stderrFd],
        shell: process.platform === "win32",
        env: { ...process.env, CI: "1" },
      },
    );
  } finally {
    fs.closeSync(stdoutFd);
    fs.closeSync(stderrFd);
  }

  const passed = result.status === 0 && fs.existsSync(jsonPath);
  const evidence = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, "utf8")) : {};
  const wrappedEvidence = {
    ...evidence,
    passed,
    final_status: passed ? "GREEN_FULL_JEST_FROZEN_PASSED" : "BLOCKED_FULL_JEST_FROZEN_FAILED",
    candidate_id: candidate.candidate_id,
    source_commit: candidate.source_commit,
    source_tree_hash: candidate.sourceTreeHash,
    native_build_fingerprint: candidate.nativeBuildFingerprint,
    js_bundle_fingerprint: candidate.jsBundleFingerprint,
    proof_harness_fingerprint: candidate.proofHarnessFingerprint,
    stdout_log: stdoutPath,
    stderr_log: stderrPath,
    duration_ms: Date.now() - startedAt,
    full_jest_output_outside_repo_before_pass: true,
    fake_green_claimed: false,
  };
  fs.writeFileSync(jsonPath, `${JSON.stringify(wrappedEvidence, null, 2)}\n`, "utf8");

  writeReleaseCandidate({
    ...candidate,
    full_jest_runs_for_candidate: candidate.full_jest_runs_for_candidate + 1,
    updated_at: new Date().toISOString(),
  });

  console.log(JSON.stringify({
    passed,
    temp_json: jsonPath,
    stdout_log: stdoutPath,
    stderr_log: stderrPath,
    fake_green_claimed: false,
  }, null, 2));

  if (!passed) process.exit(1);
}

main();
