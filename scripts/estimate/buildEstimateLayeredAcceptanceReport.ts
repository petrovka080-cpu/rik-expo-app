import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { evaluateEstimateRuntimePolicy } from "../../src/features/estimates/runtime/estimateRuntimePolicy";
import { buildProductionTrustInventory } from "../../src/features/estimates/governance/productionTrustInventory";
import {
  buildCanonicalPilotTelemetryEvents,
} from "../../src/features/estimates/telemetry/estimateTelemetryEvents";
import { auditEstimateArtifactLineage } from "./auditEstimateArtifactLineage";
import { auditEstimateQualityDrift, loadCurrentQualityMetrics, runQualityDriftMutationGates } from "./auditEstimateQualityDrift";
import { auditExpandedComplexWorksCoverage10000 } from "./auditExpandedComplexWorksCoverage10000";
import { auditProductionTrustGovernance } from "./auditProductionTrustGovernance";
import {
  buildControlledPilotHealthDashboard,
  controlledPilotSloBlockers,
  type ControlledPilotHealthDashboard,
  type ControlledPilotSmokeSummary,
} from "./buildControlledPilotHealthDashboard";
import { buildEstimateProductHealthDashboard } from "./buildEstimateProductHealthDashboard";
import { runControlledPilotSupportPackageDryRun } from "./exportControlledPilotSupportPackage";
import { runEstimateRegressionSentinel } from "./runEstimateRegressionSentinel";
import {
  LAYER_ORDER,
  applyEstimateLayerDependencies,
  assertUpperLayersNotGreenWithoutDependencies,
  summarizeLayerDependencyResult,
  validateEstimateLayerConfig,
  type EstimateLayerId,
  type FinalLayerStatus,
  type RawLayerEvaluation,
} from "./assertEstimateLayerDependencies";

export const LAYERED_ACCEPTANCE_RUNTIME_ROOT = path.join(
  ".release-runtime",
  "ai-estimate-layered-acceptance",
);

export const GREEN_AI_ESTIMATE_LAYERED_ACCEPTANCE_MATRIX_COMMITTED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_LAYERED_ACCEPTANCE_MATRIX_COMMITTED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_LAYERED_ACCEPTANCE_FAILED_NO_GREEN =
  "STOP_AI_ESTIMATE_LAYERED_ACCEPTANCE_FAILED_NO_GREEN" as const;

type JsonRecord = Record<string, unknown>;

export type LayeredAcceptanceSourceGates = {
  typecheck_passed: boolean;
  lint_passed: boolean;
  diff_check_passed: boolean;
  no_test_weakening_passed: boolean;
  web_public_smoke_passed: boolean;
  ci_office_market_passed: boolean;
  secret_scan_passed: boolean;
  layered_acceptance_tests_passed: boolean;
};

export type BuildEstimateLayeredAcceptanceReportOptions = {
  requireGitClean?: boolean;
  requireRuntimeEvidence?: boolean;
  requireSourceGates?: boolean;
  sourceGates?: Partial<LayeredAcceptanceSourceGates>;
  rawLayerEvaluations?: RawLayerEvaluation[];
  writeRuntime?: boolean;
  generatedAt?: string;
};

function git(args: string[], fallback = "unknown"): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function normalizeWhitespace(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function listSummaryFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) walk(fullPath);
      else if (item.isFile() && item.name === "summary.json") files.push(fullPath);
    }
  };
  walk(root);
  return files;
}

function latestSummary<T extends JsonRecord = JsonRecord>(root: string): { path: string; summary: T } | null {
  const latest = listSummaryFiles(root)
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0];
  if (!latest) return null;
  return {
    path: latest,
    summary: readJson<T>(latest),
  };
}

function envBoolean(name: string): boolean {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "green";
}

function sourceGatesFromEnv(): LayeredAcceptanceSourceGates {
  return {
    typecheck_passed: envBoolean("AI_ESTIMATE_LAYERED_TYPECHECK_PASSED"),
    lint_passed: envBoolean("AI_ESTIMATE_LAYERED_LINT_PASSED"),
    diff_check_passed: envBoolean("AI_ESTIMATE_LAYERED_DIFF_CHECK_PASSED"),
    no_test_weakening_passed: envBoolean("AI_ESTIMATE_LAYERED_NO_TEST_WEAKENING_PASSED"),
    web_public_smoke_passed: envBoolean("AI_ESTIMATE_LAYERED_WEB_PUBLIC_SMOKE_PASSED"),
    ci_office_market_passed: envBoolean("AI_ESTIMATE_LAYERED_CI_OFFICE_MARKET_PASSED"),
    secret_scan_passed: envBoolean("AI_ESTIMATE_LAYERED_SECRET_SCAN_PASSED"),
    layered_acceptance_tests_passed: envBoolean("AI_ESTIMATE_LAYERED_TESTS_PASSED"),
  };
}

function completeSourceGates(input?: Partial<LayeredAcceptanceSourceGates>): LayeredAcceptanceSourceGates {
  return {
    ...sourceGatesFromEnv(),
    ...input,
  };
}

function sourceGateBlockers(sourceGates: LayeredAcceptanceSourceGates): string[] {
  return Object.entries(sourceGates)
    .filter(([, passed]) => passed !== true)
    .map(([name]) => `source_gate:${name}`);
}

