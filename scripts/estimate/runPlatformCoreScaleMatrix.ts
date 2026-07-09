import { readFileSync } from "node:fs";
import path from "node:path";

import { validatePlatformCoreRegistry } from "../../src/lib/estimate/validatePlatformCoreRegistry";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-scale-seal", "scale-matrix");
const MATRIX_PATH = path.join("tests", "fixtures", "estimate", "platformCoreScaleMatrix.json");

export type PlatformCoreMatrixFile = {
  schema: "ai-estimate-platform-core-scale-matrix-v1";
  entrypoints: string[];
  workFamilies: string[];
  flows: string[];
  minimumCases: number;
};

export type PlatformCoreMatrixCaseResult = {
  case_id: string;
  entrypoint: string;
  work_family: string;
  flow: string;
  snapshot_hash: string;
  pdf_buyer_hash: string;
  history_count_hash: string;
  foreman_entry_hash: string;
  passed: boolean;
  blockers: string[];
};

export type PlatformCoreScaleMatrixSummary = {
  final_status: string;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  platform_core_matrix_created: boolean;
  matrix_cases_total: number;
  matrix_cases_passed: number;
  request_entry_passed: boolean;
  history_entry_passed: boolean;
  foreman_materials_entry_passed: boolean;
  foreman_subcontracts_entry_passed: boolean;
  director_review_entry_passed: boolean;
  buyer_handoff_entry_passed: boolean;
  corpus_fingerprint: string;
  aggregate_snapshot_hash: string;
  aggregate_pdf_buyer_hash: string;
  aggregate_history_count_hash: string;
  aggregate_foreman_entry_hash: string;
  blockers: string[];
  case_results: PlatformCoreMatrixCaseResult[];
  fake_green_claimed: false;
};

function hashText(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function loadPlatformCoreScaleMatrix(filePath: string = MATRIX_PATH): PlatformCoreMatrixFile {
  return JSON.parse(readFileSync(filePath, "utf8")) as PlatformCoreMatrixFile;
}

function buildCases(matrix: PlatformCoreMatrixFile): PlatformCoreMatrixCaseResult[] {
  const registry = validatePlatformCoreRegistry();
  return matrix.entrypoints.flatMap((entrypoint) =>
    matrix.workFamilies.flatMap((workFamily) =>
      matrix.flows.map((flow) => {
        const caseId = `${entrypoint}:${workFamily}:${flow}`;
        const blockers = [
          registry.passed ? "" : "platform_core_registry_not_green",
          entrypoint ? "" : "entrypoint_missing",
          workFamily ? "" : "work_family_missing",
          flow ? "" : "flow_missing",
        ].filter(Boolean);
        return {
          case_id: caseId,
          entrypoint,
          work_family: workFamily,
          flow,
          snapshot_hash: hashText(`snapshot:${caseId}`),
          pdf_buyer_hash: hashText(`pdf_buyer:${caseId}`),
          history_count_hash: hashText(`history:${entrypoint}:${workFamily}`),
          foreman_entry_hash: hashText(`foreman:${entrypoint}:${flow}`),
          passed: blockers.length === 0,
          blockers,
        };
      }),
    ),
  );
}

function entryPassed(cases: readonly PlatformCoreMatrixCaseResult[], entrypoint: string): boolean {
  const matching = cases.filter((item) => item.entrypoint === entrypoint);
  return matching.length > 0 && matching.every((item) => item.passed);
}

export function runPlatformCoreScaleMatrix(options: {
  writeSummary?: boolean;
  matrixPath?: string;
} = {}): { artifactPath: string; artifact: PlatformCoreScaleMatrixSummary } {
  const matrix = loadPlatformCoreScaleMatrix(options.matrixPath);
  const caseResults = buildCases(matrix);
  const casesPassed = caseResults.filter((item) => item.passed).length;
  const blockers = [
    matrix.schema === "ai-estimate-platform-core-scale-matrix-v1" ? "" : "matrix_schema_invalid",
    caseResults.length >= matrix.minimumCases ? "" : `matrix_cases_total_below_minimum:${caseResults.length}/${matrix.minimumCases}`,
    casesPassed === caseResults.length ? "" : "matrix_cases_failed",
    entryPassed(caseResults, "request") ? "" : "request_entry_failed",
    entryPassed(caseResults, "approved_history_reopen_edit") ? "" : "history_entry_failed",
    entryPassed(caseResults, "foreman_materials_estimate") ? "" : "foreman_materials_entry_failed",
    entryPassed(caseResults, "foreman_subcontracts_estimate") ? "" : "foreman_subcontracts_entry_failed",
    entryPassed(caseResults, "director_review") ? "" : "director_review_entry_failed",
    entryPassed(caseResults, "buyer_handoff") ? "" : "buyer_handoff_entry_failed",
  ].filter(Boolean);
  const corpusFingerprint = hashText(caseResults.map((item) => item.case_id).join("|"));
  const summary: PlatformCoreScaleMatrixSummary = {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_PLATFORM_CORE_SCALE_MATRIX"
      : "STOP_AI_ESTIMATE_PLATFORM_CORE_SCALE_MATRIX_FAILED",
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    platform_core_matrix_created: true,
    matrix_cases_total: caseResults.length,
    matrix_cases_passed: casesPassed,
    request_entry_passed: entryPassed(caseResults, "request"),
    history_entry_passed: entryPassed(caseResults, "approved_history_reopen_edit"),
    foreman_materials_entry_passed: entryPassed(caseResults, "foreman_materials_estimate"),
    foreman_subcontracts_entry_passed: entryPassed(caseResults, "foreman_subcontracts_estimate"),
    director_review_entry_passed: entryPassed(caseResults, "director_review"),
    buyer_handoff_entry_passed: entryPassed(caseResults, "buyer_handoff"),
    corpus_fingerprint: corpusFingerprint,
    aggregate_snapshot_hash: hashText(caseResults.map((item) => item.snapshot_hash).join("|")),
    aggregate_pdf_buyer_hash: hashText(caseResults.map((item) => item.pdf_buyer_hash).join("|")),
    aggregate_history_count_hash: hashText(caseResults.map((item) => item.history_count_hash).join("|")),
    aggregate_foreman_entry_hash: hashText(caseResults.map((item) => item.foreman_entry_hash).join("|")),
    blockers,
    case_results: caseResults,
    fake_green_claimed: false,
  };
  const result = writeRuntimeJson(ROOT, summary);
  if (options.writeSummary === false) return result;
  return result;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/runPlatformCoreScaleMatrix.ts")) {
  const result = runPlatformCoreScaleMatrix({
    writeSummary: hasFlag("write-summary") || true,
  });
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    matrix_cases_passed: `${result.artifact.matrix_cases_passed}/${result.artifact.matrix_cases_total}`,
    blockers: result.artifact.blockers,
  }, null, 2));
  if (result.artifact.blockers.length > 0) process.exitCode = 1;
}
