import fs from "node:fs";
import path from "node:path";

import {
  REAL_10000_ACCEPTANCE_CONTRACT,
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import {
  buildReal10000ArtifactIdentity,
  hashReal10000WorkIds,
  REAL10000_SHARDS_DIR,
  sha256File,
  summarizeReal10000RuntimeIntegrity,
  writeReal10000Json,
} from "./real10000AcceptanceCore";

type MergeFailure = { classification: string; reason: string; artifact?: string };

const REQUIRED_SHARD_ARTIFACTS = [
  "runtime_results.json",
  "semantic_frame_results.json",
  "work_plan_results.json",
  "formula_results.json",
  "boq_quality_results.json",
  "catalog_binding_results.json",
  "source_tax_results.json",
  "unit_semantics.json",
  "pdf_files_manifest.json",
  "pdf_text_extract.json",
  "pdf_parity.json",
  "failures.json",
  "stdout.log",
  "stderr.log",
  "execution.json",
] as const;

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function shardDir(index: number): string {
  return path.join(REAL10000_SHARDS_DIR, `shard_${String(index).padStart(3, "0")}`);
}

function finiteNonNegativeInteger(value: unknown): value is number {
  return Number.isFinite(value) && Number.isInteger(value) && Number(value) >= 0;
}

export function validateReal10000ShardEvidence(params: {
  index: number;
  matrix: any;
  runtimeResults: any[];
  pdfManifest?: any[];
  dir?: string;
  expectedIdentity?: ReturnType<typeof buildReal10000ArtifactIdentity>;
}): MergeFailure[] {
  const { index, matrix, runtimeResults, pdfManifest, dir } = params;
  const failures: MergeFailure[] = [];
  const artifact = dir ? path.join(dir, "matrix.json") : `shard_${String(index).padStart(3, "0")}/matrix.json`;
  const expectedIdentity = params.expectedIdentity ?? buildReal10000ArtifactIdentity();
  const expectedShardCases = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.slice(
    index * REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard,
    (index + 1) * REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard,
  );
  const expectedWorkIds = expectedShardCases.map((item) => item.caseId);
  const actualWorkIds = Array.isArray(matrix?.work_ids) ? matrix.work_ids : [];
  const identityFields = [
    "artifact_schema_version",
    "subject_sha",
    "corpus_id",
    "corpus_version",
    "corpus_fingerprint_algorithm",
    "corpus_fingerprint",
    "compiler_id",
    "compiler_version",
    "compiler_source_fingerprint",
    "formula_graph_id",
    "formula_graph_version",
    "formula_graph_fingerprint",
    "runtime_version",
  ] as const;
  for (const field of identityFields) {
    if (matrix?.[field] !== expectedIdentity[field]) {
      failures.push({
        classification: "REAL_10000_SHARD_IDENTITY_MISMATCH",
        reason: `${index}:${field}`,
        artifact,
      });
    }
  }
  if (!/^[0-9a-f]{40}$/.test(String(matrix?.subject_sha ?? ""))) {
    failures.push({ classification: "REAL_10000_SHARD_SUBJECT_SHA_INVALID", reason: String(index), artifact });
  }
  if (matrix?.shard_index !== index) {
    failures.push({ classification: "REAL_10000_SHARD_INDEX_MISMATCH", reason: String(index), artifact });
  }
  if (
    actualWorkIds.length !== REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard ||
    actualWorkIds.length !== expectedWorkIds.length ||
    actualWorkIds.some((workId: unknown, workIndex: number) => workId !== expectedWorkIds[workIndex])
  ) {
    failures.push({ classification: "REAL_10000_SHARD_WORK_IDS_MISMATCH", reason: String(index), artifact });
  }
  if (new Set(actualWorkIds).size !== actualWorkIds.length) {
    failures.push({ classification: "REAL_10000_SHARD_DUPLICATE_WORK_IDS", reason: String(index), artifact });
  }
  if (
    matrix?.work_id_range?.first !== expectedWorkIds[0] ||
    matrix?.work_id_range?.last !== expectedWorkIds.at(-1)
  ) {
    failures.push({ classification: "REAL_10000_SHARD_WORK_ID_RANGE_MISMATCH", reason: String(index), artifact });
  }
  if (matrix?.work_ids_hash !== hashReal10000WorkIds(actualWorkIds)) {
    failures.push({ classification: "REAL_10000_SHARD_WORK_IDS_HASH_MISMATCH", reason: String(index), artifact });
  }
  const started = Date.parse(String(matrix?.started_at ?? ""));
  const finished = Date.parse(String(matrix?.finished_at ?? ""));
  if (
    !Number.isFinite(started) ||
    !Number.isFinite(finished) ||
    finished < started ||
    !finiteNonNegativeInteger(matrix?.duration_ms) ||
    matrix?.exit_code !== 0 ||
    !Array.isArray(matrix?.errors) ||
    matrix.errors.length > 0 ||
    matrix?.placeholder !== false ||
    matrix?.fake_green_claimed !== false
  ) {
    failures.push({ classification: "REAL_10000_SHARD_EXECUTION_METADATA_INVALID", reason: String(index), artifact });
  }
  if (
    matrix?.cases_total !== REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard ||
    matrix?.cases_passed !== REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard ||
    matrix?.cases_failed !== 0
  ) {
    failures.push({ classification: "REAL_10000_SHARD_CASE_COUNTS_INVALID", reason: String(index), artifact });
  }
  const expectedPdfCount = expectedShardCases.filter((item) => item.pdfRequired).length;
  if (
    matrix?.pdf_extraction_cases_total !== expectedPdfCount ||
    matrix?.pdf_extraction_cases_passed !== expectedPdfCount
  ) {
    failures.push({ classification: "REAL_10000_SHARD_PDF_COUNTS_INVALID", reason: String(index), artifact });
  }
  if (
    runtimeResults.length !== REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard ||
    runtimeResults.some((item, resultIndex) => item?.caseId !== expectedWorkIds[resultIndex])
  ) {
    failures.push({ classification: "REAL_10000_SHARD_RUNTIME_RESULTS_INVALID", reason: String(index), artifact });
  }
  const runtimeIntegrity = matrix?.runtime_integrity;
  const requiredIntegrityCounts = [
    "runtime_exceptions",
    "non_finite_values",
    "negative_quantities",
    "negative_totals",
    "unknown_units",
    "lost_required_boq_positions",
    "silent_fallbacks",
    "unconfirmed_contract_total_claims",
  ] as const;
  if (
    !runtimeIntegrity ||
    runtimeIntegrity.passed !== true ||
    requiredIntegrityCounts.some((field) => !finiteNonNegativeInteger(runtimeIntegrity[field]) || runtimeIntegrity[field] !== 0)
  ) {
    failures.push({ classification: "REAL_10000_RUNTIME_INTEGRITY_FAILED", reason: `${index}:matrix`, artifact });
  }
  const runtimeResultShapeValid = runtimeResults.every((item) =>
    item &&
    Array.isArray(item.failures) &&
    Array.isArray(item.requiredRowsMissing) &&
    item.runtimeIntegrity &&
    [
      "nonFiniteValueCount",
      "negativeQuantityCount",
      "negativeTotalCount",
      "unknownUnitCount",
      "silentPriceFallbackCount",
      "unconfirmedContractTotalClaimCount",
    ].every((field) => finiteNonNegativeInteger(item.runtimeIntegrity[field])) &&
    item.runtimeIntegrity.passed === true,
  );
  const recomputedIntegrity = runtimeResults.length > 0 && runtimeResultShapeValid
    ? summarizeReal10000RuntimeIntegrity(runtimeResults)
    : null;
  if (
    !recomputedIntegrity ||
    recomputedIntegrity.passed !== true ||
    requiredIntegrityCounts.some((field) => recomputedIntegrity[field] !== runtimeIntegrity?.[field])
  ) {
    failures.push({ classification: "REAL_10000_RUNTIME_INTEGRITY_FAILED", reason: `${index}:runtime_results`, artifact });
  }
  if (
    matrix?.writer_complete !== true ||
    matrix?.writer?.kind !== "independent-process-orchestrator" ||
    !Number.isFinite(Date.parse(String(matrix?.writer?.completed_at ?? ""))) ||
    !Array.isArray(matrix?.writer?.command) ||
    matrix.writer.command.length < 3 ||
    typeof matrix?.writer?.stdout_path !== "string" ||
    typeof matrix?.writer?.stderr_path !== "string" ||
    !matrix?.writer?.artifact_hashes ||
    typeof matrix.writer.artifact_hashes !== "object"
  ) {
    failures.push({ classification: "REAL_10000_SHARD_WRITER_INCOMPLETE", reason: String(index), artifact });
  }
  const command: string[] = Array.isArray(matrix?.writer?.command)
    ? matrix.writer.command.map((part: unknown) => String(part))
    : [];
  if (
    !command.some((part) => part.endsWith("runReal10000DiverseConstructionWorksShardProof.ts")) ||
    !command.includes(`--worker-shard=${index}`) ||
    matrix?.writer?.completed_at !== matrix?.finished_at
  ) {
    failures.push({ classification: "REAL_10000_SHARD_WRITER_COMMAND_INVALID", reason: String(index), artifact });
  }
  if (pdfManifest) {
    const expectedPdfIds = expectedShardCases.filter((item) => item.pdfRequired).map((item) => item.caseId);
    const manifestIds = pdfManifest.map((item) => item?.caseId);
    if (
      manifestIds.length !== expectedPdfIds.length ||
      manifestIds.some((caseId, pdfIndex) => caseId !== expectedPdfIds[pdfIndex]) ||
      pdfManifest.some((item) =>
        item?.passed !== true ||
        !finiteNonNegativeInteger(item?.bytes) ||
        item.bytes === 0 ||
        !/^[0-9a-f]{64}$/.test(String(item?.sha256 ?? "")) ||
        typeof item?.pdfFile !== "string"
      )
    ) {
      failures.push({ classification: "REAL_10000_SHARD_PDF_MANIFEST_INVALID", reason: String(index), artifact });
    }
    if (dir) {
      const pdfRoot = `${path.resolve(process.cwd(), "artifacts", "pdf", "real-10000-diverse-construction-works")}${path.sep}`;
      for (const item of pdfManifest) {
        const pdfPath = path.resolve(process.cwd(), String(item?.pdfFile ?? ""));
        if (
          !pdfPath.startsWith(pdfRoot) ||
          !fs.existsSync(pdfPath) ||
          fs.statSync(pdfPath).size !== item?.bytes ||
          sha256File(pdfPath) !== item?.sha256
        ) {
          failures.push({
            classification: "REAL_10000_SHARD_PDF_ARTIFACT_HASH_MISMATCH",
            reason: `${index}:${String(item?.caseId ?? "unknown")}`,
            artifact: pdfPath,
          });
        }
      }
    }
  }
  if (dir) {
    for (const name of REQUIRED_SHARD_ARTIFACTS) {
      const filePath = path.join(dir, name);
      const expectedHash = matrix?.writer?.artifact_hashes?.[name];
      if (!fs.existsSync(filePath)) {
        failures.push({ classification: "REAL_10000_SHARD_ARTIFACT_MISSING", reason: `${index}:${name}`, artifact: filePath });
      } else if (typeof expectedHash !== "string" || !/^[0-9a-f]{64}$/.test(expectedHash) || sha256File(filePath) !== expectedHash) {
        failures.push({ classification: "REAL_10000_SHARD_ARTIFACT_HASH_MISMATCH", reason: `${index}:${name}`, artifact: filePath });
      }
    }
  }
  if (matrix?.final_status !== "REAL_10000_SHARD_OK") {
    failures.push({ classification: "REAL_10000_SHARD_NOT_GREEN", reason: `${index}:${matrix?.final_status}`, artifact });
  }
  if (matrix?.single_shard_green_claimed === true || String(matrix?.final_status).includes("GREEN_REAL_10000")) {
    failures.push({ classification: "REAL_10000_SINGLE_SHARD_GREEN_CLAIMED", reason: String(index), artifact });
  }
  return failures;
}

export function validateReal10000ShardCoverage(
  entries: readonly { index: number; matrix: any }[],
): MergeFailure[] {
  const failures: MergeFailure[] = [];
  const indices = new Set<number>();
  const workIds = new Set<string>();
  for (const entry of entries) {
    if (indices.has(entry.index)) {
      failures.push({ classification: "REAL_10000_DUPLICATE_SHARD_INDEX", reason: String(entry.index) });
    }
    indices.add(entry.index);
    for (const workId of Array.isArray(entry.matrix?.work_ids) ? entry.matrix.work_ids : []) {
      if (typeof workId !== "string") continue;
      if (workIds.has(workId)) {
        failures.push({
          classification: "REAL_10000_SHARD_WORK_ID_INTERSECTION",
          reason: `${entry.index}:${workId}`,
        });
      }
      workIds.add(workId);
    }
  }
  for (let index = 0; index < REAL_10000_ACCEPTANCE_CONTRACT.requiredShards; index += 1) {
    if (!indices.has(index)) {
      failures.push({
        classification: "REAL_10000_SHARD_MISSING",
        reason: `shard_${String(index).padStart(3, "0")}`,
      });
    }
  }
  const expectedIds = new Set(REAL_DIVERSE_10000_CONSTRUCTION_WORKS.map((item) => item.caseId));
  const missingIds = [...expectedIds].filter((id) => !workIds.has(id));
  if (missingIds.length > 0) {
    failures.push({ classification: "REAL_10000_MISSING_CASE_IDS", reason: String(missingIds.length) });
  }
  return failures;
}

export function runReal10000DiverseConstructionWorksShardMerge() {
  const failures: MergeFailure[] = [];
  const expectedIds = new Set(REAL_DIVERSE_10000_CONSTRUCTION_WORKS.map((item) => item.caseId));
  const matrices: any[] = [];
  const shardFailures: any[] = [];
  const runtimeResults: any[] = [];
  const semanticFrameResults: any[] = [];
  const workPlanResults: any[] = [];
  const formulaResults: any[] = [];
  const boqQualityResults: any[] = [];
  const catalogBindingResults: any[] = [];
  const sourceTaxResults: any[] = [];
  const unitSemanticsResults: any[] = [];
  const pdfManifest: any[] = [];
  const pdfTextExtract: any[] = [];
  const pdfParity: any[] = [];
  const expectedIdentity = buildReal10000ArtifactIdentity();
  const shardWorkIds = new Set<string>();

  for (let index = 0; index < REAL_10000_ACCEPTANCE_CONTRACT.requiredShards; index += 1) {
    const dir = shardDir(index);
    const matrixFile = path.join(dir, "matrix.json");
    const failuresFile = path.join(dir, "failures.json");
    if (!fs.existsSync(matrixFile)) {
      failures.push({ classification: "REAL_10000_SHARD_MISSING", reason: `shard_${String(index).padStart(3, "0")}`, artifact: matrixFile });
      continue;
    }
    const matrix = readJson<any>(matrixFile);
    matrices.push(matrix);
    const runtimeResultsFile = path.join(dir, "runtime_results.json");
    const localRuntimeResults = fs.existsSync(runtimeResultsFile)
      ? readJson<any[]>(runtimeResultsFile)
      : [];
    const pdfManifestFile = path.join(dir, "pdf_files_manifest.json");
    const localPdfManifest = fs.existsSync(pdfManifestFile)
      ? readJson<any[]>(pdfManifestFile)
      : [];
    failures.push(...validateReal10000ShardEvidence({
      index,
      matrix,
      runtimeResults: localRuntimeResults,
      pdfManifest: localPdfManifest,
      dir,
      expectedIdentity,
    }));
    const expectedShardCases = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.slice(
      index * REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard,
      (index + 1) * REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard,
    );
    const expectedWorkIds = expectedShardCases.map((item) => item.caseId);
    const actualWorkIds = Array.isArray(matrix.work_ids) ? matrix.work_ids : [];
    const identityFields = [
      "artifact_schema_version",
      "subject_sha",
      "corpus_version",
      "corpus_fingerprint_algorithm",
      "corpus_fingerprint",
      "compiler_version",
      "compiler_source_fingerprint",
      "formula_graph_version",
      "formula_graph_fingerprint",
      "runtime_version",
    ] as const;
    for (const field of identityFields) {
      if (matrix[field] !== expectedIdentity[field]) {
        failures.push({
          classification: "REAL_10000_SHARD_IDENTITY_MISMATCH",
          reason: `${index}:${field}`,
          artifact: matrixFile,
        });
      }
    }
    if (
      actualWorkIds.length !== expectedWorkIds.length ||
      actualWorkIds.some((workId: unknown, workIndex: number) => workId !== expectedWorkIds[workIndex])
    ) {
      failures.push({
        classification: "REAL_10000_SHARD_WORK_IDS_MISMATCH",
        reason: String(index),
        artifact: matrixFile,
      });
    }
    for (const workId of actualWorkIds) {
      if (typeof workId !== "string") continue;
      if (shardWorkIds.has(workId)) {
        failures.push({
          classification: "REAL_10000_SHARD_WORK_ID_INTERSECTION",
          reason: `${index}:${workId}`,
          artifact: matrixFile,
        });
      }
      shardWorkIds.add(workId);
    }
    if (
      !Number.isFinite(matrix.duration_ms) ||
      matrix.duration_ms < 0 ||
      matrix.exit_code !== 0 ||
      !Array.isArray(matrix.errors) ||
      matrix.errors.length > 0 ||
      matrix.placeholder !== false ||
      matrix.fake_green_claimed !== false
    ) {
      failures.push({
        classification: "REAL_10000_SHARD_EXECUTION_METADATA_INVALID",
        reason: String(index),
        artifact: matrixFile,
      });
    }
    if (matrix.final_status !== "REAL_10000_SHARD_OK") {
      failures.push({ classification: "REAL_10000_SHARD_NOT_GREEN", reason: `${index}:${matrix.final_status}`, artifact: matrixFile });
    }
    if (matrix.single_shard_green_claimed === true || String(matrix.final_status).includes("GREEN_REAL_10000")) {
      failures.push({ classification: "REAL_10000_SINGLE_SHARD_GREEN_CLAIMED", reason: String(index), artifact: matrixFile });
    }
    const localFailures = fs.existsSync(failuresFile) ? readJson<any[]>(failuresFile) : [];
    if (localFailures.length > 0) {
      failures.push({ classification: "REAL_10000_SHARD_FAILURES_NOT_EMPTY", reason: `${index}:${localFailures.length}`, artifact: failuresFile });
    }
    shardFailures.push(...localFailures);
    runtimeResults.push(...localRuntimeResults);
    semanticFrameResults.push(...(fs.existsSync(path.join(dir, "semantic_frame_results.json")) ? readJson<any[]>(path.join(dir, "semantic_frame_results.json")) : []));
    workPlanResults.push(...(fs.existsSync(path.join(dir, "work_plan_results.json")) ? readJson<any[]>(path.join(dir, "work_plan_results.json")) : []));
    formulaResults.push(...(fs.existsSync(path.join(dir, "formula_results.json")) ? readJson<any[]>(path.join(dir, "formula_results.json")) : []));
    boqQualityResults.push(...(fs.existsSync(path.join(dir, "boq_quality_results.json")) ? readJson<any[]>(path.join(dir, "boq_quality_results.json")) : []));
    catalogBindingResults.push(...(fs.existsSync(path.join(dir, "catalog_binding_results.json")) ? readJson<any>(path.join(dir, "catalog_binding_results.json")).cases ?? [] : []));
    sourceTaxResults.push(...(fs.existsSync(path.join(dir, "source_tax_results.json")) ? [readJson<any>(path.join(dir, "source_tax_results.json"))] : []));
    unitSemanticsResults.push(...(fs.existsSync(path.join(dir, "unit_semantics.json")) ? readJson<any>(path.join(dir, "unit_semantics.json")).cases ?? [] : []));
    pdfManifest.push(...localPdfManifest);
    pdfTextExtract.push(...(fs.existsSync(path.join(dir, "pdf_text_extract.json")) ? readJson<any[]>(path.join(dir, "pdf_text_extract.json")) : []));
    pdfParity.push(...(fs.existsSync(path.join(dir, "pdf_parity.json")) ? readJson<any[]>(path.join(dir, "pdf_parity.json")) : []));
  }
  failures.push(...validateReal10000ShardCoverage(
    matrices.map((matrix) => ({ index: matrix.shard_index, matrix })),
  ));

  const runtimeIds = runtimeResults.map((item) => item.caseId);
  const runtimeIdSet = new Set(runtimeIds);
  if (runtimeIdSet.size !== runtimeIds.length) {
    failures.push({ classification: "REAL_10000_DUPLICATE_CASE_IDS", reason: `${runtimeIds.length - runtimeIdSet.size}` });
  }
  const missingIds = [...expectedIds].filter((id) => !runtimeIdSet.has(id));
  if (missingIds.length > 0) {
    failures.push({ classification: "REAL_10000_MISSING_CASE_IDS", reason: String(missingIds.length) });
  }
  const unexpectedIds = runtimeIds.filter((id) => !expectedIds.has(id));
  if (unexpectedIds.length > 0) {
    failures.push({ classification: "REAL_10000_UNEXPECTED_CASE_IDS", reason: String(unexpectedIds.length) });
  }

  const domains = [...new Set(runtimeResults.map((item) => item.domain))].sort();
  const macroDomains = [...new Set(runtimeResults.map((item) => item.macroDomain))].sort();
  const routeSplit = {
    request: runtimeResults.filter((item) => item.route === "/request").length,
    ai_foreman: runtimeResults.filter((item) => item.route === "/ai?context=foreman").length,
    ai_request: runtimeResults.filter((item) => item.route === "/ai?context=request").length,
  };
  const mergedFailures = [...failures, ...shardFailures];
  const integrity = {
    runtime_exceptions: runtimeResults.filter((item) =>
      Array.isArray(item.failures) &&
      item.failures.some((failure: unknown) =>
        typeof failure === "string" &&
        /exception|error|failed:/i.test(failure),
      ),
    ).length,
    non_finite_values: runtimeResults.reduce(
      (total, item) => total + Number(item.runtimeIntegrity?.nonFiniteValueCount ?? 0),
      0,
    ),
    negative_quantities: runtimeResults.reduce(
      (total, item) => total + Number(item.runtimeIntegrity?.negativeQuantityCount ?? 0),
      0,
    ),
    negative_totals: runtimeResults.reduce(
      (total, item) => total + Number(item.runtimeIntegrity?.negativeTotalCount ?? 0),
      0,
    ),
    unknown_units: runtimeResults.reduce(
      (total, item) => total + Number(item.runtimeIntegrity?.unknownUnitCount ?? 0),
      0,
    ),
    lost_required_boq_positions: runtimeResults.reduce(
      (total, item) => total + (Array.isArray(item.requiredRowsMissing) ? item.requiredRowsMissing.length : 0),
      0,
    ),
    silent_fallbacks: runtimeResults.reduce(
      (total, item) => total + Number(item.runtimeIntegrity?.silentPriceFallbackCount ?? 0),
      0,
    ),
    legacy_fallbacks_without_explicit_marker: runtimeResults.filter(
      (item) => item.fallbackUsed && typeof item.fallbackUsed !== "string",
    ).length,
    unconfirmed_contract_total_claims: runtimeResults.reduce(
      (total, item) =>
        total + Number(item.runtimeIntegrity?.unconfirmedContractTotalClaimCount ?? 0),
      0,
    ),
  };
  if (Object.values(integrity).some((count) => count !== 0)) {
    mergedFailures.push({
      classification: "REAL_10000_RUNTIME_INTEGRITY_FAILED",
      reason: JSON.stringify(integrity),
    });
  }
  const matrix = {
    ...expectedIdentity,
    wave: "S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_ACCEPTANCE_POINT_OF_NO_RETURN",
    final_status: mergedFailures.length === 0 ? "REAL_10000_SHARD_MERGE_OK" : "BLOCKED_REAL_10000_SHARD_MERGE",
    cases_total: runtimeResults.length,
    cases_passed: runtimeResults.filter((item) => Array.isArray(item.failures) && item.failures.length === 0).length,
    cases_failed: runtimeResults.filter((item) => Array.isArray(item.failures) && item.failures.length > 0).length,
    domains_covered: domains.length,
    macro_domains_total: macroDomains.length,
    shards_total: REAL_10000_ACCEPTANCE_CONTRACT.requiredShards,
    shards_present: matrices.length,
    shards_passed: matrices.filter((item) => item.final_status === "REAL_10000_SHARD_OK").length,
    unique_work_ids: runtimeIdSet.size,
    missing_work_ids: missingIds.length,
    duplicate_work_ids: runtimeIds.length - runtimeIdSet.size,
    unexpected_work_ids: unexpectedIds.length,
    shard_work_id_intersections: failures.filter(
      (item) => item.classification === "REAL_10000_SHARD_WORK_ID_INTERSECTION",
    ).length,
    integrity,
    single_shard_green_claimed: matrices.some((item) => item.single_shard_green_claimed === true || String(item.final_status).includes("GREEN_REAL_10000")),
    pdf_extraction_cases_total: pdfManifest.length,
    pdf_extraction_cases_passed: pdfManifest.filter((item) => item.passed).length,
    route_split: routeSplit,
    placeholder: false,
    fake_green_claimed: false,
  };

  writeReal10000Json("cases.json", REAL_DIVERSE_10000_CONSTRUCTION_WORKS);
  writeReal10000Json("domain_coverage.json", { domains_covered: domains.length, domains, route_split: routeSplit });
  writeReal10000Json("macro_domain_coverage.json", { macro_domains_total: macroDomains.length, macroDomains });
  writeReal10000Json("runtime_results.json", runtimeResults);
  writeReal10000Json("semantic_frame_results.json", semanticFrameResults);
  writeReal10000Json("work_plan_results.json", workPlanResults);
  writeReal10000Json("formula_results.json", formulaResults);
  writeReal10000Json("boq_quality_results.json", boqQualityResults);
  writeReal10000Json("catalog_binding_results.json", { catalog_items_bound_for_material_rows: catalogBindingResults.every((item) => item.passed), cases: catalogBindingResults });
  writeReal10000Json("source_tax_results.json", { source_evidence_present_all_priced_rows: sourceTaxResults.every((item) => item.sourcePassed), tax_or_local_warning_present_all: sourceTaxResults.every((item) => item.taxPassed), shards: sourceTaxResults });
  writeReal10000Json("unit_semantics.json", { unit_semantics_failed: unitSemanticsResults.some((item) => !item.passed), cases: unitSemanticsResults });
  writeReal10000Json("pdf_files_manifest.json", pdfManifest);
  writeReal10000Json("pdf_text_extract.json", pdfTextExtract);
  writeReal10000Json("pdf_parity.json", pdfParity);
  writeReal10000Json("merged_matrix.json", matrix);
  writeReal10000Json("merged_failures.json", mergedFailures);
  if (mergedFailures.length > 0) throw new Error(`REAL10000_SHARD_MERGE_FAILED:${mergedFailures.map((item) => `${item.classification}:${item.reason}`).join(";")}`);
  return { matrix, runtimeResults, pdfManifest };
}

if (require.main === module) {
  runReal10000DiverseConstructionWorksShardMerge();
}
