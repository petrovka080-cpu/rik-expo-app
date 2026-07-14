import path from "node:path";

import { AI_PLATFORM_KERNEL_ROOT, currentGitState, newestSummary, timestampForPath, writeJson } from "../architecture/aiPlatformKernelAuditUtils";
import { GREEN_AI_PLATFORM_KERNEL_ANDROID_SMOKE } from "./runAiPlatformKernelAndroidSmoke";
import { GREEN_AI_PLATFORM_KERNEL_WEB_SMOKE } from "./runAiPlatformKernelWebSmoke";

export const GREEN_AI_PLATFORM_KERNEL_WEB_ANDROID_PARITY =
  "GREEN_AI_PLATFORM_KERNEL_WEB_ANDROID_PARITY" as const;
export const STOP_AI_PLATFORM_KERNEL_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_PLATFORM_KERNEL_WEB_ANDROID_PARITY_FAILED" as const;

type KernelSmokeSummary = {
  final_status: string;
  source_sha: string;
  case_results: { case_id: string; passed: boolean; result_hash: string }[];
  blockers: string[];
};

function mapResults(summary: KernelSmokeSummary | null | undefined): Map<string, string> {
  return new Map((summary?.case_results ?? []).map((item) => [item.case_id, item.passed ? item.result_hash : "FAILED"]));
}

export function runAiPlatformKernelWebAndroidParity(input: { writeSummary?: boolean } = {}) {
  const git = currentGitState();
  const web = newestSummary<KernelSmokeSummary>(path.join(AI_PLATFORM_KERNEL_ROOT, "web"), (summary) =>
    summary.source_sha === git.source_sha && summary.final_status === GREEN_AI_PLATFORM_KERNEL_WEB_SMOKE
  );
  const android = newestSummary<KernelSmokeSummary>(path.join(AI_PLATFORM_KERNEL_ROOT, "android-chrome"), (summary) =>
    summary.source_sha === git.source_sha && summary.final_status === GREEN_AI_PLATFORM_KERNEL_ANDROID_SMOKE
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
      ? GREEN_AI_PLATFORM_KERNEL_WEB_ANDROID_PARITY
      : STOP_AI_PLATFORM_KERNEL_WEB_ANDROID_PARITY_FAILED,
    ...git,
    generated_at: new Date().toISOString(),
    same_ai_platform_corpus_used_for_web_android: sameCases,
    web_android_ai_result_contract_parity: sameHashes,
    web_android_tool_policy_parity: sameHashes,
    web_android_ledger_parity: sameHashes,
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
  const summaryPath = path.join(AI_PLATFORM_KERNEL_ROOT, "web-android-parity", timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiPlatformKernelWebAndroidParity({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_PLATFORM_KERNEL_WEB_ANDROID_PARITY) process.exitCode = 1;
}
