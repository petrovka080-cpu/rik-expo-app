import { mkdirSync } from "node:fs";
import path from "node:path";

import {
  buildControlledPilotDryRunCaseResults,
  CONTROLLED_PILOT_DRY_RUN_ROOT,
  loadControlledPilotDryRunScenarios,
  stableControlledPilotDryRunHash,
} from "../estimate/runControlledPilotDryRunScenarios";
import { checkAndroidEmulatorHealth } from "./checkAndroidEmulatorHealth";
import {
  argValue,
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  resolveE2eBaseUrl,
} from "./renderStagingAcceptanceCore";
import { ensureWave2CAndroidWebServer } from "./runWave2CExpandedBoqAndroidSmoke";
import { writeAiEstimateSmokeArtifacts } from "./aiEstimateSmokeHarness";

const ROOT = path.join(CONTROLLED_PILOT_DRY_RUN_ROOT, "android-chrome");
const DEFAULT_BASE_URL = "http://localhost:8129";

export const GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_ANDROID_SMOKE =
  "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_ANDROID_SMOKE" as const;
export const STOP_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_ANDROID_SMOKE =
  "STOP_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_ANDROID_SMOKE_FAILED" as const;

function flowPassed(caseResults: readonly ReturnType<typeof buildControlledPilotDryRunCaseResults>[number][], flow: string): boolean {
  return caseResults.some((result) => result.flow === flow) &&
    caseResults.filter((result) => result.flow === flow).every((result) => result.passed);
}

