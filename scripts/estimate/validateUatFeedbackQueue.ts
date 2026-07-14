import path from "node:path";

import {
  loadUatFeedbackSchema,
  timestampForPath,
  validateUatFeedbackQueue as validateQueue,
  writeJson,
} from "./buildRoleBasedUatDashboard";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-role-based-uat", "feedback-validation");

export function validateUatFeedbackQueueCli() {
  const validation = validateQueue();
  const schema = loadUatFeedbackSchema();
  const blockers = [
    ...validation.blockers,
    schema.approved_correction_requires.includes("version_bump") ? "" : "version_bump_not_required",
    schema.approved_correction_requires.includes("no_prompt_specific_hardcode") ? "" : "prompt_specific_hardcode_not_rejected",
    schema.approved_correction_requires.includes("no_llm_quantity_correction") ? "" : "llm_quantity_correction_not_rejected",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_UAT_FEEDBACK_QUEUE_VALIDATED"
      : "STOP_AI_ESTIMATE_UAT_FEEDBACK_QUEUE_VALIDATION_FAILED",
    ...validation,
    blockers,
  };
  const outPath = path.join(RUNTIME_ROOT, timestampForPath(), "summary.json");
  writeJson(outPath, summary);
  return { summary, outPath };
}

if (require.main === module) {
  const { summary, outPath } = validateUatFeedbackQueueCli();
  console.log(JSON.stringify({
    final_status: summary.final_status,
    feedback_items_count: summary.feedback_items_count,
    blockers: summary.blockers,
    artifact: outPath,
  }, null, 2));
  if (summary.blockers.length > 0) process.exitCode = 1;
}