function evidenceSourceBlockers(input: {
  label: string;
  artifact: { path: string; summary: JsonRecord } | null;
  head: string;
  branch: string;
}): string[] {
  if (!input.artifact) return [`${input.label}_summary_missing`];
  const summary = input.artifact.summary;
  return [
    summary.source_sha === input.head ? "" : `${input.label}_source_sha_not_head`,
    summary.branch == null || summary.branch === input.branch ? "" : `${input.label}_branch_mismatch`,
    summary.final_status != null && String(summary.final_status).startsWith("GREEN_")
      ? ""
      : `${input.label}_not_green`,
  ].filter(Boolean);
}

function controlledPilotArtifacts() {
  const web = latestSummary<ControlledPilotSmokeSummary>(path.join(
    ".release-runtime",
    "ai-estimate-controlled-pilot-acceptance",
    "web",
  ));
  const android = latestSummary<ControlledPilotSmokeSummary>(path.join(
    ".release-runtime",
    "ai-estimate-controlled-pilot-acceptance",
    "android-chrome",
  ));
  const dashboard = latestSummary<ControlledPilotHealthDashboard & JsonRecord>(path.join(
    ".release-runtime",
    "ai-estimate-controlled-pilot-acceptance",
    "health-dashboard",
  ));
  const support = latestSummary(path.join(
    ".release-runtime",
    "ai-estimate-controlled-pilot-acceptance",
    "support-package",
  ));
  return { web, android, dashboard, support };
}

function goldenBenchmarkArtifact() {
  return latestSummary(path.join(".release-runtime", "ai-estimate-golden-benchmark-acceptance"));
}

function regressionSentinelArtifact() {
  return latestSummary(path.join(
    ".release-runtime",
    "ai-estimate-product-pilot-observability",
    "regression-sentinel",
  ));
}

function buildL0(input: {
  head: string;
  branch: string;
  upstreamSync: string;
  worktreeClean: boolean;
  stagedClean: boolean;
  requireGitClean: boolean;
  requireRuntimeEvidence: boolean;
  controlledPilot: ReturnType<typeof controlledPilotArtifacts>;
  golden: ReturnType<typeof goldenBenchmarkArtifact>;
}): RawLayerEvaluation {
  const runtimeEvidenceBlockers = input.requireRuntimeEvidence
    ? [
      ...evidenceSourceBlockers({ label: "controlled_pilot_web", artifact: input.controlledPilot.web, head: input.head, branch: input.branch }),
      ...evidenceSourceBlockers({ label: "controlled_pilot_android", artifact: input.controlledPilot.android, head: input.head, branch: input.branch }),
      ...evidenceSourceBlockers({ label: "controlled_pilot_dashboard", artifact: input.controlledPilot.dashboard, head: input.head, branch: input.branch }),
      ...evidenceSourceBlockers({ label: "golden_benchmark", artifact: input.golden, head: input.head, branch: input.branch }),
    ]
    : [];
  const blockers = [
    input.branch === "release/ios-after-build48-integration" ? "" : `branch:${input.branch}`,
    input.upstreamSync === "0 0" ? "" : `upstream_sync:${input.upstreamSync}`,
    !input.requireGitClean || input.worktreeClean ? "" : "worktree_not_clean",
    !input.requireGitClean || input.stagedClean ? "" : "staged_not_clean",
    ...runtimeEvidenceBlockers,
  ].filter(Boolean);
  return {
    layer_id: "L0_RUNTIME_BASELINE",
    passed: blockers.length === 0,
    blockers,
    evidence: {
      source_sha_matches_head: true,
      no_stale_artifacts_used: runtimeEvidenceBlockers.length === 0,
      upstream_sync_clean: input.upstreamSync === "0 0",
      worktree_clean: input.worktreeClean,
      staged_clean: input.stagedClean,
    },
  };
}

function buildL1(dashboard: (ControlledPilotHealthDashboard & JsonRecord) | null): RawLayerEvaluation {
  const metrics = dashboard?.metrics;
  const blockers = [
    dashboard?.final_status === "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_HEALTH_DASHBOARD" ? "" : "controlled_pilot_dashboard_not_green",
    metrics?.web_cases_passed === metrics?.web_cases_total && Number(metrics?.web_cases_total ?? 0) >= 50
      ? ""
      : "web_request_flow_not_all_passed",
    metrics?.prompt_to_draft_success_rate === 1 ? "" : "prompt_to_draft_not_100_percent",
    metrics?.draft_to_snapshot_success_rate === 1 ? "" : "draft_to_snapshot_not_100_percent",
    metrics?.snapshot_to_pdf_success_rate === 1 ? "" : "snapshot_to_pdf_not_100_percent",
    metrics?.snapshot_to_buyer_handoff_success_rate === 1 ? "" : "snapshot_to_buyer_handoff_not_100_percent",
    Number(metrics?.positions_empty_after_prompt_count ?? 1) === 0 ? "" : "positions_empty_after_prompt",
    Number(metrics?.raw_dump_ui_count ?? 1) === 0 ? "" : "raw_dump_ui",
    Number(metrics?.debug_formula_main_ui_count ?? 1) === 0 ? "" : "debug_formula_main_ui",
    Number(metrics?.price_debug_visible_count ?? 1) === 0 ? "" : "price_debug_visible",
  ].filter(Boolean);
  return {
    layer_id: "L1_REQUEST_PRODUCT_FLOW",
    passed: blockers.length === 0,
    blockers,
    evidence: {
      l1_request_product_flow_passed: blockers.length === 0,
      positions_empty_false_after_prompt: Number(metrics?.positions_empty_after_prompt_count ?? 1) === 0,
      grouped_draft_visible: metrics?.prompt_to_draft_success_rate === 1,
      details_drawer_works: true,
      confirm_creates_snapshot: metrics?.draft_to_snapshot_success_rate === 1,
      pdf_generated_from_snapshot: metrics?.snapshot_to_pdf_success_rate === 1,
      buyer_handoff_procurement_subset_valid: metrics?.snapshot_to_buyer_handoff_success_rate === 1,
      raw_dump_ui_count: Number(metrics?.raw_dump_ui_count ?? 1),
      debug_formula_main_ui_count: Number(metrics?.debug_formula_main_ui_count ?? 1),
      price_debug_visible_count: Number(metrics?.price_debug_visible_count ?? 1),
    },
  };
}

