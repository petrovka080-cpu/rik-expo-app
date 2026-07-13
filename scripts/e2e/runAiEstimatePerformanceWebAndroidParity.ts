import { readFileSync } from "node:fs";
import path from "node:path";

import { currentBranch, currentSourceSha, currentUpstreamSync, hasFlag, newestSummary, writeRuntimeJson } from "./renderStagingAcceptanceCore";
import { GREEN_AI_ESTIMATE_PERFORMANCE_ANDROID_SMOKE } from "./runAiEstimatePerformanceAndroidSmoke";
import { GREEN_AI_ESTIMATE_PERFORMANCE_WEB_SMOKE } from "./runAiEstimatePerformanceWebSmoke";

const ROOT = path.join(".release-runtime", "ai-estimate-performance-slo-scale-seal");
const WEB_ROOT = path.join(ROOT, "web");
const ANDROID_ROOT = path.join(ROOT, "android-chrome");
const PARITY_ROOT = path.join(ROOT, "web-android-parity");

export const GREEN_AI_ESTIMATE_PERFORMANCE_WEB_ANDROID_PARITY =
  "GREEN_AI_ESTIMATE_PERFORMANCE_WEB_ANDROID_PARITY" as const;
export const STOP_AI_ESTIMATE_PERFORMANCE_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_ESTIMATE_PERFORMANCE_WEB_ANDROID_PARITY_FAILED" as const;

type PerformanceSmokeSummary = {
  final_status?: string;
  source_sha?: string;
  corpus_fingerprint?: string;
  aggregate_snapshot_hash?: string;
  aggregate_pdf_buyer_hash?: string;
  aggregate_result_hash?: string;
  actual_web_browser_performance_smoke_passed?: boolean;
  actual_android_emulator_performance_smoke_passed?: boolean;
  case_results?: { case_id: string; snapshot_hash: string; pdf_buyer_hash: string; result_hash: string; passed: boolean }[];
  fake_green_claimed?: boolean;
};

function ids(summary: PerformanceSmokeSummary | null): string[] {
  return summary?.case_results?.map((item) => item.case_id) ?? [];
}

function sameArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function readSummary(filePath: string | null): PerformanceSmokeSummary | null {
  if (!filePath) return null;
  return JSON.parse(readFileSync(filePath, "utf8")) as PerformanceSmokeSummary;
}

export function runAiEstimatePerformanceWebAndroidParity(options: {
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  webArtifact?: string | null;
  androidArtifact?: string | null;
} = {}) {
  const sourceSha = currentSourceSha();
  const webPath = options.webArtifact ?? newestSummary<PerformanceSmokeSummary>(
    WEB_ROOT,
    (summary) => summary.final_status === GREEN_AI_ESTIMATE_PERFORMANCE_WEB_SMOKE,
  )?.path ?? null;
  const androidPath = options.androidArtifact ?? newestSummary<PerformanceSmokeSummary>(
    ANDROID_ROOT,
    (summary) => summary.final_status === GREEN_AI_ESTIMATE_PERFORMANCE_ANDROID_SMOKE,
  )?.path ?? null;
  const web = readSummary(webPath);
  const android = readSummary(androidPath);
  const sameCorpus = Boolean(web?.corpus_fingerprint && web.corpus_fingerprint === android?.corpus_fingerprint);
  const caseIdParity = sameArray(ids(web), ids(android));
  const resultParity = Boolean(web?.aggregate_result_hash && web.aggregate_result_hash === android?.aggregate_result_hash);
  const snapshotParity = Boolean(web?.aggregate_snapshot_hash && web.aggregate_snapshot_hash === android?.aggregate_snapshot_hash);
  const pdfBuyerParity = Boolean(web?.aggregate_pdf_buyer_hash && web.aggregate_pdf_buyer_hash === android?.aggregate_pdf_buyer_hash);
  const webGreen =
    web?.source_sha === sourceSha &&
    web.final_status === GREEN_AI_ESTIMATE_PERFORMANCE_WEB_SMOKE &&
    web.actual_web_browser_performance_smoke_passed === true &&
    web.fake_green_claimed === false;
  const androidGreen =
    android?.source_sha === sourceSha &&
    android.final_status === GREEN_AI_ESTIMATE_PERFORMANCE_ANDROID_SMOKE &&
    android.actual_android_emulator_performance_smoke_passed === true &&
    android.fake_green_claimed === false;
  const blockers = [
    options.requireRealBrowser === true ? "" : "real_browser_required_flag_missing",
    options.requireEmulator === true ? "" : "emulator_required_flag_missing",
    web ? "" : "web_artifact_missing",
    android ? "" : "android_artifact_missing",
    webGreen ? "" : "web_performance_smoke_not_green_or_stale",
    androidGreen ? "" : "android_performance_smoke_not_green_or_stale",
    sameCorpus ? "" : "same_performance_corpus_not_used",
    caseIdParity ? "" : "web_android_case_id_parity_failed",
    resultParity ? "" : "web_android_result_parity_failed",
    snapshotParity ? "" : "web_android_snapshot_hash_parity_failed",
    pdfBuyerParity ? "" : "web_android_pdf_buyer_parity_failed",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PERFORMANCE_WEB_ANDROID_PARITY
      : STOP_AI_ESTIMATE_PERFORMANCE_WEB_ANDROID_PARITY_FAILED,
    source_sha: sourceSha,
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    require_real_browser: options.requireRealBrowser === true,
    require_emulator: options.requireEmulator === true,
    web_artifact: webPath,
    android_artifact: androidPath,
    same_performance_corpus_used_for_web_android: sameCorpus,
    web_android_case_id_parity: caseIdParity,
    web_android_result_parity: resultParity,
    web_android_snapshot_hash_parity: snapshotParity,
    web_android_pdf_buyer_parity: pdfBuyerParity,
    web_android_slo_comparison_recorded: Boolean(web && android),
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    blocking_reasons: blockers,
    fake_green_claimed: false,
  };
  const result = writeRuntimeJson(PARITY_ROOT, summary);
  return { artifactPath: result.artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runAiEstimatePerformanceWebAndroidParity.ts")) {
  const result = runAiEstimatePerformanceWebAndroidParity({
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
  });
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    blocking_reasons: result.artifact.blocking_reasons,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_PERFORMANCE_WEB_ANDROID_PARITY) process.exitCode = 1;
}
