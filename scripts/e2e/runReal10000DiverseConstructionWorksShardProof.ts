import fs from "node:fs";
import path from "node:path";

import {
  REAL_10000_ACCEPTANCE_CONTRACT,
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import {
  evaluateReal10000Cases,
  REAL10000_SHARDS_DIR,
  slimResult,
  summarizeReal10000,
  writeJsonFile,
} from "./real10000AcceptanceCore";

function shardDir(index: number): string {
  return path.join(REAL10000_SHARDS_DIR, `shard_${String(index).padStart(3, "0")}`);
}

function shardCases(index: number) {
  const start = index * REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard;
  return REAL_DIVERSE_10000_CONSTRUCTION_WORKS.slice(start, start + REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard);
}

export function runReal10000DiverseConstructionWorksShardProof(index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= REAL_10000_ACCEPTANCE_CONTRACT.requiredShards) {
    throw new Error(`REAL10000_INVALID_SHARD:${index}`);
  }
  const cases = shardCases(index);
  const evaluation = evaluateReal10000Cases(cases, { includePdf: true });
  const summary = summarizeReal10000(evaluation);
  const failures = [...evaluation.failures];
  const caseIds = evaluation.cases.map((item) => item.caseId);
  if (cases.length !== REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard) {
    failures.push({ classification: "REAL_10000_SHARD_CASE_COUNT_FAILED", reason: `${cases.length}` });
  }
  if (new Set(caseIds).size !== caseIds.length) {
    failures.push({ classification: "REAL_10000_SHARD_DUPLICATE_CASE_IDS", reason: String(index) });
  }
  const dir = shardDir(index);
  fs.mkdirSync(dir, { recursive: true });
  const runtimeResults = evaluation.cases.map(slimResult);
  writeJsonFile(path.join(dir, "runtime_results.json"), runtimeResults);
  writeJsonFile(path.join(dir, "semantic_frame_results.json"), evaluation.cases.map((item) => ({ caseId: item.caseId, semanticFrame: item.semanticFrame, failures: item.failures })));
  writeJsonFile(path.join(dir, "work_plan_results.json"), evaluation.cases.map((item) => ({ caseId: item.caseId, constructionWorkPlan: item.constructionWorkPlan })));
  writeJsonFile(path.join(dir, "formula_results.json"), evaluation.cases.map((item) => ({ caseId: item.caseId, formulaResult: item.formulaResult })));
  writeJsonFile(path.join(dir, "boq_quality_results.json"), evaluation.cases.map((item) => ({ caseId: item.caseId, rowCount: item.rowCount, requiredRowsFound: item.requiredRowsFound, forbiddenRowsFound: item.forbiddenRowsFound })));
  writeJsonFile(path.join(dir, "catalog_binding_results.json"), { passed: evaluation.cases.every((item) => item.catalogBindingPassed), cases: evaluation.cases.map((item) => ({ caseId: item.caseId, passed: item.catalogBindingPassed })) });
  writeJsonFile(path.join(dir, "source_tax_results.json"), { sourcePassed: evaluation.cases.every((item) => item.sourceEvidencePassed), taxPassed: evaluation.cases.every((item) => item.taxWarningPassed) });
  writeJsonFile(path.join(dir, "unit_semantics.json"), { passed: evaluation.cases.every((item) => item.unitSemanticsPassed), cases: evaluation.cases.map((item) => ({ caseId: item.caseId, passed: item.unitSemanticsPassed })) });
  writeJsonFile(path.join(dir, "pdf_files_manifest.json"), evaluation.cases.filter((item) => item.pdfChecked).map((item) => ({ caseId: item.caseId, pdfFile: item.pdfFile, passed: item.pdfPassed })));
  writeJsonFile(path.join(dir, "pdf_text_extract.json"), evaluation.cases.filter((item) => item.pdfChecked).map((item) => ({ caseId: item.caseId, text: item.pdfText })));
  writeJsonFile(path.join(dir, "pdf_parity.json"), evaluation.cases.filter((item) => item.pdfChecked).map((item) => ({ caseId: item.caseId, pdfRowsMatchUiRows: item.pdfPassed })));
  writeJsonFile(path.join(dir, "failures.json"), failures);
  const matrix = {
    wave: "S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_ACCEPTANCE_POINT_OF_NO_RETURN",
    shard_index: index,
    final_status: failures.length === 0 ? "REAL_10000_SHARD_OK" : "BLOCKED_REAL_10000_SHARD",
    cases_total: summary.cases_total,
    cases_passed: summary.cases_passed,
    cases_failed: summary.cases_failed,
    pdf_extraction_cases_total: summary.pdf_extraction_cases_total,
    pdf_extraction_cases_passed: summary.pdf_extraction_cases_passed,
    domains_covered: summary.domains_covered,
    macro_domains_total: summary.macro_domains_total,
    single_shard_green_claimed: false,
    fake_green_claimed: false,
  };
  writeJsonFile(path.join(dir, "matrix.json"), matrix);
  if (failures.length > 0) {
    throw new Error(`REAL10000_SHARD_${index}_FAILED:${failures.map((item) => `${item.caseId ?? "global"}:${item.classification}`).join(";")}`);
  }
  return { matrix, evaluation };
}

export function runAllReal10000DiverseConstructionWorksShards() {
  const failures: string[] = [];
  for (let index = 0; index < REAL_10000_ACCEPTANCE_CONTRACT.requiredShards; index += 1) {
    try {
      runReal10000DiverseConstructionWorksShardProof(index);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (failures.length > 0) throw new Error(`REAL10000_SHARDS_FAILED:${failures.join(";")}`);
}

if (require.main === module) {
  const all = process.argv.includes("--all");
  const shardArg = process.argv.find((arg) => arg.startsWith("--shard="));
  if (all) {
    runAllReal10000DiverseConstructionWorksShards();
  } else if (shardArg) {
    runReal10000DiverseConstructionWorksShardProof(Number(shardArg.split("=")[1]));
  } else {
    throw new Error("REAL10000_SHARD_PROOF_REQUIRES_--all_OR_--shard=N");
  }
}
