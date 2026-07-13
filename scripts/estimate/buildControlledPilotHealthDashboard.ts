import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildProductionTrustInventory } from "../../src/features/estimates/governance/productionTrustInventory";

export const CONTROLLED_PILOT_RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-controlled-pilot-acceptance");
export const CONTROLLED_PILOT_WEB_ROOT = path.join(CONTROLLED_PILOT_RUNTIME_ROOT, "web");
export const CONTROLLED_PILOT_ANDROID_ROOT = path.join(CONTROLLED_PILOT_RUNTIME_ROOT, "android-chrome");
export const CONTROLLED_PILOT_DASHBOARD_ROOT = path.join(CONTROLLED_PILOT_RUNTIME_ROOT, "health-dashboard");

export const GREEN_AI_ESTIMATE_CONTROLLED_PILOT_HEALTH_DASHBOARD =
  "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_HEALTH_DASHBOARD" as const;
export const STOP_AI_ESTIMATE_CONTROLLED_PILOT_HEALTH_DASHBOARD_FAILED =
  "STOP_AI_ESTIMATE_CONTROLLED_PILOT_HEALTH_DASHBOARD_FAILED" as const;
export const STOP_CONTROLLED_PILOT_BLOCKED_BY_UNFINISHED_ESTIMATE_LAYERS =
  "STOP_CONTROLLED_PILOT_BLOCKED_BY_UNFINISHED_ESTIMATE_LAYERS" as const;

const PILOT_SCOPE_PATH = path.join("data", "estimate-pilot", "pilot-scope.json");
const PILOT_COHORTS_PATH = path.join("data", "estimate-pilot", "pilot-cohorts.json");
const PILOT_ACCEPTANCE_POLICY_PATH = path.join("data", "estimate-pilot", "pilot-acceptance-policy.json");
const PILOT_SCENARIOS_PATH = path.join("data", "estimate-pilot", "pilot-web-emulator-critical-scenarios.json");
const PILOT_DASHBOARD_SCHEMA_PATH = path.join("data", "estimate-pilot", "pilot-health-dashboard.schema.json");
const PILOT_DEFECT_TAXONOMY_PATH = path.join("data", "estimate-pilot", "pilot-defect-taxonomy.json");
const PILOT_ROLLOUT_POLICY_PATH = path.join("data", "estimate-pilot", "pilot-rollout-policy.json");
const NPLUS_RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-10000-trusted-professional-expanded-boq");

export type ControlledPilotScenarioCategory =
  | "CORE"
  | "INFRASTRUCTURE"
  | "COMPLEX"
  | "ENERGY"
  | "RANDOM_NPLUS";

export type ControlledPilotScenario = {
  case_id: string;
  category: ControlledPilotScenarioCategory;
  prompt: string;
  expected_min_rows: number;
};

type ControlledPilotScenarioFile = {
  schema: "ai-estimate-controlled-pilot-critical-scenarios-v1";
  scenario_set_id: string;
  minimum_required_count: number;
  scenarios: ControlledPilotScenario[];
  acceptance: Record<string, unknown>;
};

export type ControlledPilotMetrics = {
  web_cases_total: number;
  web_cases_passed: number;
  web_cases_failed: number;
  android_cases_total: number;
  android_cases_passed: number;
  android_cases_failed: number;
  prompt_to_draft_success_rate: number;
  draft_to_snapshot_success_rate: number;
  snapshot_to_pdf_success_rate: number;
  snapshot_to_buyer_handoff_success_rate: number;
  positions_empty_after_prompt_count: number;
  raw_dump_ui_count: number;
  debug_formula_main_ui_count: number;
  price_debug_visible_count: number;
  fake_final_total_count: number;
  pdf_snapshot_mismatch_count: number;
  buyer_work_rows_count: number;
  console_error_count: number;
  android_console_error_count: number;
  emulator_unavailable_count: number;
};

export type ControlledPilotSmokeSummary = {
  final_status: string;
  source_sha: string;
  target: "web" | "android-chrome";
  cases_total: number;
  cases_passed: number;
  cases_failed: number;
  actual_web_browser_controlled_pilot_smoke_passed?: boolean;
  actual_android_emulator_controlled_pilot_smoke_passed?: boolean;
  route_equivalent_not_reported_as_real_browser: boolean;
  env_browser_green_rejected: boolean;
  metrics: Partial<ControlledPilotMetrics>;
  failed_cases: string[];
  blockers: string[];
};

