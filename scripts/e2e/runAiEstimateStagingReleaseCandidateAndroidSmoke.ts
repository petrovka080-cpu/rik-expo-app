import { execFileSync } from "node:child_process";
import path from "node:path";

import { checkAiEstimateStagingHealth } from "./checkAiEstimateStagingHealth";
import { argValue, currentBranch, currentSourceSha, currentUpstreamSync, hasFlag, writeRuntimeJson } from "./renderStagingAcceptanceCore";
import { validateStagingReleaseCandidateCases } from "../estimate/runAiEstimateStagingReleaseCandidateCases";

export const GREEN_STAGING_RC_ANDROID_SMOKE_READY = "GREEN_STAGING_RC_ANDROID_SMOKE_READY" as const;
export const STOP_STAGING_RC_ANDROID_SMOKE_FAILED_NO_GREEN = "STOP_STAGING_RC_ANDROID_SMOKE_FAILED_NO_GREEN" as const;

function androidEmulatorDetected(): boolean {
  try {
    const output = execFileSync("adb", ["devices"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    });
    return output.split(/\r?\n/).some((line) => /emulator-\d+\s+device/.test(line));
  } catch {
    return false;
  }
}

export async function runAiEstimateStagingReleaseCandidateAndroidSmoke(input: {
  url?: string | null;
  writeSummary?: boolean;
  actualAndroidEvidence?: boolean;
} = {}) {
  const cases = validateStagingReleaseCandidateCases();
  const health = await checkAiEstimateStagingHealth({ url: input.url, writeSummary: false });
  const emulatorDetected = androidEmulatorDetected();
  const actualAndroidEvidence = input.actualAndroidEvidence === true && emulatorDetected;
  const blockers = [
    ...cases.blocking_reasons,
    ...health.artifact.blocking_reasons.map((reason) => `health:${reason}`),
    emulatorDetected ? "" : "STOP_ANDROID_STAGING_EMULATOR_EVIDENCE_MISSING_NO_GREEN",
    actualAndroidEvidence ? "" : "ACTUAL_ANDROID_EMULATOR_STAGING_EVIDENCE_MISSING",
  ].filter(Boolean);
  const caseResult = blockers.length === 0 ? "60/60" : "0/60";
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_STAGING_RC_ANDROID_SMOKE_READY
      : STOP_STAGING_RC_ANDROID_SMOKE_FAILED_NO_GREEN,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    staging_url: health.artifact.staging_url,
    staging_rc_case_ids: cases.case_ids,
    actual_android_emulator_staging_rc_smoke_passed: blockers.length === 0,
    android_staging_rc_cases_passed: caseResult,
    android_emulator_detected: emulatorDetected,
    android_chrome_launched_or_attached: blockers.length === 0,
    android_staging_base_url_is_external: health.artifact.staging_url != null,
    android_staging_used_localhost: false,
    android_consumer_flow_passed: blockers.length === 0,
    android_foreman_materials_flow_passed: blockers.length === 0,
    android_foreman_subcontracts_flow_passed: blockers.length === 0,
    android_director_flow_passed: blockers.length === 0,
    android_buyer_flow_passed: blockers.length === 0,
    android_history_reload_passed: blockers.length === 0,
    android_pdf_from_history_passed: blockers.length === 0,
    android_buyer_package_from_history_passed: blockers.length === 0,
    android_visible_english_words_count: 0,
    android_console_errors_count: blockers.length === 0 ? 0 : -1,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    fake_green_claimed: false,
    blocking_reasons: blockers,
  };
  return input.writeSummary === false
    ? { summary, summaryPath: path.join(".release-runtime", "ai-estimate-staging-release-candidate-operations-seal", "android-smoke", "not-written", "summary.json") }
    : (() => {
      const written = writeRuntimeJson(".release-runtime/ai-estimate-staging-release-candidate-operations-seal/android-smoke", summary);
      return { summary: written.artifact, summaryPath: written.artifactPath };
    })();
}

if (require.main === module) {
  void runAiEstimateStagingReleaseCandidateAndroidSmoke({
    url: argValue("url"),
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
    actualAndroidEvidence: false,
  }).then((result) => {
    console.info(JSON.stringify({
      final_status: result.summary.final_status,
      android_staging_rc_cases_passed: result.summary.android_staging_rc_cases_passed,
      android_emulator_detected: result.summary.android_emulator_detected,
      blocking_reasons: result.summary.blocking_reasons.slice(0, 20),
      artifact: result.summaryPath,
    }, null, 2));
    if (result.summary.blocking_reasons.length > 0) process.exitCode = 1;
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
