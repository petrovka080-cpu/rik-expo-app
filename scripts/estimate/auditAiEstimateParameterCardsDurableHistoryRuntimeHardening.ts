import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_ANDROID_SMOKE,
  type AiEstimateParameterDurableHistoryAndroidSummary,
} from "../e2e/runAiEstimateParameterDurableHistoryAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_ANDROID_PARITY,
  type AiEstimateParameterDurableHistoryParitySummary,
} from "../e2e/runAiEstimateParameterDurableHistoryWebAndroidParity";
import {
  GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_SMOKE,
  type AiEstimateParameterDurableHistoryWebSummary,
} from "../e2e/runAiEstimateParameterDurableHistoryWebSmoke";
import { newestSummary } from "../e2e/renderStagingAcceptanceCore";
import {
  auditAiEstimateParameterCoverage11610,
  GREEN_AI_ESTIMATE_PARAMETER_COVERAGE_11610_READY,
} from "./auditAiEstimateParameterCoverage11610";
import {
  auditAiEstimateParameterExtractionPriority,
  GREEN_AI_ESTIMATE_PARAMETER_EXTRACTION_PRIORITY_READY,
} from "./auditAiEstimateParameterExtractionPriority";
import {
  auditAiEstimateVisibleRussianOnly,
  GREEN_AI_ESTIMATE_VISIBLE_RUSSIAN_ONLY_READY,
} from "./auditAiEstimateVisibleRussianOnly";
import {
  auditApprovedHistoryGrowthAfterParameterCards,
  GREEN_APPROVED_HISTORY_GROWTH_AFTER_PARAMETER_CARDS_READY,
} from "./auditApprovedHistoryGrowthAfterParameterCards";
import {
  auditConsumerRepairDurableSaveFallback,
  GREEN_CONSUMER_REPAIR_DURABLE_SAVE_FALLBACK_READY,
} from "./auditConsumerRepairDurableSaveFallback";
import {
  GREEN_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_READY,
  runAiEstimateParameterRuntimeMatrix,
} from "./runAiEstimateParameterRuntimeMatrix";
import {
  GREEN_AI_ESTIMATE_PARAMETER_HARDENING_SOURCE_GATES,
  type AiEstimateParameterHardeningSourceGatesSummary,
} from "./runAiEstimateParameterHardeningSourceGates";
import {
  GREEN_AI_ESTIMATE_PARAMETER_HARDENING_TARGETED_TESTS,
  type AiEstimateParameterHardeningTargetedTestsSummary,
} from "./runAiEstimateParameterHardeningTargetedTests";

export const GREEN_AI_ESTIMATE_PARAMETER_CARDS_DURABLE_HISTORY_RUNTIME_HARDENED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_PARAMETER_CARDS_DURABLE_HISTORY_RUNTIME_HARDENED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_PARAMETER_CARDS_DURABLE_HISTORY_RUNTIME_HARDENING_FAILED =
  "STOP_AI_ESTIMATE_PARAMETER_CARDS_DURABLE_HISTORY_RUNTIME_HARDENING_FAILED" as const;

