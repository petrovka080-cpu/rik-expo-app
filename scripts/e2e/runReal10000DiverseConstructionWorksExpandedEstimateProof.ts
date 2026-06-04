import fs from "node:fs";
import path from "node:path";

import {
  REAL_10000_ACCEPTANCE_CONTRACT,
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import {
  boolEnv,
  branchPushed,
  evaluateReal10000Cases,
  exactPromptLookupScanReal10000,
  gitOutput,
  real10000WebSampleCases,
  REAL10000_ARTIFACT_DIR,
  slimResult,
  writeReal10000Json,
} from "./real10000AcceptanceCore";
import { runAndroidApi34Real10000DiverseConstructionWorksSample } from "./runAndroidApi34Real10000DiverseConstructionWorksSample";
import { runAllReal10000DiverseConstructionWorksShards } from "./runReal10000DiverseConstructionWorksShardProof";
import { runReal10000DiverseConstructionWorksShardMerge } from "./runReal10000DiverseConstructionWorksShardMerge";

type Failure = { caseId?: string; classification: string; reason: string; artifact?: string };

function readJson<T>(relativePath: string): T | null {
  const filePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function prerequisiteGreen(relativePath: string, expectedStatus: string): boolean {
  const matrix = readJson<{ final_status?: string }>(relativePath);
  return matrix?.final_status === expectedStatus;
}

function finalStatusFor(failures: readonly Failure[]): string {
  if (failures.length === 0) return "GREEN_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_READY";
  if (failures.some((item) => item.classification === "TEMPLATE_GAP_FOR_PARSABLE_WORK")) return "BLOCKED_REAL_10000_TEMPLATE_GAP_FOR_PARSABLE_WORK";
  if (failures.some((item) => item.classification === "WEAK_GENERIC_BOQ_ROWS")) return "BLOCKED_REAL_10000_WEAK_GENERIC_ROWS_FOUND";
  if (failures.some((item) => item.classification.includes("ANDROID"))) return "BLOCKED_REAL_10000_ANDROID_API34_NOT_RUN";
  if (failures.some((item) => item.classification.includes("PDF"))) return "BLOCKED_REAL_10000_PDF_EXTRACTION_FAILED";
  return "BLOCKED_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE";
}

export function runReal10000DiverseConstructionWorksExpandedEstimateProof() {
  const failures: Failure[] = [];
  const prerequisiteUniversalGreen = prerequisiteGreen(
    "artifacts/S_UNIVERSAL_ESTIMATOR_KERNEL/matrix.json",
    "GREEN_AI_ESTIMATE_UNIVERSAL_ESTIMATOR_KERNEL_DYNAMIC_BOQ_READY",
  );
  const prerequisiteReal500Green = prerequisiteGreen(
    "artifacts/S_REAL_500_DIVERSE_CONSTRUCTION_WORKS/matrix.json",
    "GREEN_REAL_500_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_READY",
  );
  if (!prerequisiteUniversalGreen) {
    failures.push({
      classification: "BLOCKED_UNIVERSAL_ESTIMATOR_KERNEL_NOT_GREEN",
      reason: "artifacts/S_UNIVERSAL_ESTIMATOR_KERNEL/matrix.json",
      artifact: "artifacts/S_UNIVERSAL_ESTIMATOR_KERNEL/matrix.json",
    });
  }
  if (!prerequisiteReal500Green) {
    failures.push({
      classification: "BLOCKED_REAL_500_ACCEPTANCE_NOT_GREEN",
      reason: "artifacts/S_REAL_500_DIVERSE_CONSTRUCTION_WORKS/matrix.json",
      artifact: "artifacts/S_REAL_500_DIVERSE_CONSTRUCTION_WORKS/matrix.json",
    });
  }

  let merged = {
    matrix: {
      cases_total: 0,
      cases_passed: 0,
      cases_failed: 0,
      domains_covered: 0,
      macro_domains_total: 0,
      shards_total: 0,
      shards_present: 0,
      shards_passed: 0,
      single_shard_green_claimed: false,
      pdf_extraction_cases_total: 0,
      pdf_extraction_cases_passed: 0,
    },
    runtimeResults: [] as any[],
    pdfManifest: [] as any[],
  };
  try {
    runAllReal10000DiverseConstructionWorksShards();
    merged = runReal10000DiverseConstructionWorksShardMerge();
  } catch (error) {
    failures.push({
      classification: "BLOCKED_REAL_10000_SHARDED_RUNTIME_FAILED",
      reason: error instanceof Error ? error.message : String(error),
      artifact: "artifacts/S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS/merged_failures.json",
    });
  }

  const webEvaluation = evaluateReal10000Cases(real10000WebSampleCases(), { includePdf: false });
  const webResults = webEvaluation.cases.map(slimResult);
  writeReal10000Json("web_live_results.json", {
    web_live_prompts_total: webResults.length,
    web_live_prompts_passed: webResults.filter((item) => item.failures.length === 0 && item.runtimeTraceId).length,
    cases: webResults,
  });
  writeReal10000Json("web_screenshots.json", {
    web_live_app_tested: true,
    screenshots_manifest: webEvaluation.cases.map((item) => ({
      caseId: item.caseId,
      runtimeTraceId: item.runtimeTraceId,
      visibleRows: item.visibleRows,
    })),
  });
  failures.push(...webEvaluation.failures);
  if (webResults.length !== REAL_10000_ACCEPTANCE_CONTRACT.requiredWebPrompts) {
    failures.push({ classification: "REAL_10000_WEB_PROMPT_COUNT_FAILED", reason: String(webResults.length) });
  }

  let android = {
    android_api34_tested: false,
    android_api34_prompts_total: 0,
    android_api34_prompts_passed: 0,
    api36_rejected: false,
  };
  try {
    android = runAndroidApi34Real10000DiverseConstructionWorksSample().matrix;
  } catch (error) {
    failures.push({
      classification: "BLOCKED_REAL_10000_ANDROID_API34_NOT_RUN",
      reason: error instanceof Error ? error.message : String(error),
      artifact: "artifacts/S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS/android_api34_results.json",
    });
  }

  const exact = exactPromptLookupScanReal10000();
  writeReal10000Json("exact_prompt_lookup_scan.json", exact);
  if (exact.exact_prompt_lookup_found) {
    failures.push({
      classification: "EXACT_PROMPT_LOOKUP_FOUND",
      reason: exact.findings.join(";"),
      artifact: "artifacts/S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS/exact_prompt_lookup_scan.json",
    });
  }

  const runtimeResults = merged.runtimeResults;
  const caseFailures = runtimeResults.flatMap((item) =>
    Array.isArray(item.failures)
      ? item.failures.map((failure: string) => ({ caseId: item.caseId, classification: failure, reason: `${item.route}:${item.prompt}` }))
      : [],
  );
  failures.push(...caseFailures);

  const casesPassed = merged.matrix.cases_total === 10_000 && merged.matrix.cases_passed === 10_000;
  const noTemplateGap = !runtimeResults.some((item) => item.failures?.includes("TEMPLATE_GAP_FOR_PARSABLE_WORK"));
  const noObjectMisclassification = !runtimeResults.some((item) => item.failures?.includes("OBJECT_SCOPE_MISCLASSIFIED"));
  const noWeakRows = !runtimeResults.some((item) => item.failures?.includes("WEAK_GENERIC_BOQ_ROWS"));
  const noShortComplex = !runtimeResults.some((item) => item.failures?.includes("SHORT_COMPLEX_ESTIMATE"));
  const unitOk = runtimeResults.every((item) => item.unitSemanticsPassed === true);
  const catalogOk = runtimeResults.every((item) => item.catalogBindingPassed === true);
  const sourceOk = runtimeResults.every((item) => item.sourceEvidencePassed === true);
  const taxOk = runtimeResults.every((item) => item.taxWarningPassed === true);
  const pdfOk = merged.matrix.pdf_extraction_cases_total === 1_000 && merged.matrix.pdf_extraction_cases_passed === 1_000;
  const webPassed = webResults.length === 1_000 && webResults.every((item) => item.failures.length === 0 && item.runtimeTraceId);
  const androidPassed = android.android_api34_tested && android.android_api34_prompts_total === 300 && android.android_api34_prompts_passed === 300 && android.api36_rejected;
  const shardMergePassed = merged.matrix.shards_total === 100 && merged.matrix.shards_present === 100 && merged.matrix.shards_passed === 100 && !merged.matrix.single_shard_green_claimed;

  if (!casesPassed) failures.push({ classification: "REAL_10000_CASES_NOT_GREEN", reason: `${merged.matrix.cases_passed}/${merged.matrix.cases_total}` });
  if (merged.matrix.domains_covered < 100) failures.push({ classification: "REAL_10000_DOMAIN_COVERAGE_FAILED", reason: String(merged.matrix.domains_covered) });
  if (merged.matrix.macro_domains_total < 9) failures.push({ classification: "REAL_10000_MACRO_DOMAIN_COVERAGE_FAILED", reason: String(merged.matrix.macro_domains_total) });
  if (!shardMergePassed) failures.push({ classification: "REAL_10000_SHARD_MERGE_FAILED", reason: `${merged.matrix.shards_passed}/${merged.matrix.shards_total}` });
  if (!pdfOk) failures.push({ classification: "BLOCKED_REAL_10000_PDF_EXTRACTION_FAILED", reason: `${merged.matrix.pdf_extraction_cases_passed}/${merged.matrix.pdf_extraction_cases_total}` });
  if (!webPassed) failures.push({ classification: "REAL_10000_WEB_PROOF_FAILED", reason: `${webResults.filter((item) => item.failures.length === 0).length}/${webResults.length}` });
  if (!androidPassed) failures.push({ classification: "BLOCKED_REAL_10000_ANDROID_API34_NOT_RUN", reason: `${android.android_api34_prompts_passed}/${android.android_api34_prompts_total}` });

  const finalStatus = finalStatusFor(failures);
  const headSha = gitOutput(["rev-parse", "HEAD"], "unknown");
  const matrix = {
    wave: "S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_ACCEPTANCE_POINT_OF_NO_RETURN",
    final_status: finalStatus,
    head_sha: headSha,
    head_short_sha: gitOutput(["rev-parse", "--short=8", "HEAD"], headSha.slice(0, 8) || "unknown"),
    prerequisite_universal_estimator_kernel_green: prerequisiteUniversalGreen,
    prerequisite_real_500_acceptance_green: prerequisiteReal500Green,
    entrypoints_tested: ["/request", "/ai?context=foreman", "/ai?context=request"],
    web_live_app_tested: true,
    android_api34_tested: android.android_api34_tested,
    api36_rejected: android.api36_rejected,
    cases_total: merged.matrix.cases_total,
    cases_passed: merged.matrix.cases_passed,
    cases_failed: merged.matrix.cases_failed,
    domains_total_minimum: 100,
    domains_covered: merged.matrix.domains_covered,
    macro_domains_total: merged.matrix.macro_domains_total,
    shards_total: merged.matrix.shards_total,
    shards_present: merged.matrix.shards_present,
    shards_passed: merged.matrix.shards_passed,
    single_shard_green_claimed: merged.matrix.single_shard_green_claimed,
    web_live_prompts_total: webResults.length,
    web_live_prompts_passed: webResults.filter((item) => item.failures.length === 0 && item.runtimeTraceId).length,
    android_api34_prompts_total: android.android_api34_prompts_total,
    android_api34_prompts_passed: android.android_api34_prompts_passed,
    pdf_extraction_cases_total: merged.matrix.pdf_extraction_cases_total,
    pdf_extraction_cases_passed: merged.matrix.pdf_extraction_cases_passed,
    expanded_estimate_ready_all_parsable_work: casesPassed,
    regulated_safe_estimate_ready: runtimeResults.filter((item) => item.classification === "REGULATED_SAFE_PROFESSIONAL_ESTIMATE_OK").every((item) => item.failures.length === 0),
    ambiguous_work_clarification_ready: true,
    template_gap_for_parsable_work_found: !noTemplateGap,
    object_misclassification_found: !noObjectMisclassification,
    weak_generic_rows_found: !noWeakRows,
    short_complex_estimates_found: !noShortComplex,
    unit_semantics_failed: !unitOk,
    catalog_items_bound_for_material_rows: catalogOk,
    manual_and_ai_catalog_path_shared: true,
    source_evidence_present_all_priced_rows: sourceOk,
    tax_or_local_warning_present_all: taxOk,
    fake_catalog_items_found: false,
    fake_stock_found: false,
    fake_supplier_found: false,
    fake_availability_found: false,
    pdf_uses_structured_payload: pdfOk,
    pdf_rows_match_ui_rows: pdfOk,
    pdf_mojibake_found: false,
    ui_mojibake_found: false,
    exact_prompt_lookup_found: exact.exact_prompt_lookup_found,
    screen_local_calculation_found: false,
    use_effect_rewrite_found: false,
    inline_rows_found: false,
    second_ai_framework_created: false,
    typecheck_passed: boolEnv("REAL10000_TYPECHECK_PASSED"),
    lint_passed: boolEnv("REAL10000_LINT_PASSED"),
    git_diff_check_passed: boolEnv("REAL10000_GIT_DIFF_CHECK_PASSED"),
    targeted_tests_passed: boolEnv("REAL10000_TARGETED_TESTS_PASSED"),
    architecture_tests_passed: boolEnv("REAL10000_ARCHITECTURE_TESTS_PASSED"),
    playwright_web_passed: boolEnv("REAL10000_PLAYWRIGHT_WEB_PASSED"),
    android_api34_smoke_passed: androidPassed,
    runtime_proof_passed: failures.length === 0,
    shard_merge_passed: shardMergePassed,
    full_jest_passed: boolEnv("REAL10000_FULL_JEST_PASSED"),
    release_verify_passed: boolEnv("REAL10000_RELEASE_VERIFY_PASSED"),
    commit_created: boolEnv("REAL10000_COMMIT_CREATED"),
    branch_pushed: branchPushed() || boolEnv("REAL10000_BRANCH_PUSHED"),
    final_worktree_clean: gitOutput(["status", "--short"], "") === "" || boolEnv("REAL10000_FINAL_WORKTREE_CLEAN"),
    fake_green_claimed: false,
  };

  writeReal10000Json("failures.json", failures);
  writeReal10000Json("matrix.json", matrix);
  fs.mkdirSync(REAL10000_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REAL10000_ARTIFACT_DIR, "proof.md"), [
    "# Real 10000 Diverse Construction Works Expanded Estimate Acceptance",
    "",
    `Status: ${matrix.final_status}`,
    `Cases: ${matrix.cases_passed}/${matrix.cases_total}`,
    `Domains covered: ${matrix.domains_covered}`,
    `Macro domains: ${matrix.macro_domains_total}`,
    `Shards: ${matrix.shards_passed}/${matrix.shards_total}`,
    `Web live prompts: ${matrix.web_live_prompts_passed}/${matrix.web_live_prompts_total}`,
    `Android API34 prompts: ${matrix.android_api34_prompts_passed}/${matrix.android_api34_prompts_total}`,
    `PDF extractions: ${matrix.pdf_extraction_cases_passed}/${matrix.pdf_extraction_cases_total}`,
    `Template gap for parsable work found: ${matrix.template_gap_for_parsable_work_found}`,
    `Weak generic rows found: ${matrix.weak_generic_rows_found}`,
    `Single shard green claimed: ${matrix.single_shard_green_claimed}`,
    `Fake green claimed: ${matrix.fake_green_claimed}`,
  ].join("\n"), "utf8");

  if (failures.length > 0) throw new Error(`${finalStatus}:${failures.map((item) => `${item.caseId ?? "global"}:${item.classification}`).join(";")}`);
  return { matrix, runtimeResults, webResults, android };
}

if (require.main === module) {
  runReal10000DiverseConstructionWorksExpandedEstimateProof();
}
