import path from "node:path";

import { validatePlatformCoreRegistry } from "../../src/lib/estimate/validatePlatformCoreRegistry";
import { validateEstimateLineage } from "../../src/lib/estimate/validateEstimateLineage";
import { validateAiEstimateScaleBudgets } from "../../src/lib/platform/platformScaleBudgets";
import { validateAiEstimateEvidenceRegistry, type EvidenceSummaryLike } from "../../src/lib/platform/evidenceRegistry";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  newestSummary,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";
import {
  GREEN_AI_ESTIMATE_PLATFORM_CORE_ANDROID_SMOKE,
} from "../e2e/runAiEstimatePlatformCoreAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_PLATFORM_CORE_WEB_ANDROID_PARITY,
} from "../e2e/runAiEstimatePlatformCoreWebAndroidParity";
import {
  GREEN_AI_ESTIMATE_PLATFORM_CORE_WEB_SMOKE,
} from "../e2e/runAiEstimatePlatformCoreWebSmoke";
import { auditNoSecondEstimateEngine } from "./auditNoSecondEstimateEngine";
import { runPlatformCoreScaleMatrix } from "./runPlatformCoreScaleMatrix";

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-scale-seal");
const WEB_ROOT = path.join(ROOT, "web");
const ANDROID_ROOT = path.join(ROOT, "android-chrome");
const PARITY_ROOT = path.join(ROOT, "web-android-parity");

export const GREEN_AI_ESTIMATE_PLATFORM_CORE_SCALE_SEAL =
  "GREEN_AI_ESTIMATE_PLATFORM_CORE_SCALE_SEAL_11610_COMMITTED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_PLATFORM_CORE_SCALE_SEAL =
  "STOP_AI_ESTIMATE_PLATFORM_CORE_SCALE_SEAL_11610_INCOMPLETE_NO_GREEN" as const;

type SummaryLike = Record<string, unknown>;

function finalStatus(summary: SummaryLike | null | undefined): string {
  return String(summary?.final_status ?? "");
}

function sourceSha(summary: SummaryLike | null | undefined): string {
  return String(summary?.source_sha ?? "");
}

function latestGreen(root: string, marker: string): { path: string; summary: SummaryLike } | null {
  return newestSummary<SummaryLike>(root, (summary) => finalStatus(summary).includes(marker));
}

function flag(name: string): boolean {
  return hasFlag(name);
}

function all(values: Record<string, boolean>): boolean {
  return Object.values(values).every(Boolean);
}