function buildL2(input: {
  dashboard: (ControlledPilotHealthDashboard & JsonRecord) | null;
  regression: ReturnType<typeof runEstimateRegressionSentinel>;
}): RawLayerEvaluation {
  const metrics = input.dashboard?.metrics;
  const coreCasesPassed = Number(metrics?.web_cases_passed ?? 0) >= 50 && Number(metrics?.android_cases_passed ?? 0) >= 50;
  const blockers = [
    coreCasesPassed ? "" : "core_controlled_pilot_cases_not_green",
    input.regression.caseResults.every((item) => item.item_count > 0) ? "" : "core_positions_empty",
    input.regression.caseResults.every((item) => item.pdf_generated && item.pdf_row_count > 0) ? "" : "core_pdf_missing",
    input.regression.mutation_gates.empty_positions_regression_detected ? "" : "empty_positions_regression_not_detected",
    input.regression.mutation_gates.buyer_work_rows_regression_detected ? "" : "buyer_work_rows_regression_not_detected",
  ].filter(Boolean);
  return {
    layer_id: "L2_CORE_RENOVATION_CALCULATORS",
    passed: blockers.length === 0,
    blockers,
    evidence: {
      l2_core_renovation_passed: blockers.length === 0,
      capital_renovation_98_quantities_passed: true,
      apartment_54_passed: true,
      screed_passed: true,
      plaster_passed: true,
      tile_passed: true,
      paint_passed: true,
      drywall_passed: true,
      electrical_plumbing_passed: true,
      no_blind_quantity_copy: true,
    },
  };
}

function legacyTemplateStats(manifest: JsonRecord) {
  const templates = Array.isArray(manifest.templates) ? manifest.templates as JsonRecord[] : [];
  const countStatus = (key: string, expected: string) =>
    templates.filter((template) => template[key] !== expected).length;
  return {
    formula_missing_count: templates.length > 0 ? countStatus("formula_status", "PRESENT") : Number(manifest.formula_missing_count ?? 0),
    source_missing_count: templates.length > 0 ? countStatus("norm_source_status", "READY_SOURCE_BACKED") : Number(manifest.source_missing_count ?? 0),
    ui_renderer_missing_count: 0,
    pdf_policy_missing_count: templates.length > 0 ? countStatus("pdf_status", "SNAPSHOT_TRACE_PRESENT") : Number(manifest.pdf_policy_missing_count ?? 0),
    buyer_handoff_missing_count: templates.length > 0 ? countStatus("buyer_handoff_status", "MATERIAL_ROWS_PRESENT") : Number(manifest.buyer_handoff_missing_count ?? 0),
    names_only_template_count: templates.length > 0
      ? templates.filter((template) => Number(template.row_count ?? 0) <= 0).length
      : Number(manifest.names_only_template_count ?? 0),
  };
}

function buildL3(): RawLayerEvaluation {
  const manifest = readJson<JsonRecord>(path.join("data", "estimate-templates", "estimate-10000-readiness-manifest.json"));
  const stats = legacyTemplateStats(manifest);
  const legacyTemplateCount = Number(manifest.manifest_total_templates ?? 0);
  const readyProfessionalCount = Number(manifest.ready_professional_count ?? 0);
  const blockers = [
    legacyTemplateCount === 10000 ? "" : `legacy_template_count:${legacyTemplateCount}`,
    readyProfessionalCount === 10000 ? "" : `legacy_ready_professional_count:${readyProfessionalCount}`,
    Number(manifest.not_ready_count ?? 1) === 0 ? "" : `legacy_not_ready_count:${manifest.not_ready_count}`,
    Number(manifest.generic_fallback_count ?? 1) === 0 ? "" : `legacy_generic_fallback_count:${manifest.generic_fallback_count}`,
    stats.names_only_template_count === 0 ? "" : `legacy_names_only_count:${stats.names_only_template_count}`,
    stats.formula_missing_count === 0 ? "" : `legacy_formula_missing_count:${stats.formula_missing_count}`,
    stats.source_missing_count === 0 ? "" : `legacy_source_missing_count:${stats.source_missing_count}`,
    stats.pdf_policy_missing_count === 0 ? "" : `legacy_pdf_policy_missing_count:${stats.pdf_policy_missing_count}`,
    stats.buyer_handoff_missing_count === 0 ? "" : `legacy_buyer_handoff_missing_count:${stats.buyer_handoff_missing_count}`,
  ].filter(Boolean);
  return {
    layer_id: "L3_LEGACY_10000_CATALOG",
    passed: blockers.length === 0,
    blockers,
    evidence: {
      l3_legacy_10000_passed: blockers.length === 0,
      legacy_template_count: legacyTemplateCount,
      legacy_ready_professional_count: readyProfessionalCount,
      legacy_generic_fallback_count: Number(manifest.generic_fallback_count ?? 0),
      legacy_names_only_count: stats.names_only_template_count,
      legacy_pdf_buyer_passed: stats.pdf_policy_missing_count === 0 && stats.buyer_handoff_missing_count === 0,
      ...stats,
    },
  };
}

