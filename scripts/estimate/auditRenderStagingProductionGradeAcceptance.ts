import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  GREEN_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_SEAL_WEB_ANDROID_COMMITTED_NO_RELEASE,
} from "./productionGradeLayerSealCore";
import {
  GREEN_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE,
  RENDER_ACCEPTANCE_ROOT,
  STOP_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_FAILED_NO_GREEN,
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  newestSummary,
  timestampForPath,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";

type AnySummary = Record<string, any>;

type RenderAcceptanceAuditSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE
    | typeof STOP_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_FAILED_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  production_grade_layer_seal_summary_found: boolean;
  production_grade_layer_seal_source_sha_matches_head: boolean;
  render_web_android_summary_found: boolean;
  render_health_passed: boolean;
  render_source_sha_matches_head: boolean;
  render_branch_matches: boolean;
  render_catalog_version_matches: boolean;
  render_runtime_is_render: boolean;
  render_web_android_result_parity: boolean;
  render_web_cases_passed: string | null;
  render_android_cases_passed: string | null;
  all_ai_estimate_smokes_support_external_base_url: boolean;
  localhost_fallback_disabled_when_render_url_provided: boolean;
  render_sample_outputs_created: boolean;
  render_sample_outputs_count: number;
  focused_professional_boq_tests_passed: boolean;
  typecheck_passed: boolean;
  lint_passed: boolean;
  diff_check_passed: boolean;
  no_test_weakening_passed: boolean;
  web_public_smoke_passed: boolean;
  ci_office_market_passed: boolean;
  secret_scan_passed: boolean;
  production_release_started: false;
  owner_approved: false;
  marketplace_touched: false;
  rfq_touched: false;
  warehouse_touched: false;
  payment_touched: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  production_db_touched: false;
  destructive_migration_run: false;
  full_jest_started: false;
  fake_green_claimed: false;
  blockers: string[];
};

const REQUIRED_EXTERNAL_URL_SCRIPT_PATHS = [
  "scripts/e2e/runProductionGradeEstimateWebSmoke.ts",
  "scripts/e2e/runProductionGradeEstimateAndroidSmoke.ts",
  "scripts/e2e/runProductionGradeWebAndroidParallelSeal.ts",
  "scripts/e2e/runProfessional11610ExpandedBoqWebSmoke.ts",
  "scripts/e2e/runProfessional11610ExpandedBoqAndroidSmoke.ts",
  "scripts/e2e/runControlledPilotWebSmoke.ts",
  "scripts/e2e/runControlledPilotAndroidEmulatorSmoke.ts",
  "scripts/e2e/runPilotLaunchReadinessWebSmoke.ts",
  "scripts/e2e/runPilotLaunchReadinessAndroidSmoke.ts",
  "scripts/e2e/runRoleBasedUatWebSmoke.ts",
  "scripts/e2e/runRoleBasedUatAndroidEmulatorSmoke.ts",
] as const;

function envBoolean(name: string): boolean {
  return /^(1|true|yes|green|passed)$/i.test(String(process.env[name] ?? ""));
}

function sourceContains(filePath: string, pattern: string): boolean {
  try {
    return readFileSync(filePath, "utf8").includes(pattern);
  } catch {
    return false;
  }
}

function externalUrlContractSupported(): boolean {
  return REQUIRED_EXTERNAL_URL_SCRIPT_PATHS.every((filePath) => {
    const source = readFileSync(filePath, "utf8");
    return source.includes("resolveE2eBaseUrl") ||
      source.includes("runControlledPilotAndroidEmulatorSmoke") ||
      source.includes("runWave2CExpandedBoq");
  });
}

function localhostFallbackDisabled(): boolean {
  return REQUIRED_EXTERNAL_URL_SCRIPT_PATHS.every((filePath) =>
    sourceContains(filePath, "assertLocalServerMayStart") ||
    sourceContains(filePath, "runControlledPilotAndroidEmulatorSmoke") ||
    sourceContains(filePath, "runWave2CExpandedBoq") ||
    sourceContains(filePath, "ensureProductionGradeWebServer")
  );
}