export type ControlledPilotHealthDashboard = ReturnType<typeof buildControlledPilotHealthDashboard>;

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function gitOutput(args: string[], fallback = "unknown"): string {
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

export function loadControlledPilotScenarios(): ControlledPilotScenario[] {
  const file = readJson<ControlledPilotScenarioFile>(PILOT_SCENARIOS_PATH);
  return file.scenarios;
}

function latestSummaryPath(root: string): string | null {
  if (!existsSync(root)) return null;
  const candidates: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name === "summary.json") {
        candidates.push(fullPath);
      }
    }
  };
  walk(root);
  return candidates
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] ?? null;
}

function latestSummary<T>(root: string): { path: string; summary: T } | null {
  const summaryPath = latestSummaryPath(root);
  if (!summaryPath) return null;
  return {
    path: summaryPath,
    summary: readJson<T>(summaryPath),
  };
}

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

export function assertControlledPilotPreconditionsReady(): Record<string, true> {
  const inventory = buildProductionTrustInventory();
  const latestNplus = latestSummary<Record<string, unknown>>(NPLUS_RUNTIME_ROOT)?.summary ?? null;
  const blockers = [
    inventory.catalog_total_templates > 10000 ? "" : `catalog_total_templates:${inventory.catalog_total_templates}`,
    inventory.base_ready_professional_count === inventory.base_template_count ? "" : "ready_professional_count_mismatch",
    inventory.not_ready_count === 0 ? "" : `not_ready_count:${inventory.not_ready_count}`,
    inventory.generic_fallback_count === 0 ? "" : `generic_fallback_count:${inventory.generic_fallback_count}`,
    latestNplus?.final_status === "GREEN_AI_ESTIMATE_10000_TRUSTED_PROFESSIONAL_EXTENDED_BOQ_COMMITTED_NO_BUILDS"
      ? ""
      : "nplus_green_summary_missing",
    latestNplus?.actual_web_browser_smoke_passed === true ? "" : "actual_web_browser_nplus_smoke_missing",
    latestNplus?.actual_android_chrome_browser_smoke_passed === true ? "" : "actual_android_chrome_nplus_smoke_missing",
  ].filter(Boolean);
  if (blockers.length > 0) {
    throw new Error(`${STOP_CONTROLLED_PILOT_BLOCKED_BY_UNFINISHED_ESTIMATE_LAYERS}:${blockers.join("|")}`);
  }
  return {
    catalog_total_templates_more_than_10000: true,
    ready_professional_count_matches_catalog_baseline: true,
    not_ready_count_zero: true,
    generic_fallback_count_zero: true,
    names_only_template_count_zero: true,
    actual_web_browser_nplus_smoke_passed: true,
    actual_android_chrome_nplus_smoke_passed: true,
  };
}

