import path from "node:path";

import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  newestSummary,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";
import { runForemanAiEstimateSyncDomainProof } from "./foremanAiEstimateSyncProof";

const ROOT = path.join(".release-runtime", "ai-estimate-foreman-materials-subcontracts-sync");
const WEB_ROOT = path.join(ROOT, "web");
const ANDROID_ROOT = path.join(ROOT, "android-chrome");

const GREEN_FINAL =
  "GREEN_AI_ESTIMATE_FOREMAN_MATERIALS_SUBCONTRACTS_SYNCED_WEB_ANDROID_COMMITTED_NO_RELEASE" as const;
const STOP_FINAL =
  "STOP_AI_ESTIMATE_FOREMAN_MATERIALS_SUBCONTRACTS_SYNC_INCOMPLETE_NO_GREEN" as const;

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

function latestAnyGreen(root: string): { path: string; summary: SummaryLike } | null {
  return newestSummary<SummaryLike>(root, (summary) => finalStatus(summary).startsWith("GREEN"));
}

function dependencyStatus(root: string, marker: string): "green" | "missing" {
  return latestGreen(root, marker) ? "green" : "missing";
}

function gateFlag(name: string): boolean {
  return hasFlag(name);
}

const head = currentSourceSha();
const branch = currentBranch();
const upstreamSync = currentUpstreamSync();
const domain = runForemanAiEstimateSyncDomainProof();
const web = latestAnyGreen(WEB_ROOT);
const android = latestAnyGreen(ANDROID_ROOT);

const webFresh = sourceSha(web?.summary) === head;
const androidFresh = sourceSha(android?.summary) === head;
const webPassed = webFresh &&
  web?.summary.actual_web_browser_foreman_ai_estimate_sync_passed === true &&
  web?.summary.web_foreman_materials_flow_passed === true &&
  web?.summary.web_foreman_subcontracts_flow_passed === true &&
  web?.summary.web_director_visibility_passed === true &&
  web?.summary.web_buyer_procurement_handoff_passed === true &&
  Number(web?.summary.web_console_errors_count ?? -1) === 0;
const androidPassed = androidFresh &&
  android?.summary.actual_android_emulator_foreman_ai_estimate_sync_passed === true &&
  android?.summary.android_foreman_materials_flow_passed === true &&
  android?.summary.android_foreman_subcontracts_flow_passed === true &&
  android?.summary.android_director_visibility_passed === true &&
  android?.summary.android_buyer_procurement_handoff_passed === true &&
  Number(android?.summary.android_console_errors_count ?? -1) === 0 &&
  android?.summary.android_emulator_health_degraded === false;

const gates = {
  foreman_ai_estimate_entry_contract_tests_passed: gateFlag("foreman-ai-estimate-entry-contract-tests-passed"),
  foreman_materials_sync_tests_passed: gateFlag("foreman-materials-sync-tests-passed"),
  foreman_subcontracts_sync_tests_passed: gateFlag("foreman-subcontracts-sync-tests-passed"),
  foreman_revision_lifecycle_tests_passed: gateFlag("foreman-revision-lifecycle-tests-passed"),
  foreman_no_legacy_picker_tests_passed: gateFlag("foreman-no-legacy-picker-tests-passed"),
  foreman_director_buyer_handoff_tests_passed: gateFlag("foreman-director-buyer-handoff-tests-passed"),
  foreman_architecture_tests_passed: gateFlag("foreman-architecture-tests-passed"),
  focused_professional_boq_and_foreman_tests_passed: gateFlag("focused-professional-boq-and-foreman-tests-passed"),
  typecheck_passed: gateFlag("typecheck-passed"),
  lint_passed: gateFlag("lint-passed"),
  diff_check_passed: gateFlag("diff-check-passed"),
  no_test_weakening_passed: gateFlag("no-test-weakening-passed"),
  web_public_smoke_passed: gateFlag("web-public-smoke-passed"),
  ci_office_market_passed: gateFlag("ci-office-market-passed"),
  secret_scan_passed: gateFlag("secret-scan-passed"),
};

const realNamedBoqGreenFound = Boolean(latestGreen(
  path.join(".release-runtime", "ai-estimate-real-named-boq-line-items"),
  "GREEN_AI_ESTIMATE_REAL_NAMED",
));
const editableRevisionsGreenFound = Boolean(latestGreen(
  path.join(".release-runtime", "ai-estimate-editable-param-revisions"),
  "GREEN_AI_ESTIMATE_EDITABLE",
));
const materialCompletenessDependencyStatus = dependencyStatus(
  path.join(".release-runtime", "ai-estimate-material-completeness"),
  "GREEN_AI_ESTIMATE_MATERIAL_COMPLETENESS",
);
const materialQuantityAccuracyDependencyStatus = dependencyStatus(
  path.join(".release-runtime", "ai-estimate-material-quantity-accuracy"),
  "GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY",
);

const blockingReasons = [
  branch === "release/ios-after-build48-integration" ? "" : `branch:${branch}`,
  upstreamSync === "0 0" ? "" : `upstream_sync:${upstreamSync}`,
  realNamedBoqGreenFound ? "" : "real_named_boq_green_missing",
  editableRevisionsGreenFound ? "" : "editable_revisions_green_missing",
  domain.passed ? "" : "domain_proof_failed",
  webPassed ? "" : webFresh ? "web_smoke_failed" : "web_smoke_missing_or_stale",
  androidPassed ? "" : androidFresh ? "android_smoke_failed" : "android_smoke_missing_or_stale",
  ...Object.entries(gates).map(([key, value]) => (value ? "" : key)),
].filter(Boolean);

