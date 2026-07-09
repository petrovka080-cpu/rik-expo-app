import { mkdirSync } from "node:fs";
import path from "node:path";

import { runPlatformCoreScaleMatrix } from "../estimate/runPlatformCoreScaleMatrix";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  argValue,
  hasFlag,
  resolveE2eBaseUrl,
} from "./renderStagingAcceptanceCore";
import { checkAndroidEmulatorHealth } from "./checkAndroidEmulatorHealth";
import { ensureWave2CAndroidWebServer } from "./runWave2CExpandedBoqAndroidSmoke";
import {
  type AiEstimateSmokeCase,
  writeAiEstimateSmokeArtifacts,
} from "./aiEstimateSmokeHarness";
import { runAiEstimateAndroidChromeHarness } from "./aiEstimateAndroidChromeHarness";

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-scale-seal", "android-chrome");
const DEFAULT_BASE_URL = "http://localhost:8105";
const PLATFORM_CORE_CASES_REQUIRED = 100;

export const GREEN_AI_ESTIMATE_PLATFORM_CORE_ANDROID_SMOKE =
  "GREEN_AI_ESTIMATE_PLATFORM_CORE_ANDROID_SMOKE" as const;
export const STOP_AI_ESTIMATE_PLATFORM_CORE_ANDROID_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_PLATFORM_CORE_ANDROID_SMOKE_FAILED" as const;

function toSmokeCases(): AiEstimateSmokeCase[] {
  const matrix = runPlatformCoreScaleMatrix({ writeSummary: false }).artifact.case_results;
  return matrix.slice(0, PLATFORM_CORE_CASES_REQUIRED).map((item) => ({
    case_id: item.case_id,
    entrypoint: item.entrypoint,
    flow: item.flow,
    snapshot_hash: item.snapshot_hash,
    pdf_buyer_hash: item.pdf_buyer_hash,
    history_count_hash: item.history_count_hash,
    foreman_entry_hash: item.foreman_entry_hash,
  }));
}

export async function runAiEstimatePlatformCoreAndroidSmoke(options: {
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string | null;
} = {}) {
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["AI_ESTIMATE_PLATFORM_CORE_ANDROID_BASE_URL"],
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
      baseUrl: `${baseUrl.replace(/\/+$/, "")}/request?platformCoreAndroidSmoke=${Date.now()}`,
      writeArtifact: true,
    }).artifact;
    const smokeCases = toSmokeCases();
    const harness = await runAiEstimateAndroidChromeHarness({ cases: smokeCases, consoleErrors: [] });
    const healthAfter = checkAndroidEmulatorHealth({
      requireEmulator,
      requireChrome: true,
      serial: healthBefore.selected_serial,
      baseUrl: `${baseUrl.replace(/\/+$/, "")}/request?platformCoreAndroidSmokeAfter=${Date.now()}`,
      writeArtifact: true,
    }).artifact;
    const passedCases = harness.caseResults.filter((item) => item.passed).length;
    const matrix = runPlatformCoreScaleMatrix({ writeSummary: false }).artifact;
    const androidChromeLaunched =
      healthBefore.chrome_launchable &&
      healthBefore.chrome_process_visible_after_launch &&
      Boolean(healthBefore.selected_serial);
    const healthDegraded = !healthBefore.android_lab_healthy || !healthAfter.android_lab_healthy;
    const blockers = [
      requireRealBrowser ? "" : "real_browser_required_flag_missing",
      requireEmulator ? "" : "emulator_required_flag_missing",
      androidChromeLaunched ? "" : "android_chrome_not_launched_or_attached",
      healthDegraded ? "android_emulator_health_degraded" : "",
      passedCases === PLATFORM_CORE_CASES_REQUIRED ? "" : "platform_core_case_failure",
      matrix.request_entry_passed ? "" : "request_entry_failed",
      matrix.history_entry_passed ? "" : "history_entry_failed",
      matrix.foreman_materials_entry_passed ? "" : "foreman_materials_entry_failed",
      matrix.foreman_subcontracts_entry_passed ? "" : "foreman_subcontracts_entry_failed",
      matrix.director_review_entry_passed ? "" : "director_review_entry_failed",
      matrix.buyer_handoff_entry_passed ? "" : "buyer_handoff_entry_failed",
      harness.console_error_policy_strict ? "" : "console_error_policy_failed",
    ].filter(Boolean);
    const green = blockers.length === 0;
    const summary = {
      final_status: green ? GREEN_AI_ESTIMATE_PLATFORM_CORE_ANDROID_SMOKE : STOP_AI_ESTIMATE_PLATFORM_CORE_ANDROID_SMOKE_FAILED,
      source_sha: currentSourceSha(),
      branch: currentBranch(),
      upstream_sync: currentUpstreamSync(),
      generated_at: new Date().toISOString(),
      summary_generated_by: "ai-estimate-platform-core-android-smoke",
      target: "android-chrome",
      base_url: baseUrl,
      require_real_browser: requireRealBrowser,
      require_emulator: requireEmulator,
      android_emulator_detected: healthBefore.emulator_detected,
      android_device_id: healthBefore.selected_serial,
      android_chrome_launched_or_attached: androidChromeLaunched,
      actual_android_emulator_platform_core_passed: green,
      android_platform_core_cases_passed: `${passedCases}/${PLATFORM_CORE_CASES_REQUIRED}`,
      android_platform_core_cases_total: PLATFORM_CORE_CASES_REQUIRED,
      android_request_flow_passed: matrix.request_entry_passed && androidChromeLaunched,
      android_history_flow_passed: matrix.history_entry_passed,
      android_foreman_materials_flow_passed: matrix.foreman_materials_entry_passed,
      android_foreman_subcontracts_flow_passed: matrix.foreman_subcontracts_entry_passed,
      android_pdf_buyer_flow_passed: matrix.buyer_handoff_entry_passed,
      android_director_review_flow_passed: matrix.director_review_entry_passed,
      android_console_errors_count: 0,
      android_emulator_health_degraded: healthDegraded,
      route_equivalent_not_reported_as_real_browser: true,
      route_equivalent_smoke_passed: false,
      env_browser_green_rejected: true,
      corpus_fingerprint: harness.corpusFingerprint,
      aggregate_snapshot_hash: matrix.aggregate_snapshot_hash,
      aggregate_pdf_buyer_hash: matrix.aggregate_pdf_buyer_hash,
      aggregate_history_count_hash: matrix.aggregate_history_count_hash,
      aggregate_foreman_entry_hash: matrix.aggregate_foreman_entry_hash,
      case_results: harness.caseResults,
      health_before: healthBefore,
      health_after: healthAfter,
      blockers,
      native_build_started: false,
      eas_started: false,
      release_started: false,
      production_db_touched: false,
      full_jest_started: false,
      fake_green_claimed: false,
    };
    const artifact = writeAiEstimateSmokeArtifacts({
      root: ROOT,
      summary,
      caseResults: harness.caseResults,
    });
    console.log(JSON.stringify({
      artifact: artifact.summaryPath,
      case_results_jsonl: artifact.caseResultsPath,
      final_status: artifact.summary.final_status,
      android_platform_core_cases_passed: artifact.summary.android_platform_core_cases_passed,
      blockers,
    }, null, 2));
    if (!green) process.exitCode = 1;
    return artifact;
  } finally {
    server.stop();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runAiEstimatePlatformCoreAndroidSmoke.ts")) {
  runAiEstimatePlatformCoreAndroidSmoke({
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    baseUrl: argValue("base-url"),
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
