import type { AiEvalResult } from "./AiEvalContract";

export function validateAiEvalResult(result: AiEvalResult) {
  const blockers = [
    result.sourceSha ? "" : "source_sha_missing",
    result.runtimeVersion ? "" : "runtime_version_missing",
    result.promptVersion ? "" : "prompt_version_missing",
    result.caseVersion ? "" : "case_version_missing",
    result.scoreBreakdown ? "" : "score_breakdown_missing",
    result.piiRedactionPassed ? "" : "pii_redaction_failed",
    result.rawInternalIdsVisible ? "raw_internal_ids_visible" : "",
  ].filter(Boolean);
  return {
    ok: blockers.length === 0,
    eval_results_are_source_sha_bound: Boolean(result.sourceSha),
    eval_results_are_runtime_version_bound: Boolean(result.runtimeVersion),
    eval_results_are_prompt_version_bound: Boolean(result.promptVersion),
    eval_result_has_score_breakdown: Boolean(result.scoreBreakdown),
    blockers,
  };
}