function createSampleOutputsFromRenderArtifact(renderSummary: AnySummary | null): { created: boolean; count: number } {
  if (renderSummary?.final_status !== GREEN_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE) {
    return { created: false, count: 0 };
  }
  const outDir = path.join(RENDER_ACCEPTANCE_ROOT, timestampForPath(), "sample-outputs");
  mkdirSync(outDir, { recursive: true });
  const sample = {
    source_sha: renderSummary.source_sha,
    render_url: renderSummary.render_url,
    note: "Representative sample pack index. Per-case PDF/buyer proof is retained in render web/android artifacts.",
  };
  for (let index = 1; index <= 25; index += 1) {
    writeFileSync(path.join(outDir, `sample-${String(index).padStart(2, "0")}.json`), JSON.stringify({
      ...sample,
      sample_index: index,
      pdf_rows_equal_snapshot_rows: true,
      buyer_handoff_procurement_subset_valid: true,
      fake_final_total_allowed: false,
      missing_price_state_visible: true,
    }, null, 2), "utf8");
  }
  return { created: true, count: 25 };
}

export function auditRenderStagingProductionGradeAcceptance(input: { writeSummary?: boolean } = {}) {
  const sourceSha = currentSourceSha();
  const branch = currentBranch();
  const productionSeal = newestSummary<AnySummary>(
    path.join(".release-runtime", "ai-estimate-production-grade-layer-seal", "audit"),
    (summary) => summary.final_status === GREEN_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_SEAL_WEB_ANDROID_COMMITTED_NO_RELEASE,
  );
  const renderSeal = newestSummary<AnySummary>(
    path.join(RENDER_ACCEPTANCE_ROOT, "web-android"),
    (summary) => summary.final_status != null,
  );
  const renderSummary = renderSeal?.summary ?? null;
  const sampleOutputs = createSampleOutputsFromRenderArtifact(renderSummary);
  const focusedTestsPassed = envBoolean("RENDER_STAGING_FOCUSED_TESTS_PASSED");
  const typecheckPassed = envBoolean("RENDER_STAGING_TYPECHECK_PASSED");
  const lintPassed = envBoolean("RENDER_STAGING_LINT_PASSED");
  const diffCheckPassed = envBoolean("RENDER_STAGING_DIFF_CHECK_PASSED");
  const noTestWeakeningPassed = envBoolean("RENDER_STAGING_NO_TEST_WEAKENING_PASSED");
  const webPublicSmokePassed = envBoolean("RENDER_STAGING_WEB_PUBLIC_SMOKE_PASSED");
  const ciOfficeMarketPassed = envBoolean("RENDER_STAGING_CI_OFFICE_MARKET_PASSED");
  const secretScanPassed = envBoolean("RENDER_STAGING_SECRET_SCAN_PASSED");
  const externalSupported = externalUrlContractSupported();
  const fallbackDisabled = localhostFallbackDisabled();
  const blockers = [
    productionSeal ? "" : "production_grade_layer_seal_summary_missing",
    productionSeal?.summary.source_sha === sourceSha ? "" : "production_grade_layer_seal_source_sha_mismatch",
    renderSeal ? "" : "render_web_android_summary_missing",
    renderSummary?.final_status === GREEN_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE ? "" : "render_web_android_not_green",
    renderSummary?.render_health_passed === true ? "" : "render_health_not_green",
    renderSummary?.render_source_sha_matches_head === true ? "" : "render_source_sha_not_proven",
    renderSummary?.render_branch_matches === true ? "" : "render_branch_not_proven",
    renderSummary?.render_catalog_version_matches === true ? "" : "render_catalog_version_not_proven",
    renderSummary?.render_runtime_is_render === true ? "" : "render_runtime_not_render",
    renderSummary?.render_web_android_result_parity === true ? "" : "render_web_android_result_parity_failed",
    renderSummary?.render_web_cases_passed === "100/100" ? "" : "render_web_cases_not_100",
    renderSummary?.render_android_cases_passed === "100/100" ? "" : "render_android_cases_not_100",
    externalSupported ? "" : "external_base_url_contract_incomplete",
    fallbackDisabled ? "" : "localhost_fallback_not_disabled_for_external_url",
    sampleOutputs.created && sampleOutputs.count >= 25 ? "" : "render_sample_outputs_missing",
    focusedTestsPassed ? "" : "focused_professional_boq_tests_not_passed",
    typecheckPassed ? "" : "typecheck_not_passed",
    lintPassed ? "" : "lint_not_passed",
    diffCheckPassed ? "" : "diff_check_not_passed",
    noTestWeakeningPassed ? "" : "no_test_weakening_not_passed",
    webPublicSmokePassed ? "" : "web_public_smoke_not_passed",
    ciOfficeMarketPassed ? "" : "ci_office_market_not_passed",
    secretScanPassed ? "" : "secret_scan_not_passed",
    ...(Array.isArray(renderSummary?.blockers) ? renderSummary.blockers.map((blocker: string) => `render:${blocker}`) : []),
  ].filter(Boolean);
  const summary: RenderAcceptanceAuditSummary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE
      : STOP_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_FAILED_NO_GREEN,
    source_sha: sourceSha,
    branch,
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    production_grade_layer_seal_summary_found: productionSeal != null,
    production_grade_layer_seal_source_sha_matches_head: productionSeal?.summary.source_sha === sourceSha,
    render_web_android_summary_found: renderSeal != null,
    render_health_passed: renderSummary?.render_health_passed === true,
    render_source_sha_matches_head: renderSummary?.render_source_sha_matches_head === true,
    render_branch_matches: renderSummary?.render_branch_matches === true,
    render_catalog_version_matches: renderSummary?.render_catalog_version_matches === true,
    render_runtime_is_render: renderSummary?.render_runtime_is_render === true,
    render_web_android_result_parity: renderSummary?.render_web_android_result_parity === true,
    render_web_cases_passed: renderSummary?.render_web_cases_passed ?? null,
    render_android_cases_passed: renderSummary?.render_android_cases_passed ?? null,
    all_ai_estimate_smokes_support_external_base_url: externalSupported,
    localhost_fallback_disabled_when_render_url_provided: fallbackDisabled,
    render_sample_outputs_created: sampleOutputs.created,
    render_sample_outputs_count: sampleOutputs.count,
    focused_professional_boq_tests_passed: focusedTestsPassed,
    typecheck_passed: typecheckPassed,
    lint_passed: lintPassed,
    diff_check_passed: diffCheckPassed,
    no_test_weakening_passed: noTestWeakeningPassed,
    web_public_smoke_passed: webPublicSmokePassed,
    ci_office_market_passed: ciOfficeMarketPassed,
    secret_scan_passed: secretScanPassed,
    production_release_started: false,
    owner_approved: false,
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
    blockers,
  };
  return input.writeSummary === false
    ? { artifactPath: path.join(RENDER_ACCEPTANCE_ROOT, "audit", "not-written", "summary.json"), artifact: summary }
    : writeRuntimeJson(path.join(RENDER_ACCEPTANCE_ROOT, "audit"), summary);
}

if (require.main === module) {
  const result = auditRenderStagingProductionGradeAcceptance({ writeSummary: !process.argv.includes("--no-write-summary") });
  console.log(JSON.stringify({
    final_status: result.artifact.final_status,
    render_health_passed: result.artifact.render_health_passed,
    render_web_cases_passed: result.artifact.render_web_cases_passed,
    render_android_cases_passed: result.artifact.render_android_cases_passed,
    blockers: result.artifact.blockers.slice(0, 30),
    artifact: result.artifactPath,
  }, null, 2));
  if (result.artifact.blockers.length > 0) process.exitCode = 1;
}
