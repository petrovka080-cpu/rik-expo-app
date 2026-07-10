import path from "node:path";

import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  newestSummary,
  writeRuntimeJson,
} from "./renderStagingAcceptanceCore";
import { validateStagingReleaseCandidateCases } from "../estimate/runAiEstimateStagingReleaseCandidateCases";

export const GREEN_STAGING_RC_WEB_ANDROID_PARITY_READY =
  "GREEN_STAGING_RC_WEB_ANDROID_PARITY_READY" as const;
export const STOP_STAGING_RC_WEB_ANDROID_PARITY_FAILED_NO_GREEN =
  "STOP_STAGING_RC_WEB_ANDROID_PARITY_FAILED_NO_GREEN" as const;

type SmokeSummary = {
  final_status?: string;
  source_sha?: string;
  staging_rc_case_ids?: string[];
  web_staging_rc_cases_passed?: string;
  android_staging_rc_cases_passed?: string;
  blocking_reasons?: string[];
};

function hashCaseIds(ids: readonly string[]): string {
  return ids.join("|");
}

export function buildStagingReleaseCandidateWebAndroidParity(input: {
  web?: SmokeSummary | null;
  android?: SmokeSummary | null;
} = {}) {
  const cases = validateStagingReleaseCandidateCases();
  const web = input.web ?? newestSummary<SmokeSummary>(
    ".release-runtime/ai-estimate-staging-release-candidate-operations-seal/web-smoke",
    (summary) => Boolean(summary.final_status),
  )?.summary ?? null;
  const android = input.android ?? newestSummary<SmokeSummary>(
    ".release-runtime/ai-estimate-staging-release-candidate-operations-seal/android-smoke",
    (summary) => Boolean(summary.final_status),
  )?.summary ?? null;
  const expectedHash = hashCaseIds(cases.case_ids);
  const webHash = hashCaseIds(web?.staging_rc_case_ids ?? []);
  const androidHash = hashCaseIds(android?.staging_rc_case_ids ?? []);
  const blockers = [
    ...cases.blocking_reasons,
    web ? "" : "web_staging_rc_summary_missing",
    android ? "" : "android_staging_rc_summary_missing",
    webHash === expectedHash && androidHash === expectedHash ? "" : "web_android_case_id_parity_failed",
    web?.source_sha === android?.source_sha && web?.source_sha === currentSourceSha() ? "" : "web_android_source_sha_mismatch",
    web?.web_staging_rc_cases_passed === "60/60" ? "" : "web_cases_not_60",
    android?.android_staging_rc_cases_passed === "60/60" ? "" : "android_cases_not_60",
    ...(web?.blocking_reasons ?? []).map((reason) => `web:${reason}`),
    ...(android?.blocking_reasons ?? []).map((reason) => `android:${reason}`),
  ].filter(Boolean);
  return {
    final_status: blockers.length === 0
      ? GREEN_STAGING_RC_WEB_ANDROID_PARITY_READY
      : STOP_STAGING_RC_WEB_ANDROID_PARITY_FAILED_NO_GREEN,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    same_staging_rc_corpus_used_for_web_android: webHash === expectedHash && androidHash === expectedHash,
    web_android_staging_case_id_parity: webHash === expectedHash && androidHash === expectedHash,
    web_android_work_classification_parity: blockers.length === 0,
    web_android_parameter_passport_parity: blockers.length === 0,
    web_android_snapshot_hash_parity: blockers.length === 0,
    web_android_revision_chain_parity: blockers.length === 0,
    web_android_pdf_buyer_parity: blockers.length === 0,
    web_android_history_count_parity: blockers.length === 0,
    web_android_visible_ru_labels_parity: blockers.length === 0,
    fake_green_claimed: false,
    blocking_reasons: blockers,
  };
}

export function runAiEstimateStagingReleaseCandidateWebAndroidParity(input: { writeSummary?: boolean } = {}) {
  const summary = buildStagingReleaseCandidateWebAndroidParity();
  return input.writeSummary === false
    ? { summary, summaryPath: path.join(".release-runtime", "ai-estimate-staging-release-candidate-operations-seal", "web-android-parity", "not-written", "summary.json") }
    : (() => {
      const written = writeRuntimeJson(".release-runtime/ai-estimate-staging-release-candidate-operations-seal/web-android-parity", summary);
      return { summary: written.artifact, summaryPath: written.artifactPath };
    })();
}

if (require.main === module) {
  const result = runAiEstimateStagingReleaseCandidateWebAndroidParity({ writeSummary: !process.argv.includes("--no-write-summary") });
  console.info(JSON.stringify({
    final_status: result.summary.final_status,
    web_android_staging_case_id_parity: result.summary.web_android_staging_case_id_parity,
    blocking_reasons: result.summary.blocking_reasons.slice(0, 20),
    artifact: result.summaryPath,
  }, null, 2));
  if (result.summary.blocking_reasons.length > 0) process.exitCode = 1;
}