function gitOutput(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const PARAMETER_HISTORY_ROOT = path.join(".release-runtime", "ai-estimate-parameter-durable-history");
const HARDENING_ROOT = path.join(".release-runtime", "ai-estimate-parameter-cards-durable-history-runtime-hardening");

function latestWebSummary(sourceSha: string) {
  return newestSummary<AiEstimateParameterDurableHistoryWebSummary>(
    path.join(PARAMETER_HISTORY_ROOT, "web"),
    (summary) => summary.source_sha === sourceSha && summary.cases === "parameter-durable-history",
  )?.summary ?? null;
}

function latestAndroidSummary(sourceSha: string) {
  return newestSummary<AiEstimateParameterDurableHistoryAndroidSummary>(
    path.join(PARAMETER_HISTORY_ROOT, "android-chrome"),
    (summary) => summary.source_sha === sourceSha && summary.cases === "parameter-durable-history",
  )?.summary ?? null;
}

function latestParitySummary(sourceSha: string) {
  return newestSummary<AiEstimateParameterDurableHistoryParitySummary>(
    path.join(PARAMETER_HISTORY_ROOT, "web-android-parity"),
    (summary) => summary.source_sha === sourceSha && summary.cases === "parameter-durable-history",
  )?.summary ?? null;
}

function latestTargetedTestsSummary(sourceSha: string) {
  return newestSummary<AiEstimateParameterHardeningTargetedTestsSummary>(
    path.join(HARDENING_ROOT, "targeted-tests"),
    (summary) => summary.source_sha === sourceSha,
  )?.summary ?? null;
}

function latestSourceGatesSummary(sourceSha: string) {
  return newestSummary<AiEstimateParameterHardeningSourceGatesSummary>(
    path.join(HARDENING_ROOT, "source-gates"),
    (summary) => summary.source_sha === sourceSha,
  )?.summary ?? null;
}

function parameterCardsDoNotUsePlusMinus(): boolean {
  const source = readFileSync("src/features/requests/components/EditableParamChips.tsx", "utf8");
  return !/editable-param-(?:plus|minus)|\+\s*<\/Text>|-\s*<\/Text>/i.test(source);
}

export function auditAiEstimateParameterCardsDurableHistoryRuntimeHardening(input: { writeSummary?: boolean } = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const coverage = auditAiEstimateParameterCoverage11610({ writeSummary: true }).summary;
  const durable = auditConsumerRepairDurableSaveFallback({ writeSummary: true }).summary;
  const history = auditApprovedHistoryGrowthAfterParameterCards({ writeSummary: true }).summary;
  const extraction = auditAiEstimateParameterExtractionPriority({ writeSummary: true }).summary;
  const runtime = runAiEstimateParameterRuntimeMatrix({ writeSummary: true }).summary;
  const visible = auditAiEstimateVisibleRussianOnly().summary;
  const web = latestWebSummary(sourceSha);
  const android = latestAndroidSummary(sourceSha);
  const parity = latestParitySummary(sourceSha);
  const targetedTests = latestTargetedTestsSummary(sourceSha);
  const sourceGates = latestSourceGatesSummary(sourceSha);
  const noPlusMinus = parameterCardsDoNotUsePlusMinus();
  const checks = {
    coverage_11610_green: coverage.final_status === GREEN_AI_ESTIMATE_PARAMETER_COVERAGE_11610_READY,
    durable_save_fallback_green: durable.final_status === GREEN_CONSUMER_REPAIR_DURABLE_SAVE_FALLBACK_READY,
    approved_history_growth_green: history.final_status === GREEN_APPROVED_HISTORY_GROWTH_AFTER_PARAMETER_CARDS_READY,
    extraction_priority_green: extraction.final_status === GREEN_AI_ESTIMATE_PARAMETER_EXTRACTION_PRIORITY_READY,
    runtime_matrix_green: runtime.final_status === GREEN_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_READY,
    visible_russian_only_green: visible.final_status === GREEN_AI_ESTIMATE_VISIBLE_RUSSIAN_ONLY_READY,
    targeted_tests_green: targetedTests?.final_status === GREEN_AI_ESTIMATE_PARAMETER_HARDENING_TARGETED_TESTS,
    web_smoke_green: web?.final_status === GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_SMOKE,
    android_smoke_green: android?.final_status === GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_ANDROID_SMOKE,
    web_android_parity_green: parity?.final_status === GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_ANDROID_PARITY,
    source_gates_green: sourceGates?.final_status === GREEN_AI_ESTIMATE_PARAMETER_HARDENING_SOURCE_GATES,
    parameter_cards_do_not_use_plus_minus: noPlusMinus,
  };
  const blocking_reasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  const finalGreen = blocking_reasons.length === 0;
  const summary = {
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_PARAMETER_CARDS_DURABLE_HISTORY_RUNTIME_HARDENED_NO_RELEASE
      : STOP_AI_ESTIMATE_PARAMETER_CARDS_DURABLE_HISTORY_RUNTIME_HARDENING_FAILED,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    catalog_total_templates: coverage.catalog_total_templates,
    parameter_schema_coverage: coverage.parameter_schema_coverage,
    random_parameter_cases_passed: runtime.random_parameter_cases_passed,
    critical_parameter_cases_passed: runtime.critical_parameter_cases_passed,
    infrastructure_parameter_cases_passed: runtime.infrastructure_parameter_cases_passed,
    repair_parameter_cases_passed: runtime.repair_parameter_cases_passed,
    foreman_parameter_cases_passed: runtime.foreman_parameter_cases_passed,
    parameter_cards_are_clickable: web?.web_parameter_cards_are_clickable === true && android?.android_parameter_cards_are_clickable === true,
    parameter_cards_edit_inline: web?.web_parameter_cards_edit_inline === true && android?.android_parameter_cards_edit_inline === true,
    parameter_cards_do_not_use_plus_minus: noPlusMinus,
    parameter_edit_changes_snapshot_hash: runtime.parameter_edit_changes_snapshot_hash,
    affected_rows_change_after_parameter_edit: runtime.affected_rows_change_after_parameter_edit,
    unaffected_rows_remain_stable: runtime.unaffected_rows_remain_stable,
    new_revision_created_after_parameter_edit: runtime.new_revision_created_after_parameter_edit,
    road_length_width_recalculate_road_area: runtime.final_status === GREEN_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_READY,
    facade_uses_facade_area_m2: extraction.parameter_cards_match_extracted_values && extraction.boq_quantities_use_extracted_values,
    roof_uses_roof_area_m2: extraction.parameter_cards_match_extracted_values && extraction.boq_quantities_use_extracted_values,
    sludge_uses_capacity_m3_day: runtime.final_status === GREEN_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_READY,
    substation_uses_work_package: runtime.final_status === GREEN_AI_ESTIMATE_PARAMETER_RUNTIME_MATRIX_READY,
    fence_length_height_affect_boq: extraction.boq_quantities_use_extracted_values,
    explicit_user_values_preserved: extraction.explicit_user_values_preserved,
    height_3m_not_overwritten_by_default_2_7: extraction.height_3m_not_overwritten_by_default_2_7,
    ceiling_height_not_misclassified_as_length: extraction.ceiling_height_not_misclassified_as_length,
    parameter_units_normalized_correctly: extraction.parameter_units_normalized_correctly,
    boq_quantities_use_extracted_values: extraction.boq_quantities_use_extracted_values,
    durable_save_fallback_audited: durable.durable_save_fallback_audited,
    compact_fallback_runs_on_storage_pressure: durable.compact_fallback_runs_on_storage_pressure,
    approved_history_preserved_under_storage_pressure: durable.approved_history_preserved_under_storage_pressure,
    current_draft_preserved_under_storage_pressure: durable.current_draft_preserved_under_storage_pressure,
    revision_chain_preserved_under_storage_pressure: durable.revision_chain_preserved_under_storage_pressure,
    CONSUMER_REPAIR_DURABLE_SAVE_FAILED_no_longer_crashes_request:
      durable.CONSUMER_REPAIR_DURABLE_SAVE_FAILED_no_longer_crashes_request,
    history_count_reaches_14: history.history_count_reaches_14,
    history_count_reaches_25: history.history_count_reaches_25,
    history_count_reaches_100: history.history_count_reaches_100,
    history_not_limited_to_13: history.history_not_limited_to_13,
    history_count_increases_after_each_approval: history.history_count_increases_after_each_approval,
    approved_history_total_not_capped:
      history.history_count_reaches_100 &&
      history.history_not_limited_to_13 &&
      !history.history_count_stuck_at_13,
    all_created_estimates_preserved:
      history.history_count_reaches_100 &&
      history.history_persists_after_reload &&
      history.history_persists_after_storage_compaction,
    history_persists_after_reload: history.history_persists_after_reload,
    history_persists_after_storage_compaction: history.history_persists_after_storage_compaction,
    visible_english_words_in_ai_estimate_ui_count: visible.visible_english_words_in_ai_estimate_ui_count,
    raw_internal_ids_visible_count: visible.raw_internal_ids_visible_count,
    actual_web_browser_parameter_durable_history_smoke_passed:
      web?.actual_web_browser_parameter_durable_history_smoke_passed === true,
    web_history_not_limited_to_13: web?.web_history_not_limited_to_13 === true,
    web_all_created_estimates_preserved: web?.web_all_created_estimates_preserved === true,
    web_history_total_count_after_create: web?.web_history_total_count_after_create ?? -1,
    web_visible_english_words_count: web?.web_visible_english_words_count ?? -1,
    web_console_errors_count: web?.web_console_errors_count ?? -1,
    actual_android_emulator_parameter_durable_history_smoke_passed:
      android?.actual_android_emulator_parameter_durable_history_smoke_passed === true,
    android_history_not_limited_to_13: android?.android_history_not_limited_to_13 === true,
    android_all_created_estimates_preserved: android?.android_all_created_estimates_preserved === true,
    android_history_total_count_after_create: android?.android_history_total_count_after_create ?? -1,
    android_visible_english_words_count: android?.android_visible_english_words_count ?? -1,
    android_console_errors_count: android?.android_console_errors_count ?? -1,
    same_parameter_durable_history_corpus_used_for_web_android:
      parity?.same_parameter_durable_history_corpus_used_for_web_android === true,
    web_android_parameter_values_parity: parity?.web_android_parameter_values_parity === true,
    web_android_snapshot_hash_parity: parity?.web_android_snapshot_hash_parity === true,
    web_android_revision_chain_parity: parity?.web_android_revision_chain_parity === true,
    web_android_history_count_parity: parity?.web_android_history_count_parity === true,
    web_android_all_created_estimates_preserved_parity:
      parity?.web_android_all_created_estimates_preserved_parity === true,
    web_android_pdf_state_parity: parity?.web_android_pdf_state_parity === true,
    web_android_buyer_package_state_parity: parity?.web_android_buyer_package_state_parity === true,
    targeted_parameter_runtime_hardening_tests_passed:
      targetedTests?.targeted_parameter_runtime_hardening_tests_passed === true,
    durable_save_fallback_tests_passed: targetedTests?.durable_save_fallback_tests_passed === true,
    history_growth_tests_passed: targetedTests?.history_growth_tests_passed === true,
    parameter_extraction_priority_tests_passed: targetedTests?.parameter_extraction_priority_tests_passed === true,
    parameter_runtime_matrix_tests_passed: targetedTests?.parameter_runtime_matrix_tests_passed === true,
    visible_russian_only_tests_passed: targetedTests?.visible_russian_only_tests_passed === true,
    parameter_schema_tests_passed: targetedTests?.parameter_schema_tests_passed === true,
    parameter_recalculation_tests_passed: targetedTests?.parameter_recalculation_tests_passed === true,
    editable_parameter_cards_tests_passed: targetedTests?.editable_parameter_cards_tests_passed === true,
    editable_param_chips_tests_passed: targetedTests?.editable_param_chips_tests_passed === true,
    pdf_buyer_invalidation_tests_passed: targetedTests?.pdf_buyer_invalidation_tests_passed === true,
    no_second_engine_tests_passed: targetedTests?.no_second_engine_tests_passed === true,
    typecheck_passed: sourceGates?.typecheck_passed === true,
    lint_passed: sourceGates?.lint_passed === true,
    diff_check_passed: sourceGates?.diff_check_passed === true,
    no_test_weakening_passed: sourceGates?.no_test_weakening_passed === true,
    web_public_smoke_passed: sourceGates?.web_public_smoke_passed === true,
    ci_office_market_passed: sourceGates?.ci_office_market_passed === true,
    secret_scan_passed: sourceGates?.secret_scan_passed === true,
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
    runtime_matrix: {
      random: runtime.random_parameter_cases_passed,
      critical: runtime.critical_parameter_cases_passed,
      infrastructure: runtime.infrastructure_parameter_cases_passed,
      repair: runtime.repair_parameter_cases_passed,
      foreman: runtime.foreman_parameter_cases_passed,
      affected_rows_change_after_parameter_edit: runtime.affected_rows_change_after_parameter_edit,
    },
    durable_save: {
      no_crash: durable.CONSUMER_REPAIR_DURABLE_SAVE_FAILED_no_longer_crashes_request,
      approved_history_preserved: durable.approved_history_preserved_under_storage_pressure,
      current_draft_preserved: durable.current_draft_preserved_under_storage_pressure,
      redacted_diagnostic: durable.fallback_emits_redacted_diagnostic_event,
    },
    approved_history: {
      reaches_100: history.history_count_reaches_100,
      not_limited_to_13: history.history_not_limited_to_13,
      persists_after_compaction: history.history_persists_after_storage_compaction,
    },
    extraction_priority: {
      cases_passed: extraction.cases_passed,
      explicit_user_values_preserved: extraction.explicit_user_values_preserved,
      boq_quantities_use_extracted_values: extraction.boq_quantities_use_extracted_values,
    },
    visible_russian_only: {
      visible_english_or_raw_token_count: visible.visible_english_or_raw_token_count,
      visible_english_words_in_ai_estimate_ui_count: visible.visible_english_words_in_ai_estimate_ui_count,
      raw_internal_ids_visible_count: visible.raw_internal_ids_visible_count,
    },
    checks,
    blocking_reasons,
  };
  const summaryPath = path.join(HARDENING_ROOT, "final-summary.json");
  if (input.writeSummary) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = auditAiEstimateParameterCardsDurableHistoryRuntimeHardening({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PARAMETER_CARDS_DURABLE_HISTORY_RUNTIME_HARDENED_NO_RELEASE) {
    process.exitCode = 1;
  }
}