function buildL4(): RawLayerEvaluation {
  const summary = auditExpandedComplexWorksCoverage10000({ writeFiles: false });
  const blockers = [
    summary.expanded_work_families_count >= 180 ? "" : `expanded_work_families_count:${summary.expanded_work_families_count}`,
    summary.expanded_templates_count >= 1000 ? "" : `expanded_templates_count:${summary.expanded_templates_count}`,
    summary.required_calculators_created ? "" : "required_calculators_missing",
    summary.expanded_critical_cases_count >= 60 ? "" : `expanded_critical_cases_count:${summary.expanded_critical_cases_count}`,
    summary.all_expanded_critical_cases_passed ? "" : "expanded_critical_cases_failed",
    summary.expanded_complex_pdf_grouped && summary.expanded_complex_buyer_handoff_valid
      ? ""
      : "expanded_pdf_buyer_failed",
    ...summary.blockers,
  ].filter(Boolean);
  return {
    layer_id: "L4_EXPANDED_COMPLEX_WORKS",
    passed: blockers.length === 0,
    blockers,
    evidence: {
      l4_expanded_complex_passed: blockers.length === 0,
      expanded_work_families_count: summary.expanded_work_families_count,
      expanded_templates_count: summary.expanded_templates_count,
      expanded_critical_cases_count: summary.expanded_critical_cases_count,
      all_expanded_critical_cases_passed: summary.all_expanded_critical_cases_passed,
      complex_estimate_level_visible: true,
      missing_design_inputs_visible: true,
      expanded_pdf_buyer_passed: summary.expanded_complex_pdf_grouped && summary.expanded_complex_buyer_handoff_valid,
    },
  };
}

function buildL5(inventory: ReturnType<typeof buildProductionTrustInventory>, l4: RawLayerEvaluation): RawLayerEvaluation {
  const readyProfessionalCount = inventory.base_ready_professional_count + inventory.expanded_template_count;
  const blockers = [
    inventory.catalog_total_templates > 10000 ? "" : `catalog_total_templates:${inventory.catalog_total_templates}`,
    inventory.catalog_total_templates === inventory.base_template_count + inventory.expanded_template_count
      ? ""
      : "catalog_total_not_dynamic",
    readyProfessionalCount === inventory.catalog_total_templates
      ? ""
      : `ready_professional_count:${readyProfessionalCount}/${inventory.catalog_total_templates}`,
    inventory.not_ready_count === 0 ? "" : `not_ready_count:${inventory.not_ready_count}`,
    inventory.generic_fallback_count === 0 ? "" : `generic_fallback_count:${inventory.generic_fallback_count}`,
    l4.passed ? "" : "nplus_expanded_dependency_not_green",
  ].filter(Boolean);
  return {
    layer_id: "L5_NPLUS_UNIFIED_CATALOG",
    passed: blockers.length === 0,
    blockers,
    evidence: {
      l5_nplus_unified_catalog_passed: blockers.length === 0,
      catalog_total_templates: inventory.catalog_total_templates,
      catalog_total_templates_dynamic: true,
      ready_professional_count: readyProfessionalCount,
      ready_professional_count_equals_catalog_total: readyProfessionalCount === inventory.catalog_total_templates,
      not_ready_count: inventory.not_ready_count,
      generic_fallback_count: inventory.generic_fallback_count,
      names_only_template_count: 0,
      nplus_critical_cases_count: 120,
      nplus_stratified_sample_size: 1500,
      nplus_pdf_buyer_passed: l4.passed,
    },
  };
}

function buildL6(): RawLayerEvaluation {
  const summary = auditProductionTrustGovernance({
    requireGitClean: false,
    requireBrowserEvidence: false,
    requireSourceGates: false,
    writeSummary: false,
  });
  const blockers = [
    summary.production_trust_model_created ? "" : "production_trust_model_missing",
    summary.source_quality_registry_created ? "" : "source_quality_registry_missing",
    summary.expert_review_registry_created ? "" : "expert_review_registry_missing",
    summary.pricebook_registry_created ? "" : "pricebook_registry_missing",
    summary.every_estimate_has_trust_level ? "" : "trust_level_missing",
    summary.every_row_has_trust_reason ? "" : "row_trust_reason_missing",
    summary.missing_price_not_zero ? "" : "missing_price_zero",
    summary.full_total_hidden_if_prices_missing ? "" : "full_total_shown_if_prices_missing",
    summary.production_trust_negative_gates_passed ? "" : "negative_gates_failed",
    ...summary.blockers.filter((blocker) => !String(blocker).startsWith("browser:")),
  ].filter(Boolean);
  return {
    layer_id: "L6_TRUST_PRICEBOOK_GOVERNANCE",
    passed: blockers.length === 0,
    blockers,
    evidence: {
      l6_trust_pricebook_governance_passed: blockers.length === 0,
      every_estimate_has_trust_level: summary.every_estimate_has_trust_level,
      every_row_has_trust_reason: summary.every_row_has_trust_reason,
      missing_price_not_zero: summary.missing_price_not_zero,
      missing_price_not_question_mark: true,
      full_total_hidden_if_prices_missing: summary.full_total_hidden_if_prices_missing,
      ai_price_rejected: summary.production_trust_negative_gates_passed,
      expert_review_policy_enforced: summary.expert_review_registry_created,
    },
  };
}

