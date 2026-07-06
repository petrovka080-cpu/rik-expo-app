import {
  auditWorkEstimateSemanticAcceptance,
  GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE,
} from "./auditWorkEstimateSemanticAcceptance";

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

if (require.main === module) {
  const result = auditWorkEstimateSemanticAcceptance({
    writeLedger: hasFlag("write-ledger"),
    writeSummary: hasFlag("write-summary") || hasFlag("json"),
    writeSamples: !hasFlag("no-write-samples"),
    requireGateFlags: !hasFlag("audit-only"),
    requireRuntimeEvidence: !hasFlag("no-runtime-evidence"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    source_sha: result.summary.source_sha,
    semantic_cases_run: result.summary.semantic_golden_cases_total,
    semantic_cases_passed: result.summary.semantic_golden_cases_passed,
    templates_processed: result.summary.templates_processed,
    templates_with_estimate_generated: result.summary.templates_with_estimate_generated,
    blockers: result.summary.blocking_reasons.slice(0, 20),
    runtime_summary_path: result.summary.runtime_summary_path,
    sample_outputs_dir: result.summary.sample_outputs_dir,
  }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE) {
    process.exitCode = 1;
  }
}

export {
  auditWorkEstimateSemanticAcceptance,
  GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE,
};
