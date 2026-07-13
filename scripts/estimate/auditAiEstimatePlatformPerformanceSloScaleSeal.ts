import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  createAiEstimatePerformanceEvent,
  validateAiEstimatePerformanceEvents,
} from "../../src/lib/platform/aiEstimatePerformanceTelemetry";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  newestSummary,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";
import {
  GREEN_AI_ESTIMATE_PERFORMANCE_ANDROID_SMOKE,
} from "../e2e/runAiEstimatePerformanceAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_PERFORMANCE_WEB_ANDROID_PARITY,
} from "../e2e/runAiEstimatePerformanceWebAndroidParity";
import {
  GREEN_AI_ESTIMATE_PERFORMANCE_WEB_SMOKE,
} from "../e2e/runAiEstimatePerformanceWebSmoke";
import { auditNoSecondEstimateEngine } from "./auditNoSecondEstimateEngine";
import {
  GREEN_AI_ESTIMATE_APPROVED_HISTORY_SCALE_PERFORMANCE,
  auditApprovedHistoryScalePerformance,
} from "./auditApprovedHistoryScalePerformance";
import {
  GREEN_AI_ESTIMATE_PERFORMANCE_REGRESSION_GATE,
  auditAiEstimatePerformanceRegression,
} from "./auditAiEstimatePerformanceRegression";
import {
  GREEN_AI_ESTIMATE_PERFORMANCE_SCALE_BUDGET,
  auditAiEstimateScaleBudget,
} from "./auditAiEstimateScaleBudget";
import {
  GREEN_AI_ESTIMATE_PDF_BUYER_PACKAGE_PERFORMANCE,
  benchmarkEstimatePdfBuyerPackages,
} from "./benchmarkEstimatePdfBuyerPackages";
import {
  GREEN_AI_ESTIMATE_CORE_BENCHMARK,
  runAiEstimateCoreBenchmark,
} from "./benchmarkAiEstimateCore";

const ROOT = path.join(".release-runtime", "ai-estimate-performance-slo-scale-seal");
const WEB_ROOT = path.join(ROOT, "web");
const ANDROID_ROOT = path.join(ROOT, "android-chrome");
const PARITY_ROOT = path.join(ROOT, "web-android-parity");

export const GREEN_AI_ESTIMATE_PLATFORM_PERFORMANCE_SLO_SCALE_SEAL =
  "GREEN_AI_ESTIMATE_PLATFORM_PERFORMANCE_SLO_SCALE_SEAL_COMMITTED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_PLATFORM_PERFORMANCE_SLO_SCALE_SEAL =
  "STOP_AI_ESTIMATE_PLATFORM_PERFORMANCE_SLO_SCALE_SEAL_INCOMPLETE_NO_GREEN" as const;

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

function gitStatusPorcelain(): string {
  return execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    encoding: "utf8",
  }).trim();
}

function flag(name: string): boolean {
  return hasFlag(name);
}

function telemetryProof(sourceShaValue: string) {
  const events = [
    createAiEstimatePerformanceEvent({
      eventName: "ai_estimate_prompt_started",
      operation: "prompt_to_template_match",
      durationMs: 10,
      sourceSha: sourceShaValue,
      routeOrSurface: "/request",
      prompt: "repair kitchen for +996 555 123456 user@example.com",
    }),
    createAiEstimatePerformanceEvent({
      eventName: "ai_estimate_template_matched",
      operation: "prompt_to_template_match",
      durationMs: 20,
      sourceSha: sourceShaValue,
      routeOrSurface: "/request",
    }),
    createAiEstimatePerformanceEvent({
      eventName: "ai_estimate_boq_built",
      operation: "full_boq_build",
      durationMs: 30,
      sourceSha: sourceShaValue,
      routeOrSurface: "/request",
    }),
    createAiEstimatePerformanceEvent({
      eventName: "ai_estimate_costing_built",
      operation: "trusted_costing",
      durationMs: 40,
      sourceSha: sourceShaValue,
      routeOrSurface: "/request",
    }),
    createAiEstimatePerformanceEvent({
      eventName: "ai_estimate_pdf_built",
      operation: "pdf_package_generation",
      durationMs: 50,
      sourceSha: sourceShaValue,
      routeOrSurface: "/request",
    }),
    createAiEstimatePerformanceEvent({
      eventName: "ai_estimate_buyer_handoff_built",
      operation: "buyer_handoff_generation",
      durationMs: 60,
      sourceSha: sourceShaValue,
      routeOrSurface: "/request",
    }),
    createAiEstimatePerformanceEvent({
      eventName: "ai_estimate_history_page_loaded",
      operation: "approved_history_page_load",
      durationMs: 12,
      sourceSha: sourceShaValue,
      routeOrSurface: "/request/history",
    }),
    createAiEstimatePerformanceEvent({
      eventName: "ai_estimate_foreman_entry_opened",
      operation: "foreman_materials_estimate_open",
      durationMs: 22,
      sourceSha: sourceShaValue,
      routeOrSurface: "/office/foreman",
    }),
    createAiEstimatePerformanceEvent({
      eventName: "ai_estimate_slo_violation_detected",
      operation: "draft_estimate_build",
      durationMs: 1600,
      sourceSha: sourceShaValue,
      routeOrSurface: "/request",
    }),
  ];
  return validateAiEstimatePerformanceEvents(events);
}

