import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { argValue, hasFlag, newestSummary } from "./renderStagingAcceptanceCore";
import {
  GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_ANDROID_SMOKE,
  type AiEstimateParameterDurableHistoryAndroidSummary,
} from "./runAiEstimateParameterDurableHistoryAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_SMOKE,
  type AiEstimateParameterDurableHistoryWebSummary,
} from "./runAiEstimateParameterDurableHistoryWebSmoke";

export const GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_ANDROID_PARITY =
  "GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_ANDROID_PARITY" as const;
export const STOP_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_ANDROID_PARITY_FAILED" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-parameter-durable-history");
const WEB_ROOT = path.join(RUNTIME_ROOT, "web");
const ANDROID_ROOT = path.join(RUNTIME_ROOT, "android-chrome");
const PARITY_ROOT = path.join(RUNTIME_ROOT, "web-android-parity");

export type AiEstimateParameterDurableHistoryParitySummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_ANDROID_PARITY
    | typeof STOP_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_ANDROID_PARITY_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  cases: "parameter-durable-history";
  require_real_browser: boolean;
  require_emulator: boolean;
  web_artifact: string | null;
  android_artifact: string | null;
  same_parameter_durable_history_corpus_used_for_web_android: boolean;
  web_android_parameter_values_parity: boolean;
  web_android_snapshot_hash_parity: boolean;
  web_android_revision_chain_parity: boolean;
  web_android_history_count_parity: boolean;
  web_android_all_created_estimates_preserved_parity: boolean;
  web_android_pdf_state_parity: boolean;
  web_android_buyer_package_state_parity: boolean;
  web_actual_browser_green: boolean;
  android_actual_emulator_green: boolean;
  parameter_durable_history_web_android_parity_passed: boolean;
  route_equivalent_not_reported_as_real_browser: true;
  route_equivalent_smoke_passed: false;
  env_browser_green_rejected: true;
  fake_green_claimed: false;
  exact_artifact_paths: {
    web_summary: string | null;
    android_summary: string | null;
    parity_summary: string;
  };
  blockers: string[];
};

function latestWeb(sourceSha: string) {
  return newestSummary<AiEstimateParameterDurableHistoryWebSummary>(
    WEB_ROOT,
    (summary) => summary.source_sha === sourceSha && summary.cases === "parameter-durable-history",
  );
}

function latestAndroid(sourceSha: string) {
  return newestSummary<AiEstimateParameterDurableHistoryAndroidSummary>(
    ANDROID_ROOT,
    (summary) => summary.source_sha === sourceSha && summary.cases === "parameter-durable-history",
  );
}

function comparableSnapshot(summary: {
  web_parameter_card_edited_key?: string | null;
  android_parameter_card_edited_key?: string | null;
  web_parameter_edit_recalculates_boq?: boolean;
  android_parameter_edit_recalculates_boq?: boolean;
  web_history_count_reaches_25?: boolean;
  android_history_count_reaches_25?: boolean;
  web_history_persists_after_reload?: boolean;
  android_history_persists_after_reload?: boolean;
}): string {
  return JSON.stringify({
    editedKey: summary.web_parameter_card_edited_key ?? summary.android_parameter_card_edited_key ?? null,
    editRecalculatesBoq: summary.web_parameter_edit_recalculates_boq ?? summary.android_parameter_edit_recalculates_boq ?? false,
    history25: summary.web_history_count_reaches_25 ?? summary.android_history_count_reaches_25 ?? false,
    reload: summary.web_history_persists_after_reload ?? summary.android_history_persists_after_reload ?? false,
  });
}

