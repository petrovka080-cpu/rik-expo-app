import path from "node:path";

import { validateAiEstimateArtifactLifecycle } from "../../src/lib/estimate/artifacts/validateAiEstimateArtifactLifecycle";
import { validateAiEstimateCatalogIndex } from "../../src/lib/estimate/catalog/validateAiEstimateCatalogIndex";
import { validateAiEstimateFormulaDag } from "../../src/lib/estimate/formula/validateAiEstimateFormulaDag";
import { validateAiEstimateParameterGraph } from "../../src/lib/estimate/graph/validateAiEstimateParameterGraph";
import { validateAiEstimateTelemetry } from "../../src/lib/estimate/observability/validateAiEstimateTelemetry";
import { validateAiEstimateRevisionEngineV2 } from "../../src/lib/estimate/revision/validateAiEstimateRevisionEngineV2";
import { validateAiEstimateRuntimeFacade } from "../../src/lib/estimate/runtime/validateAiEstimateRuntimeFacade";
import { validateAiEstimateWorkClassification } from "../../src/lib/estimate/semantic/validateAiEstimateWorkClassification";
import { validateAiEstimateStorageBoundary } from "../../src/lib/estimate/storage/validateAiEstimateStorageBoundary";
import { newestSummary } from "../e2e/renderStagingAcceptanceCore";
import {
  GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_ANDROID_SMOKE,
  type runAiEstimatePlatformCoreV2AndroidSmoke,
} from "../e2e/runAiEstimatePlatformCoreV2AndroidSmoke";
import {
  GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_ANDROID_PARITY,
  type runAiEstimatePlatformCoreV2WebAndroidParity,
} from "../e2e/runAiEstimatePlatformCoreV2WebAndroidParity";
import {
  GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_SMOKE,
  type runAiEstimatePlatformCoreV2WebSmoke,
} from "../e2e/runAiEstimatePlatformCoreV2WebSmoke";
import {
  GREEN_AI_ESTIMATE_PLATFORM_ARCHITECTURE_INVENTORY,
  type auditAiEstimatePlatformArchitectureInventory,
} from "./auditAiEstimatePlatformArchitectureInventory";
import {
  GREEN_AI_ESTIMATE_CATALOG_INDEX_11610,
  type auditAiEstimateCatalogIndex11610,
} from "./auditAiEstimateCatalogIndex11610";
import {
  GREEN_AI_ESTIMATE_CODE_QUALITY_BOUNDARIES,
  type auditAiEstimateCodeQualityBoundaries,
} from "./auditAiEstimateCodeQualityBoundaries";
import {
  GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_PERFORMANCE,
  type auditAiEstimatePlatformCoreV2Performance,
} from "./auditAiEstimatePlatformCoreV2Performance";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import {
  GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX,
  type runAiEstimatePlatformCoreV2Matrix,
} from "./runAiEstimatePlatformCoreV2Matrix";
import {
  GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_SOURCE_GATES,
  type runAiEstimatePlatformCoreV2SourceGates,
} from "./runAiEstimatePlatformCoreV2SourceGates";
import {
  GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_TARGETED_TESTS,
  type runAiEstimatePlatformCoreV2TargetedTests,
} from "./runAiEstimatePlatformCoreV2TargetedTests";

export const GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_SEMANTIC_SCALE_REFACTOR_READY_NO_RELEASE =
  "GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_SEMANTIC_SCALE_REFACTOR_READY_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_PLATFORM_CORE_V2_SEMANTIC_SCALE_REFACTOR_FAILED_NO_GREEN =
  "STOP_AI_ESTIMATE_PLATFORM_CORE_V2_SEMANTIC_SCALE_REFACTOR_FAILED_NO_GREEN" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-v2-semantic-scale-refactor");

type SummaryOf<T> = T extends (...args: any[]) => { summary: infer S } ? S : never;

function latest<T>(dir: string, sourceSha: string) {
  return newestSummary<T>(path.join(ROOT, dir), (summary) => (summary as { source_sha?: string }).source_sha === sourceSha);
}

