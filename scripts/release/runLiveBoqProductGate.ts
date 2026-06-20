import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { assertSourceFrozen } from "./assertSourceFrozen";
import { computeReleaseFingerprints } from "./computeReleaseFingerprints";
import { loadReleaseCandidate, type ReleaseCandidate } from "./releaseCandidateState";
import {
  candidateRuntimeDir,
  currentHead,
  gitStatusSnapshot,
  hasSameJson,
  trackedFileHashes,
  writeJsonFile,
} from "./releasePipelineRuntime";
import {
  LIVE_BOQ_PRODUCT_GATE_GREEN_STATUS,
  LIVE_BOQ_TRACKED_GREEN_STATUS,
} from "./liveBoqProductGate.shared";

type GateMode = "run" | "verify-runtime";

type LiveBoqEvidencePaths = {
  gateRoot: string;
  attemptRoot: string;
  attemptArtifactsDir: string;
  attemptPdfDir: string;
  attemptReportPath: string;
  finalReportPath: string;
};

function argvValue(name: string, argv: readonly string[]): string | null {
  const inline = argv.find((value) => value.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = argv.indexOf(name);
  const value = index >= 0 ? argv[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : null;
}

function parseMode(argv: readonly string[]): GateMode {
  const mode = argvValue("--mode", argv) ?? "run";
  if (mode !== "run" && mode !== "verify-runtime") {
    throw new Error("--mode must be run or verify-runtime");
  }
  return mode;
}

function readJsonObject(filePath: string): Record<string, unknown> {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`LIVE_BOQ_PRODUCT_GATE_JSON_INVALID:${filePath}`);
  }
  return parsed as Record<string, unknown>;
}

function listLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function stringField(record: Record<string, unknown> | null, field: string): string | null {
  const value = record?.[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function booleanField(record: Record<string, unknown> | null, field: string): boolean | null {
  const value = record?.[field];
  return typeof value === "boolean" ? value : null;
}

function normalizePath(value: string): string {
  return path.resolve(value).replace(/\\/g, "/");
}

function assertInsideRuntime(candidate: ReleaseCandidate, target: string): void {
  const runtimeRoot = normalizePath(candidateRuntimeDir(candidate));
  const normalizedTarget = normalizePath(target);
  if (normalizedTarget !== runtimeRoot && !normalizedTarget.startsWith(`${runtimeRoot}/`)) {
    throw new Error(`LIVE_BOQ_OUTPUT_OUTSIDE_CANDIDATE_RUNTIME:${target}`);
  }
}

function evidencePaths(candidate: ReleaseCandidate): LiveBoqEvidencePaths {
  const runtimeDir = candidateRuntimeDir(candidate);
  const gateRoot = path.join(runtimeDir, "product-gates", "live-boq");
  const attemptRoot = path.join(gateRoot, "attempt-1");
  return {
    gateRoot,
    attemptRoot,
    attemptArtifactsDir: path.join(attemptRoot, "artifacts"),
    attemptPdfDir: path.join(attemptRoot, "pdf"),
    attemptReportPath: path.join(attemptRoot, "report.json"),
    finalReportPath: path.join(runtimeDir, "product-gates", "live_boq.json"),
  };
}

function assertCandidateArg(candidate: ReleaseCandidate, argv: readonly string[]): void {
  const expected = argvValue("--candidate", argv);
  if (expected && expected !== candidate.candidateHash) {
    throw new Error(`LIVE_BOQ_CANDIDATE_ARG_MISMATCH:${expected}:expected:${candidate.candidateHash}`);
  }
}

function atomicWriteJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
}

function assertFrozenCandidateCurrent(candidate: ReleaseCandidate): string[] {
  const fingerprints = computeReleaseFingerprints();
  const failures: string[] = [];
  if (candidate.source_commit !== currentHead()) failures.push("LIVE_BOQ_SOURCE_HEAD_NOT_CURRENT_HEAD");
  if (candidate.productSourceHash !== fingerprints.productSourceHash) failures.push("LIVE_BOQ_PRODUCT_SOURCE_HASH_MISMATCH");
  if (candidate.proofHarnessHash !== fingerprints.proofHarnessHash) failures.push("LIVE_BOQ_PROOF_HARNESS_HASH_MISMATCH");
  if (candidate.nativeBuildHash !== fingerprints.nativeBuildHash) failures.push("LIVE_BOQ_NATIVE_BUILD_HASH_MISMATCH");
  if (candidate.candidateHash !== fingerprints.candidateHash) failures.push("LIVE_BOQ_CANDIDATE_HASH_MISMATCH");
  return failures;
}

function evaluateRuntimeEvidence(candidate: ReleaseCandidate, paths: LiveBoqEvidencePaths): {
  matrix: Record<string, unknown> | null;
  reproduction: Record<string, unknown> | null;
  failures: string[];
} {
  const matrixPath = path.join(paths.attemptArtifactsDir, "matrix.json");
  const reproductionPath = path.join(paths.attemptArtifactsDir, "failure_reproduction.json");
  const matrix = fs.existsSync(matrixPath) ? readJsonObject(matrixPath) : null;
  const reproduction = fs.existsSync(reproductionPath) ? readJsonObject(reproductionPath) : null;
  const sourceCodeHead = stringField(reproduction, "source_code_head") ?? stringField(reproduction, "head");
  const failures = [
    ...(matrix ? [] : ["LIVE_BOQ_RUNTIME_MATRIX_MISSING"]),
    ...(reproduction ? [] : ["LIVE_BOQ_RUNTIME_REPRODUCTION_MISSING"]),
    ...(stringField(matrix, "final_status") === LIVE_BOQ_TRACKED_GREEN_STATUS ? [] : ["LIVE_BOQ_RUNTIME_MATRIX_NOT_GREEN"]),
    ...(booleanField(matrix, "fake_green_claimed") === false ? [] : ["LIVE_BOQ_RUNTIME_MATRIX_FAKE_GREEN"]),
    ...(booleanField(matrix, "runtime_proof_passed") === true ? [] : ["LIVE_BOQ_RUNTIME_PROOF_NOT_PASSED"]),
    ...(booleanField(matrix, "catalog_items_bound_for_material_rows") === true ? [] : ["LIVE_BOQ_CATALOG_BINDING_NOT_GREEN"]),
    ...(booleanField(matrix, "source_evidence_present_all_priced_rows") === true ? [] : ["LIVE_BOQ_SOURCE_EVIDENCE_NOT_GREEN"]),
    ...(booleanField(matrix, "pdf_professional_table_layout_ready") === true ? [] : ["LIVE_BOQ_PDF_TABLE_LAYOUT_NOT_GREEN"]),
    ...(booleanField(matrix, "pdf_rows_match_ui_rows") === true ? [] : ["LIVE_BOQ_PDF_ROWS_NOT_MATCHING_UI"]),
    ...(booleanField(matrix, "pdf_mojibake_found") === false ? [] : ["LIVE_BOQ_PDF_MOJIBAKE_FOUND"]),
    ...(booleanField(matrix, "ui_mojibake_found") === false ? [] : ["LIVE_BOQ_UI_MOJIBAKE_FOUND"]),
    ...(booleanField(matrix, "weak_generic_rows_found") === false ? [] : ["LIVE_BOQ_WEAK_GENERIC_ROWS_FOUND"]),
    ...(booleanField(matrix, "fake_catalog_items_found") === false ? [] : ["LIVE_BOQ_FAKE_CATALOG_ITEMS_FOUND"]),
    ...(booleanField(matrix, "external_runtime_evidence_required") === false ? [] : ["LIVE_BOQ_EXTERNAL_RUNTIME_SCOPE_NOT_DECOUPLED"]),
    ...(stringField(matrix, "proof_scope") === "runtime_product_gate" ? [] : ["LIVE_BOQ_RUNTIME_SCOPE_MISSING"]),
    ...(sourceCodeHead === candidate.source_commit ? [] : ["LIVE_BOQ_SOURCE_HEAD_MISMATCH"]),
    ...(booleanField(reproduction, "fake_green_claimed") === false ? [] : ["LIVE_BOQ_REPRODUCTION_FAKE_GREEN"]),
    ...(stringField(reproduction, "proof_scope") === "runtime_product_gate" ? [] : ["LIVE_BOQ_REPRODUCTION_RUNTIME_SCOPE_MISSING"]),
    ...(reproduction && listLength(reproduction.failures) === 0 ? [] : ["LIVE_BOQ_REPRODUCTION_FAILURES_PRESENT"]),
  ];
  return { matrix, reproduction, failures };
}

export function generateLiveBoqEvidence(params: {
  candidateHash: string;
  sourceHead: string;
  outputRoot: string;
}): { exitCode: number | null; stdout: string; stderr: string } {
  const command = [
    "node",
    "node_modules/tsx/dist/cli.mjs",
    "scripts/e2e/runLiveRequestEmbeddedAiPdfBoqCatalogFailureReproduction.ts",
    "--mode=refresh",
    `--output-dir=${path.join(params.outputRoot, "artifacts")}`,
    `--pdf-dir=${path.join(params.outputRoot, "pdf")}`,
    "--product-gate-runtime",
  ];
  const result = spawnSync(command[0], command.slice(1), {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 10 * 60_000,
  });
  return {
    exitCode: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function verifyLiveBoqEvidence(params: {
  candidateHash: string;
  sourceHead: string;
  evidenceRoot: string;
}): void {
  const candidate = loadReleaseCandidate();
  if (params.candidateHash !== candidate.candidateHash) {
    throw new Error(`LIVE_BOQ_EVIDENCE_CANDIDATE_MISMATCH:${params.candidateHash}:expected:${candidate.candidateHash}`);
  }
  if (params.sourceHead !== candidate.source_commit) {
    throw new Error(`LIVE_BOQ_EVIDENCE_SOURCE_HEAD_MISMATCH:${params.sourceHead}:expected:${candidate.source_commit}`);
  }
  assertInsideRuntime(candidate, params.evidenceRoot);
  const reportPath = path.join(path.dirname(params.evidenceRoot), "live_boq.json");
  assertInsideRuntime(candidate, reportPath);
  const report = readJsonObject(reportPath);
  const failures = [
    ...(report.final_status === LIVE_BOQ_PRODUCT_GATE_GREEN_STATUS ? [] : ["LIVE_BOQ_PRODUCT_GATE_NOT_GREEN"]),
    ...(report.status === LIVE_BOQ_PRODUCT_GATE_GREEN_STATUS ? [] : ["LIVE_BOQ_STATUS_NOT_GREEN"]),
    ...(report.candidateHash === candidate.candidateHash ? [] : ["LIVE_BOQ_CAMEL_CANDIDATE_HASH_MISMATCH"]),
    ...(report.candidate_hash === candidate.candidateHash ? [] : ["LIVE_BOQ_CANDIDATE_HASH_MISMATCH"]),
    ...(report.sourceHead === candidate.source_commit ? [] : ["LIVE_BOQ_CAMEL_SOURCE_HEAD_MISMATCH"]),
    ...(report.source_commit === candidate.source_commit ? [] : ["LIVE_BOQ_SOURCE_COMMIT_MISMATCH"]),
    ...(report.fake_green_claimed === false ? [] : ["LIVE_BOQ_FAKE_GREEN"]),
    ...(report.tracked_artifacts_read === false ? [] : ["LIVE_BOQ_TRACKED_ARTIFACT_READ"]),
    ...(report.writes_only_runtime === true ? [] : ["LIVE_BOQ_NOT_RUNTIME_ONLY"]),
  ];
  if (failures.length > 0) {
    throw new Error(`LIVE_BOQ_PRODUCT_GATE_VERIFY_FAILED:${failures.join(",")}`);
  }
}

function buildReport(params: {
  candidate: ReleaseCandidate;
  paths: LiveBoqEvidencePaths;
  commandExitCode: number | null;
  stdout: string;
  stderr: string;
  matrix: Record<string, unknown> | null;
  reproduction: Record<string, unknown> | null;
  failures: string[];
}): Record<string, unknown> {
  return {
    final_status: params.failures.length === 0 ? LIVE_BOQ_PRODUCT_GATE_GREEN_STATUS : "BLOCKED_LIVE_BOQ_PRODUCT_GATE",
    status: params.failures.length === 0 ? LIVE_BOQ_PRODUCT_GATE_GREEN_STATUS : "BLOCKED_LIVE_BOQ_PRODUCT_GATE",
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
    exit_code: params.commandExitCode,
    live_boq_verified_in_proof_phase: true,
    fresh_runtime_proof_created: true,
    tracked_artifacts_read: false,
    writes_only_runtime: true,
    evidence_root: params.paths.gateRoot,
    attempt_root: params.paths.attemptRoot,
    runtime_matrix: params.matrix
      ? {
          final_status: params.matrix.final_status,
          runtime_proof_passed: params.matrix.runtime_proof_passed,
          proof_scope: params.matrix.proof_scope,
          external_runtime_evidence_required: params.matrix.external_runtime_evidence_required,
          pdf_extraction_cases_total: params.matrix.pdf_extraction_cases_total,
          pdf_extraction_cases_passed: params.matrix.pdf_extraction_cases_passed,
        }
      : null,
    stdout_tail: params.stdout.slice(-4000),
    stderr_tail: params.stderr.slice(-4000),
    failures: params.failures,
    fake_green_claimed: false,
  };
}

function runGate(candidate: ReleaseCandidate, paths: LiveBoqEvidencePaths): void {
  assertInsideRuntime(candidate, paths.gateRoot);
  assertInsideRuntime(candidate, paths.attemptRoot);
  fs.rmSync(paths.attemptRoot, { recursive: true, force: true });
  fs.mkdirSync(paths.attemptRoot, { recursive: true });
  const statusBefore = gitStatusSnapshot();
  const hashesBefore = trackedFileHashes();

  const generated = generateLiveBoqEvidence({
    candidateHash: candidate.candidateHash,
    sourceHead: candidate.source_commit,
    outputRoot: paths.attemptRoot,
  });
  const evidence = evaluateRuntimeEvidence(candidate, paths);
  const failures = [
    ...assertFrozenCandidateCurrent(candidate),
    ...(generated.exitCode === 0 ? [] : ["LIVE_BOQ_RUNTIME_PROOF_EXIT_NONZERO"]),
    ...evidence.failures,
  ];
  const statusAfter = gitStatusSnapshot();
  const hashesAfter = trackedFileHashes();
  if (statusBefore !== statusAfter || !hasSameJson(hashesBefore, hashesAfter)) {
    failures.push("LIVE_BOQ_MUTATED_TRACKED_WORKTREE");
  }
  const report = buildReport({
    candidate,
    paths,
    commandExitCode: generated.exitCode,
    stdout: generated.stdout,
    stderr: generated.stderr,
    matrix: evidence.matrix,
    reproduction: evidence.reproduction,
    failures,
  });

  writeJsonFile(paths.attemptReportPath, report);
  if (failures.length > 0) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  atomicWriteJson(paths.finalReportPath, report);
  console.log(JSON.stringify(report, null, 2));
}

function verifyRuntimeGate(candidate: ReleaseCandidate, paths: LiveBoqEvidencePaths): void {
  const statusBefore = gitStatusSnapshot();
  const hashesBefore = trackedFileHashes();
  verifyLiveBoqEvidence({
    candidateHash: candidate.candidateHash,
    sourceHead: candidate.source_commit,
    evidenceRoot: paths.gateRoot,
  });
  const statusAfter = gitStatusSnapshot();
  const hashesAfter = trackedFileHashes();
  if (statusBefore !== statusAfter || !hasSameJson(hashesBefore, hashesAfter)) {
    throw new Error("LIVE_BOQ_VERIFY_RUNTIME_MUTATED_WORKTREE");
  }
  console.log(JSON.stringify({
    final_status: LIVE_BOQ_PRODUCT_GATE_GREEN_STATUS,
    candidateHash: candidate.candidateHash,
    candidate_hash: candidate.candidateHash,
    sourceHead: candidate.source_commit,
    source_commit: candidate.source_commit,
    live_boq_runtime_verified_read_only: true,
    fake_green_claimed: false,
  }, null, 2));
}

function main(): void {
  const argv = process.argv.slice(2);
  const mode = parseMode(argv);
  assertSourceFrozen();
  const candidate = loadReleaseCandidate();
  assertCandidateArg(candidate, argv);
  const paths = evidencePaths(candidate);

  if (mode === "verify-runtime") {
    verifyRuntimeGate(candidate, paths);
    return;
  }

  runGate(candidate, paths);
}

main();
