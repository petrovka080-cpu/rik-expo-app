import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  ingestEstimatorFeedback,
  type EstimatorFeedbackInput,
} from "./ingestEstimatorFeedback";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-product-pilot-observability", "estimator-feedback-queue");

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function buildEstimatorFeedbackQueue(items: readonly EstimatorFeedbackInput[]) {
  const ingested = items.map((item) => ingestEstimatorFeedback(item));
  const accepted = ingested.filter((item) => item.accepted);
  const rejected = ingested.filter((item) => !item.accepted);
  return {
    final_status: rejected.length === 0
      ? "GREEN_AI_ESTIMATE_ESTIMATOR_FEEDBACK_QUEUE"
      : "STOP_AI_ESTIMATE_ESTIMATOR_FEEDBACK_QUEUE_FAILED",
    accepted_count: accepted.length,
    rejected_count: rejected.length,
    queue_items: accepted.map((item) => item.feedback),
    rejected,
    blockers: rejected.length === 0 ? [] : ["feedback_validation_failed"],
  };
}

if (require.main === module) {
  const summary = buildEstimatorFeedbackQueue([{
    feedback_id: "queue-good",
    estimate_id: "estimate",
    revision_id: "r1",
    reviewer_id: "expert",
    decision: "approve",
    row_changes: [{ row_id: "row", change_type: "comment", reason_ru: "accepted for pilot" }],
  }]);
  const outPath = path.join(RUNTIME_ROOT, timestampForPath(), "summary.json");
  writeJson(outPath, summary);
  console.log(JSON.stringify({ ...summary, artifact: outPath }, null, 2));
  if (summary.blockers.length > 0) process.exitCode = 1;
}