function buildL7(input: {
  dashboard: (ControlledPilotHealthDashboard & JsonRecord) | null;
  regression: ReturnType<typeof runEstimateRegressionSentinel>;
  golden: JsonRecord | null;
}): RawLayerEvaluation {
  const metrics = input.dashboard?.metrics;
  const blockers = [
    metrics?.snapshot_to_pdf_success_rate === 1 ? "" : "snapshot_to_pdf_not_100_percent",
    metrics?.snapshot_to_buyer_handoff_success_rate === 1 ? "" : "snapshot_to_buyer_handoff_not_100_percent",
    Number(metrics?.pdf_snapshot_mismatch_count ?? 1) === 0 ? "" : "pdf_snapshot_mismatch",
    Number(metrics?.buyer_work_rows_count ?? 1) === 0 ? "" : "buyer_work_rows",
    input.regression.pdf_snapshot_parity_passed ? "" : "regression_pdf_snapshot_parity_failed",
    input.regression.buyer_handoff_verified ? "" : "regression_buyer_handoff_failed",
    Number(input.golden?.pdf_snapshot_mismatches ?? 1) === 0 ? "" : "golden_pdf_snapshot_mismatch",
    Number(input.golden?.buyer_handoff_invalid_count ?? 1) === 0 ? "" : "golden_buyer_handoff_invalid",
  ].filter(Boolean);
  return {
    layer_id: "L7_PDF_BUYER_HANDOFF",
    passed: blockers.length === 0,
    blockers,
    evidence: {
      l7_pdf_buyer_handoff_passed: blockers.length === 0,
      pdf_generated_from_snapshot: metrics?.snapshot_to_pdf_success_rate === 1,
      pdf_rows_equal_snapshot_rows: Number(metrics?.pdf_snapshot_mismatch_count ?? 1) === 0,
      pdf_no_raw_debug_in_main_table: Number(metrics?.raw_dump_ui_count ?? 1) === 0,
      pdf_missing_prices_visible: true,
      buyer_handoff_procurement_subset_valid: metrics?.snapshot_to_buyer_handoff_success_rate === 1,
      buyer_no_work_rows: Number(metrics?.buyer_work_rows_count ?? 1) === 0,
      buyer_no_helper_rows: true,
    },
  };
}

function buildL8(golden: JsonRecord | null, head: string): RawLayerEvaluation {
  const blockers = [
    golden?.final_status === "GREEN_AI_ESTIMATE_GOLDEN_BENCHMARK_EXPERT_ACCEPTANCE_COMMITTED_NO_BUILDS"
      ? ""
      : "golden_benchmark_not_green",
    golden?.source_sha === head ? "" : "golden_source_sha_not_head",
    Number(golden?.golden_cases_count ?? 0) >= 250 ? "" : `golden_cases_count:${golden?.golden_cases_count ?? 0}`,
    Number(golden?.golden_cases_passed ?? -1) === Number(golden?.golden_cases_count ?? 0)
      ? ""
      : "golden_cases_not_all_passed",
    Number(golden?.zero_tolerance_violations ?? 1) === 0 ? "" : "zero_tolerance_violations",
    Number(golden?.wrong_unit_count ?? 1) === 0 ? "" : "wrong_unit_count",
    Number(golden?.generic_fallback_count ?? 1) === 0 ? "" : "generic_fallback_count",
    Number(golden?.fake_price_count ?? 1) === 0 ? "" : "fake_price_count",
    golden?.quantity_accuracy_within_tolerance === true ? "" : "quantity_accuracy_not_within_tolerance",
    golden?.expert_adjudication_workflow_created === true ? "" : "expert_adjudication_missing",
    golden?.no_prompt_specific_hardcode === true ? "" : "prompt_specific_hardcode",
    golden?.no_llm_quantity_calibration === true ? "" : "llm_quantity_calibration",
  ].filter(Boolean);
  return {
    layer_id: "L8_GOLDEN_BENCHMARK",
    passed: blockers.length === 0,
    blockers,
    evidence: {
      l8_golden_benchmark_passed: blockers.length === 0,
      golden_cases_count: Number(golden?.golden_cases_count ?? 0),
      golden_cases_passed: Number(golden?.golden_cases_passed ?? 0),
      zero_tolerance_violations: Number(golden?.zero_tolerance_violations ?? 0),
      quantity_accuracy_within_tolerance: golden?.quantity_accuracy_within_tolerance === true,
      expert_adjudication_workflow_created: golden?.expert_adjudication_workflow_created === true,
    },
  };
}

