import { auditStagingAiRateLimits } from "../../scripts/estimate/auditStagingAiRateLimits";

describe("staging AI rate limits", () => {
  it("enforces per user per role budget and forbidden actions with RU message", () => {
    const { summary } = auditStagingAiRateLimits({ writeSummary: false });

    expect(summary.staging_rate_limit_policy_created).toBe(true);
    expect(summary.per_user_ai_run_limit_enforced).toBe(true);
    expect(summary.per_role_ai_run_limit_enforced).toBe(true);
    expect(summary.daily_cost_budget_enforced).toBe(true);
    expect(summary.large_prompt_budget_enforced).toBe(true);
    expect(summary.forbidden_action_blocked).toBe(true);
    expect(summary.rate_limit_user_message_ru).toBe(true);
  });
});
