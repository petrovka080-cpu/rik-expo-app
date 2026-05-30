import {
  AI_ESTIMATE_LIMITED_PUBLIC_BETA_DEFAULT_POLICY,
  type AiEstimateLimitedPublicBetaPolicy,
} from "./limitedPublicBetaPolicy";

export type AiEstimateLimitedPublicBetaPolicyValidation = {
  valid: boolean;
  issues: string[];
  public_beta_enabled: boolean;
  limited_public_beta_ready: boolean;
  max_public_beta_percent_lte_0_5: boolean;
  country_city_allowlist_required: boolean;
  kill_switch_required: boolean;
  rollback_required: boolean;
  manual_monitoring_required: boolean;
  daily_evaluation_required: boolean;
  regulated_high_risk_public_beta_enabled: boolean;
};

export function validateLimitedPublicBetaPolicy(
  policy: AiEstimateLimitedPublicBetaPolicy = AI_ESTIMATE_LIMITED_PUBLIC_BETA_DEFAULT_POLICY,
): AiEstimateLimitedPublicBetaPolicyValidation {
  const issues: string[] = [];
  const max_public_beta_percent_lte_0_5 = policy.max_public_beta_percent <= 0.5;

  if (policy.public_beta_enabled) issues.push("PUBLIC_BETA_ENABLED_DURING_DECISION_WAVE");
  if (!max_public_beta_percent_lte_0_5) issues.push("PUBLIC_BETA_PERCENT_GT_0_5");
  if (!policy.country_city_allowlist_required) issues.push("COUNTRY_CITY_ALLOWLIST_NOT_REQUIRED");
  if (!policy.kill_switch_required) issues.push("KILL_SWITCH_NOT_REQUIRED");
  if (!policy.rollback_required) issues.push("ROLLBACK_NOT_REQUIRED");
  if (!policy.manual_monitoring_required) issues.push("MANUAL_MONITORING_NOT_REQUIRED");
  if (!policy.daily_evaluation_required) issues.push("DAILY_EVALUATION_NOT_REQUIRED");
  if (policy.regulated_high_risk_public_beta_enabled) issues.push("REGULATED_HIGH_RISK_PUBLIC_BETA_ENABLED");

  return {
    valid: issues.length === 0,
    issues,
    public_beta_enabled: policy.public_beta_enabled,
    limited_public_beta_ready: issues.length === 0,
    max_public_beta_percent_lte_0_5,
    country_city_allowlist_required: policy.country_city_allowlist_required,
    kill_switch_required: policy.kill_switch_required,
    rollback_required: policy.rollback_required,
    manual_monitoring_required: policy.manual_monitoring_required,
    daily_evaluation_required: policy.daily_evaluation_required,
    regulated_high_risk_public_beta_enabled: policy.regulated_high_risk_public_beta_enabled,
  };
}