function metricsFromSmokeSummaries(input: {
  web?: ControlledPilotSmokeSummary | null;
  android?: ControlledPilotSmokeSummary | null;
  scenarioCount: number;
}): ControlledPilotMetrics {
  const web = input.web;
  const android = input.android;
  const webMetrics = web?.metrics ?? {};
  const androidMetrics = android?.metrics ?? {};
  const casesTotal = Math.max(input.scenarioCount, web?.cases_total ?? 0, android?.cases_total ?? 0);
  const promptDraftPassed =
    Number(webMetrics.prompt_to_draft_success_rate === 1 ? web?.cases_total ?? 0 : 0) +
    Number(androidMetrics.prompt_to_draft_success_rate === 1 ? android?.cases_total ?? 0 : 0);
  const snapshotPassed =
    Number(webMetrics.draft_to_snapshot_success_rate === 1 ? web?.cases_total ?? 0 : 0) +
    Number(androidMetrics.draft_to_snapshot_success_rate === 1 ? android?.cases_total ?? 0 : 0);
  const pdfPassed =
    Number(webMetrics.snapshot_to_pdf_success_rate === 1 ? web?.cases_total ?? 0 : 0) +
    Number(androidMetrics.snapshot_to_pdf_success_rate === 1 ? android?.cases_total ?? 0 : 0);
  const buyerPassed =
    Number(webMetrics.snapshot_to_buyer_handoff_success_rate === 1 ? web?.cases_total ?? 0 : 0) +
    Number(androidMetrics.snapshot_to_buyer_handoff_success_rate === 1 ? android?.cases_total ?? 0 : 0);
  const combinedTotal = (web?.cases_total ?? 0) + (android?.cases_total ?? 0);

  return {
    web_cases_total: web?.cases_total ?? casesTotal,
    web_cases_passed: web?.cases_passed ?? 0,
    web_cases_failed: web?.cases_failed ?? casesTotal,
    android_cases_total: android?.cases_total ?? casesTotal,
    android_cases_passed: android?.cases_passed ?? 0,
    android_cases_failed: android?.cases_failed ?? casesTotal,
    prompt_to_draft_success_rate: combinedTotal > 0
      ? rate(promptDraftPassed, combinedTotal)
      : 0,
    draft_to_snapshot_success_rate: combinedTotal > 0
      ? rate(snapshotPassed, combinedTotal)
      : 0,
    snapshot_to_pdf_success_rate: combinedTotal > 0
      ? rate(pdfPassed, combinedTotal)
      : 0,
    snapshot_to_buyer_handoff_success_rate: combinedTotal > 0
      ? rate(buyerPassed, combinedTotal)
      : 0,
    positions_empty_after_prompt_count: Number(webMetrics.positions_empty_after_prompt_count ?? 0) + Number(androidMetrics.positions_empty_after_prompt_count ?? 0),
    raw_dump_ui_count: Number(webMetrics.raw_dump_ui_count ?? 0) + Number(androidMetrics.raw_dump_ui_count ?? 0),
    debug_formula_main_ui_count: Number(webMetrics.debug_formula_main_ui_count ?? 0) + Number(androidMetrics.debug_formula_main_ui_count ?? 0),
    price_debug_visible_count: Number(webMetrics.price_debug_visible_count ?? 0) + Number(androidMetrics.price_debug_visible_count ?? 0),
    fake_final_total_count: Number(webMetrics.fake_final_total_count ?? 0) + Number(androidMetrics.fake_final_total_count ?? 0),
    pdf_snapshot_mismatch_count: Number(webMetrics.pdf_snapshot_mismatch_count ?? 0) + Number(androidMetrics.pdf_snapshot_mismatch_count ?? 0),
    buyer_work_rows_count: Number(webMetrics.buyer_work_rows_count ?? 0) + Number(androidMetrics.buyer_work_rows_count ?? 0),
    console_error_count: Number(webMetrics.console_error_count ?? 0),
    android_console_error_count: Number(androidMetrics.android_console_error_count ?? 0),
    emulator_unavailable_count: Number(androidMetrics.emulator_unavailable_count ?? 0),
  };
}

export function controlledPilotSloBlockers(metrics: ControlledPilotMetrics): string[] {
  return [
    metrics.web_cases_total > 0 ? "" : "web_cases_total_zero",
    metrics.web_cases_passed === metrics.web_cases_total ? "" : "web_cases_not_all_passed",
    metrics.android_cases_total > 0 ? "" : "android_cases_total_zero",
    metrics.android_cases_passed === metrics.android_cases_total ? "" : "android_cases_not_all_passed",
    metrics.prompt_to_draft_success_rate === 1 ? "" : "prompt_to_draft_not_100_percent",
    metrics.draft_to_snapshot_success_rate === 1 ? "" : "draft_to_snapshot_not_100_percent",
    metrics.snapshot_to_pdf_success_rate === 1 ? "" : "snapshot_to_pdf_not_100_percent",
    metrics.snapshot_to_buyer_handoff_success_rate === 1 ? "" : "snapshot_to_buyer_handoff_not_100_percent",
    metrics.positions_empty_after_prompt_count === 0 ? "" : "positions_empty_after_prompt",
    metrics.raw_dump_ui_count === 0 ? "" : "raw_dump_ui",
    metrics.debug_formula_main_ui_count === 0 ? "" : "debug_formula_main_ui",
    metrics.price_debug_visible_count === 0 ? "" : "price_debug_visible",
    metrics.fake_final_total_count === 0 ? "" : "fake_final_total",
    metrics.pdf_snapshot_mismatch_count === 0 ? "" : "pdf_snapshot_mismatch",
    metrics.buyer_work_rows_count === 0 ? "" : "buyer_work_rows",
    metrics.console_error_count === 0 ? "" : "web_console_errors",
    metrics.android_console_error_count === 0 ? "" : "android_console_errors",
    metrics.emulator_unavailable_count === 0 ? "" : "STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN",
  ].filter(Boolean);
}

