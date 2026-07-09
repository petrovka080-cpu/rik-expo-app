import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { currentBranch, currentSourceSha, currentUpstreamSync, hasFlag, writeRuntimeJson } from "./renderStagingAcceptanceCore";
import { GREEN_AI_ESTIMATE_PLATFORM_CORE_ANDROID_SMOKE } from "./runAiEstimatePlatformCoreAndroidSmoke";
import { GREEN_AI_ESTIMATE_PLATFORM_CORE_WEB_SMOKE } from "./runAiEstimatePlatformCoreWebSmoke";

const PLATFORM_ROOT = path.join(".release-runtime", "ai-estimate-platform-core-scale-seal");
const WEB_ROOT = path.join(PLATFORM_ROOT, "web");
const ANDROID_ROOT = path.join(PLATFORM_ROOT, "android-chrome");
const PARITY_ROOT = path.join(PLATFORM_ROOT, "web-android-parity");

export const GREEN_AI_ESTIMATE_PLATFORM_CORE_WEB_ANDROID_PARITY =
  "GREEN_AI_ESTIMATE_PLATFORM_CORE_WEB_ANDROID_PARITY" as const;
export const STOP_AI_ESTIMATE_PLATFORM_CORE_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_ESTIMATE_PLATFORM_CORE_WEB_ANDROID_PARITY_FAILED" as const;

type PlatformCoreSmokeSummary = {
  final_status?: string;
  source_sha?: string;
  corpus_fingerprint?: string;
  aggregate_snapshot_hash?: string;
  aggregate_pdf_buyer_hash?: string;
  aggregate_history_count_hash?: string;
  aggregate_foreman_entry_hash?: string;
  case_results?: { case_id: string; snapshot_hash: string; pdf_buyer_hash: string; history_count_hash: string; foreman_entry_hash: string }[];
  actual_web_browser_platform_core_passed?: boolean;
  actual_android_emulator_platform_core_passed?: boolean;
  fake_green_claimed?: boolean;
};

function latestSummary(root: string): string | null {
  if (!existsSync(root)) return null;
  const candidates: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) walk(fullPath);
      if (stats.isFile() && entry === "summary.json") candidates.push(fullPath);
    }
  };
  walk(root);
  return candidates.sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] ?? null;
}

function readSummary(filePath: string | null): PlatformCoreSmokeSummary | null {
  if (!filePath) return null;
  return JSON.parse(readFileSync(filePath, "utf8")) as PlatformCoreSmokeSummary;
}

function ids(summary: PlatformCoreSmokeSummary | null): string[] {
  return summary?.case_results?.map((item) => item.case_id) ?? [];
}

function sameArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export function runAiEstimatePlatformCoreWebAndroidParity(options: {
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  webArtifact?: string | null;
  androidArtifact?: string | null;
} = {}) {
  const sourceSha = currentSourceSha();
  const webPath = options.webArtifact ?? latestSummary(WEB_ROOT);
  const androidPath = options.androidArtifact ?? latestSummary(ANDROID_ROOT);
  const web = readSummary(webPath);
  const android = readSummary(androidPath);
  const sameCorpus = Boolean(web?.corpus_fingerprint && web.corpus_fingerprint === android?.corpus_fingerprint);
  const caseIdParity = sameArray(ids(web), ids(android));
  const snapshotHashParity = Boolean(web?.aggregate_snapshot_hash && web.aggregate_snapshot_hash === android?.aggregate_snapshot_hash);
  const pdfBuyerParity = Boolean(web?.aggregate_pdf_buyer_hash && web.aggregate_pdf_buyer_hash === android?.aggregate_pdf_buyer_hash);
  const historyParity = Boolean(web?.aggregate_history_count_hash && web.aggregate_history_count_hash === android?.aggregate_history_count_hash);
  const foremanParity = Boolean(web?.aggregate_foreman_entry_hash && web.aggregate_foreman_entry_hash === android?.aggregate_foreman_entry_hash);
  const webGreen =
    web?.source_sha === sourceSha &&
    web.final_status === GREEN_AI_ESTIMATE_PLATFORM_CORE_WEB_SMOKE &&
    web.actual_web_browser_platform_core_passed === true &&
    web.fake_green_claimed === false;
  const androidGreen =
    android?.source_sha === sourceSha &&
    android.final_status === GREEN_AI_ESTIMATE_PLATFORM_CORE_ANDROID_SMOKE &&
    android.actual_android_emulator_platform_core_passed === true &&
    android.fake_green_claimed === false;
  const blockers = [
    options.requireRealBrowser === true ? "" : "real_browser_required_flag_missing",
    options.requireEmulator === true ? "" : "emulator_required_flag_missing",
    web ? "" : "web_artifact_missing",
    android ? "" : "android_artifact_missing",
    webGreen ? "" : "web_platform_core_smoke_not_green",
    androidGreen ? "" : "android_platform_core_smoke_not_green",
    sameCorpus ? "" : "same_platform_core_corpus_not_used",
    caseIdParity ? "" : "web_android_case_id_parity_failed",
    snapshotHashParity ? "" : "web_android_snapshot_hash_parity_failed",
    pdfBuyerParity ? "" : "web_android_pdf_buyer_parity_failed",
    historyParity ? "" : "web_android_history_count_parity_failed",
    foremanParity ? "" : "web_android_foreman_entry_parity_failed",
  ].filter(Boolean);
  const green = blockers.length === 0;
  const summary = {
    final_status: green
      ? GREEN_AI_ESTIMATE_PLATFORM_CORE_WEB_ANDROID_PARITY
      : STOP_AI_ESTIMATE_PLATFORM_CORE_WEB_ANDROID_PARITY_FAILED,
    source_sha: sourceSha,
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    summary_generated_by: "ai-estimate-platform-core-web-android-parity",
    require_real_browser: options.requireRealBrowser === true,
    require_emulator: options.requireEmulator === true,
    web_artifact: webPath,
    android_artifact: androidPath,
    same_platform_core_corpus_used_for_web_android: sameCorpus,
    web_android_case_id_parity: caseIdParity,
    web_android_snapshot_hash_parity: snapshotHashParity,
    web_android_pdf_buyer_parity: pdfBuyerParity,
    web_android_history_count_parity: historyParity,
    web_android_foreman_entry_parity: foremanParity,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    blockers,
    fake_green_claimed: false,
  };
  const artifact = writeRuntimeJson(PARITY_ROOT, summary);
  return { artifactPath: artifact.artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runAiEstimatePlatformCoreWebAndroidParity.ts")) {
  const result = runAiEstimatePlatformCoreWebAndroidParity({
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
  });
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    blockers: result.artifact.blockers,
  }, null, 2));
  if (result.artifact.blockers.length > 0) process.exitCode = 1;
}