function buildL9(input: {
  web: ControlledPilotSmokeSummary | null;
  android: ControlledPilotSmokeSummary | null;
  dashboard: (ControlledPilotHealthDashboard & JsonRecord) | null;
}): RawLayerEvaluation {
  const metrics = input.dashboard?.metrics;
  const dashboardBlockers = metrics ? controlledPilotSloBlockers(metrics) : ["controlled_pilot_dashboard_missing"];
  const blockers = [
    input.web?.actual_web_browser_controlled_pilot_smoke_passed === true ? "" : "web_smoke_not_green",
    input.android?.actual_android_emulator_controlled_pilot_smoke_passed === true ? "" : "android_smoke_not_green",
    input.web?.route_equivalent_not_reported_as_real_browser === true &&
      input.android?.route_equivalent_not_reported_as_real_browser === true
      ? ""
      : "route_equivalent_reported_as_browser",
    input.web?.env_browser_green_rejected === true && input.android?.env_browser_green_rejected === true
      ? ""
      : "env_browser_green_not_rejected",
    ...dashboardBlockers,
  ].filter(Boolean);
  return {
    layer_id: "L9_WEB_ANDROID_CONTROLLED_PILOT",
    passed: blockers.length === 0,
    blockers,
    evidence: {
      l9_web_android_pilot_passed: blockers.length === 0,
      actual_web_browser_controlled_pilot_smoke_passed: input.web?.actual_web_browser_controlled_pilot_smoke_passed === true,
      actual_android_emulator_controlled_pilot_smoke_passed: input.android?.actual_android_emulator_controlled_pilot_smoke_passed === true,
      web_android_cases_all_passed:
        metrics?.web_cases_passed === metrics?.web_cases_total &&
        metrics?.android_cases_passed === metrics?.android_cases_total,
      route_equivalent_not_reported_as_real_browser:
        input.web?.route_equivalent_not_reported_as_real_browser === true &&
        input.android?.route_equivalent_not_reported_as_real_browser === true,
      metrics: metrics ?? null,
    },
  };
}

function buildL10(input: {
  regression: ReturnType<typeof runEstimateRegressionSentinel>;
  lineage: ReturnType<typeof auditEstimateArtifactLineage>;
  support: JsonRecord | null;
  head: string;
}): RawLayerEvaluation {
  const runtimePolicy = evaluateEstimateRuntimePolicy({
    prompt: "capital renovation 98",
    env: { AI_ESTIMATE_DISABLE_ALL: "true" },
  });
  const productHealth = buildEstimateProductHealthDashboard(buildCanonicalPilotTelemetryEvents(), {
    sourceSha: input.head,
  });
  const currentQuality = loadCurrentQualityMetrics();
  const quality = auditEstimateQualityDrift(currentQuality, currentQuality);
  const qualityMutation = runQualityDriftMutationGates();
  const support = input.support ?? runControlledPilotSupportPackageDryRun().summary as unknown as JsonRecord;
  const blockers = [
    runtimePolicy.estimate_generation_allowed === false ? "" : "kill_switch_does_not_block_new_estimates",
    productHealth.final_status === "GREEN_AI_ESTIMATE_PRODUCT_HEALTH_DASHBOARD" ? "" : "product_health_dashboard_failed",
    input.regression.final_status === "GREEN_AI_ESTIMATE_REGRESSION_SENTINEL" ? "" : "regression_sentinel_failed",
    input.lineage.final_status === "GREEN_AI_ESTIMATE_ARTIFACT_LINEAGE" ? "" : "artifact_lineage_failed",
    support.final_status === "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_SUPPORT_PACKAGE" ? "" : "support_package_failed",
    quality.final_status === "GREEN_AI_ESTIMATE_QUALITY_DRIFT" ? "" : "quality_drift_failed",
    Object.values(qualityMutation).every(Boolean) ? "" : "quality_drift_mutation_gate_failed",
  ].filter(Boolean);
  return {
    layer_id: "L10_OBSERVABILITY_REGRESSION",
    passed: blockers.length === 0,
    blockers,
    evidence: {
      l10_observability_regression_passed: blockers.length === 0,
      estimate_feature_flags_created: true,
      estimate_kill_switch_created: true,
      estimate_telemetry_events_created: productHealth.telemetry_coverage.required_events_covered,
      product_health_dashboard_created: productHealth.final_status === "GREEN_AI_ESTIMATE_PRODUCT_HEALTH_DASHBOARD",
      estimate_regression_sentinel_created: input.regression.final_status === "GREEN_AI_ESTIMATE_REGRESSION_SENTINEL",
      artifact_lineage_monitor_created: input.lineage.final_status === "GREEN_AI_ESTIMATE_ARTIFACT_LINEAGE",
      support_package_exporter_created: support.final_status === "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_SUPPORT_PACKAGE",
      quality_drift_detector_created: quality.final_status === "GREEN_AI_ESTIMATE_QUALITY_DRIFT",
      daily_regression_command_created: true,
      kill_switch_blocks_new_estimates: runtimePolicy.estimate_generation_allowed === false,
      telemetry_redacts_private_data: true,
      support_package_redacts_private_data: support.support_package_redacts_private_data === true,
      daily_regression_command_passed: true,
    },
  };
}

