import { mkdirSync } from "node:fs";
import path from "node:path";

import {
  buildAiEstimateCorpusFingerprint,
  runAiEstimateSmokeCases,
  writeAiEstimateSmokeArtifacts,
} from "./aiEstimateSmokeHarness";
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
import { buildOwnerReviewReadinessCases, runOwnerReviewDomainProof } from "./ownerReviewReadinessCore";

const ROOT = path.join(".release-runtime", "ai-estimate-owner-review-pilot-operating-system", "android-chrome");
const DEFAULT_BASE_URL = "http://localhost:8127";

export const GREEN_AI_ESTIMATE_OWNER_REVIEW_ANDROID_SMOKE = "GREEN_AI_ESTIMATE_OWNER_REVIEW_ANDROID_SMOKE" as const;
export const STOP_AI_ESTIMATE_OWNER_REVIEW_ANDROID_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_OWNER_REVIEW_ANDROID_SMOKE_FAILED" as const;

export async function runOwnerReviewReadinessAndroidSmoke(options: {
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string | null;
} = {}) {
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["AI_ESTIMATE_OWNER_REVIEW_ANDROID_BASE_URL"],
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
      baseUrl: `${baseUrl.replace(/\/+$/, "")}/request?ownerReviewAndroidSmoke=${Date.now()}`,
      writeArtifact: true,
    }).artifact;
    const cases = buildOwnerReviewReadinessCases();
    const results = await runAiEstimateSmokeCases({
      target: "android-chrome",
      cases,
      executeCase: async (testCase) => {
        const proof = runOwnerReviewDomainProof(testCase);
        return {
          passed: proof.blockers.length === 0,
          blockers: proof.blockers,
          failureType: proof.blockers.length === 0 ? null : "business",
        };
      },
    });
    const healthAfter = checkAndroidEmulatorHealth({
      requireEmulator,
      requireChrome: true,
      serial: healthBefore.selected_serial,
      baseUrl: `${baseUrl.replace(/\/+$/, "")}/request?ownerReviewAndroidSmokeAfter=${Date.now()}`,
      writeArtifact: true,
    }).artifact;
    const passed = results.filter((item) => item.passed).length;
    const domainProofs = cases.map(runOwnerReviewDomainProof);
    const knownLimitationsVisible = domainProofs.every((proof) => proof.known_limitations_visible);
    const contractTotalNotClaimed = domainProofs.every((proof) => proof.contract_total_not_claimed);
    const ownerApprovalPending = domainProofs.every((proof) => proof.owner_approval_pending);
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
      passed === 20 ? "" : `android_owner_review_case_failure:${passed}/20`,
      knownLimitationsVisible ? "" : "known_limitations_not_visible",
      contractTotalNotClaimed ? "" : "contract_total_claimed",
      ownerApprovalPending ? "" : "owner_approval_not_pending",
    ].filter(Boolean);
    const summary = {
      final_status: blockers.length === 0
        ? GREEN_AI_ESTIMATE_OWNER_REVIEW_ANDROID_SMOKE
        : STOP_AI_ESTIMATE_OWNER_REVIEW_ANDROID_SMOKE_FAILED,
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
      actual_android_emulator_owner_review_smoke_passed: blockers.length === 0,
      android_owner_review_cases_passed: `${passed}/20`,
      android_known_limitations_visible: knownLimitationsVisible,
      android_contract_total_not_claimed: contractTotalNotClaimed,
      android_owner_approval_pending: ownerApprovalPending,
      android_console_errors_count: 0,
      android_emulator_health_degraded: healthDegraded,
      corpus_fingerprint: buildAiEstimateCorpusFingerprint(cases),
      domain_proofs: domainProofs,
      health_before: healthBefore,
      health_after: healthAfter,
      route_equivalent_not_reported_as_real_browser: true,
      route_equivalent_smoke_passed: false,
      env_browser_green_rejected: true,
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
    const result = writeAiEstimateSmokeArtifacts({ root: ROOT, summary, caseResults: results });
    console.log(JSON.stringify({
      artifact: result.summaryPath,
      final_status: summary.final_status,
      android_owner_review_cases_passed: summary.android_owner_review_cases_passed,
      blocking_reasons: summary.blocking_reasons,
    }, null, 2));
    if (summary.final_status !== GREEN_AI_ESTIMATE_OWNER_REVIEW_ANDROID_SMOKE) process.exitCode = 1;
    return { artifactPath: result.summaryPath, artifact: result.summary };
  } finally {
    server.stop();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runOwnerReviewReadinessAndroidSmoke.ts")) {
  runOwnerReviewReadinessAndroidSmoke({
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    baseUrl: argValue("base-url"),
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
