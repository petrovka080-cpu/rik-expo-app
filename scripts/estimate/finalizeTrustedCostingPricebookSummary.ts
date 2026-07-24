import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_SOURCE_READY,
  GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_WEB_ANDROID_COMMITTED_NO_RELEASE,
  STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_INCOMPLETE_NO_GREEN,
} from "./audit11610TrustedCostingPricebook";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import { GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_ANDROID_SMOKE } from "../e2e/runTrustedCostingPricebookAndroidSmoke";
import { GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_ANDROID_PARITY } from "../e2e/runTrustedCostingPricebookWebAndroidParity";
import { GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_SMOKE } from "../e2e/runTrustedCostingPricebookWebSmoke";

const ROOT = path.join(".release-runtime", "ai-estimate-trusted-costing-pricebook");

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function walkSummaryJson(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const full = path.join(root, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walkSummaryJson(full));
    else if (entry === "summary.json") files.push(full);
  }
  return files;
}

function latestSummary<T>(root: string, predicate: (summary: T) => boolean): { path: string; summary: T } | null {
  const candidates = walkSummaryJson(root)
    .map((filePath) => ({ filePath, mtimeMs: statSync(filePath).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  for (const candidate of candidates) {
    const summary = JSON.parse(readFileSync(candidate.filePath, "utf8")) as T;
    if (predicate(summary)) return { path: candidate.filePath, summary };
  }
  return null;
}

type SourceSummary = Record<string, any>;
type WebSummary = Record<string, any>;
type AndroidSummary = Record<string, any>;
type ParitySummary = Record<string, any>;

export function finalizeTrustedCostingPricebookSummary() {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const source = latestSummary<SourceSummary>(ROOT, (summary) =>
    summary.final_status === GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_SOURCE_READY &&
    summary.source_sha === sourceSha &&
    summary.templates_audited === 11610 &&
    summary.priority_runtime_cases_audited === 100 &&
    summary.priority_runtime_cases_outcome_ready === 100 &&
    summary.priority_runtime_cases_costing_ready +
      summary.priority_runtime_cases_price_input_required === 100 &&
    summary.diamond_drilling_costing_outcome_ready === true &&
    summary.profile_sheet_fence_costing_outcome_ready === true &&
    summary.ventilated_facade_costing_outcome_ready === true &&
    summary.water_supply_costing_outcome_ready === true &&
    summary.roadworks_costing_outcome_ready === true &&
    summary.hydraulic_structures_costing_outcome_ready === true &&
    summary.power_lines_costing_outcome_ready === true &&
    summary.high_rise_glazing_costing_outcome_ready === true &&
    summary.mansard_roof_costing_outcome_ready === true &&
    summary.bridge_tunnel_industrial_costing_outcome_ready === true
  );
  const web = latestSummary<WebSummary>(path.join(ROOT, "web"), (summary) =>
    summary.final_status === GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_SMOKE &&
    summary.source_sha === sourceSha &&
    summary.actual_web_browser_trusted_costing_smoke_passed === true
  );
  const android = latestSummary<AndroidSummary>(path.join(ROOT, "android-chrome"), (summary) =>
    summary.final_status === GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_ANDROID_SMOKE &&
    summary.source_sha === sourceSha &&
    summary.actual_android_emulator_trusted_costing_smoke_passed === true
  );
  const parity = latestSummary<ParitySummary>(path.join(ROOT, "web-android-parity"), (summary) =>
    summary.final_status === GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_ANDROID_PARITY &&
    summary.source_sha === sourceSha
  );
  const gateFlags = {
    focused_professional_boq_tests_passed: hasFlag("focused-professional-boq-tests-passed"),
    typecheck_passed: hasFlag("typecheck-passed"),
    lint_passed: hasFlag("lint-passed"),
    diff_check_passed: hasFlag("diff-check-passed"),
    no_test_weakening_passed: hasFlag("no-test-weakening-passed"),
    web_public_smoke_passed: hasFlag("web-public-smoke-passed"),
    ci_office_market_passed: hasFlag("ci-office-market-passed"),
    secret_scan_passed: hasFlag("secret-scan-passed"),
  };
  const blockers = [
    source ? "" : "source_audit_green_artifact_missing",
    web ? "" : "web_smoke_green_artifact_missing",
    android ? "" : "android_smoke_green_artifact_missing",
    parity ? "" : "web_android_parity_green_artifact_missing",
    ...Object.entries(gateFlags).filter(([, value]) => !value).map(([key]) => `${key}_missing`),
    ...(source?.summary.blocking_reasons ?? []).map((reason: string) => `source:${reason}`),
    ...(web?.summary.blockers ?? []).map((reason: string) => `web:${reason}`),
    ...(android?.summary.blockers ?? []).map((reason: string) => `android:${reason}`),
    ...(parity?.summary.blockers ?? []).map((reason: string) => `parity:${reason}`),
  ].filter(Boolean);
  const green = blockers.length === 0;
  const summary = {
    ...(source?.summary ?? {}),
    final_status: green
      ? GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_WEB_ANDROID_COMMITTED_NO_RELEASE
      : STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_INCOMPLETE_NO_GREEN,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    source_audit_artifact: source?.path ?? null,
    web_smoke_artifact: web?.path ?? null,
    android_smoke_artifact: android?.path ?? null,
    web_android_parity_artifact: parity?.path ?? null,
    actual_web_browser_trusted_costing_smoke_passed: web?.summary.actual_web_browser_trusted_costing_smoke_passed === true,
    web_trusted_costing_cases_passed: web?.summary.web_trusted_costing_cases_passed ?? "0/100",
    web_cost_summary_visible_count: web?.summary.web_cost_summary_visible_count ?? 0,
    web_price_state_badges_visible_count: web?.summary.web_price_state_badges_visible_count ?? 0,
    web_fake_final_total_count: web?.summary.web_fake_final_total_count ?? 0,
    web_console_errors_count: web?.summary.web_console_errors_count ?? 0,
    actual_android_emulator_trusted_costing_smoke_passed: android?.summary.actual_android_emulator_trusted_costing_smoke_passed === true,
    android_trusted_costing_cases_passed: android?.summary.android_trusted_costing_cases_passed ?? "0/100",
    android_emulator_detected: android?.summary.android_emulator_detected === true,
    android_chrome_launched_or_attached: android?.summary.android_chrome_launched_or_attached === true,
    android_cost_summary_visible_count: android?.summary.android_cost_summary_visible_count ?? 0,
    android_price_state_badges_visible_count: android?.summary.android_price_state_badges_visible_count ?? 0,
    android_fake_final_total_count: android?.summary.android_fake_final_total_count ?? 0,
    android_console_errors_count: android?.summary.android_console_errors_count ?? 0,
    android_emulator_health_degraded: android?.summary.android_emulator_health_degraded === true,
    same_trusted_costing_corpus_used_for_web_android: parity?.summary.same_trusted_costing_corpus_used_for_web_android === true,
    web_android_case_id_parity: parity?.summary.web_android_case_id_parity === true,
    web_android_cost_summary_parity: parity?.summary.web_android_cost_summary_parity === true,
    web_android_price_state_parity: parity?.summary.web_android_price_state_parity === true,
    web_android_pdf_buyer_cost_parity: parity?.summary.web_android_pdf_buyer_cost_parity === true,
    ...gateFlags,
    full_trusted_costing_green_claimed: green,
    contract_total_claimed: false,
    owner_approved: false,
    render_staging_started: false,
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
    blocking_reasons: blockers,
  };
  const outDir = path.join(ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  writeJson(artifactPath, summary);
  return { artifactPath, summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/finalizeTrustedCostingPricebookSummary.ts")) {
  const result = finalizeTrustedCostingPricebookSummary();
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    source_sha: result.summary.source_sha,
    web_trusted_costing_cases_passed: result.summary.web_trusted_costing_cases_passed,
    android_trusted_costing_cases_passed: result.summary.android_trusted_costing_cases_passed,
    focused_professional_boq_tests_passed: result.summary.focused_professional_boq_tests_passed,
    typecheck_passed: result.summary.typecheck_passed,
    lint_passed: result.summary.lint_passed,
    ci_office_market_passed: result.summary.ci_office_market_passed,
    blockers: result.summary.blocking_reasons,
    artifact: result.artifactPath,
  }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_WEB_ANDROID_COMMITTED_NO_RELEASE) {
    process.exitCode = 1;
  }
}
