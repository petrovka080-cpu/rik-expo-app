export type AiEvalCostBudget = {
  estimate_eval_p95_ms: number;
  chat_eval_p95_ms: number;
  tool_policy_eval_p95_ms: number;
  redaction_eval_p95_ms: number;
  golden_suite_p95_case_ms: number;
  cost_budget_per_1000_cases_recorded: true;
  provider_token_usage_recorded: true;
};

export const DEFAULT_AI_EVAL_COST_BUDGET: AiEvalCostBudget = {
  estimate_eval_p95_ms: 1500,
  chat_eval_p95_ms: 1200,
  tool_policy_eval_p95_ms: 300,
  redaction_eval_p95_ms: 200,
  golden_suite_p95_case_ms: 2000,
  cost_budget_per_1000_cases_recorded: true,
  provider_token_usage_recorded: true,
};
