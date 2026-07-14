import path from "node:path";

import {
  GREEN_AI_ESTIMATE_RENDER_STAGING_HEALTH_READY,
  checkRenderHealth,
  type RenderHealthSummary,
} from "./checkRenderHealth";
import { runProductionGradeWebAndroidParallelSeal } from "./runProductionGradeWebAndroidParallelSeal";
import {
  GREEN_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE,
  RENDER_ACCEPTANCE_ROOT,
  STOP_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_FAILED_NO_GREEN,
  argValue,
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  resolveRequiredRenderBaseUrl,
  writeRuntimeJson,
} from "./renderStagingAcceptanceCore";

type RenderSealSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE
    | typeof STOP_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_FAILED_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  render_url: string | null;
  render_web_android_seal_runner_created: true;
  render_health_artifact: string | null;
  web_android_artifact: string | null;
  render_health_passed: boolean;
  render_source_sha_matches_head: boolean;
  render_branch_matches: boolean;
  render_catalog_version_matches: boolean;
  render_runtime_is_render: boolean;
  same_case_corpus_used_for_render_web_android: boolean;
  render_web_android_case_id_parity: boolean;
  render_web_android_source_sha_matches: boolean;
  render_web_android_result_parity: boolean;
  render_web_android_summary_written: boolean;
  actual_web_browser_render_production_grade_smoke_passed: boolean;
  actual_android_emulator_render_production_grade_smoke_passed: boolean;
  render_web_cases_passed: string | null;
  render_android_cases_passed: string | null;
  render_web_smoke_used_localhost: boolean;
  render_android_smoke_used_localhost: boolean;
  route_equivalent_not_reported_as_real_browser: true;
  env_browser_green_rejected: true;
  production_release_started: false;
  owner_approved: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  production_db_touched: false;
  destructive_migration_run: false;
  fake_green_claimed: false;
  blockers: string[];
};

type ParallelSummary = {
  final_status: string;
  same_source_sha: boolean;
  same_corpus_used_for_web_and_android: boolean;
  web_android_case_id_parity: boolean;
  web_android_result_parity: boolean;
  web_android_pdf_buyer_parity: boolean;
  web_cases_passed: string | null;
  android_cases_passed: string | null;
  blockers: string[];
};

export async function runRenderProductionGradeWebAndroidSeal(options: {
  url?: string | null;
  cases?: string;
  web?: boolean;
  android?: boolean;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  writeSummary?: boolean;
} = {}) {
  const sourceSha = currentSourceSha();
  const branch = currentBranch();
  const { baseUrl, blockers: configBlockers } = resolveRequiredRenderBaseUrl({ explicit: options.url });
  let healthArtifactPath: string | null = null;
  let health: RenderHealthSummary | null = null;
  let parallelArtifactPath: string | null = null;
  let parallel: ParallelSummary | null = null;

  if (baseUrl) {
    const healthResult = await checkRenderHealth({ url: baseUrl, writeSummary: true });
    healthArtifactPath = healthResult.artifactPath;
    health = healthResult.artifact;
    if (health.final_status === GREEN_AI_ESTIMATE_RENDER_STAGING_HEALTH_READY) {
      const parallelResult = await runProductionGradeWebAndroidParallelSeal({
        cases: options.cases,
        web: options.web,
        android: options.android,
        requireRealBrowser: options.requireRealBrowser,
        requireEmulator: options.requireEmulator,
        writeSummary: true,
        baseUrl,
      });
      parallelArtifactPath = parallelResult.artifactPath;
      parallel = parallelResult.artifact as ParallelSummary;
    }
  }

  const blockers = [
    ...configBlockers,
    health?.final_status === GREEN_AI_ESTIMATE_RENDER_STAGING_HEALTH_READY ? "" : "render_health_not_green",
    health?.render_source_sha_matches_head === true ? "" : "render_source_sha_not_proven",
    health?.render_branch_matches === true ? "" : "render_branch_not_proven",
    health?.render_catalog_version_matches === true ? "" : "render_catalog_version_not_proven",
    health?.render_runtime_is_render === true ? "" : "render_runtime_not_proven",
    parallel ? "" : "render_web_android_parallel_not_run",
    parallel?.same_corpus_used_for_web_and_android === true ? "" : "render_corpus_parity_failed",
    parallel?.web_android_case_id_parity === true ? "" : "render_case_id_parity_failed",
    parallel?.same_source_sha === true ? "" : "render_web_android_source_sha_mismatch",
    parallel?.web_android_result_parity === true ? "" : "render_result_parity_failed",
    parallel?.web_android_pdf_buyer_parity === true ? "" : "render_pdf_buyer_parity_failed",
    ...(health?.blockers.map((blocker) => `health:${blocker}`) ?? []),
    ...(parallel?.blockers.map((blocker) => `web_android:${blocker}`) ?? []),
  ].filter(Boolean);

  const summary: RenderSealSummary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE
      : STOP_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_FAILED_NO_GREEN,
    source_sha: sourceSha,
    branch,
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    render_url: baseUrl,
    render_web_android_seal_runner_created: true,
    render_health_artifact: healthArtifactPath,
    web_android_artifact: parallelArtifactPath,
    render_health_passed: health?.final_status === GREEN_AI_ESTIMATE_RENDER_STAGING_HEALTH_READY,
    render_source_sha_matches_head: health?.render_source_sha_matches_head === true,
    render_branch_matches: health?.render_branch_matches === true,
    render_catalog_version_matches: health?.render_catalog_version_matches === true,
    render_runtime_is_render: health?.render_runtime_is_render === true,
    same_case_corpus_used_for_render_web_android: parallel?.same_corpus_used_for_web_and_android === true,
    render_web_android_case_id_parity: parallel?.web_android_case_id_parity === true,
    render_web_android_source_sha_matches: parallel?.same_source_sha === true,
    render_web_android_result_parity: parallel?.web_android_result_parity === true,
    render_web_android_summary_written: parallelArtifactPath != null,
    actual_web_browser_render_production_grade_smoke_passed: parallel?.web_cases_passed === "100/100" && blockers.length === 0,
    actual_android_emulator_render_production_grade_smoke_passed: parallel?.android_cases_passed === "100/100" && blockers.length === 0,
    render_web_cases_passed: parallel?.web_cases_passed ?? null,
    render_android_cases_passed: parallel?.android_cases_passed ?? null,
    render_web_smoke_used_localhost: false,
    render_android_smoke_used_localhost: false,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    production_release_started: false,
    owner_approved: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    destructive_migration_run: false,
    fake_green_claimed: false,
    blockers,
  };

  return options.writeSummary === false
    ? { artifactPath: path.join(RENDER_ACCEPTANCE_ROOT, "web-android", "not-written", "summary.json"), artifact: summary }
    : writeRuntimeJson(path.join(RENDER_ACCEPTANCE_ROOT, "web-android"), summary);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runRenderProductionGradeWebAndroidSeal.ts")) {
  void runRenderProductionGradeWebAndroidSeal({
    url: argValue("url"),
    cases: argValue("cases") ?? undefined,
    web: hasFlag("web") || !hasFlag("android"),
    android: hasFlag("android") || !hasFlag("web"),
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        render_health_passed: result.artifact.render_health_passed,
        render_web_cases_passed: result.artifact.render_web_cases_passed,
        render_android_cases_passed: result.artifact.render_android_cases_passed,
        blockers: result.artifact.blockers.slice(0, 30),
        artifact: result.artifactPath,
      }, null, 2));
      if (result.artifact.blockers.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
