import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  AUTONOMOUS_ESTIMATE_PROGRAM_RUNTIME_ROOT,
  buildAutonomousEstimatePriorityPlan,
  type AutonomousEstimatePriorityPlan,
} from "./buildAutonomousEstimatePriorityPlan";

export const GREEN_AI_ESTIMATE_BATCH_PRIORITY_EXPLAINED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_BATCH_PRIORITY_EXPLAINED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_BATCH_PRIORITY_EXPLANATION_FAILED =
  "STOP_AI_ESTIMATE_BATCH_PRIORITY_EXPLANATION_FAILED" as const;

type BatchPriorityExplanation = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_BATCH_PRIORITY_EXPLAINED_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_BATCH_PRIORITY_EXPLANATION_FAILED;
  batch_id: string;
  selected_batch_id: string;
  is_selected_batch: boolean;
  priority_score: number;
  scoring_formula: string;
  score_breakdown: AutonomousEstimatePriorityPlan["selected_batch"]["score"];
  expected_ready_delta: number;
  expected_generic_reduction: number;
  expected_rendered_snapshot_count: number;
  reason: string;
  zero_delta_justified_by_full_green: boolean;
  fake_green_claimed: false;
  marketplace_touched: false;
  runtime_summary_path: string | null;
  blockers: string[];
};

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function readOrBuildPlan(): AutonomousEstimatePriorityPlan {
  return buildAutonomousEstimatePriorityPlan({
    writeFiles: false,
    writeRuntime: false,
    runChildAudits: false,
    runBaselineAudits: false,
  });
}

function batchArg(): string | null {
  const direct = process.argv.find((arg) => arg.startsWith("--batch="));
  if (direct) return direct.slice("--batch=".length);
  const index = process.argv.indexOf("--batch");
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

export function explainEstimateBatchPriority(options: {
  batchId?: string;
  writeRuntime?: boolean;
} = {}): BatchPriorityExplanation {
  const plan = readOrBuildPlan();
  const batchId = options.batchId ?? plan.selected_batch.batch_id;
  const candidate = plan.candidates.find((item) => item.batch_id === batchId);
  const blockers = [
    candidate ? "" : `batch_not_found:${batchId}`,
    plan.selected_batch.batch_id ? "" : "selected_batch_missing",
  ].filter(Boolean);
  const selectedOrCandidate = candidate ?? plan.selected_batch;
  const explanation: BatchPriorityExplanation = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_BATCH_PRIORITY_EXPLAINED_NO_BUILDS
      : STOP_AI_ESTIMATE_BATCH_PRIORITY_EXPLANATION_FAILED,
    batch_id: batchId,
    selected_batch_id: plan.selected_batch.batch_id,
    is_selected_batch: batchId === plan.selected_batch.batch_id,
    priority_score: selectedOrCandidate.score.priority_score,
    scoring_formula: plan.scoring_formula,
    score_breakdown: selectedOrCandidate.score,
    expected_ready_delta: selectedOrCandidate.expected_ready_delta,
    expected_generic_reduction: selectedOrCandidate.expected_generic_reduction,
    expected_rendered_snapshot_count: selectedOrCandidate.expected_rendered_snapshot_count,
    reason: selectedOrCandidate.reason,
    zero_delta_justified_by_full_green:
      selectedOrCandidate.expected_ready_delta === 0 &&
      selectedOrCandidate.expected_generic_reduction === 0 &&
      plan.baseline_dashboard.full_10000_real_norm_green_claimed,
    fake_green_claimed: false,
    marketplace_touched: false,
    runtime_summary_path: null,
    blockers,
  };
  if (options.writeRuntime === true) {
    const runtimeDir = path.join(process.cwd(), AUTONOMOUS_ESTIMATE_PROGRAM_RUNTIME_ROOT, timestampForPath());
    const runtimeSummaryPath = path.join(runtimeDir, "batch-priority-explanation.json");
    mkdirSync(runtimeDir, { recursive: true });
    explanation.runtime_summary_path = path.relative(process.cwd(), runtimeSummaryPath).replace(/\\/g, "/");
    writeFileSync(runtimeSummaryPath, `${JSON.stringify(explanation, null, 2)}\n`, "utf8");
  }
  return explanation;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/explainEstimateBatchPriority.ts")) {
  try {
    const batchId = batchArg();
    if (!batchId) throw new Error("EXPLAIN_ESTIMATE_BATCH_PRIORITY_REQUIRES_--batch");
    const explanation = explainEstimateBatchPriority({ batchId, writeRuntime: true });
    console.log(JSON.stringify(explanation, null, 2));
    process.exitCode =
      explanation.final_status === GREEN_AI_ESTIMATE_BATCH_PRIORITY_EXPLAINED_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
