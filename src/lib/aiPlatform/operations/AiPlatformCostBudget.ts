export const AI_PLATFORM_STAGING_COST_BUDGET_VERSION = "ai-platform-staging-cost-budget-v1" as const;

export type AiPlatformCostBudgetPolicy = {
  version: typeof AI_PLATFORM_STAGING_COST_BUDGET_VERSION;
  dailyBudgetUsd: number;
  perRunBudgetUsd: number;
  maxInputCharsPerRun: number;
  maxToolExecutionsPerRun: number;
  tokenLoggingAllowed: false;
};

export const AI_PLATFORM_STAGING_COST_BUDGET: AiPlatformCostBudgetPolicy = {
  version: AI_PLATFORM_STAGING_COST_BUDGET_VERSION,
  dailyBudgetUsd: 25,
  perRunBudgetUsd: 0.2,
  maxInputCharsPerRun: 24_000,
  maxToolExecutionsPerRun: 8,
  tokenLoggingAllowed: false,
};

export function validateAiPlatformCostBudget(policy = AI_PLATFORM_STAGING_COST_BUDGET) {
  const blockers = [
    policy.dailyBudgetUsd > 0 ? "" : "daily_cost_budget_missing",
    policy.perRunBudgetUsd > 0 && policy.perRunBudgetUsd <= 0.5 ? "" : "per_run_budget_missing_or_too_high",
    policy.maxInputCharsPerRun <= 24_000 ? "" : "large_prompt_budget_too_high",
    policy.maxToolExecutionsPerRun <= 8 ? "" : "tool_execution_budget_too_high",
    policy.tokenLoggingAllowed === false ? "" : "tokens_logging_allowed",
  ].filter(Boolean);
  return {
    staging_cost_budget_enforced: blockers.length === 0,
    daily_cost_budget_enforced: policy.dailyBudgetUsd > 0,
    large_prompt_budget_enforced: policy.maxInputCharsPerRun <= 24_000,
    tool_execution_budget_enforced: policy.maxToolExecutionsPerRun <= 8,
    tokens_not_logged: policy.tokenLoggingAllowed === false,
    blocking_reasons: blockers,
  };
}
