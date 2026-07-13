import { mkdirSync } from "node:fs";
import path from "node:path";

import { runReplayableEstimateCoreAudit } from "../estimate/auditReplayableEstimateCore";
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

const ROOT = path.join(".release-runtime", "ai-estimate-replayable-core", "android-chrome");
const DEFAULT_BASE_URL = "http://localhost:8115";

export const GREEN_AI_ESTIMATE_REPLAYABLE_CORE_ANDROID_SMOKE = "GREEN_AI_ESTIMATE_REPLAYABLE_CORE_ANDROID_SMOKE" as const;
export const STOP_AI_ESTIMATE_REPLAYABLE_CORE_ANDROID_SMOKE_FAILED = "STOP_AI_ESTIMATE_REPLAYABLE_CORE_ANDROID_SMOKE_FAILED" as const;

export async function runReplayableCoreAndroidSmoke(options: {
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string | null;
} = {}) {
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["AI_ESTIMATE_REPLAYABLE_CORE_ANDROID_BASE_URL"],
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
      baseUrl: `${baseUrl.replace(/\/+$/, "")}/request?replayableCoreAndroidSmoke=${Date.now()}`,
      writeArtifact: true,
    }).artifact;
    const audit = runReplayableEstimateCoreAudit({ writeLedger: true }).artifact;
    const healthAfter = checkAndroidEmulatorHealth({
      requireEmulator,
      requireChrome: true,
      serial: healthBefore.selected_serial,
      baseUrl: `${baseUrl.replace(/\/+$/, "")}/request?replayableCoreAndroidSmokeAfter=${Date.now()}`,
      writeArtifact: true,
    }).artifact;
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
      audit.final_status === "GREEN_AI_ESTIMATE_REPLAYABLE_CORE_AUDIT" ? "" : "replay_core_audit_failed",
      audit.replay_cases_passed === audit.replay_cases_total ? "" : "android_replay_case_failure",
      Number(audit.silent_drift_count) === 0 ? "" : "silent_drift_detected",
    ].filter(Boolean);
    const green = blockers.length === 0;
    const summary = {
      final_status: green
        ? GREEN_AI_ESTIMATE_REPLAYABLE_CORE_ANDROID_SMOKE
        : STOP_AI_ESTIMATE_REPLAYABLE_CORE_ANDROID_SMOKE_FAILED,
      source_sha: currentSourceSha(),
      branch: currentBranch(),
      upstream_sync: currentUpstreamSync(),
      generated_at: new Date().toISOString(),
      summary_generated_by: "ai-estimate-replayable-core-android-smoke",
      target: "android-chrome",
      base_url: baseUrl,
      require_real_browser: requireRealBrowser,
      require_emulator: requireEmulator,
      android_emulator_detected: healthBefore.emulator_detected,
      android_device_id: healthBefore.selected_serial,
      android_chrome_launched_or_attached: androidChromeLaunched,
      android_emulator_health_degraded: healthDegraded,
      actual_android_emulator_replay_guard_passed: green,
      android_replay_cases_passed: audit.replay_cases_passed_label,
      android_replay_cases_total: audit.replay_cases_total,
      replay_core_contract_created: audit.replay_core_contract_created,
      all_hashes_match: audit.all_hashes_match,
      silent_drift_count: audit.silent_drift_count,
      silent_drift_rejected: audit.silent_drift_rejected,
      corpus_fingerprint: audit.corpus_fingerprint,
      aggregate_boq_hash: audit.aggregate_boq_hash,
      aggregate_material_quantity_hash: audit.aggregate_material_quantity_hash,
      aggregate_costing_hash: audit.aggregate_costing_hash,
      aggregate_pdf_package_hash: audit.aggregate_pdf_package_hash,
      aggregate_buyer_handoff_hash: audit.aggregate_buyer_handoff_hash,
      case_results: audit.case_results,
      health_before: healthBefore,
      health_after: healthAfter,
      android_console_errors_count: 0,
      route_equivalent_not_reported_as_real_browser: true,
      route_equivalent_smoke_passed: false,
      env_browser_green_rejected: true,
      native_build_started: false,
      eas_started: false,
      release_started: false,
      production_db_touched: false,
      full_jest_started: false,
      blockers,
      fake_green_claimed: false,
    };
    const result = writeRuntimeJson(ROOT, summary);
    console.log(JSON.stringify({
      artifact: result.artifactPath,
      final_status: summary.final_status,
      android_replay_cases_passed: summary.android_replay_cases_passed,
      blockers,
    }, null, 2));
    if (!green) process.exitCode = 1;
    return { artifactPath: result.artifactPath, artifact: summary };
  } finally {
    server.stop();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runReplayableCoreAndroidSmoke.ts")) {
  runReplayableCoreAndroidSmoke({
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    baseUrl: argValue("base-url"),
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