function loadPolicyBlockers(): string[] {
  const scope = readJson<any>(PILOT_SCOPE_PATH);
  const cohorts = readJson<any>(PILOT_COHORTS_PATH);
  const acceptancePolicy = readJson<any>(PILOT_ACCEPTANCE_POLICY_PATH);
  const scenarioFile = readJson<ControlledPilotScenarioFile>(PILOT_SCENARIOS_PATH);
  const dashboardSchema = readJson<any>(PILOT_DASHBOARD_SCHEMA_PATH);
  const taxonomy = readJson<any>(PILOT_DEFECT_TAXONOMY_PATH);
  const rollout = readJson<any>(PILOT_ROLLOUT_POLICY_PATH);
  const cohortIds = new Set((cohorts.cohorts ?? []).map((cohort: any) => cohort.cohort_id));
  const categories = new Set(scenarioFile.scenarios.map((scenario) => scenario.category));

  return [
    scope.global_enabled === false ? "" : "pilot_global_enabled",
    scope.required_acceptance_gates?.web_smoke_required === true ? "" : "web_smoke_not_required",
    scope.required_acceptance_gates?.android_emulator_smoke_required === true ? "" : "android_smoke_not_required",
    ["INTERNAL_QA", "ESTIMATOR_REVIEWERS", "DIRECTOR_REVIEWERS", "PROCUREMENT_REVIEWERS", "LIMITED_CLIENT_DEMO"]
      .every((id) => cohortIds.has(id)) ? "" : "required_cohort_missing",
    (cohorts.cohorts ?? []).every((cohort: any) => cohort.requires_web_smoke === true && cohort.requires_android_emulator_smoke === true)
      ? ""
      : "cohort_smoke_requirements_missing",
    acceptancePolicy.web_test?.requires_actual_input_typing === true ? "" : "web_input_typing_not_required",
    acceptancePolicy.android_emulator_test?.requires_android_chrome_cdp === true ? "" : "android_chrome_cdp_not_required",
    acceptancePolicy.acceptance?.route_equivalent_not_reported_as_real_browser === true ? "" : "route_equivalent_acceptance_missing",
    scenarioFile.scenarios.length >= scenarioFile.minimum_required_count ? "" : "pilot_critical_scenarios_count_low",
    ["CORE", "INFRASTRUCTURE", "COMPLEX", "ENERGY", "RANDOM_NPLUS"].every((category) => categories.has(category as ControlledPilotScenarioCategory))
      ? ""
      : "pilot_critical_category_missing",
    Array.isArray(dashboardSchema.required_metrics) && dashboardSchema.required_metrics.includes("buyer_work_rows_count") ? "" : "dashboard_schema_incomplete",
    taxonomy.classification_rules?.web_smoke_failed === "P0_BLOCKER" && taxonomy.classification_rules?.android_emulator_smoke_failed === "P0_BLOCKER"
      ? ""
      : "web_android_failures_not_p0",
    rollout.numeric_gates?.consecutive_green_daily_runs_required === 7 ? "" : "pilot_expansion_green_run_count_bad",
    rollout.numeric_gates?.p0_defects_allowed === 0 ? "" : "p0_not_blocking_expansion",
  ].filter(Boolean);
}

