import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  AUTONOMOUS_ESTIMATE_PROGRAM_RUNTIME_ROOT,
  buildAutonomousEstimatePriorityPlan,
  GREEN_AI_ESTIMATE_AUTONOMOUS_PRIORITY_PLAN_READY_NO_BUILDS,
  type AutonomousEstimatePriorityPlan,
} from "./buildAutonomousEstimatePriorityPlan";

export const GREEN_AI_ESTIMATE_AUTONOMOUS_NEXT_BATCH_SELECTED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_AUTONOMOUS_NEXT_BATCH_SELECTED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_AUTONOMOUS_NEXT_BATCH_NOT_SELECTED =
  "STOP_AI_ESTIMATE_AUTONOMOUS_NEXT_BATCH_NOT_SELECTED" as const;

export type SelectedProfessionalEstimateBatch = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_AUTONOMOUS_NEXT_BATCH_SELECTED_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_AUTONOMOUS_NEXT_BATCH_NOT_SELECTED;
  selected_batch_id: string;
  selected_batch_type: AutonomousEstimatePriorityPlan["selected_batch"]["batch_type"];
  template_count: number;
  expected_ready_delta: number;
  expected_generic_reduction: number;
  expected_rendered_snapshot_count: number;
  selected_by_priority_score: boolean;
  zero_delta_justified_by_full_green: boolean;
  reason: string;
  plan_status: string;
  runtime_summary_path: string | null;
  fake_green_claimed: false;
  marketplace_touched: false;
  blockers: string[];
};

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function selectNextProfessionalEstimateBatch(options: { writeFiles?: boolean; writeRuntime?: boolean } = {}) {
  const plan = buildAutonomousEstimatePriorityPlan({
    writeFiles: options.writeFiles === true,
    writeRuntime: options.writeRuntime === true,
    runChildAudits: options.writeFiles === true,
    runBaselineAudits: options.writeFiles === true || options.writeRuntime === true,
  });
  const blockers = [
    plan.final_status === GREEN_AI_ESTIMATE_AUTONOMOUS_PRIORITY_PLAN_READY_NO_BUILDS
      ? ""
      : `priority_plan_status:${plan.final_status}`,
    plan.selected_batch.batch_id ? "" : "selected_batch_missing",
    plan.next_batch_selected_by_score ? "" : "selected_batch_not_top_scored",
    plan.selected_batch_not_chosen_for_easy_fake_green ? "" : "selected_batch_chosen_for_easy_fake_green",
  ].filter(Boolean);

  const result: SelectedProfessionalEstimateBatch = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_AUTONOMOUS_NEXT_BATCH_SELECTED_NO_BUILDS
      : STOP_AI_ESTIMATE_AUTONOMOUS_NEXT_BATCH_NOT_SELECTED,
    selected_batch_id: plan.selected_batch.batch_id,
    selected_batch_type: plan.selected_batch.batch_type,
    template_count: plan.selected_batch.template_count,
    expected_ready_delta: plan.selected_batch.expected_ready_delta,
    expected_generic_reduction: plan.selected_batch.expected_generic_reduction,
    expected_rendered_snapshot_count: plan.selected_batch.expected_rendered_snapshot_count,
    selected_by_priority_score: plan.next_batch_selected_by_score,
    zero_delta_justified_by_full_green: plan.selected_batch_zero_delta_justified_by_full_green,
    reason: plan.selected_batch.reason,
    plan_status: plan.final_status,
    runtime_summary_path: null,
    fake_green_claimed: false,
    marketplace_touched: false,
    blockers,
  };

  if (options.writeRuntime === true) {
    const runtimeDir = path.join(process.cwd(), AUTONOMOUS_ESTIMATE_PROGRAM_RUNTIME_ROOT, timestampForPath());
    const runtimeSummaryPath = path.join(runtimeDir, "selected-batch.json");
    mkdirSync(runtimeDir, { recursive: true });
    result.runtime_summary_path = path.relative(process.cwd(), runtimeSummaryPath).replace(/\\/g, "/");
    writeFileSync(runtimeSummaryPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  return result;
}

function requireWriteFlag(): void {
  if (!process.argv.includes("--write")) {
    throw new Error("SELECT_NEXT_PROFESSIONAL_ESTIMATE_BATCH_REQUIRES_--write");
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/selectNextProfessionalEstimateBatch.ts")) {
  try {
    requireWriteFlag();
    const selection = selectNextProfessionalEstimateBatch({ writeFiles: true, writeRuntime: true });
    console.log(JSON.stringify(selection, null, 2));
    process.exitCode =
      selection.final_status === GREEN_AI_ESTIMATE_AUTONOMOUS_NEXT_BATCH_SELECTED_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