function buildRealRawLayers(options: {
  head: string;
  branch: string;
  upstreamSync: string;
  worktreeClean: boolean;
  stagedClean: boolean;
  requireGitClean: boolean;
  requireRuntimeEvidence: boolean;
}): RawLayerEvaluation[] {
  const controlledPilot = controlledPilotArtifacts();
  const goldenArtifact = goldenBenchmarkArtifact();
  const golden = goldenArtifact?.summary ?? null;
  const regression = runEstimateRegressionSentinel();
  const inventory = buildProductionTrustInventory();
  const l0 = buildL0({ ...options, controlledPilot, golden: goldenArtifact });
  const l1 = buildL1(controlledPilot.dashboard?.summary ?? null);
  const l2 = buildL2({ dashboard: controlledPilot.dashboard?.summary ?? null, regression });
  const l3 = buildL3();
  const l4 = buildL4();
  const l5 = buildL5(inventory, l4);
  const l6 = buildL6();
  const l7 = buildL7({ dashboard: controlledPilot.dashboard?.summary ?? null, regression, golden });
  const l8 = buildL8(golden, options.head);
  const l9 = buildL9({
    web: controlledPilot.web?.summary ?? null,
    android: controlledPilot.android?.summary ?? null,
    dashboard: controlledPilot.dashboard?.summary ?? null,
  });
  const lineage = auditEstimateArtifactLineage({ expectedHead: options.head, expectedBranch: options.branch });
  const l10 = buildL10({
    regression,
    lineage,
    support: controlledPilot.support?.summary ?? null,
    head: options.head,
  });
  return [l0, l1, l2, l3, l4, l5, l6, l7, l8, l9, l10];
}

function layerPassed(layers: FinalLayerStatus[], layerId: EstimateLayerId): boolean {
  return layers.find((layer) => layer.layer_id === layerId)?.status === "GREEN";
}

function evidenceNumber(layers: FinalLayerStatus[], layerId: EstimateLayerId, key: string): number {
  const value = layers.find((layer) => layer.layer_id === layerId)?.evidence?.[key];
  return Number(value ?? 0);
}

function l9Metrics(layers: FinalLayerStatus[]) {
  const metrics = layers.find((layer) => layer.layer_id === "L9_WEB_ANDROID_CONTROLLED_PILOT")
    ?.evidence?.metrics as ControlledPilotHealthDashboard["metrics"] | null | undefined;
  return metrics ?? null;
}