export function auditAiEstimatePlatformCoreScaleSeal() {
  const head = currentSourceSha();
  const branch = currentBranch();
  const upstreamSync = currentUpstreamSync();
  const registry = validatePlatformCoreRegistry();
  const noSecond = auditNoSecondEstimateEngine().artifact;
  const lineage = validateEstimateLineage();
  const budgets = validateAiEstimateScaleBudgets();
  const matrix = runPlatformCoreScaleMatrix({ writeSummary: false }).artifact;
  const web = latestGreen(WEB_ROOT, GREEN_AI_ESTIMATE_PLATFORM_CORE_WEB_SMOKE);
  const android = latestGreen(ANDROID_ROOT, GREEN_AI_ESTIMATE_PLATFORM_CORE_ANDROID_SMOKE);
  const parity = latestGreen(PARITY_ROOT, GREEN_AI_ESTIMATE_PLATFORM_CORE_WEB_ANDROID_PARITY);

  const evidence = validateAiEstimateEvidenceRegistry({
    headSha: head,
    currentScopeSummaries: [web?.summary, android?.summary, parity?.summary].filter(Boolean) as EvidenceSummaryLike[],
    currentWebSummary: web?.summary as EvidenceSummaryLike | null,
    currentAndroidSummary: android?.summary as EvidenceSummaryLike | null,
    currentParitySummary: parity?.summary as EvidenceSummaryLike | null,
  });

  const preconditions = {
    real_named_boq_green_found: Boolean(latestGreen(
      path.join(".release-runtime", "ai-estimate-real-named-boq-line-items"),
      "GREEN_AI_ESTIMATE_REAL_NAMED",
    )),
    trusted_costing_green_found: Boolean(latestGreen(
      path.join(".release-runtime", "ai-estimate-trusted-costing-pricebook"),
      "GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK",
    )),
    approved_history_scaling_green_found: Boolean(latestGreen(
      path.join(".release-runtime", "ai-estimate-approved-history-scaling"),
      "GREEN_AI_ESTIMATE_APPROVED_HISTORY",
    )),
    material_quantity_accuracy_green_found: Boolean(latestGreen(
      path.join(".release-runtime", "ai-estimate-material-quantity-accuracy"),
      "GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY",
    )),
    foreman_sync_green_found: Boolean(latestGreen(
      path.join(".release-runtime", "ai-estimate-foreman-materials-subcontracts-sync"),
      "GREEN_AI_ESTIMATE_FOREMAN_MATERIALS_SUBCONTRACTS_SYNCED",
    )),
  };

  const sourceGates = {
    targeted_tests_passed: flag("targeted-tests-passed"),
    typecheck_passed: flag("typecheck-passed"),
    lint_passed: flag("lint-passed"),
    diff_check_passed: flag("diff-check-passed"),
    no_test_weakening_passed: flag("no-test-weakening-passed"),
    web_public_smoke_passed: flag("web-public-smoke-passed"),
    ci_office_market_passed: flag("ci-office-market-passed"),
    secret_scan_passed: flag("secret-scan-passed"),
  };

  const webFresh = sourceSha(web?.summary) === head;
  const androidFresh = sourceSha(android?.summary) === head;
  const parityFresh = sourceSha(parity?.summary) === head;
  const webPassed =
    webFresh &&
    web?.summary.actual_web_browser_platform_core_passed === true &&
    web?.summary.web_platform_core_cases_passed === "100/100" &&
    Number(web?.summary.web_console_errors_count ?? -1) === 0;
  const androidPassed =
    androidFresh &&
    android?.summary.actual_android_emulator_platform_core_passed === true &&
    android?.summary.android_platform_core_cases_passed === "100/100" &&
    Number(android?.summary.android_console_errors_count ?? -1) === 0 &&
    android?.summary.android_emulator_health_degraded === false;
  const parityPassed =
    parityFresh &&
    parity?.summary.same_platform_core_corpus_used_for_web_android === true &&
    parity?.summary.web_android_case_id_parity === true &&
    parity?.summary.web_android_snapshot_hash_parity === true &&
    parity?.summary.web_android_pdf_buyer_parity === true &&
    parity?.summary.web_android_history_count_parity === true &&
    parity?.summary.web_android_foreman_entry_parity === true;

  const blockers = [
    branch === "release/ios-after-build48-integration" ? "" : `branch:${branch}`,
    upstreamSync === "0 0" ? "" : `upstream_sync:${upstreamSync}`,
    all(preconditions) ? "" : "preconditions_missing",
    registry.passed ? "" : `platform_core_registry:${registry.failures.join("|")}`,
    noSecond.passed ? "" : `no_second_engine:${(noSecond.violations as string[]).join("|")}`,
    lineage.passed ? "" : `lineage:${lineage.failures.join("|")}`,
    budgets.passed ? "" : `scale_budgets:${budgets.failures.join("|")}`,
    evidence.passed ? "" : `evidence:${evidence.failures.join("|")}`,
    matrix.final_status === "GREEN_AI_ESTIMATE_PLATFORM_CORE_SCALE_MATRIX" ? "" : "platform_core_matrix_failed",
    webPassed ? "" : webFresh ? "web_platform_core_smoke_failed" : "web_platform_core_smoke_missing_or_stale",
    androidPassed ? "" : androidFresh ? "android_platform_core_smoke_failed" : "android_platform_core_smoke_missing_or_stale",
    parityPassed ? "" : parityFresh ? "web_android_parity_failed" : "web_android_parity_missing_or_stale",
    ...Object.entries(sourceGates).map(([key, value]) => (value ? "" : key)),
  ].filter(Boolean);
  const green = blockers.length === 0;

  const summary = {
    final_status: green ? GREEN_AI_ESTIMATE_PLATFORM_CORE_SCALE_SEAL : STOP_AI_ESTIMATE_PLATFORM_CORE_SCALE_SEAL,
    source_sha: head,
    branch,
    upstream_sync: upstreamSync,
    generated_at: new Date().toISOString(),
    ...preconditions,

    platform_core_registry_created: registry.platform_core_registry_created,
    all_estimate_entries_registered: registry.all_estimate_entries_registered,
    all_entries_use_shared_engine: registry.all_entries_use_shared_engine,
    all_entries_use_shared_snapshot_model: registry.all_entries_use_shared_snapshot_model,
    all_entries_use_shared_revision_model: registry.all_entries_use_shared_revision_model,
    all_entries_use_shared_pdf_renderer: registry.all_entries_use_shared_pdf_renderer,
    all_entries_use_shared_buyer_handoff: registry.all_entries_use_shared_buyer_handoff,
    no_unregistered_estimate_entry_points: registry.no_unregistered_estimate_entry_points,

    no_second_estimate_engine_passed: noSecond.no_second_estimate_engine_passed,
    no_screen_local_calculation_passed: noSecond.no_screen_local_calculation_passed,
    no_duplicate_pdf_engine_passed: noSecond.no_duplicate_pdf_engine_passed,
    no_duplicate_buyer_handoff_engine_passed: noSecond.no_duplicate_buyer_handoff_engine_passed,

    estimate_lineage_contract_created: lineage.estimate_lineage_contract_created,
    all_artifacts_have_source_snapshot: lineage.all_artifacts_have_source_snapshot,
    pdf_snapshot_binding_passed: lineage.pdf_snapshot_binding_passed,
    buyer_snapshot_binding_passed: lineage.buyer_snapshot_binding_passed,
    history_snapshot_binding_passed: lineage.history_snapshot_binding_passed,
    foreman_snapshot_binding_passed: lineage.foreman_snapshot_binding_passed,
    stale_artifact_policy_passed: lineage.stale_artifact_policy_passed,

    scale_budgets_created: budgets.scale_budgets_created,
    catalog_scale_budget_passed: budgets.catalog_scale_budget_passed,
    history_50000_scale_budget_locked: budgets.history_50000_scale_budget_locked,
    pdf_package_scale_budget_passed: budgets.pdf_package_scale_budget_passed,
    buyer_handoff_scale_budget_passed: budgets.buyer_handoff_scale_budget_passed,
    web_android_corpus_budget_passed: budgets.web_android_corpus_budget_passed,
    semantic_1500_budget_passed: budgets.semantic_1500_budget_passed,

    evidence_registry_created: evidence.evidence_registry_created,
    no_stale_green_accepted: evidence.no_stale_green_accepted,
    source_sha_matches_head_for_current_scope: evidence.source_sha_matches_head_for_current_scope,
    web_android_artifacts_current: evidence.web_android_artifacts_current,
    route_equivalent_rejected_as_real_browser: evidence.route_equivalent_rejected_as_real_browser,
    manual_summary_green_rejected: evidence.manual_summary_green_rejected,

    platform_core_matrix_created: matrix.platform_core_matrix_created,
    matrix_cases_total: matrix.matrix_cases_total,
    matrix_cases_passed: matrix.matrix_cases_passed,
    request_entry_passed: matrix.request_entry_passed,
    history_entry_passed: matrix.history_entry_passed,
    foreman_materials_entry_passed: matrix.foreman_materials_entry_passed,
    foreman_subcontracts_entry_passed: matrix.foreman_subcontracts_entry_passed,
    director_review_entry_passed: matrix.director_review_entry_passed,
    buyer_handoff_entry_passed: matrix.buyer_handoff_entry_passed,

    actual_web_browser_platform_core_passed: webPassed,
    web_platform_core_cases_passed: String(web?.summary.web_platform_core_cases_passed ?? "0/100"),
    web_request_flow_passed: web?.summary.web_request_flow_passed === true,
    web_history_flow_passed: web?.summary.web_history_flow_passed === true,
    web_foreman_materials_flow_passed: web?.summary.web_foreman_materials_flow_passed === true,
    web_foreman_subcontracts_flow_passed: web?.summary.web_foreman_subcontracts_flow_passed === true,
    web_pdf_buyer_flow_passed: web?.summary.web_pdf_buyer_flow_passed === true,
    web_console_errors_count: Number(web?.summary.web_console_errors_count ?? -1),

    actual_android_emulator_platform_core_passed: androidPassed,
    android_platform_core_cases_passed: String(android?.summary.android_platform_core_cases_passed ?? "0/100"),
    android_request_flow_passed: android?.summary.android_request_flow_passed === true,
    android_history_flow_passed: android?.summary.android_history_flow_passed === true,
    android_foreman_materials_flow_passed: android?.summary.android_foreman_materials_flow_passed === true,
    android_foreman_subcontracts_flow_passed: android?.summary.android_foreman_subcontracts_flow_passed === true,
    android_pdf_buyer_flow_passed: android?.summary.android_pdf_buyer_flow_passed === true,
    android_console_errors_count: Number(android?.summary.android_console_errors_count ?? -1),
    android_emulator_health_degraded: android?.summary.android_emulator_health_degraded === true,

    same_platform_core_corpus_used_for_web_android: parity?.summary.same_platform_core_corpus_used_for_web_android === true,
    web_android_case_id_parity: parity?.summary.web_android_case_id_parity === true,
    web_android_snapshot_hash_parity: parity?.summary.web_android_snapshot_hash_parity === true,
    web_android_pdf_buyer_parity: parity?.summary.web_android_pdf_buyer_parity === true,
    web_android_history_count_parity: parity?.summary.web_android_history_count_parity === true,
    web_android_foreman_entry_parity: parity?.summary.web_android_foreman_entry_parity === true,

    ...sourceGates,

    owner_go_no_go_started: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    full_jest_started: false,
    fake_green_claimed: false,
    web_summary_path: web?.path ?? null,
    android_summary_path: android?.path ?? null,
    parity_summary_path: parity?.path ?? null,
    blocking_reasons: blockers,
  };

  const result = writeRuntimeJson(ROOT, summary);
  return {
    artifactPath: result.artifactPath,
    artifact: summary,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditAiEstimatePlatformCoreScaleSeal.ts")) {
  const result = auditAiEstimatePlatformCoreScaleSeal();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    blocking_reasons: result.artifact.blocking_reasons,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_PLATFORM_CORE_SCALE_SEAL) process.exitCode = 1;
}