export function auditAiEstimatePlatformCoreV2SemanticScaleRefactor(input: { writeSummary?: boolean } = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const branch = gitOutput(["branch", "--show-current"]);
  const upstreamSync = gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " ");
  const runtime = validateAiEstimateRuntimeFacade();
  const catalog = validateAiEstimateCatalogIndex();
  const classifier = validateAiEstimateWorkClassification();
  const graph = validateAiEstimateParameterGraph();
  const formula = validateAiEstimateFormulaDag();
  const revision = validateAiEstimateRevisionEngineV2();
  const artifacts = validateAiEstimateArtifactLifecycle();
  const storage = validateAiEstimateStorageBoundary();
  const telemetry = validateAiEstimateTelemetry();
  const inventory = latest<SummaryOf<typeof auditAiEstimatePlatformArchitectureInventory>>("architecture-inventory", sourceSha);
  const catalogAudit = latest<SummaryOf<typeof auditAiEstimateCatalogIndex11610>>("catalog-index", sourceSha);
  const performance = latest<SummaryOf<typeof auditAiEstimatePlatformCoreV2Performance>>("performance", sourceSha);
  const codeQuality = latest<SummaryOf<typeof auditAiEstimateCodeQualityBoundaries>>("code-quality-boundaries", sourceSha);
  const matrix = latest<SummaryOf<typeof runAiEstimatePlatformCoreV2Matrix>>("matrix", sourceSha);
  const web = latest<SummaryOf<typeof runAiEstimatePlatformCoreV2WebSmoke>>("web", sourceSha);
  const android = latest<SummaryOf<typeof runAiEstimatePlatformCoreV2AndroidSmoke>>("android-chrome", sourceSha);
  const parity = latest<SummaryOf<typeof runAiEstimatePlatformCoreV2WebAndroidParity>>("web-android-parity", sourceSha);
  const targeted = latest<SummaryOf<typeof runAiEstimatePlatformCoreV2TargetedTests>>("targeted-tests", sourceSha);
  const sourceGates = latest<SummaryOf<typeof runAiEstimatePlatformCoreV2SourceGates>>("source-gates", sourceSha);

  const checks = {
    branch_ok: branch === "release/ios-after-build48-integration",
    upstream_sync_ok: upstreamSync === "0 0",
    runtime_ok: runtime.ok,
    catalog_ok: catalog.ok && catalogAudit?.summary.final_status === GREEN_AI_ESTIMATE_CATALOG_INDEX_11610,
    classifier_ok: classifier.ok,
    graph_ok: graph.ok,
    formula_ok: formula.ok,
    revision_ok: revision.ok,
    artifacts_ok: artifacts.ok,
    storage_ok: storage.ok,
    telemetry_ok: telemetry.ok,
    inventory_ok: inventory?.summary.final_status === GREEN_AI_ESTIMATE_PLATFORM_ARCHITECTURE_INVENTORY,
    performance_ok: performance?.summary.final_status === GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_PERFORMANCE,
    code_quality_ok: codeQuality?.summary.final_status === GREEN_AI_ESTIMATE_CODE_QUALITY_BOUNDARIES,
    matrix_ok: matrix?.summary.final_status === GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX,
    web_ok: web?.summary.final_status === GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_SMOKE,
    android_ok: android?.summary.final_status === GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_ANDROID_SMOKE,
    parity_ok: parity?.summary.final_status === GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_ANDROID_PARITY,
    targeted_ok: targeted?.summary.final_status === GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_TARGETED_TESTS,
    source_gates_ok: sourceGates?.summary.final_status === GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_SOURCE_GATES,
  };
  const blocking_reasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  const finalGreen = blocking_reasons.length === 0;
  const summary = {
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_SEMANTIC_SCALE_REFACTOR_READY_NO_RELEASE
      : STOP_AI_ESTIMATE_PLATFORM_CORE_V2_SEMANTIC_SCALE_REFACTOR_FAILED_NO_GREEN,
    source_sha: sourceSha,
    branch,
    upstream_sync: upstreamSync,
    generated_at: new Date().toISOString(),

    ai_estimate_runtime_facade_created: runtime.aiEstimateRuntimeFacadeCreated,
    request_flow_uses_runtime: runtime.requestFlowUsesRuntime,
    consumer_repair_flow_uses_runtime: runtime.consumerRepairFlowUsesRuntime,
    foreman_materials_flow_uses_runtime: runtime.foremanMaterialsFlowUsesRuntime,
    foreman_subcontracts_flow_uses_runtime: runtime.foremanSubcontractsFlowUsesRuntime,
    director_flow_uses_runtime: runtime.directorFlowUsesRuntime,
    pdf_flow_uses_runtime: runtime.pdfFlowUsesRuntime,
    buyer_package_flow_uses_runtime: runtime.buyerPackageFlowUsesRuntime,

    catalog_total_templates: catalog.catalogTotalTemplates,
    catalog_index_coverage: catalog.catalogIndexCoverage,
    catalog_search_p95_ms: catalog.catalogSearchP95Ms,

    semantic_work_classifier_created: classifier.semanticWorkClassifierCreated,
    work_family_classification_coverage: classifier.workFamilyClassificationCoverage,
    top1_accuracy_on_golden_cases: classifier.top1AccuracyOnGoldenCases,
    unit_conflict_regressions_passed: classifier.unitConflictRegressionsPassed,

    parameter_graph_created: graph.parameterGraphCreated,
    parameter_graph_coverage: graph.parameterGraphCoverage,
    exact_identifier_dependency_matching: graph.exactIdentifierDependencyMatching,
    substring_dependency_matching_absent: graph.substringDependencyMatchingAbsent,

    formula_dag_created: formula.formulaDagCreated,
    formula_dag_coverage: formula.formulaDagCoverage,
    safe_formula_evaluator_created: formula.safeFormulaEvaluatorCreated,
    eval_not_used: formula.evalNotUsed,
    incremental_recalculation_supported: formula.incrementalRecalculationSupported,
    full_rebuild_snapshot_hash_matches_incremental_recalc: formula.fullRebuildSnapshotHashMatchesIncrementalRecalc,

    revision_engine_v2_created: revision.revisionEngineV2Created,
    revision_is_immutable: revision.revisionIsImmutable,
    revision_chain_preserved: revision.revisionChainPreserved,

    artifact_lifecycle_created: artifacts.artifactLifecycleCreated,
    pdf_rows_equal_snapshot_rows: artifacts.pdfRowsEqualSnapshotRows,
    buyer_package_is_procurement_subset: artifacts.buyerPackageIsProcurementSubset,
    no_fake_final_total: artifacts.noFakeFinalTotal,

    storage_boundary_created: storage.storageBoundaryCreated,
    direct_localStorage_calls_outside_storage_adapter_count: storage.directLocalStorageCallsOutsideStorageAdapterCount,
    approved_history_never_treated_as_cache: storage.approvedHistoryNeverTreatedAsCache,

    telemetry_boundary_created: telemetry.telemetryBoundaryCreated,
    pii_redaction_passed: telemetry.piiRedactionPassed,
    full_prompt_not_logged_unredacted: telemetry.fullPromptNotLoggedUnredacted,

    all_core_operations_within_slo: performance?.summary.all_core_operations_within_slo === true,
    memory_budget_violations_count: performance?.summary.memory_budget_violations_count ?? -1,

    catalog_coverage: matrix?.summary.catalog_coverage ?? "missing",
    random_create_draft_cases_passed: matrix?.summary.random_create_draft_cases_passed ?? "missing",
    critical_create_draft_cases_passed: matrix?.summary.critical_create_draft_cases_passed ?? "missing",
    parameter_override_cases_passed: matrix?.summary.parameter_override_cases_passed ?? "missing",
    missing_input_cases_passed: matrix?.summary.missing_input_cases_passed ?? "missing",
    pdf_snapshot_parity_cases_passed: matrix?.summary.pdf_snapshot_parity_cases_passed ?? "missing",
    buyer_package_parity_cases_passed: matrix?.summary.buyer_package_parity_cases_passed ?? "missing",
    history_reload_cases_passed: matrix?.summary.history_reload_cases_passed ?? "missing",

    actual_web_browser_platform_core_v2_smoke_passed: web?.summary.actual_web_browser_platform_core_v2_smoke_passed === true,
    web_core_v2_cases_passed: web?.summary.web_core_v2_cases_passed ?? "missing",
    web_console_errors_count: web?.summary.web_console_errors_count ?? -1,

    actual_android_emulator_platform_core_v2_smoke_passed: android?.summary.actual_android_emulator_platform_core_v2_smoke_passed === true,
    android_core_v2_cases_passed: android?.summary.android_core_v2_cases_passed ?? "missing",
    android_console_errors_count: android?.summary.android_console_errors_count ?? -1,

    web_android_snapshot_hash_parity: parity?.summary.web_android_snapshot_hash_parity === true,
    web_android_pdf_buyer_parity: parity?.summary.web_android_pdf_buyer_parity === true,
    web_android_history_parity: parity?.summary.web_android_history_parity === true,

    circular_imports_count: codeQuality?.summary.circular_imports_count ?? -1,
    ui_low_level_estimate_imports_count: codeQuality?.summary.ui_low_level_estimate_imports_count ?? -1,
    duplicate_estimate_engines_count: codeQuality?.summary.duplicate_estimate_engines_count ?? -1,
    duplicate_parameter_parsers_count: codeQuality?.summary.duplicate_parameter_parsers_count ?? -1,
    raw_internal_ids_visible_count: codeQuality?.summary.raw_internal_ids_visible_count ?? -1,

    targeted_platform_core_v2_tests_passed: targeted?.summary.targeted_platform_core_v2_tests_passed === true,
    typecheck_passed: sourceGates?.summary.typecheck_passed === true,
    lint_passed: sourceGates?.summary.lint_passed === true,
    diff_check_passed: sourceGates?.summary.diff_check_passed === true,
    no_test_weakening_passed: sourceGates?.summary.no_test_weakening_passed === true,
    web_public_smoke_passed: sourceGates?.summary.web_public_smoke_passed === true,
    ci_office_market_passed: sourceGates?.summary.ci_office_market_passed === true,
    secret_scan_passed: sourceGates?.summary.secret_scan_passed === true,

    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    render_started: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    fake_green_claimed: false,

    artifact_paths: {
      inventory: inventory?.path ?? null,
      catalog: catalogAudit?.path ?? null,
      performance: performance?.path ?? null,
      code_quality: codeQuality?.path ?? null,
      matrix: matrix?.path ?? null,
      web: web?.path ?? null,
      android: android?.path ?? null,
      parity: parity?.path ?? null,
      targeted: targeted?.path ?? null,
      source_gates: sourceGates?.path ?? null,
    },
    checks,
    blocking_reasons,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = auditAiEstimatePlatformCoreV2SemanticScaleRefactor({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_SEMANTIC_SCALE_REFACTOR_READY_NO_RELEASE) {
    process.exitCode = 1;
  }
}
