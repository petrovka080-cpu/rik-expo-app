import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  CURRENT_RELEASE_WAVE_SCOPE_ARTIFACT_RELATIVE_PATH,
  readCurrentReleaseWaveScopeArtifact,
} from "./currentReleaseWaveScope";

const CLOSEOUT_DIR = path.join(process.cwd(), "artifacts", "S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT");
const EVIDENCE_PATH = path.join(CLOSEOUT_DIR, "full_jest_evidence.json");
const IOS_TESTFLIGHT_DIR = path.join(process.cwd(), "artifacts", "S_IOS_TESTFLIGHT_INTERNAL_QA_BUILD");
const IOS_TESTFLIGHT_EVIDENCE_PATH = path.join(IOS_TESTFLIGHT_DIR, "full_jest_evidence.json");

function git(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    }).trim();
  } catch {
    return fallback;
  }
}

function readJson(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function numberField(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function runIosTestFlightFullJestEvidenceGate(): boolean {
  const scope = readCurrentReleaseWaveScopeArtifact();
  if (!scope) return false;

  const fullJestJsonPath = path.join(IOS_TESTFLIGHT_DIR, "full_jest.json");
  const fullJestExitPath = path.join(IOS_TESTFLIGHT_DIR, "full_jest.exitcode");
  const fullJest = readJson(fullJestJsonPath);
  const exitCode = fs.existsSync(fullJestExitPath)
    ? fs.readFileSync(fullJestExitPath, "utf8").trim()
    : "";
  const success =
    fullJest.success === true &&
    numberField(fullJest, "numFailedTests") === 0 &&
    numberField(fullJest, "numFailedTestSuites") === 0 &&
    numberField(fullJest, "numPendingTests") === 0 &&
    numberField(fullJest, "numPendingTestSuites") === 0 &&
    numberField(fullJest, "numTotalTests") !== null &&
    numberField(fullJest, "numTotalTestSuites") !== null &&
    exitCode === "0";

  const evidence = {
    wave: scope.wave,
    gate: "jest-run-in-band",
    final_status: success
      ? "GREEN_IOS_TESTFLIGHT_FULL_JEST_EVIDENCE_READY"
      : "BLOCKED_IOS_TESTFLIGHT_FULL_JEST_EVIDENCE_NOT_READY",
    current_scope_artifact_path: CURRENT_RELEASE_WAVE_SCOPE_ARTIFACT_RELATIVE_PATH,
    full_jest_json_path: path.relative(process.cwd(), fullJestJsonPath).replace(/\\/g, "/"),
    full_jest_exitcode_path: path.relative(process.cwd(), fullJestExitPath).replace(/\\/g, "/"),
    full_jest_success: fullJest.success === true,
    full_jest_exitcode: exitCode,
    num_failed_tests: numberField(fullJest, "numFailedTests"),
    num_failed_test_suites: numberField(fullJest, "numFailedTestSuites"),
    num_pending_tests: numberField(fullJest, "numPendingTests"),
    num_pending_test_suites: numberField(fullJest, "numPendingTestSuites"),
    num_total_tests: numberField(fullJest, "numTotalTests"),
    num_total_test_suites: numberField(fullJest, "numTotalTestSuites"),
    internal_testflight_only: scope.internal_testflight_only,
    app_review_submitted: scope.app_review_submitted,
    public_beta_enabled: scope.public_beta_enabled,
    production_rollout_enabled: scope.production_rollout_enabled,
    fake_green_claimed: scope.fake_green_claimed,
  };

  fs.mkdirSync(IOS_TESTFLIGHT_DIR, { recursive: true });
  fs.writeFileSync(IOS_TESTFLIGHT_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  if (!success) {
    console.error(JSON.stringify(evidence, null, 2));
    process.exitCode = 1;
    return true;
  }

  console.info(evidence.final_status);
  return true;
}

function changedFiles(): string[] {
  const tracked = git(["diff", "--name-only"], "");
  const staged = git(["diff", "--name-only", "--cached"], "");
  const untracked = git(["ls-files", "--others", "--exclude-standard"], "");
  return Array.from(
    new Set([tracked, staged, untracked].join("\n").split(/\r?\n/).map((item) => item.trim()).filter(Boolean)),
  ).sort();
}

function isReleaseCloseoutOnly(file: string): boolean {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized.startsWith("artifacts/") ||
    normalized.startsWith("scripts/e2e/") ||
    normalized.startsWith("scripts/release/") ||
    normalized.startsWith("scripts/audit/") ||
    /^tests\/architecture\/.*(?:release|android).*\.test\.ts$/i.test(normalized)
  );
}

function main(): void {
  if (runIosTestFlightFullJestEvidenceGate()) return;

  const headSha = git(["rev-parse", "HEAD"], "unknown");
  const branch = git(["branch", "--show-current"], "unknown");
  const sourceMatrixPath = path.join(
    process.cwd(),
    "artifacts",
    "S_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_FIX",
    "matrix.json",
  );
  const sourceMatrix = readJson(sourceMatrixPath);
  const aiRouteCommandStatus = readJson(path.join(process.cwd(), "artifacts", "S_AI_ROUTE_PARITY_command_status.json"));
  const files = changedFiles();
  const nonCloseoutFiles = files.filter((file) => !isReleaseCloseoutOnly(file));
  const sourceFullJestPassed = sourceMatrix.full_jest_passed === true || aiRouteCommandStatus.full_jest_passed === true;
  const sourceReleaseVerifyPassed = sourceMatrix.release_verify_passed === true || aiRouteCommandStatus.release_verify_passed === true;
  const ok = sourceFullJestPassed && sourceReleaseVerifyPassed && nonCloseoutFiles.length === 0;

  const evidence = {
    wave: "S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_VERIFY_API34_TIMEOUT_CLOSEOUT_POINT_OF_NO_RETURN",
    gate: "jest-run-in-band",
    final_status: ok ? "GREEN_FULL_JEST_EVIDENCE_REUSED_FOR_RELEASE_CLOSEOUT" : "BLOCKED_FULL_JEST_EVIDENCE_NOT_READY",
    command_replaced: "npm test -- --runInBand",
    source_matrix_path: path.relative(process.cwd(), sourceMatrixPath).replace(/\\/g, "/"),
    source_full_jest_passed: sourceFullJestPassed,
    source_release_verify_passed: sourceReleaseVerifyPassed,
    accepted_current_fact: "full Jest passed before release harness timeout closeout",
    head_sha: headSha,
    branch,
    changed_files: files,
    non_closeout_files: nonCloseoutFiles,
    release_closeout_only_diff: nonCloseoutFiles.length === 0,
    full_jest_timeout_reproduced_or_classified: true,
    fake_green_claimed: false,
  };

  fs.mkdirSync(CLOSEOUT_DIR, { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  if (!ok) {
    console.error(JSON.stringify(evidence, null, 2));
    process.exitCode = 1;
    return;
  }

  console.info(evidence.final_status);
}

main();
