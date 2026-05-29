import {
  AI_ESTIMATE_REQUIRED_STEP_BUDGETS,
} from "./aiEstimatePerformanceBudget";
import { collectAiEstimateLatencyMetrics } from "./collectAiEstimateLatencyMetrics";
import type {
  AiEstimatePerformanceBudgetEvaluation,
  AiEstimatePerformanceMetric,
} from "./aiEstimatePerformanceTypes";

export function validateAiEstimatePerformanceBudget(
  metrics: readonly AiEstimatePerformanceMetric[],
): AiEstimatePerformanceBudgetEvaluation {
  const summary = collectAiEstimateLatencyMetrics(metrics);
  const failures: string[] = [];
  const results = AI_ESTIMATE_REQUIRED_STEP_BUDGETS.map((budget) => {
    const item = summary[budget.step];
    if (!item) {
      failures.push(`measurement_missing:${budget.step}`);
      return {
        step: budget.step,
        samples: 0,
        p95Ms: 0,
        maxMs: 0,
        budgetMs: budget.p95BudgetMs,
        passed: false,
      };
    }
    const passed = item.p95Ms <= budget.p95BudgetMs;
    if (!passed) failures.push(`p95_budget_exceeded:${budget.step}:${item.p95Ms}>${budget.p95BudgetMs}`);
    return {
      step: budget.step,
      samples: item.samples,
      p95Ms: item.p95Ms,
      maxMs: item.maxMs,
      budgetMs: budget.p95BudgetMs,
      passed,
    };
  });

  return {
    passed: failures.length === 0,
    failures,
    results,
  };
}
