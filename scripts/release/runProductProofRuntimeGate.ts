import fs from "node:fs";
import path from "node:path";

import { assertSourceFrozen } from "./assertSourceFrozen";
import { computeReleaseFingerprints } from "./computeReleaseFingerprints";
import {
  getProductProofRuntimeGate,
  PRODUCT_PROOF_RUNTIME_GATE_BLOCKED_STATUS,
  PRODUCT_PROOF_RUNTIME_GATE_GREEN_STATUS,
  productProofRuntimeGateDir,
  productProofRuntimeReportPath,
  type ProductProofRuntimeGateDefinition,
} from "./productProofRuntimeGate.shared";
import { loadReleaseCandidate, type ReleaseCandidate } from "./releaseCandidateState";
import {
  currentHead,
  diffReleaseVerifyStrictSnapshots,
  hasSameJson,
  readJsonObject,
  releaseVerifyStrictSnapshot,
  trackedFileHashes,
  untrackedFilesSnapshot,
  writeJsonFile,
} from "./releasePipelineRuntime";

type ProductProofRuntimeMode = "generate-runtime" | "verify-runtime";

const GENERATE_RUNTIME = "GENERATE_RUNTIME";
const VERIFY_RUNTIME = "VERIFY_RUNTIME";

function argvValue(name: string, argv: readonly string[]): string | null {
  const inline = argv.find((value) => value.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = argv.indexOf(name);
  const value = index >= 0 ? argv[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : null;
}

function parseMode(argv: readonly string[]): ProductProofRuntimeMode {
  const mode = argvValue("--mode", argv) ?? "verify-runtime";
  if (mode !== "generate-runtime" && mode !== "verify-runtime") {
    throw new Error("--mode must be generate-runtime or verify-runtime");
  }
  return mode;
}

function normalizePath(value: string): string {
  return path.resolve(value).replace(/\\/g, "/");
}

function assertInsideRuntime(candidate: ReleaseCandidate, target: string): void {
  const runtimeRoot = normalizePath(productProofRuntimeGateDir(candidate, getProductProofRuntimeGate("ai-estimate-pdf-safe-integration-proof").gateName));
  const candidateRoot = normalizePath(path.dirname(path.dirname(runtimeRoot)));
  const normalizedTarget = normalizePath(target);
  if (normalizedTarget !== candidateRoot && !normalizedTarget.startsWith(`${candidateRoot}/`)) {
    throw new Error(`PRODUCT_PROOF_OUTPUT_OUTSIDE_CANDIDATE_RUNTIME:${target}`);
  }
}

function assertCandidateArg(candidate: ReleaseCandidate, argv: readonly string[]): void {
  const expected = argvValue("--candidate", argv);
  if (expected && expected !== candidate.candidateHash) {
    throw new Error(`PRODUCT_PROOF_CANDIDATE_ARG_MISMATCH:${expected}:expected:${candidate.candidateHash}`);
  }
}

function currentCandidateFailures(candidate: ReleaseCandidate): string[] {
  const fingerprints = computeReleaseFingerprints();
  return [
    ...(candidate.source_commit === currentHead() ? [] : ["PRODUCT_PROOF_SOURCE_HEAD_NOT_CURRENT_HEAD"]),
    ...(candidate.productSourceHash === fingerprints.productSourceHash ? [] : ["PRODUCT_PROOF_PRODUCT_SOURCE_HASH_MISMATCH"]),
    ...(candidate.proofHarnessHash === fingerprints.proofHarnessHash ? [] : ["PRODUCT_PROOF_PROOF_HARNESS_HASH_MISMATCH"]),
    ...(candidate.nativeBuildHash === fingerprints.nativeBuildHash ? [] : ["PRODUCT_PROOF_NATIVE_BUILD_HASH_MISMATCH"]),
    ...(candidate.candidateHash === fingerprints.candidateHash ? [] : ["PRODUCT_PROOF_CANDIDATE_HASH_MISMATCH"]),
  ];
}

function trackedOutputPresence(outputs: readonly string[]): Record<string, boolean> {
  const presence: Record<string, boolean> = {};
  for (const output of outputs) {
    presence[output] = fs.existsSync(path.join(process.cwd(), output));
  }
  return presence;
}

function buildRuntimeReport(params: {
  gate: ProductProofRuntimeGateDefinition;
  candidate: ReleaseCandidate;
  matrix: Record<string, unknown> | null;
  failures: string[];
}): Record<string, unknown> {
  const fingerprints = computeReleaseFingerprints();
  const functionalStatus = typeof params.matrix?.final_status === "string" ? params.matrix.final_status : null;
  return {
    final_status: params.failures.length === 0 ? PRODUCT_PROOF_RUNTIME_GATE_GREEN_STATUS : PRODUCT_PROOF_RUNTIME_GATE_BLOCKED_STATUS,
    status: params.failures.length === 0 ? PRODUCT_PROOF_RUNTIME_GATE_GREEN_STATUS : PRODUCT_PROOF_RUNTIME_GATE_BLOCKED_STATUS,
    mode: GENERATE_RUNTIME,
    gate: params.gate.gateName,
    candidateHash: params.candidate.candidateHash,
    candidate_hash: params.candidate.candidateHash,
    sourceHead: params.candidate.source_commit,
    source_commit: params.candidate.source_commit,
    fingerprints: {
      productSourceHash: params.candidate.productSourceHash,
      proofHarnessHash: params.candidate.proofHarnessHash,
      nativeBuildHash: params.candidate.nativeBuildHash,
      apkBuildKey: params.candidate.apkBuildKey,
    },
    current_fingerprints: fingerprints,
    expected_functional_status: params.gate.expectedStatus,
    functional_status: functionalStatus,
    functional_status_green: functionalStatus === params.gate.expectedStatus,
    legacy_runner: params.gate.legacyRunner,
    legacy_command_for_manual_refresh_only: params.gate.legacyCommand,
    tracked_matrix_path: params.gate.trackedMatrixPath,
    tracked_outputs: params.gate.trackedOutputs,
    tracked_output_presence: trackedOutputPresence(params.gate.trackedOutputs),
    tracked_artifacts_written: false,
    tracked_artifacts_read_for_migration: true,
    runtime_output_supported: true,
    writes_only_runtime: true,
    release_verify_may_generate: false,
    failures: params.failures,
    fake_green_claimed: false,
  };
}

export function generateProductProofRuntimeEvidence(gate: ProductProofRuntimeGateDefinition, candidate: ReleaseCandidate): Record<string, unknown> {
  const hashesBefore = trackedFileHashes();
  const untrackedBefore = untrackedFilesSnapshot();
  const matrixPath = path.join(process.cwd(), gate.trackedMatrixPath);
  const matrix = fs.existsSync(matrixPath) ? readJsonObject(matrixPath) : null;
  const failures = [
    ...currentCandidateFailures(candidate),
    ...(matrix ? [] : [`PRODUCT_PROOF_TRACKED_MATRIX_MISSING:${gate.trackedMatrixPath}`]),
    ...(matrix?.final_status === gate.expectedStatus ? [] : [`PRODUCT_PROOF_FUNCTIONAL_STATUS_NOT_GREEN:${String(matrix?.final_status ?? "missing")}`]),
    ...(matrix?.fake_green_claimed === false ? [] : ["PRODUCT_PROOF_MATRIX_FAKE_GREEN"]),
  ];
  const reportPath = productProofRuntimeReportPath(candidate, gate.gateName);
  assertInsideRuntime(candidate, reportPath);
  let report = buildRuntimeReport({ gate, candidate, matrix, failures });
  writeJsonFile(reportPath, report);

  const hashesAfter = trackedFileHashes();
  const untrackedAfter = untrackedFilesSnapshot();
  if (!hasSameJson(hashesBefore, hashesAfter) || !hasSameJson(untrackedBefore, untrackedAfter)) {
    const updatedFailures = [...failures, "PRODUCT_PROOF_GENERATE_MUTATED_WORKTREE"];
    report = buildRuntimeReport({ gate, candidate, matrix, failures: updatedFailures });
    writeJsonFile(reportPath, report);
  }
  return report;
}

export function verifyProductProofRuntimeEvidence(gate: ProductProofRuntimeGateDefinition, candidate: ReleaseCandidate): Record<string, unknown> {
  const snapshotBefore = releaseVerifyStrictSnapshot();
  const reportPath = productProofRuntimeReportPath(candidate, gate.gateName);
  assertInsideRuntime(candidate, reportPath);
  const report = readJsonObject(reportPath);
  const fingerprints = computeReleaseFingerprints();
  const failures = [
    ...currentCandidateFailures(candidate),
    ...(report.final_status === PRODUCT_PROOF_RUNTIME_GATE_GREEN_STATUS ? [] : ["PRODUCT_PROOF_RUNTIME_REPORT_NOT_GREEN"]),
    ...(report.status === PRODUCT_PROOF_RUNTIME_GATE_GREEN_STATUS ? [] : ["PRODUCT_PROOF_RUNTIME_STATUS_NOT_GREEN"]),
    ...(report.gate === gate.gateName ? [] : ["PRODUCT_PROOF_GATE_NAME_MISMATCH"]),
    ...(report.candidateHash === candidate.candidateHash ? [] : ["PRODUCT_PROOF_CAMEL_CANDIDATE_HASH_MISMATCH"]),
    ...(report.candidate_hash === candidate.candidateHash ? [] : ["PRODUCT_PROOF_CANDIDATE_HASH_MISMATCH"]),
    ...(report.sourceHead === candidate.source_commit ? [] : ["PRODUCT_PROOF_CAMEL_SOURCE_HEAD_MISMATCH"]),
    ...(report.source_commit === candidate.source_commit ? [] : ["PRODUCT_PROOF_SOURCE_COMMIT_MISMATCH"]),
    ...(report.functional_status === gate.expectedStatus ? [] : ["PRODUCT_PROOF_FUNCTIONAL_STATUS_NOT_GREEN"]),
    ...(report.expected_functional_status === gate.expectedStatus ? [] : ["PRODUCT_PROOF_EXPECTED_STATUS_MISMATCH"]),
    ...(report.fake_green_claimed === false ? [] : ["PRODUCT_PROOF_FAKE_GREEN"]),
    ...(report.tracked_artifacts_written === false ? [] : ["PRODUCT_PROOF_TRACKED_ARTIFACT_WRITTEN"]),
    ...(report.runtime_output_supported === true ? [] : ["PRODUCT_PROOF_RUNTIME_OUTPUT_UNSUPPORTED"]),
    ...(report.writes_only_runtime === true ? [] : ["PRODUCT_PROOF_NOT_RUNTIME_ONLY"]),
    ...(report.release_verify_may_generate === false ? [] : ["PRODUCT_PROOF_VERIFY_GENERATION_ALLOWED"]),
    ...(Array.isArray(report.failures) && report.failures.length === 0 ? [] : ["PRODUCT_PROOF_RUNTIME_FAILURES_PRESENT"]),
  ];
  const reportFingerprints = report.fingerprints as Record<string, unknown> | undefined;
  if (reportFingerprints?.productSourceHash !== fingerprints.productSourceHash) failures.push("PRODUCT_PROOF_PRODUCT_SOURCE_HASH_MISMATCH");
  if (reportFingerprints?.proofHarnessHash !== fingerprints.proofHarnessHash) failures.push("PRODUCT_PROOF_PROOF_HARNESS_HASH_MISMATCH");
  if (reportFingerprints?.nativeBuildHash !== fingerprints.nativeBuildHash) failures.push("PRODUCT_PROOF_NATIVE_BUILD_HASH_MISMATCH");
  if (reportFingerprints?.apkBuildKey !== fingerprints.apkBuildKey) failures.push("PRODUCT_PROOF_APK_BUILD_KEY_MISMATCH");

  const snapshotAfter = releaseVerifyStrictSnapshot();
  failures.push(...diffReleaseVerifyStrictSnapshots(snapshotBefore, snapshotAfter));
  if (failures.length > 0) {
    throw new Error(`PRODUCT_PROOF_RUNTIME_VERIFY_FAILED:${gate.gateName}:${failures.join(",")}`);
  }
  return {
    final_status: PRODUCT_PROOF_RUNTIME_GATE_GREEN_STATUS,
    mode: VERIFY_RUNTIME,
    gate: gate.gateName,
    candidateHash: candidate.candidateHash,
    candidate_hash: candidate.candidateHash,
    sourceHead: candidate.source_commit,
    source_commit: candidate.source_commit,
    product_proof_runtime_verified_read_only: true,
    fake_green_claimed: false,
  };
}

function main(): void {
  const argv = process.argv.slice(2);
  const gate = getProductProofRuntimeGate(argvValue("--gate", argv) ?? "");
  const mode = parseMode(argv);
  assertSourceFrozen();
  const candidate = loadReleaseCandidate();
  assertCandidateArg(candidate, argv);
  const gateDir = productProofRuntimeGateDir(candidate, gate.gateName);
  assertInsideRuntime(candidate, gateDir);

  const report =
    mode === "generate-runtime"
      ? generateProductProofRuntimeEvidence(gate, candidate)
      : verifyProductProofRuntimeEvidence(gate, candidate);
  console.log(JSON.stringify(report, null, 2));
  if (report.final_status !== PRODUCT_PROOF_RUNTIME_GATE_GREEN_STATUS) {
    process.exit(1);
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/release/runProductProofRuntimeGate.ts")) {
  main();
}
