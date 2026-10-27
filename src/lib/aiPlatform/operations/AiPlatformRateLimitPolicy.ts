export const AI_PLATFORM_STAGING_RATE_LIMIT_POLICY_VERSION =
  "ai-platform-staging-rate-limit-v1" as const;

export type AiPlatformRateLimitPolicy = {
  version: typeof AI_PLATFORM_STAGING_RATE_LIMIT_POLICY_VERSION;
  perUserDailyRuns: number;
  perRoleDailyRuns: Record<"consumer" | "foreman" | "director" | "buyer", number>;
  perSessionSoftLimit: number;
  dailyCostBudgetUsd: number;
  maxPromptChars: number;
  maxToolExecutions: number;
  forbiddenActions: readonly string[];
  userMessageRu: string;
};

export const AI_PLATFORM_STAGING_RATE_LIMIT_POLICY: AiPlatformRateLimitPolicy = {
  version: AI_PLATFORM_STAGING_RATE_LIMIT_POLICY_VERSION,
  perUserDailyRuns: 30,
  perRoleDailyRuns: {
    consumer: 20,
    foreman: 40,
    director: 25,
    buyer: 25,
  },
  perSessionSoftLimit: 10,
  dailyCostBudgetUsd: 25,
  maxPromptChars: 24_000,
  maxToolExecutions: 8,
  forbiddenActions: [
    "owner_approved=true",
    "production_release_started=true",
    "contract_total_claimed=true",
    "production_db_write",
    "warehouse_mutation",
    "payment_mutation",
  ],
  userMessageRu: "Лимит AI-сметы на сегодня исчерпан. Попробуйте позже или обратитесь в поддержку.",
};

export function validateAiPlatformRateLimitPolicy(policy = AI_PLATFORM_STAGING_RATE_LIMIT_POLICY) {
  const blockers = [
    policy.perUserDailyRuns > 0 ? "" : "per_user_limit_missing",
    Object.values(policy.perRoleDailyRuns).every((limit) => limit > 0) ? "" : "per_role_limit_missing",
    policy.perSessionSoftLimit > 0 ? "" : "per_session_soft_limit_missing",
    policy.dailyCostBudgetUsd > 0 ? "" : "daily_cost_budget_missing",
    policy.maxPromptChars <= 24_000 ? "" : "large_prompt_budget_missing",
    policy.maxToolExecutions <= 8 ? "" : "tool_execution_budget_missing",
    policy.forbiddenActions.includes("production_db_write") ? "" : "forbidden_action_block_missing",
    /[А-Яа-яЁё]/.test(policy.userMessageRu) ? "" : "rate_limit_user_message_not_ru",
  ].filter(Boolean);
  return {
    staging_rate_limit_policy_created: true,
    per_user_ai_run_limit_enforced: policy.perUserDailyRuns > 0,
    per_role_ai_run_limit_enforced: Object.values(policy.perRoleDailyRuns).every((limit) => limit > 0),
    daily_cost_budget_enforced: policy.dailyCostBudgetUsd > 0,
    large_prompt_budget_enforced: policy.maxPromptChars <= 24_000,
    forbidden_action_blocked: policy.forbiddenActions.includes("production_db_write"),
    rate_limit_user_message_ru: /[А-Яа-яЁё]/.test(policy.userMessageRu),
    blocking_reasons: blockers,
  };
}
