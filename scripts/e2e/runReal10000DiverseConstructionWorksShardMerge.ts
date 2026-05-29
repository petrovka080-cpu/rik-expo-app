import fs from "node:fs";
import path from "node:path";

import {
  REAL_10000_ACCEPTANCE_CONTRACT,
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import {
  REAL10000_SHARDS_DIR,
  writeReal10000Json,
} from "./real10000AcceptanceCore";

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function shardDir(index: number): string {
  return path.join(REAL10000_SHARDS_DIR, `shard_${String(index).padStart(3, "0")}`);
}

export function runReal10000DiverseConstructionWorksShardMerge() {
  const failures: Array<{ classification: string; reason: string; artifact?: string }> = [];
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
    runtimeResults.push(...(fs.existsSync(path.join(dir, "runtime_results.json")) ? readJson<any[]>(path.join(dir, "runtime_results.json")) : []));
    semanticFrameResults.push(...(fs.existsSync(path.join(dir, "semantic_frame_results.json")) ? readJson<any[]>(path.join(dir, "semantic_frame_results.json")) : []));
    workPlanResults.push(...(fs.existsSync(path.join(dir, "work_plan_results.json")) ? readJson<any[]>(path.join(dir, "work_plan_results.json")) : []));
    formulaResults.push(...(fs.existsSync(path.join(dir, "formula_results.json")) ? readJson<any[]>(path.join(dir, "formula_results.json")) : []));
    boqQualityResults.push(...(fs.existsSync(path.join(dir, "boq_quality_results.json")) ? readJson<any[]>(path.join(dir, "boq_quality_results.json")) : []));
    catalogBindingResults.push(...(fs.existsSync(path.join(dir, "catalog_binding_results.json")) ? readJson<any>(path.join(dir, "catalog_binding_results.json")).cases ?? [] : []));
    sourceTaxResults.push(...(fs.existsSync(path.join(dir, "source_tax_results.json")) ? [readJson<any>(path.join(dir, "source_tax_results.json"))] : []));
    unitSemanticsResults.push(...(fs.existsSync(path.join(dir, "unit_semantics.json")) ? readJson<any>(path.join(dir, "unit_semantics.json")).cases ?? [] : []));
    pdfManifest.push(...(fs.existsSync(path.join(dir, "pdf_files_manifest.json")) ? readJson<any[]>(path.join(dir, "pdf_files_manifest.json")) : []));
    pdfTextExtract.push(...(fs.existsSync(path.join(dir, "pdf_text_extract.json")) ? readJson<any[]>(path.join(dir, "pdf_text_extract.json")) : []));
    pdfParity.push(...(fs.existsSync(path.join(dir, "pdf_parity.json")) ? readJson<any[]>(path.join(dir, "pdf_parity.json")) : []));
  }

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
  const matrix = {
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
    single_shard_green_claimed: matrices.some((item) => item.single_shard_green_claimed === true || String(item.final_status).includes("GREEN_REAL_10000")),
    pdf_extraction_cases_total: pdfManifest.length,
    pdf_extraction_cases_passed: pdfManifest.filter((item) => item.passed).length,
    route_split: routeSplit,
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