export function auditAiEstimatePlatformPerformanceSloScaleSeal() {
  const head = currentSourceSha();
  const branch = currentBranch();
  const upstreamSync = currentUpstreamSync();
  const gitStatus = gitStatusPorcelain();
  const noSecond = auditNoSecondEstimateEngine().artifact;
  const scale = auditAiEstimateScaleBudget().artifact;
  const benchmark = runAiEstimateCoreBenchmark({ casesLimit: 100, iterations: 5, writeLedger: true }).artifact;
  const history = auditApprovedHistoryScalePerformance().artifact;
  const pdfBuyer = benchmarkEstimatePdfBuyerPackages({ casesLimit: 100 }).artifact;
  const regression = auditAiEstimatePerformanceRegression().artifact;
  const telemetry = telemetryProof(head);

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

  const web = newestSummary<SummaryLike>(WEB_ROOT, (summary) =>
    finalStatus(summary) === GREEN_AI_ESTIMATE_PERFORMANCE_WEB_SMOKE
  );
  const android = newestSummary<SummaryLike>(ANDROID_ROOT, (summary) =>
    finalStatus(summary) === GREEN_AI_ESTIMATE_PERFORMANCE_ANDROID_SMOKE
  );
  const parity = newestSummary<SummaryLike>(PARITY_ROOT, (summary) =>
    finalStatus(summary) === GREEN_AI_ESTIMATE_PERFORMANCE_WEB_ANDROID_PARITY
  );

  const webFresh = sourceSha(web?.summary) === head;
  const androidFresh = sourceSha(android?.summary) === head;
  const parityFresh = sourceSha(parity?.summary) === head;
  const webPassed =
    webFresh &&
    web?.summary.actual_web_browser_performance_smoke_passed === true &&
    web?.summary.web_performance_cases_passed === "100/100" &&
    Number(web?.summary.web_console_errors_count ?? -1) === 0;
  const androidPassed =
    androidFresh &&
    android?.summary.actual_android_emulator_performance_smoke_passed === true &&
    android?.summary.android_performance_cases_passed === "100/100" &&
    Number(android?.summary.android_console_errors_count ?? -1) === 0 &&
    android?.summary.android_emulator_health_degraded === false;
  const parityPassed =
    parityFresh &&
    parity?.summary.same_performance_corpus_used_for_web_android === true &&
    parity?.summary.web_android_case_id_parity === true &&
    parity?.summary.web_android_result_parity === true &&
    parity?.summary.web_android_snapshot_hash_parity === true &&
    parity?.summary.web_android_pdf_buyer_parity === true &&
    parity?.summary.web_android_slo_comparison_recorded === true;

  const sourceGates = {
    targeted_performance_tests_passed: flag("targeted-performance-tests-passed"),
    typecheck_passed: flag("typecheck-passed"),
    lint_passed: flag("lint-passed"),
    diff_check_passed: flag("diff-check-passed"),
    no_test_weakening_passed: flag("no-test-weakening-passed"),
    web_public_smoke_passed: flag("web-public-smoke-passed"),
    ci_office_market_passed: flag("ci-office-market-passed"),
    secret_scan_passed: flag("secret-scan-passed"),
  };

  const blockers = [
    branch === "release/ios-after-build48-integration" ? "" : `branch:${branch}`,
    upstreamSync === "0 0" ? "" : `upstream_sync:${upstreamSync}`,
    gitStatus.length === 0 ? "" : "worktree_not_clean",
    Object.values(preconditions).every(Boolean) ? "" : "preconditions_missing",
    preconditions.foreman_sync_green_found ? "" : "STOP_PERFORMANCE_SLO_BLOCKED_BY_FOREMAN_SYNC_NOT_GREEN",
    noSecond.passed ? "" : `no_second_engine:${(noSecond.violations as string[]).join("|")}`,
    scale.final_status === GREEN_AI_ESTIMATE_PERFORMANCE_SCALE_BUDGET ? "" : "scale_budget_failed",
    benchmark.final_status === GREEN_AI_ESTIMATE_CORE_BENCHMARK ? "" : "core_benchmark_failed",
    history.final_status === GREEN_AI_ESTIMATE_APPROVED_HISTORY_SCALE_PERFORMANCE ? "" : "approved_history_scale_performance_failed",
    pdfBuyer.final_status === GREEN_AI_ESTIMATE_PDF_BUYER_PACKAGE_PERFORMANCE ? "" : "pdf_buyer_package_performance_failed",
    regression.final_status === GREEN_AI_ESTIMATE_PERFORMANCE_REGRESSION_GATE ? "" : "performance_regression_gate_failed",
    telemetry.passed ? "" : `telemetry:${telemetry.failures.join("|")}`,
    webPassed ? "" : webFresh ? "web_performance_smoke_failed" : "web_performance_smoke_missing_or_stale",
    androidPassed ? "" : androidFresh ? "android_performance_smoke_failed" : "android_performance_smoke_missing_or_stale",
    parityPassed ? "" : parityFresh ? "web_android_performance_parity_failed" : "web_android_performance_parity_missing_or_stale",
    ...Object.entries(sourceGates).map(([key, value]) => (value ? "" : key)),
  ].filter(Boolean);

  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PLATFORM_PERFORMANCE_SLO_SCALE_SEAL
      : STOP_AI_ESTIMATE_PLATFORM_PERFORMANCE_SLO_SCALE_SEAL,
    source_sha: head,
    branch,
    upstream_sync: upstreamSync,
    generated_at: new Date().toISOString(),
    ...preconditions,
    performance_slo_contract_created: benchmark.performance_slo_contract_created === true,
    scale_budgets_created: scale.scale_budgets_created === true,
    core_benchmark_created: benchmark.core_benchmark_created === true,
    benchmark_cases_total: benchmark.benchmark_cases_total,
    benchmark_iterations: benchmark.benchmark_iterations,
    all_core_operations_within_slo: benchmark.all_core_operations_within_slo === true,
    memory_budget_violations_count: benchmark.memory_budget_violations_count,
    approved_history_50000_scale_performance_passed: history.approved_history_50000_scale_performance_passed === true,
    history_page_load_within_slo: history.history_page_load_within_slo === true,
    history_record_load_within_slo: history.history_record_load_within_slo === true,
    history_does_not_load_all_payloads: history.history_does_not_load_all_payloads === true,
    pdf_package_performance_passed: pdfBuyer.pdf_package_performance_passed === true,
    buyer_handoff_performance_passed: pdfBuyer.buyer_handoff_performance_passed === true,
    pdf_no_truncation_under_load: pdfBuyer.pdf_no_truncation_under_load === true,
    buyer_no_truncation_under_load: pdfBuyer.buyer_no_truncation_under_load === true,
    actual_web_browser_performance_smoke_passed: webPassed,
    web_performance_cases_passed: String(web?.summary.web_performance_cases_passed ?? "0/100"),
    web_prompt_to_summary_p95_ms: Number(web?.summary.web_prompt_to_summary_p95_ms ?? -1),
    web_console_errors_count: Number(web?.summary.web_console_errors_count ?? -1),
    actual_android_emulator_performance_smoke_passed: androidPassed,
    android_performance_cases_passed: String(android?.summary.android_performance_cases_passed ?? "0/100"),
    android_prompt_to_summary_p95_ms: Number(android?.summary.android_prompt_to_summary_p95_ms ?? -1),
    android_console_errors_count: Number(android?.summary.android_console_errors_count ?? -1),
    same_performance_corpus_used_for_web_android: parity?.summary.same_performance_corpus_used_for_web_android === true,
    web_android_case_id_parity: parity?.summary.web_android_case_id_parity === true,
    web_android_result_parity: parity?.summary.web_android_result_parity === true,
    web_android_snapshot_hash_parity: parity?.summary.web_android_snapshot_hash_parity === true,
    web_android_pdf_buyer_parity: parity?.summary.web_android_pdf_buyer_parity === true,
    web_android_slo_comparison_recorded: parity?.summary.web_android_slo_comparison_recorded === true,
    performance_telemetry_schema_created: telemetry.performance_telemetry_schema_created,
    all_events_have_duration: telemetry.all_events_have_duration,
    all_events_have_source_sha: telemetry.all_events_have_source_sha,
    pii_redaction_passed: telemetry.pii_redaction_passed,
    full_prompt_not_logged_unredacted: telemetry.full_prompt_not_logged_unredacted,
    absolute_slo_passed: regression.absolute_slo_passed === true,
    regression_over_20_percent_count: regression.regression_over_20_percent_count,
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
  return { artifactPath: result.artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditAiEstimatePlatformPerformanceSloScaleSeal.ts")) {
  const result = auditAiEstimatePlatformPerformanceSloScaleSeal();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    blocking_reasons: result.artifact.blocking_reasons,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_PLATFORM_PERFORMANCE_SLO_SCALE_SEAL) process.exitCode = 1;
}
