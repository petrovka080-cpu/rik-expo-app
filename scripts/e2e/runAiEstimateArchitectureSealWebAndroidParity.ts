import path from "node:path";

import { newestSummary } from "./renderStagingAcceptanceCore";
import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_ANDROID_SMOKE } from "./runAiEstimateArchitectureSealAndroidSmoke";
import { GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_SMOKE } from "./runAiEstimateArchitectureSealWebSmoke";

export const GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_ANDROID_PARITY =
  "GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_ANDROID_PARITY" as const;
export const STOP_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_ANDROID_PARITY_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-evolutionary-architecture-scale-seal");

type SealSummary = {
  final_status: string;
  source_sha: string;
  case_results: { case_id: string; passed: boolean; result_hash: string }[];
  blockers: string[];
};

function mapResults(summary: SealSummary | null | undefined): Map<string, string> {
  return new Map((summary?.case_results ?? []).map((item) => [item.case_id, item.passed ? item.result_hash : "FAILED"]));
}

export function runAiEstimateArchitectureSealWebAndroidParity(input: { writeSummary?: boolean } = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const web = newestSummary<SealSummary>(path.join(ROOT, "web"), (summary) =>
    summary.source_sha === sourceSha && summary.final_status === GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_SMOKE
  );
  const android = newestSummary<SealSummary>(path.join(ROOT, "android-chrome"), (summary) =>
    summary.source_sha === sourceSha && summary.final_status === GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_ANDROID_SMOKE
  );
  const webResults = mapResults(web?.summary);
  const androidResults = mapResults(android?.summary);
  const caseIds = [...webResults.keys()].sort();
  const sameCases = caseIds.length === 50 &&
    caseIds.length === androidResults.size &&
    caseIds.every((caseId) => androidResults.has(caseId));
  const sameHashes = sameCases && caseIds.every((caseId) => webResults.get(caseId) === androidResults.get(caseId));
  const blockers = [
    web ? "" : "web_summary_missing_or_not_green",
    android ? "" : "android_summary_missing_or_not_green",
    sameCases ? "" : "web_android_case_ids_mismatch",
    sameHashes ? "" : "web_android_result_hash_mismatch",
    ...(web?.summary.blockers.map((blocker) => `web:${blocker}`) ?? []),
    ...(android?.summary.blockers.map((blocker) => `android:${blocker}`) ?? []),
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_ANDROID_PARITY
      : STOP_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_ANDROID_PARITY_FAILED,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    same_source_sha: Boolean(web && android),
    web_android_case_id_parity: sameCases,
    web_android_result_hash_parity: sameHashes,
    web_summary_artifact: web?.path ?? null,
    android_summary_artifact: android?.path ?? null,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    fake_green_claimed: false,
    blockers,
  };
  const summaryPath = path.join(ROOT, "web-android-parity", timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateArchitectureSealWebAndroidParity({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_ANDROID_PARITY) process.exitCode = 1;
}