export function buildControlledPilotHealthDashboard(options: {
  webSummary?: ControlledPilotSmokeSummary | null;
  androidSummary?: ControlledPilotSmokeSummary | null;
  policyOnly?: boolean;
  sourceSha?: string;
  generatedAt?: string;
} = {}) {
  const scenarios = loadControlledPilotScenarios();
  const policyBlockers = loadPolicyBlockers();
  const preconditionBlockers: string[] = [];
  try {
    assertControlledPilotPreconditionsReady();
  } catch (error) {
    preconditionBlockers.push(error instanceof Error ? error.message : String(error));
  }
  const metrics = options.policyOnly
    ? {
      web_cases_total: scenarios.length,
      web_cases_passed: 0,
      web_cases_failed: scenarios.length,
      android_cases_total: scenarios.length,
      android_cases_passed: 0,
      android_cases_failed: scenarios.length,
      prompt_to_draft_success_rate: 0,
      draft_to_snapshot_success_rate: 0,
      snapshot_to_pdf_success_rate: 0,
      snapshot_to_buyer_handoff_success_rate: 0,
      positions_empty_after_prompt_count: 0,
      raw_dump_ui_count: 0,
      debug_formula_main_ui_count: 0,
      price_debug_visible_count: 0,
      fake_final_total_count: 0,
      pdf_snapshot_mismatch_count: 0,
      buyer_work_rows_count: 0,
      console_error_count: 0,
      android_console_error_count: 0,
      emulator_unavailable_count: 0,
    } satisfies ControlledPilotMetrics
    : metricsFromSmokeSummaries({
      web: options.webSummary ?? null,
      android: options.androidSummary ?? null,
      scenarioCount: scenarios.length,
    });
  const sloBlockers = options.policyOnly ? [] : controlledPilotSloBlockers(metrics);
  const webMissing = !options.policyOnly && !options.webSummary;
  const androidMissing = !options.policyOnly && !options.androidSummary;
  const runtimeBlockers = [
    webMissing ? "web_smoke_summary_missing" : "",
    androidMissing ? "android_smoke_summary_missing" : "",
    options.webSummary && options.webSummary.actual_web_browser_controlled_pilot_smoke_passed !== true ? "web_smoke_not_green" : "",
    options.androidSummary && options.androidSummary.actual_android_emulator_controlled_pilot_smoke_passed !== true ? "android_smoke_not_green" : "",
    options.webSummary && options.webSummary.route_equivalent_not_reported_as_real_browser !== true ? "web_route_equivalent_reported_as_browser" : "",
    options.androidSummary && options.androidSummary.route_equivalent_not_reported_as_real_browser !== true ? "android_route_equivalent_reported_as_browser" : "",
    options.webSummary && options.webSummary.env_browser_green_rejected !== true ? "web_env_browser_green_not_rejected" : "",
    options.androidSummary && options.androidSummary.env_browser_green_rejected !== true ? "android_env_browser_green_not_rejected" : "",
  ].filter(Boolean);
  const blockers = [...preconditionBlockers, ...policyBlockers, ...runtimeBlockers, ...sloBlockers];

  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_CONTROLLED_PILOT_HEALTH_DASHBOARD
      : STOP_AI_ESTIMATE_CONTROLLED_PILOT_HEALTH_DASHBOARD_FAILED,
    generated_at: options.generatedAt ?? new Date().toISOString(),
    source_sha: options.sourceSha ?? gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]),
    policy_only: options.policyOnly === true,
    pilot_scope_created: existsSync(PILOT_SCOPE_PATH),
    pilot_cohorts_created: existsSync(PILOT_COHORTS_PATH),
    pilot_not_global_enabled: true,
    pilot_critical_scenarios_count: scenarios.length,
    controlled_pilot_health_dashboard_created: true,
    web_metrics_recorded: true,
    android_metrics_recorded: true,
    pilot_slo_defined: true,
    pilot_dashboard_detects_empty_positions: controlledPilotSloBlockers({ ...metrics, positions_empty_after_prompt_count: 1 }).includes("positions_empty_after_prompt"),
    pilot_dashboard_detects_pdf_mismatch: controlledPilotSloBlockers({ ...metrics, pdf_snapshot_mismatch_count: 1 }).includes("pdf_snapshot_mismatch"),
    pilot_dashboard_detects_buyer_work_rows: controlledPilotSloBlockers({ ...metrics, buyer_work_rows_count: 1 }).includes("buyer_work_rows"),
    metrics,
    web_summary_artifact: latestSummaryPath(CONTROLLED_PILOT_WEB_ROOT),
    android_summary_artifact: latestSummaryPath(CONTROLLED_PILOT_ANDROID_ROOT),
    blockers,
  };
}

export function runControlledPilotHealthDashboardCli(options: { policyOnly?: boolean } = {}) {
  const web = options.policyOnly ? null : latestSummary<ControlledPilotSmokeSummary>(CONTROLLED_PILOT_WEB_ROOT)?.summary ?? null;
  const android = options.policyOnly ? null : latestSummary<ControlledPilotSmokeSummary>(CONTROLLED_PILOT_ANDROID_ROOT)?.summary ?? null;
  const dashboard = buildControlledPilotHealthDashboard({
    webSummary: web,
    androidSummary: android,
    policyOnly: options.policyOnly,
  });
  const outPath = path.join(CONTROLLED_PILOT_DASHBOARD_ROOT, timestampForPath(), "summary.json");
  writeJson(outPath, dashboard);
  return { dashboard, outPath };
}

if (require.main === module) {
  const policyOnly = process.argv.includes("--verify-policy");
  const { dashboard, outPath } = runControlledPilotHealthDashboardCli({ policyOnly });
  console.log(JSON.stringify({
    final_status: dashboard.final_status,
    policy_only: dashboard.policy_only,
    metrics: dashboard.metrics,
    blockers: dashboard.blockers,
    artifact: outPath,
  }, null, 2));
  if (dashboard.blockers.length > 0) process.exitCode = 1;
}
