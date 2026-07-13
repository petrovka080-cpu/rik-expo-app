import path from "node:path";

import { createAiRuntimeKernel } from "../../src/lib/aiPlatform/kernel/createAiRuntimeKernel";
import { AI_PLATFORM_KERNEL_ROOT, currentGitState, timestampForPath, writeJson } from "./aiPlatformKernelAuditUtils";

export const GREEN_AI_PLATFORM_KERNEL_FITNESS_MATRIX = "GREEN_AI_PLATFORM_KERNEL_FITNESS_MATRIX" as const;
export const STOP_AI_PLATFORM_KERNEL_FITNESS_MATRIX_FAILED = "STOP_AI_PLATFORM_KERNEL_FITNESS_MATRIX_FAILED" as const;

const groups = [
  { key: "estimate", surface: "estimate", count: 50, mode: "draft_only" },
  { key: "chat", surface: "chat", count: 30, mode: "safe_read" },
  { key: "director", surface: "director", count: 20, mode: "safe_read" },
  { key: "foreman", surface: "foreman", count: 20, mode: "draft_only" },
  { key: "documents", surface: "document", count: 20, mode: "draft_only" },
  { key: "reports", surface: "report", count: 20, mode: "draft_only" },
  { key: "procurement", surface: "procurement", count: 20, mode: "draft_only" },
  { key: "forbidden_mutation", surface: "office", count: 20, mode: "forbidden" },
  { key: "approval_required", surface: "procurement", count: 20, mode: "approval_required" },
  { key: "redaction", surface: "chat", count: 20, mode: "safe_read", redaction: true },
] as const;

export async function runAiPlatformKernelFitnessMatrix(input: { writeSummary?: boolean } = {}) {
  const git = currentGitState();
  const kernel = createAiRuntimeKernel();
  const groupResults: Record<string, { passed: number; total: number }> = {};
  for (const group of groups) {
    let passed = 0;
    for (let index = 0; index < group.count; index += 1) {
      const result = await kernel.run({
        flowId: `${group.key}-${index}`,
        role: group.surface === "estimate" ? "consumer" : "director",
        surface: group.surface,
        intent: `${group.key}-intent-${index}`,
        userText: "redaction" in group && group.redaction
          ? `email test${index}@example.com phone +996 555 111 22${index % 10}`
          : `input ${index}`,
        mode: group.mode,
        sourceSha: git.source_sha,
        runtimeVersion: "ai-platform-kernel-v1",
      });
      const ok =
        Boolean(result.diagnostics?.ledgerRecordId) &&
        result.diagnostics?.redactionPassed === true &&
        (group.mode === "forbidden"
          ? result.status === "forbidden"
          : group.mode === "approval_required"
            ? result.status === "needs_approval"
            : result.status === "completed");
      if (ok) passed += 1;
    }
    groupResults[group.key] = { passed, total: group.count };
  }
  const allPassed = Object.values(groupResults).every((item) => item.passed === item.total);
  const ratio = (key: string) => `${groupResults[key].passed}/${groupResults[key].total}`;
  const summary = {
    final_status: allPassed ? GREEN_AI_PLATFORM_KERNEL_FITNESS_MATRIX : STOP_AI_PLATFORM_KERNEL_FITNESS_MATRIX_FAILED,
    ...git,
    ai_platform_fitness_matrix_created: true,
    estimate_cases_passed: ratio("estimate"),
    chat_cases_passed: ratio("chat"),
    director_cases_passed: ratio("director"),
    foreman_cases_passed: ratio("foreman"),
    documents_cases_passed: ratio("documents"),
    reports_cases_passed: ratio("reports"),
    procurement_cases_passed: ratio("procurement"),
    forbidden_mutation_cases_passed: ratio("forbidden_mutation"),
    approval_required_cases_passed: ratio("approval_required"),
    redaction_cases_passed: ratio("redaction"),
    group_results: groupResults,
    blockers: allPassed ? [] : ["ai_platform_fitness_matrix_failed"],
  };
  const summaryPath = path.join(AI_PLATFORM_KERNEL_ROOT, "fitness-matrix", timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  void runAiPlatformKernelFitnessMatrix({ writeSummary: true }).then((result) => {
    console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
    if (result.summary.final_status !== GREEN_AI_PLATFORM_KERNEL_FITNESS_MATRIX) process.exitCode = 1;
  });
}
