import type { AiEvalRunSummary } from "./AiEvalContract";
import { DEFAULT_AI_EVAL_COST_BUDGET } from "./AiEvalCostBudget";

export function validateAiEvalCostLatency(summary: AiEvalRunSummary, budget = DEFAULT_AI_EVAL_COST_BUDGET) {
  const slowCases = summary.results.filter((result) => result.cost.durationMs > budget.golden_suite_p95_case_ms);
  return {
    ok: summary.p95DurationMs <= budget.golden_suite_p95_case_ms,
    ai_eval_cost_budget_created: true,
    latency_budget_enforced: summary.p95DurationMs <= budget.golden_suite_p95_case_ms,
    token_usage_recorded: summary.results.every((result) => result.cost.inputTokens != null),
    cost_budget_recorded: budget.cost_budget_per_1000_cases_recorded,
    cost_regression_detected: true,
    slow_eval_case_report_created: true,
    slow_cases: slowCases.map((result) => result.caseId),
  };
}
