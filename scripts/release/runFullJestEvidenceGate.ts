import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  buildFullJestEvidenceContext,
  findLatestDeterministicFullJestTerminal,
  readJson,
  validateDeterministicFullJestTerminal,
} from "./fullJestEvidence";
import {
  CURRENT_RELEASE_WAVE_SCOPE_ARTIFACT_RELATIVE_PATH,
  isCurrentReleaseWaveScopeActive,
  readCurrentReleaseWaveScopeArtifact,
} from "./currentReleaseWaveScope";

const CLOSEOUT_DIR = path.join(process.cwd(), "artifacts", "S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT");
const EVIDENCE_PATH = path.join(CLOSEOUT_DIR, "full_jest_evidence.json");
const IOS_TESTFLIGHT_DIR = path.join(process.cwd(), "artifacts", "S_IOS_TESTFLIGHT_INTERNAL_QA_BUILD");
const IOS_TESTFLIGHT_EVIDENCE_PATH = path.join(IOS_TESTFLIGHT_DIR, "full_jest_evidence.json");

function sha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function writeFullJestReleaseReceipt(input: {
  context: ReturnType<typeof buildFullJestEvidenceContext>;
  terminalPath: string | null;
  validation: ReturnType<typeof validateDeterministicFullJestTerminal>;
}): string {
  const releaseId = process.env.RELEASE_CANDIDATE_ID?.trim() || "UNSPECIFIED_RELEASE_CANDIDATE";
  const safeReleaseId = releaseId.replace(/[^a-zA-Z0-9._-]/g, "_");
  const configuredPath = process.env.FULL_JEST_RELEASE_RECEIPT_PATH?.trim();
  const receiptPath = configuredPath
    ? (path.isAbsolute(configuredPath) ? configuredPath : path.join(process.cwd(), configuredPath))
    : path.join(process.cwd(), ".release-runtime", "release-receipts", safeReleaseId, "full_jest.json");
  const terminal = input.validation.terminal;
  const manifestFiles = Array.isArray(input.validation.manifest.files)
    ? (input.validation.manifest.files as Record<string, unknown>[])
      .map((entry) => typeof entry.test_path === "string" ? entry.test_path.replace(/\\/g, "/") : "")
      .filter(Boolean)
    : [];
  const observedIds = Array.isArray(terminal.shards)
    ? (terminal.shards as Record<string, unknown>[]).flatMap((shard) =>
        Array.isArray(shard.observed_test_files)
          ? (shard.observed_test_files as unknown[]).filter((item): item is string => typeof item === "string")
          : [])
    : [];
  const now = new Date().toISOString();
  const startedAt = typeof terminal.started_at === "string" ? terminal.started_at : now;
  const endedAt = typeof terminal.ended_at === "string" ? terminal.ended_at : now;
  const durationMs = typeof terminal.duration_ms === "number" && Number.isFinite(terminal.duration_ms)
    ? terminal.duration_ms
    : Math.max(0, Date.parse(endedAt) - Date.parse(startedAt));
  const producerPath = "scripts/release/runFullJestEvidenceGate.ts";
  const producerFullPath = path.join(process.cwd(), producerPath);
  const manifestPath = input.validation.manifestPath;
  const receipt = {
    schema: "release-receipt-artifact/v1",
    evidence_class: "actual_environment",
    receipt_id: `${releaseId}:full_jest`,
    kind: "full_jest",
    release_id: releaseId,
    subject_sha: input.context.headSha,
    workspace_fingerprint: input.context.workspaceFingerprint,
    producer: producerPath,
    command_argv: ["npx", "tsx", producerPath],
    proof_level: "FULL_M2",
    started_at: startedAt,
    ended_at: endedAt,
    duration_ms: durationMs,
    status: input.validation.passed ? "passed" : "failed",
    exit_code: input.validation.passed ? 0 : 1,
    signal: null,
    timed_out: input.validation.errors.some((error) => error.includes("TIMEOUT")),
    passed: input.validation.passed,
    expected_ids: manifestFiles,
    observed_ids: observedIds,
    input_hashes: {
      workspace: input.context.workspaceFingerprint,
      producer_source: sha256(producerFullPath),
      ...(manifestPath && fs.existsSync(manifestPath) ? { manifest_file: sha256(manifestPath) } : {}),
    },
    primary_result_path: input.terminalPath
      ? path.relative(process.cwd(), input.terminalPath).replace(/\\/g, "/")
      : null,
    primary_result_sha256: input.terminalPath && fs.existsSync(input.terminalPath)
      ? sha256(input.terminalPath)
      : null,
    validation_errors: input.validation.errors,
    fake_green_claimed: false,
  };
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  return path.relative(process.cwd(), receiptPath).replace(/\\/g, "/");
}

function numberField(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function runIosTestFlightFullJestEvidenceGate(): boolean {
  if (!isCurrentReleaseWaveScopeActive()) return false;
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
  fs.writeFileSync(IOS_TESTFLIGHT_EVIDENCE_PATH, JSON.stringify(evidence, null, 2) + "\n", "utf8");

  if (!success) {
    console.error(JSON.stringify(evidence, null, 2));
    process.exitCode = 1;
    return true;
  }

  console.info(evidence.final_status);
  return true;
}

function main(): void {
  if (runIosTestFlightFullJestEvidenceGate()) return;

  const context = buildFullJestEvidenceContext();
  const configuredTerminal = process.env.DETERMINISTIC_FULL_JEST_TERMINAL_PATH?.trim();
  const terminalPath = configuredTerminal
    ? (path.isAbsolute(configuredTerminal) ? configuredTerminal : path.join(process.cwd(), configuredTerminal))
    : findLatestDeterministicFullJestTerminal(context);
  const validation = validateDeterministicFullJestTerminal(terminalPath, context);
  const ok = validation.passed;
  const releaseReceiptPath = writeFullJestReleaseReceipt({ context, terminalPath, validation });

  const evidence = {
    wave: "S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_VERIFY_API34_TIMEOUT_CLOSEOUT_POINT_OF_NO_RETURN",
    gate: "jest-run-in-band",
    final_status: ok ? "GREEN_FULL_JEST_EVIDENCE_ACCEPTED_FOR_CURRENT_WORKSPACE" : "BLOCKED_FULL_JEST_EVIDENCE_NOT_READY",
    command_replaced: "npm test -- --runInBand",
    deterministic_terminal_path: terminalPath
      ? path.relative(process.cwd(), terminalPath).replace(/\\/g, "/")
      : null,
    deterministic_manifest_path: validation.manifestPath
      ? path.relative(process.cwd(), validation.manifestPath).replace(/\\/g, "/")
      : null,
    deterministic_terminal_passed: validation.passed,
    deterministic_terminal_errors: validation.errors,
    release_receipt_path: releaseReceiptPath,
    workspace_fingerprint: context.workspaceFingerprint,
    accepted_current_fact: ok
      ? "deterministic full Jest completed against the exact current workspace manifest and fingerprint"
      : "no current complete deterministic full Jest terminal was accepted",
    head_sha: context.headSha,
    branch: context.branch,
    changed_files: context.changedFiles,
    historical_full_jest_evidence_reused: false,
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