export function runAiEstimateParameterDurableHistoryWebAndroidParity(options: {
  webArtifact?: string | null;
  androidArtifact?: string | null;
  cases?: string | null;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  writeSummary?: boolean;
} = {}): { artifactPath: string; artifact: AiEstimateParameterDurableHistoryParitySummary } {
  if ((options.cases ?? "parameter-durable-history") !== "parameter-durable-history") {
    throw new Error(`UNSUPPORTED_PARAMETER_HISTORY_PARITY_CASES:${options.cases}`);
  }
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const webCandidate = latestWeb(sourceSha);
  const androidCandidate = latestAndroid(sourceSha);
  const webPath = options.webArtifact ?? webCandidate?.path ?? null;
  const androidPath = options.androidArtifact ?? androidCandidate?.path ?? null;
  const web = webCandidate?.path === webPath ? webCandidate.summary : null;
  const android = androidCandidate?.path === androidPath ? androidCandidate.summary : null;
  const outDir = path.join(PARITY_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  const requireRealBrowser = options.requireRealBrowser === true;
  const requireEmulator = options.requireEmulator === true;

  const sameCorpus =
    web?.source_sha === sourceSha &&
    android?.source_sha === sourceSha &&
    web.cases === "parameter-durable-history" &&
    android.cases === "parameter-durable-history";
  const webActualGreen =
    web?.final_status === GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_SMOKE &&
    web.actual_web_browser_parameter_durable_history_smoke_passed === true &&
    web.web_console_errors_count === 0 &&
    web.web_visible_english_words_count === 0 &&
    web.web_raw_internal_ids_visible_count === 0;
  const androidActualGreen =
    android?.final_status === GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_ANDROID_SMOKE &&
    android.actual_android_emulator_parameter_durable_history_smoke_passed === true &&
    android.android_console_errors_count === 0 &&
    android.android_visible_english_words_count === 0 &&
    android.android_raw_internal_ids_visible_count === 0;
  const parameterParity =
    Boolean(web && android) &&
    web?.web_parameter_card_edited_key === android?.android_parameter_card_edited_key &&
    web?.web_parameter_edit_recalculates_boq === true &&
    android?.android_parameter_edit_recalculates_boq === true;
  const snapshotHashParity =
    Boolean(web && android) &&
    comparableSnapshot(web!) === comparableSnapshot(android!);
  const revisionChainParity =
    web?.web_history_count_reaches_25 === true &&
    android?.android_history_count_reaches_25 === true &&
    web?.web_history_persists_after_reload === true &&
    android?.android_history_persists_after_reload === true;
  const historyCountParity =
    web?.web_history_not_limited_to_13 === true &&
    android?.android_history_not_limited_to_13 === true;
  const allCreatedPreservedParity =
    web?.web_all_created_estimates_preserved === true &&
    android?.android_all_created_estimates_preserved === true &&
    web?.web_created_estimates_count === android?.android_created_estimates_count &&
    (web?.web_history_total_count_after_create ?? 0) >= (web?.web_history_expected_total_count_after_create ?? Number.POSITIVE_INFINITY) &&
    (android?.android_history_total_count_after_create ?? 0) >=
      (android?.android_history_expected_total_count_after_create ?? Number.POSITIVE_INFINITY);
  const pdfStateParity =
    web?.web_pdf_from_history_passed === true &&
    android?.android_pdf_from_history_passed === true;
  const buyerPackageStateParity =
    web?.web_buyer_package_from_history_passed === true &&
    android?.android_buyer_package_from_history_passed === true;
  const blockers = [
    requireRealBrowser ? "" : "real_browser_required_flag_missing",
    requireEmulator ? "" : "emulator_required_flag_missing",
    web ? "" : "web_artifact_missing",
    android ? "" : "android_artifact_missing",
    webActualGreen ? "" : "web_parameter_history_actual_browser_smoke_not_green",
    androidActualGreen ? "" : "android_parameter_history_actual_emulator_smoke_not_green",
    sameCorpus ? "" : "same_parameter_history_corpus_not_proven",
    parameterParity ? "" : "web_android_parameter_values_parity_failed",
    snapshotHashParity ? "" : "web_android_snapshot_hash_parity_failed",
    revisionChainParity ? "" : "web_android_revision_chain_parity_failed",
    historyCountParity ? "" : "web_android_history_count_parity_failed",
    allCreatedPreservedParity ? "" : "web_android_all_created_estimates_preserved_parity_failed",
    pdfStateParity ? "" : "web_android_pdf_state_parity_failed",
    buyerPackageStateParity ? "" : "web_android_buyer_package_state_parity_failed",
  ].filter(Boolean);
  const passed = blockers.length === 0;
  const summary: AiEstimateParameterDurableHistoryParitySummary = {
    final_status: passed
      ? GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_ANDROID_PARITY
      : STOP_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_ANDROID_PARITY_FAILED,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    cases: "parameter-durable-history",
    require_real_browser: requireRealBrowser,
    require_emulator: requireEmulator,
    web_artifact: webPath,
    android_artifact: androidPath,
    same_parameter_durable_history_corpus_used_for_web_android: sameCorpus,
    web_android_parameter_values_parity: parameterParity,
    web_android_snapshot_hash_parity: snapshotHashParity,
    web_android_revision_chain_parity: revisionChainParity,
    web_android_history_count_parity: historyCountParity,
    web_android_all_created_estimates_preserved_parity: allCreatedPreservedParity,
    web_android_pdf_state_parity: pdfStateParity,
    web_android_buyer_package_state_parity: buyerPackageStateParity,
    web_actual_browser_green: webActualGreen,
    android_actual_emulator_green: androidActualGreen,
    parameter_durable_history_web_android_parity_passed: passed,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    fake_green_claimed: false,
    exact_artifact_paths: {
      web_summary: webPath,
      android_summary: androidPath,
      parity_summary: artifactPath,
    },
    blockers,
  };
  if (options.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runAiEstimateParameterDurableHistoryWebAndroidParity.ts")) {
  void Promise.resolve(runAiEstimateParameterDurableHistoryWebAndroidParity({
    webArtifact: argValue("web-artifact"),
    androidArtifact: argValue("android-artifact"),
    cases: argValue("cases"),
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    writeSummary: hasFlag("write-summary") || !hasFlag("no-write-summary"),
  }))
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        same_parameter_durable_history_corpus_used_for_web_android:
          result.artifact.same_parameter_durable_history_corpus_used_for_web_android,
        web_android_parameter_values_parity: result.artifact.web_android_parameter_values_parity,
        web_android_snapshot_hash_parity: result.artifact.web_android_snapshot_hash_parity,
        web_android_revision_chain_parity: result.artifact.web_android_revision_chain_parity,
        web_android_history_count_parity: result.artifact.web_android_history_count_parity,
        web_android_all_created_estimates_preserved_parity:
          result.artifact.web_android_all_created_estimates_preserved_parity,
        blockers: result.artifact.blockers,
        artifact: result.artifactPath,
      }, null, 2));
      if (result.artifact.blockers.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
