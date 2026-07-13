import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { releasePipelineRuntimeDir } from "./computeReleaseFingerprints";
import { assertSourceFrozen } from "./assertSourceFrozen";
import { loadReleaseCandidate } from "./releaseCandidateState";
import { acquireRuntimeLock, releaseRuntimeLock } from "./runtimeLock";

type ProcessListRow = {
  ProcessId?: number;
  CommandLine?: string | null;
};

function processList(): string {
  const command = process.platform === "win32" ? "powershell" : "ps";
  const args = process.platform === "win32"
    ? ["-NoProfile", "-Command", "Get-CimInstance Win32_Process | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress"]
    : ["-eo", "pid,args"];
  const result = spawnSync(command, args, { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return result.stdout || "";
}

function processCommandLines(text: string): string[] {
  if (process.platform !== "win32") return text.split(/\r?\n/);
  try {
    const parsed = JSON.parse(text) as ProcessListRow | ProcessListRow[] | null;
    const rows = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    return rows.map((row) => row.CommandLine ?? "").filter(Boolean);
  } catch {
    return text.split(/\r?\n/);
  }
}

export function isJestRunnerProcess(commandLine: string): boolean {
  const normalized = commandLine.replace(/\\/g, "/").toLowerCase();
  if (!normalized.trim()) return false;
  if (normalized.includes("runfrozenfulljest.ts")) return false;
  if (normalized.includes("release:full-jest:frozen")) return false;
  if (normalized.includes("get-ciminstance") || normalized.includes("convertto-json")) return false;

  return (
    /node_modules\/(?:jest\/bin\/jest\.js|\.bin\/jest(?:\.cmd)?)(?:[\s"]|$)/.test(normalized) ||
    (/(?:^|[\s"'])jest(?:\.js)?(?:["'\s]|$)/.test(normalized) && normalized.includes("--runinband"))
  );
}

function assertNoDuplicateJest(): void {
  const matches = processCommandLines(processList()).filter(isJestRunnerProcess);
  if (matches.length > 0) {
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

function assertNoExistingFullJestResult(outDir: string): void {
  const terminalFiles = ["result.json", "summary.json", "exit_code.txt"];
  const existing = terminalFiles.filter((file) => fs.existsSync(path.join(outDir, file)));
  if (existing.length > 0) {
    throw new Error("BLOCKED_FULL_JEST_RESULT_ALREADY_EXISTS");
  }
}

function main(): void {
  assertSourceFrozen();
  assertNoWorktreeChanges();
  assertNoDuplicateJest();

  const candidate = loadReleaseCandidate();
  const outDir = releasePipelineRuntimeDir(candidate.candidateHash, "full-jest");
  assertNoExistingFullJestResult(outDir);

  const lock = acquireRuntimeLock("full-jest", {
    pid: process.pid,
    candidate_id: candidate.candidate_id,
    source_tree_hash: candidate.sourceTreeHash,
    started_at: new Date().toISOString(),
  });
  if (lock.pid !== process.pid) {
    throw new Error("BLOCKED_DUPLICATE_FULL_JEST_PROCESS");
  }

  let result: ReturnType<typeof spawnSync> | null = null;
  let jsonPath = "";
  let summaryPath = "";
  let exitCodePath = "";
  let stdoutPath = "";
  let stderrPath = "";
  const startedAt = Date.now();
  try {
    assertNoExistingFullJestResult(outDir);
    fs.mkdirSync(outDir, { recursive: true });
    jsonPath = path.join(outDir, "result.json");
    summaryPath = path.join(outDir, "summary.json");
    exitCodePath = path.join(outDir, "exit_code.txt");
    stdoutPath = path.join(outDir, "stdout.log");
    stderrPath = path.join(outDir, "stderr.log");
    const stdoutFd = fs.openSync(stdoutPath, "w");
    const stderrFd = fs.openSync(stderrPath, "w");
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
  } finally {
    releaseRuntimeLock("full-jest");
  }

  if (!result) {
    throw new Error("BLOCKED_FULL_JEST_PROCESS_NOT_STARTED");
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
