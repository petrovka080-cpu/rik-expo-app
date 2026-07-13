import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { recordEstimateTelemetryEvent } from "../../src/features/estimates/telemetry/estimateTelemetryRecorder";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-product-pilot-observability", "estimator-feedback");

export type EstimatorFeedbackDecision = "approve" | "request_change" | "reject";
export type EstimatorFeedbackRowChange = {
  row_id: string;
  change_type: "quantity_changed" | "price_source_added" | "row_removed" | "row_added" | "comment";
  reason_ru: string;
  before_quantity?: number | null;
  after_quantity?: number | null;
  revision_link_id?: string | null;
};

export type EstimatorFeedbackInput = {
  feedback_id: string;
  estimate_id: string;
  revision_id: string;
  reviewer_id: string;
  decision: EstimatorFeedbackDecision;
  row_changes: EstimatorFeedbackRowChange[];
  created_at?: string;
};

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function validateEstimatorFeedback(input: EstimatorFeedbackInput): string[] {
  const blockers = [
    input.feedback_id ? "" : "feedback_id_missing",
    input.estimate_id ? "" : "estimate_id_missing",
    input.revision_id ? "" : "revision_id_missing",
    input.reviewer_id ? "" : "reviewer_id_missing",
    ["approve", "request_change", "reject"].includes(input.decision) ? "" : "decision_invalid",
  ].filter(Boolean);
  for (const change of input.row_changes) {
    if (!change.row_id) blockers.push("row_id_missing");
    if (!change.reason_ru) blockers.push("change_reason_missing");
    if (change.change_type === "quantity_changed") {
      if (!change.revision_link_id) blockers.push("quantity_change_revision_link_missing");
      if (change.before_quantity == null || change.after_quantity == null) blockers.push("quantity_change_before_after_missing");
      if (change.before_quantity === change.after_quantity) blockers.push("quantity_change_no_delta");
    }
  }
  return blockers;
}

export function ingestEstimatorFeedback(input: EstimatorFeedbackInput) {
  const blockers = validateEstimatorFeedback(input);
  if (blockers.length > 0) {
    return {
      accepted: false,
      status: "rejected",
      blockers,
      silent_quantity_change_rejected: blockers.includes("quantity_change_revision_link_missing"),
    };
  }
  const feedback = {
    ...input,
    created_at: input.created_at ?? new Date().toISOString(),
    status: "queued_for_catalog_review",
    silent_quantity_change_rejected: true,
  };
  recordEstimateTelemetryEvent({
    event_name: "estimator_feedback_ingested",
    route: "feedback",
    platform: "node",
    estimate_id: input.estimate_id,
    payload: {
      feedback_id: input.feedback_id,
      decision: input.decision,
      row_change_count: input.row_changes.length,
    },
  });
  return {
    accepted: true,
    status: feedback.status,
    feedback,
    blockers: [],
    silent_quantity_change_rejected: true,
  };
}

export function runEstimatorFeedbackMutationGates() {
  const rejected = ingestEstimatorFeedback({
    feedback_id: "bad",
    estimate_id: "estimate",
    revision_id: "r1",
    reviewer_id: "expert",
    decision: "request_change",
    row_changes: [{
      row_id: "row",
      change_type: "quantity_changed",
      reason_ru: "changed without revision link",
      before_quantity: 1,
      after_quantity: 2,
    }],
  });
  const accepted = ingestEstimatorFeedback({
    feedback_id: "good",
    estimate_id: "estimate",
    revision_id: "r2",
    reviewer_id: "expert",
    decision: "request_change",
    row_changes: [{
      row_id: "row",
      change_type: "quantity_changed",
      reason_ru: "linked revision",
      before_quantity: 1,
      after_quantity: 2,
      revision_link_id: "revision_event_1",
    }],
  });
  return {
    silent_quantity_change_rejected: rejected.accepted === false && rejected.silent_quantity_change_rejected,
    valid_feedback_accepted: accepted.accepted === true,
  };
}

if (require.main === module) {
  const gates = runEstimatorFeedbackMutationGates();
  const blockers = Object.values(gates).every(Boolean) ? [] : ["estimator_feedback_gate_failed"];
  const summary = {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_ESTIMATOR_FEEDBACK"
      : "STOP_AI_ESTIMATE_ESTIMATOR_FEEDBACK_FAILED",
    ...gates,
    blockers,
  };
  const outPath = path.join(RUNTIME_ROOT, timestampForPath(), "summary.json");
  writeJson(outPath, summary);
  console.log(JSON.stringify({ ...summary, artifact: outPath }, null, 2));
  if (blockers.length > 0) process.exitCode = 1;
}
