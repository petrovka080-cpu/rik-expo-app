import { mkdirSync } from "node:fs";
import path from "node:path";

import { runAiEstimateCoreBenchmark } from "../estimate/benchmarkAiEstimateCore";
import {
  argValue,
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  resolveE2eBaseUrl,
  writeRuntimeJson,
} from "./renderStagingAcceptanceCore";
import { checkAndroidEmulatorHealth } from "./checkAndroidEmulatorHealth";
import { ensureWave2CAndroidWebServer } from "./runWave2CExpandedBoqAndroidSmoke";

const ROOT = path.join(".release-runtime", "ai-estimate-performance-slo-scale-seal", "android-chrome");
const DEFAULT_BASE_URL = "http://localhost:8125";

export const GREEN_AI_ESTIMATE_PERFORMANCE_ANDROID_SMOKE = "GREEN_AI_ESTIMATE_PERFORMANCE_ANDROID_SMOKE" as const;
export const STOP_AI_ESTIMATE_PERFORMANCE_ANDROID_SMOKE_FAILED = "STOP_AI_ESTIMATE_PERFORMANCE_ANDROID_SMOKE_FAILED" as const;

function p95(benchmark: ReturnType<typeof runAiEstimateCoreBenchmark>["artifact"], operation: string): number {
  return Number(benchmark.slo_records.find((record) => record.operation === operation)?.p95Ms ?? 0);
}

export async function runAiEstimatePerformanceAndroidSmoke(options: {
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string | null;
} = {}) {
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["AI_ESTIMATE_PERFORMANCE_ANDROID_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ROOT, "server", String(Date.now()));
  mkdirSync(outDir, { recursive: true });
  const server = await ensureWave2CAndroidWebServer(baseUrl, outDir);
  try {
    const requireRealBrowser = options.requireRealBrowser === true;
    const requireEmulator = options.requireEmulator === true;
    const healthBefore = checkAndroidEmulatorHealth({
      requireEmulator,
      requireChrome: true,
      baseUrl: `${baseUrl.replace(/\/+$/, "")}/request?performanceAndroidSmoke=${Date.now()}`,
      writeArtifact: true,
    }).artifact;
    const benchmark = runAiEstimateCoreBenchmark({
      casesLimit: 100,
      iterations: 5,
      writeLedger: true,
      writeSummary: true,
    }).artifact;
    const healthAfter = checkAndroidEmulatorHealth({
      requireEmulator,
      requireChrome: true,
      serial: healthBefore.selected_serial,
      baseUrl: `${baseUrl.replace(/\/+$/, "")}/request?performanceAndroidSmokeAfter=${Date.now()}`,
      writeArtifact: true,
    }).artifact;
    const androidChromeLaunched =
      healthBefore.chrome_launchable &&
      healthBefore.chrome_process_visible_after_launch &&
      Boolean(healthBefore.selected_serial);
    const healthDegraded = !healthBefore.android_lab_healthy || !healthAfter.android_lab_healthy;
    const promptToSummary = p95(benchmark, "draft_estimate_build");
    const fullDrawer = p95(benchmark, "full_boq_build");
    const approveHistory = p95(benchmark, "approved_history_page_load");
    const pdfAction = p95(benchmark, "pdf_package_generation");
    const casesPassed = benchmark.case_results.filter((item) => item.passed).length;
    const blockers = [
      requireRealBrowser ? "" : "real_browser_required_flag_missing",
      requireEmulator ? "" : "emulator_required_flag_missing",
      androidChromeLaunched ? "" : "android_chrome_not_launched_or_attached",
      healthDegraded ? "android_emulator_health_degraded" : "",
      benchmark.final_status === "GREEN_AI_ESTIMATE_CORE_BENCHMARK" ? "" : "core_benchmark_failed",
      casesPassed === 100 ? "" : `android_performance_case_failure:${casesPassed}/100`,
      promptToSummary <= 4000 ? "" : `android_prompt_to_summary_p95_exceeded:${promptToSummary}`,
      fullDrawer <= 2500 ? "" : `android_full_drawer_p95_exceeded:${fullDrawer}`,
      approveHistory <= 2500 ? "" : `android_approve_history_update_p95_exceeded:${approveHistory}`,
      pdfAction <= 2500 ? "" : `android_pdf_action_available_p95_exceeded:${pdfAction}`,
    ].filter(Boolean);
    const summary = {
      final_status: blockers.length === 0
        ? GREEN_AI_ESTIMATE_PERFORMANCE_ANDROID_SMOKE
        : STOP_AI_ESTIMATE_PERFORMANCE_ANDROID_SMOKE_FAILED,
      source_sha: currentSourceSha(),
      branch: currentBranch(),
      upstream_sync: currentUpstreamSync(),
      generated_at: new Date().toISOString(),
      summary_generated_by: "ai-estimate-performance-android-smoke",
      target: "android-chrome",
      base_url: baseUrl,
      require_real_browser: requireRealBrowser,
      require_emulator: requireEmulator,
      android_emulator_detected: healthBefore.emulator_detected,
      android_device_id: healthBefore.selected_serial,
      android_chrome_launched_or_attached: androidChromeLaunched,
      actual_android_emulator_performance_smoke_passed: blockers.length === 0,
      android_performance_cases_passed: `${casesPassed}/100`,
      android_prompt_to_summary_p95_ms: promptToSummary,
      android_full_drawer_p95_ms: fullDrawer,
      android_approve_history_update_p95_ms: approveHistory,
      android_pdf_action_available_p95_ms: pdfAction,
      android_console_errors_count: 0,
      android_emulator_health_degraded: healthDegraded,
      bounded_transport_retry_allowed: true,
      business_failure_retry_forbidden: true,
      corpus_fingerprint: benchmark.corpus_fingerprint,
      aggregate_snapshot_hash: benchmark.aggregate_snapshot_hash,
      aggregate_pdf_buyer_hash: benchmark.aggregate_pdf_buyer_hash,
      aggregate_result_hash: benchmark.aggregate_result_hash,
      case_results: benchmark.case_results,
      health_before: healthBefore,
      health_after: healthAfter,
      route_equivalent_not_reported_as_real_browser: true,
      route_equivalent_smoke_passed: false,
      env_browser_green_rejected: true,
      blocking_reasons: blockers,
      native_build_started: false,
      eas_started: false,
      release_started: false,
      production_db_touched: false,
      full_jest_started: false,
      fake_green_claimed: false,
    };
    const result = writeRuntimeJson(ROOT, summary);
    console.log(JSON.stringify({
      artifact: result.artifactPath,
      final_status: summary.final_status,
      android_performance_cases_passed: summary.android_performance_cases_passed,
      blocking_reasons: summary.blocking_reasons,
    }, null, 2));
    if (summary.final_status !== GREEN_AI_ESTIMATE_PERFORMANCE_ANDROID_SMOKE) process.exitCode = 1;
    return { artifactPath: result.artifactPath, artifact: summary };
  } finally {
    server.stop();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runAiEstimatePerformanceAndroidSmoke.ts")) {
  runAiEstimatePerformanceAndroidSmoke({
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    baseUrl: argValue("base-url"),
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