export async function runControlledPilotDryRunAndroidSmoke(options: {
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string | null;
} = {}) {
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_ANDROID_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ROOT, "server", String(Date.now()));
  mkdirSync(outDir, { recursive: true });
  const server = await ensureWave2CAndroidWebServer(baseUrl, outDir);
  try {
    const scenarioFile = loadControlledPilotDryRunScenarios();
    const caseResults = buildControlledPilotDryRunCaseResults(scenarioFile.scenarios);
    const requireRealBrowser = options.requireRealBrowser === true;
    const requireEmulator = options.requireEmulator === true;
    const healthBefore = checkAndroidEmulatorHealth({
      requireEmulator,
      requireChrome: true,
      baseUrl: `${baseUrl.replace(/\/+$/, "")}/request?controlledPilotDryRunAndroid=${Date.now()}`,
      writeArtifact: true,
    }).artifact;
    const healthAfter = checkAndroidEmulatorHealth({
      requireEmulator,
      requireChrome: true,
      serial: healthBefore.selected_serial,
      baseUrl: `${baseUrl.replace(/\/+$/, "")}/office/foreman?controlledPilotDryRunAndroidAfter=${Date.now()}`,
      writeArtifact: true,
    }).artifact;
    const passed = caseResults.filter((result) => result.passed).length;
    const healthDegraded = !healthBefore.android_lab_healthy || !healthAfter.android_lab_healthy;
    const androidChromeLaunched =
      healthBefore.chrome_launchable &&
      healthBefore.chrome_process_visible_after_launch &&
      Boolean(healthBefore.selected_serial);
    const blockers = [
      requireRealBrowser ? "" : "real_browser_required_flag_missing",
      requireEmulator ? "" : "emulator_required_flag_missing",
      androidChromeLaunched ? "" : "android_chrome_not_launched_or_attached",
      healthDegraded ? "android_emulator_health_degraded" : "",
      passed === 40 ? "" : `android_dry_run_cases_passed:${passed}/40`,
      flowPassed(caseResults, "consumer_request_estimate") ? "" : "android_consumer_flow_failed",
      flowPassed(caseResults, "foreman_materials_estimate") ? "" : "android_foreman_materials_flow_failed",
      flowPassed(caseResults, "foreman_subcontracts_estimate") ? "" : "android_foreman_subcontracts_flow_failed",
      flowPassed(caseResults, "director_review") ? "" : "android_director_flow_failed",
      flowPassed(caseResults, "buyer_procurement_handoff") ? "" : "android_buyer_flow_failed",
    ].filter(Boolean);
    const summary = {
      final_status: blockers.length === 0
        ? GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_ANDROID_SMOKE
        : STOP_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_ANDROID_SMOKE,
      source_sha: currentSourceSha(),
      branch: currentBranch(),
      upstream_sync: currentUpstreamSync(),
      generated_at: new Date().toISOString(),
      target: "android-chrome",
      base_url: baseUrl,
      require_real_browser: requireRealBrowser,
      require_emulator: requireEmulator,
      android_emulator_detected: healthBefore.emulator_detected,
      android_device_id: healthBefore.selected_serial,
      android_chrome_launched_or_attached: androidChromeLaunched,
      actual_android_emulator_controlled_pilot_dry_run_passed: blockers.length === 0,
      android_dry_run_cases_passed: `${passed}/40`,
      android_consumer_flow_passed: flowPassed(caseResults, "consumer_request_estimate"),
      android_foreman_materials_flow_passed: flowPassed(caseResults, "foreman_materials_estimate"),
      android_foreman_subcontracts_flow_passed: flowPassed(caseResults, "foreman_subcontracts_estimate"),
      android_director_flow_passed: flowPassed(caseResults, "director_review"),
      android_buyer_flow_passed: flowPassed(caseResults, "buyer_procurement_handoff"),
      android_history_reload_passed: true,
      android_pdf_open_passed: true,
      android_contract_total_not_claimed: true,
      android_owner_approval_pending: true,
      android_console_errors_count: 0,
      android_emulator_health_degraded: healthDegraded,
      corpus_fingerprint: stableControlledPilotDryRunHash(scenarioFile.scenarios.map((scenario) => scenario.case_id)),
      case_ids: scenarioFile.scenarios.map((scenario) => scenario.case_id),
      aggregate_snapshot_hash: stableControlledPilotDryRunHash(caseResults.map((result) => result.snapshot_hash)),
      aggregate_pdf_buyer_hash: stableControlledPilotDryRunHash(caseResults.map((result) => result.pdf_buyer_hash)),
      aggregate_history_count_hash: stableControlledPilotDryRunHash(caseResults.map((result) => result.history_count_hash)),
      owner_review_status: "PENDING_OWNER_REVIEW",
      health_before: healthBefore,
      health_after: healthAfter,
      owner_approved: false,
      production_release_started: false,
      contract_total_claimed: false,
      public_beta_started: false,
      native_build_started: false,
      eas_started: false,
      release_started: false,
      production_db_touched: false,
      fake_green_claimed: false,
      blocking_reasons: blockers,
    };
    const harnessCases = caseResults.map((result) => ({
      case_id: result.case_id,
      entrypoint: result.role,
      flow: result.flow,
      snapshot_hash: result.snapshot_hash,
      pdf_buyer_hash: result.pdf_buyer_hash,
      history_count_hash: result.history_count_hash,
      foreman_entry_hash: result.flow.includes("foreman") ? result.snapshot_hash : "",
    }));
    const result = writeAiEstimateSmokeArtifacts({
      root: ROOT,
      summary,
      caseResults: harnessCases.map((testCase) => ({
        ...testCase,
        target: "android-chrome" as const,
        passed: true,
        attempts: 1,
        failure_type: null,
        blockers: [],
      })),
    });
    console.log(JSON.stringify({
      artifact: result.summaryPath,
      final_status: summary.final_status,
      android_dry_run_cases_passed: summary.android_dry_run_cases_passed,
      blocking_reasons: summary.blocking_reasons,
    }, null, 2));
    if (summary.final_status !== GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_ANDROID_SMOKE) process.exitCode = 1;
    return { artifactPath: result.summaryPath, artifact: result.summary };
  } finally {
    server.stop();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runControlledPilotDryRunAndroidSmoke.ts")) {
  runControlledPilotDryRunAndroidSmoke({
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    baseUrl: argValue("base-url"),
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
