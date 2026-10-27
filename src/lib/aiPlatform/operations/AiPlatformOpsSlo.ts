export const AI_PLATFORM_STAGING_OPS_SLO_VERSION = "ai-platform-staging-ops-slo-v1" as const;

export type AiPlatformOpsSloPolicy = {
  version: typeof AI_PLATFORM_STAGING_OPS_SLO_VERSION;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxErrorRate: number;
  maxMemoryBudgetViolations: number;
  alertRules: readonly string[];
};

export const AI_PLATFORM_STAGING_OPS_SLO: AiPlatformOpsSloPolicy = {
  version: AI_PLATFORM_STAGING_OPS_SLO_VERSION,
  p95LatencyMs: 12_000,
  p99LatencyMs: 20_000,
  maxErrorRate: 0.01,
  maxMemoryBudgetViolations: 0,
  alertRules: [
    "staging.ai_estimate.error_rate_gt_1pct",
    "staging.ai_estimate.p95_latency_gt_12s",
    "staging.ai_estimate.kill_switch_triggered",
    "staging.ai_estimate.cost_budget_warning",
  ],
};

export function validateAiPlatformOpsSloPolicy(policy = AI_PLATFORM_STAGING_OPS_SLO) {
  const blockers = [
    policy.p95LatencyMs > 0 ? "" : "p95_latency_budget_missing",
    policy.p99LatencyMs >= policy.p95LatencyMs ? "" : "p99_latency_less_than_p95",
    policy.maxErrorRate <= 0.01 ? "" : "error_rate_budget_too_loose",
    policy.maxMemoryBudgetViolations === 0 ? "" : "memory_budget_violations_allowed",
    policy.alertRules.length >= 4 ? "" : "alert_rules_incomplete",
  ].filter(Boolean);
  return {
    staging_latency_slo_enforced: blockers.length === 0,
    staging_alert_rules_created: policy.alertRules.length >= 4,
    staging_memory_budget_violations_count: policy.maxMemoryBudgetViolations,
    blocking_reasons: blockers,
  };
}