const green = blockingReasons.length === 0;
const summary = {
  final_status: green ? GREEN_FINAL : STOP_FINAL,
  source_sha: head,
  branch,
  upstream_sync: upstreamSync,
  real_named_boq_green_found: realNamedBoqGreenFound,
  editable_revisions_green_found: editableRevisionsGreenFound,
  material_completeness_dependency_status: materialCompletenessDependencyStatus,
  material_quantity_accuracy_dependency_status: materialQuantityAccuracyDependencyStatus,
  foreman_materials_estimate_button_visible: domain.foreman_materials_estimate_button_visible,
  foreman_materials_ai_estimate_opened: domain.foreman_materials_ai_estimate_opened,
  foreman_materials_real_named_boq_visible: domain.foreman_materials_real_named_boq_visible,
  foreman_materials_material_rows_visible: domain.foreman_materials_material_rows_visible,
  foreman_materials_pdf_created: domain.foreman_materials_pdf_created,
  foreman_materials_buyer_handoff_created: domain.foreman_materials_buyer_handoff_created,
  foreman_materials_user_confirmation_required: domain.foreman_materials_user_confirmation_required,
  foreman_subcontracts_estimate_button_visible: domain.foreman_subcontracts_estimate_button_visible,
  foreman_subcontracts_ai_estimate_opened: domain.foreman_subcontracts_ai_estimate_opened,
  foreman_subcontracts_real_named_boq_visible: domain.foreman_subcontracts_real_named_boq_visible,
  foreman_subcontracts_work_service_equipment_rows_visible: domain.foreman_subcontracts_work_service_equipment_rows_visible,
  foreman_subcontracts_material_rows_visible: domain.foreman_subcontracts_material_rows_visible,
  foreman_subcontracts_pdf_created: domain.foreman_subcontracts_pdf_created,
  foreman_subcontracts_user_confirmation_required: domain.foreman_subcontracts_user_confirmation_required,
  foreman_materials_revision_lifecycle_synced: domain.foreman_materials_revision_lifecycle_synced,
  foreman_subcontracts_revision_lifecycle_synced: domain.foreman_subcontracts_revision_lifecycle_synced,
  foreman_param_edit_recalculates_boq: domain.foreman_param_edit_recalculates_boq,
  foreman_new_pdf_uses_latest_revision: domain.foreman_new_pdf_uses_latest_revision,
  foreman_buyer_handoff_uses_latest_revision: domain.foreman_buyer_handoff_uses_latest_revision,
  director_foreman_materials_request_visible: domain.director_foreman_materials_request_visible,
  director_foreman_subcontracts_request_visible: domain.director_foreman_subcontracts_request_visible,
  director_foreman_materials_pdf_valid: domain.director_foreman_materials_pdf_valid,
  director_foreman_subcontracts_pdf_valid: domain.director_foreman_subcontracts_pdf_valid,
  buyer_foreman_materials_procurement_rows_visible: domain.buyer_foreman_materials_procurement_rows_visible,
  buyer_foreman_materials_no_item_truncation: domain.buyer_foreman_materials_no_item_truncation,
  buyer_foreman_subcontracts_procurement_subset_valid: domain.buyer_foreman_subcontracts_procurement_subset_valid,
  buyer_foreman_work_rows_not_in_materials_handoff: domain.buyer_foreman_work_rows_not_in_materials_handoff,
  actual_web_browser_foreman_ai_estimate_sync_passed: webPassed,
  web_foreman_materials_flow_passed: web?.summary.web_foreman_materials_flow_passed === true,
  web_foreman_subcontracts_flow_passed: web?.summary.web_foreman_subcontracts_flow_passed === true,
  web_director_visibility_passed: web?.summary.web_director_visibility_passed === true,
  web_buyer_procurement_handoff_passed: web?.summary.web_buyer_procurement_handoff_passed === true,
  web_console_errors_count: Number(web?.summary.web_console_errors_count ?? -1),
  actual_android_emulator_foreman_ai_estimate_sync_passed: androidPassed,
  android_foreman_materials_flow_passed: android?.summary.android_foreman_materials_flow_passed === true,
  android_foreman_subcontracts_flow_passed: android?.summary.android_foreman_subcontracts_flow_passed === true,
  android_director_visibility_passed: android?.summary.android_director_visibility_passed === true,
  android_buyer_procurement_handoff_passed: android?.summary.android_buyer_procurement_handoff_passed === true,
  android_console_errors_count: Number(android?.summary.android_console_errors_count ?? -1),
  ...gates,
  foreman_ai_estimate_sync_green_claimed: green,
  render_staging_started: false,
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
  blocking_reasons: blockingReasons,
};

const result = writeRuntimeJson(ROOT, summary);
console.log(JSON.stringify({
  artifact: result.artifactPath,
  final_status: summary.final_status,
  blocking_reasons: blockingReasons,
}, null, 2));
if (!green) process.exitCode = 1;