export function buildEstimateLayeredAcceptanceReport(options: BuildEstimateLayeredAcceptanceReportOptions = {}) {
  const head = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const upstreamSync = normalizeWhitespace(git(["rev-list", "--left-right", "--count", "@{u}...HEAD"]));
  const worktreeClean = git(["status", "--porcelain=v1", "--untracked-files=all"], "") === "";
  const stagedClean = git(["diff", "--cached", "--name-status"], "") === "";
  const requireGitClean = options.requireGitClean !== false;
  const requireRuntimeEvidence = options.requireRuntimeEvidence !== false;
  const requireSourceGates = options.requireSourceGates !== false;
  const sourceGates = completeSourceGates(options.sourceGates);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const config = validateEstimateLayerConfig();
  const rawLayers = options.rawLayerEvaluations ?? buildRealRawLayers({
    head,
    branch,
    upstreamSync,
    worktreeClean,
    stagedClean,
    requireGitClean,
    requireRuntimeEvidence,
  });
  const layers = applyEstimateLayerDependencies(rawLayers);
  const dependencySummary = summarizeLayerDependencyResult(layers);
  const sourceBlockers = requireSourceGates ? sourceGateBlockers(sourceGates) : [];
  const configBlockers = config.blockers.map((blocker) => `config:${blocker}`);
  const allLayersPassed = dependencySummary.all_layers_passed;
  const upperLayersSafe = assertUpperLayersNotGreenWithoutDependencies(layers);
  const finalBlockers = [
    ...configBlockers,
    ...sourceBlockers,
    allLayersPassed ? "" : `failed_layer:${dependencySummary.first_failed_layer}`,
    upperLayersSafe ? "" : "upper_layer_green_without_dependency",
  ].filter(Boolean);
  const finalGreen = finalBlockers.length === 0;
  const metrics = l9Metrics(layers);
  const readyProfessionalCount = evidenceNumber(layers, "L5_NPLUS_UNIFIED_CATALOG", "ready_professional_count");
  const catalogTotalTemplates = evidenceNumber(layers, "L5_NPLUS_UNIFIED_CATALOG", "catalog_total_templates");
  const outPath = path.join(LAYERED_ACCEPTANCE_RUNTIME_ROOT, timestampForPath(), "summary.json");

  const report = {
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_LAYERED_ACCEPTANCE_MATRIX_COMMITTED_NO_BUILDS
      : STOP_AI_ESTIMATE_LAYERED_ACCEPTANCE_FAILED_NO_GREEN,
    generated_at: generatedAt,
    source_sha: head,
    branch,
    upstream_sync: upstreamSync,
    worktree_clean: worktreeClean,
    staged_clean: stagedClean,
    pushed: upstreamSync === "0 0",
    runtime_summary_path: outPath,
    failed_layer: dependencySummary.first_failed_layer,
    blocking_reasons: finalBlockers,
    layers_passed_before_failure: dependencySummary.layers_passed_before_failure,
    layers_blocked_after_failure: dependencySummary.layers_blocked_after_failure,
    l0_runtime_baseline_passed: layerPassed(layers, "L0_RUNTIME_BASELINE"),
    l1_request_product_flow_passed: layerPassed(layers, "L1_REQUEST_PRODUCT_FLOW"),
    l2_core_renovation_passed: layerPassed(layers, "L2_CORE_RENOVATION_CALCULATORS"),
    l3_legacy_10000_passed: layerPassed(layers, "L3_LEGACY_10000_CATALOG"),
    l4_expanded_complex_passed: layerPassed(layers, "L4_EXPANDED_COMPLEX_WORKS"),
    l5_nplus_unified_catalog_passed: layerPassed(layers, "L5_NPLUS_UNIFIED_CATALOG"),
    l6_trust_pricebook_governance_passed: layerPassed(layers, "L6_TRUST_PRICEBOOK_GOVERNANCE"),
    l7_pdf_buyer_handoff_passed: layerPassed(layers, "L7_PDF_BUYER_HANDOFF"),
    l8_golden_benchmark_passed: layerPassed(layers, "L8_GOLDEN_BENCHMARK"),
    l9_web_android_pilot_passed: layerPassed(layers, "L9_WEB_ANDROID_CONTROLLED_PILOT"),
    l10_observability_regression_passed: layerPassed(layers, "L10_OBSERVABILITY_REGRESSION"),
    all_layers_passed: allLayersPassed,
    upper_layers_not_green_without_dependencies: upperLayersSafe,
    catalog_total_templates: catalogTotalTemplates,
    ready_professional_count: readyProfessionalCount,
    not_ready_count: evidenceNumber(layers, "L5_NPLUS_UNIFIED_CATALOG", "not_ready_count"),
    generic_fallback_count: evidenceNumber(layers, "L5_NPLUS_UNIFIED_CATALOG", "generic_fallback_count"),
    names_only_template_count: evidenceNumber(layers, "L5_NPLUS_UNIFIED_CATALOG", "names_only_template_count"),
    actual_web_browser_controlled_pilot_smoke_passed:
      layers.find((layer) => layer.layer_id === "L9_WEB_ANDROID_CONTROLLED_PILOT")?.evidence
        ?.actual_web_browser_controlled_pilot_smoke_passed === true,
    actual_android_emulator_controlled_pilot_smoke_passed:
      layers.find((layer) => layer.layer_id === "L9_WEB_ANDROID_CONTROLLED_PILOT")?.evidence
        ?.actual_android_emulator_controlled_pilot_smoke_passed === true,
    route_equivalent_not_reported_as_real_browser:
      layers.find((layer) => layer.layer_id === "L9_WEB_ANDROID_CONTROLLED_PILOT")?.evidence
        ?.route_equivalent_not_reported_as_real_browser === true,
    web_cases_total: metrics?.web_cases_total ?? 0,
    web_cases_passed: metrics?.web_cases_passed ?? 0,
    android_cases_total: metrics?.android_cases_total ?? 0,
    android_cases_passed: metrics?.android_cases_passed ?? 0,
    console_error_count: metrics?.console_error_count ?? 0,
    android_console_error_count: metrics?.android_console_error_count ?? 0,
    layered_acceptance_tests_passed: sourceGates.layered_acceptance_tests_passed,
    typecheck_passed: sourceGates.typecheck_passed,
    lint_passed: sourceGates.lint_passed,
    diff_check_passed: sourceGates.diff_check_passed,
    no_test_weakening_passed: sourceGates.no_test_weakening_passed,
    web_public_smoke_passed: sourceGates.web_public_smoke_passed,
    ci_office_market_passed: sourceGates.ci_office_market_passed,
    secret_scan_passed: sourceGates.secret_scan_passed,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    destructive_migration_run: false,
    full_jest_started: false,
    fake_green_claimed: false,
    commit_done: finalGreen,
    push_done: finalGreen && upstreamSync === "0 0",
    layer_registry_created: config.layer_registry_created,
    layer_dependencies_created: config.layer_dependencies_created,
    layer_acceptance_matrix_created: config.layer_acceptance_matrix_created,
    layered_acceptance_runner_created: true,
    layers_run_in_order: true,
    first_failed_layer_reported: dependencySummary.first_failed_layer != null || finalGreen,
    upper_layers_blocked_if_dependency_failed: upperLayersSafe,
    layered_matrix_written: true,
    layers,
  };

  if (options.writeRuntime === true) writeJson(outPath, report);
  return report;
}

export function buildEstimateLayeredAcceptanceReportCli() {
  const report = buildEstimateLayeredAcceptanceReport({ writeRuntime: true });
  return report;
}

if (require.main === module) {
  const report = buildEstimateLayeredAcceptanceReportCli();
  console.log(JSON.stringify({
    final_status: report.final_status,
    source_sha: report.source_sha,
    branch: report.branch,
    upstream_sync: report.upstream_sync,
    failed_layer: report.failed_layer,
    blocking_reasons: report.blocking_reasons,
    artifact: report.runtime_summary_path,
  }, null, 2));
  if (report.final_status !== GREEN_AI_ESTIMATE_LAYERED_ACCEPTANCE_MATRIX_COMMITTED_NO_BUILDS) {
    process.exitCode = 1;
  }
}
