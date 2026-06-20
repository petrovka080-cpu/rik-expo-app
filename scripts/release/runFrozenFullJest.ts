import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { releasePipelineRuntimeDir } from "./computeReleaseFingerprints";
import { assertSourceFrozen } from "./assertSourceFrozen";
import { loadReleaseCandidate } from "./releaseCandidateState";

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
  assertSourceFrozen();
  assertNoWorktreeChanges();
  assertNoDuplicateJest();

  const candidate = loadReleaseCandidate();
  const outDir = releasePipelineRuntimeDir(candidate.candidateHash, "full-jest");
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "result.json");
  const summaryPath = path.join(outDir, "summary.json");
  const exitCodePath = path.join(outDir, "exit_code.txt");
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
    final_status: passed ? "FULL_JEST_RUNTIME_PASS" : "FULL_JEST_RUNTIME_FAIL",
    candidate_id: candidate.candidate_id,
    source_commit: candidate.source_commit,
    source_tree_hash: candidate.sourceTreeHash,
    product_source_hash: candidate.productSourceHash,
    native_build_fingerprint: candidate.nativeBuildFingerprint,
    native_build_hash: candidate.nativeBuildHash,
    js_bundle_fingerprint: candidate.jsBundleFingerprint,
    proof_harness_fingerprint: candidate.proofHarnessFingerprint,
    proof_harness_hash: candidate.proofHarnessHash,
    candidate_hash: candidate.candidateHash,
    stdout_log: stdoutPath,
    stderr_log: stderrPath,
    duration_ms: Date.now() - startedAt,
    full_jest_output_outside_repo_before_pass: true,
    fake_green_claimed: false,
  };
  fs.writeFileSync(jsonPath, `${JSON.stringify(wrappedEvidence, null, 2)}\n`, "utf8");
  fs.writeFileSync(exitCodePath, `${String(result.status ?? 1)}\n`, "utf8");
  fs.writeFileSync(
    summaryPath,
    `${JSON.stringify({
      status: passed ? "FULL_JEST_RUNTIME_PASS" : "FULL_JEST_RUNTIME_FAIL",
      passed,
      exit_code: result.status ?? 1,
      numFailedTestSuites: wrappedEvidence.numFailedTestSuites ?? null,
      numFailedTests: wrappedEvidence.numFailedTests ?? null,
      candidate_hash: candidate.candidateHash,
      fake_green_claimed: false,
    }, null, 2)}\n`,
    "utf8",
  );

  console.log(JSON.stringify({
    passed,
    result_json: jsonPath,
    summary_json: summaryPath,
    exit_code_txt: exitCodePath,
    stdout_log: stdoutPath,
    stderr_log: stderrPath,
    fake_green_claimed: false,
  }, null, 2));

  if (!passed) process.exit(1);
}

main();
