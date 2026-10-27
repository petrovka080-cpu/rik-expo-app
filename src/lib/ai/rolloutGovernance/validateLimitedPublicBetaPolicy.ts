import {
  AI_ESTIMATE_LIMITED_PUBLIC_BETA_DEFAULT_POLICY,
  type AiEstimateLimitedPublicBetaPolicy,
} from "./limitedPublicBetaPolicy";
import {
  AI_ESTIMATE_LIMITED_PUBLIC_BETA_COUNTRY_CITY_ALLOWLIST,
  AI_ESTIMATE_LIMITED_PUBLIC_BETA_ENTRYPOINTS,
} from "./limitedPublicBetaExecutionTypes";

export type AiEstimateLimitedPublicBetaPolicyValidation = {
  valid: boolean;
  issues: string[];
  external_beta_flag_approval: boolean;
  full_public_rollout_enabled: boolean;
  public_beta_enabled: boolean;
  limited_public_beta_enabled_by_default: boolean;
  limited_public_beta_ready: boolean;
  manual_enable_required: boolean;
  initial_public_beta_percent_lte_0_1: boolean;
  max_public_beta_percent_lte_0_5: boolean;
  user_allowlist_required: boolean;
  allowlist_ids_present: boolean;
  public_users_without_allowlist_excluded: boolean;
  country_city_allowlist_required: boolean;
  country_city_allowlist_valid: boolean;
  entrypoints_valid: boolean;
  kill_switch_required: boolean;
  rollback_required: boolean;
  manual_monitoring_required: boolean;
  daily_evaluation_required: boolean;
  daily_error_budget_required: boolean;
  regulated_high_risk_public_beta_enabled: boolean;
  regulated_high_risk_disabled_by_default: boolean;
  kill_switch_overrides_all: boolean;
  rollback_plan_required: boolean;
  monitoring_owner_present: boolean;
  rollback_owner_present: boolean;
};

export type AiEstimateLimitedPublicBetaPolicyValidationOptions = {
  requireAllowlistIds?: boolean;
};

export function validateLimitedPublicBetaPolicy(
  policy: AiEstimateLimitedPublicBetaPolicy = AI_ESTIMATE_LIMITED_PUBLIC_BETA_DEFAULT_POLICY,
  options: AiEstimateLimitedPublicBetaPolicyValidationOptions = {},
): AiEstimateLimitedPublicBetaPolicyValidation {
  const issues: string[] = [];
  const initial_public_beta_percent_lte_0_1 = policy.initial_public_beta_percent <= 0.1;
  const max_public_beta_percent_lte_0_5 = policy.max_public_beta_percent <= 0.5;
  const allowlist_ids_present = policy.user_allowlist_ids.length > 0;
  const expectedCities = new Set(AI_ESTIMATE_LIMITED_PUBLIC_BETA_COUNTRY_CITY_ALLOWLIST.map((item) => `${item.country}:${item.city}`));
  const actualCities = new Set(policy.country_city_allowlist.map((item) => `${item.country}:${item.city}`));
  const country_city_allowlist_valid =
    policy.country_city_allowlist_required &&
    expectedCities.size === actualCities.size &&
    [...expectedCities].every((item) => actualCities.has(item));
  const entrypoints_valid =
    policy.entrypoints_enabled.length === AI_ESTIMATE_LIMITED_PUBLIC_BETA_ENTRYPOINTS.length &&
    AI_ESTIMATE_LIMITED_PUBLIC_BETA_ENTRYPOINTS.every((item) => policy.entrypoints_enabled.includes(item));
  const monitoring_owner_present = policy.monitoring_owner.trim().length > 0;
  const rollback_owner_present = policy.rollback_owner.trim().length > 0;

  if (!policy.external_beta_flag_approval) issues.push("EXTERNAL_BETA_FLAG_APPROVAL_MISSING");
  if (policy.full_public_rollout_enabled) issues.push("FULL_PUBLIC_ROLLOUT_ENABLED");
  if (policy.public_beta_enabled) issues.push("PUBLIC_BETA_ENABLED_DURING_DECISION_WAVE");
  if (policy.limited_public_beta_enabled_by_default) issues.push("LIMITED_PUBLIC_BETA_ENABLED_BY_DEFAULT");
  if (!policy.manual_enable_required) issues.push("MANUAL_ENABLE_NOT_REQUIRED");
  if (!initial_public_beta_percent_lte_0_1) issues.push("INITIAL_PUBLIC_BETA_PERCENT_GT_0_1");
  if (!max_public_beta_percent_lte_0_5) issues.push("PUBLIC_BETA_PERCENT_GT_0_5");
  if (policy.eligible_users !== "explicit_allowlist_only") issues.push("ELIGIBLE_USERS_NOT_EXPLICIT_ALLOWLIST_ONLY");
  if (!policy.user_allowlist_required) issues.push("USER_ALLOWLIST_NOT_REQUIRED");
  if (options.requireAllowlistIds && !allowlist_ids_present) issues.push("USER_ALLOWLIST_IDS_MISSING");
  if (!policy.public_users_without_allowlist_excluded) issues.push("PUBLIC_USERS_WITHOUT_ALLOWLIST_NOT_EXCLUDED");
  if (!policy.country_city_allowlist_required) issues.push("COUNTRY_CITY_ALLOWLIST_NOT_REQUIRED");
  if (!country_city_allowlist_valid) issues.push("COUNTRY_CITY_ALLOWLIST_INVALID");
  if (!entrypoints_valid) issues.push("ENTRYPOINTS_INVALID");
  if (!policy.kill_switch_required) issues.push("KILL_SWITCH_NOT_REQUIRED");
  if (!policy.rollback_required) issues.push("ROLLBACK_NOT_REQUIRED");
  if (!policy.manual_monitoring_required) issues.push("MANUAL_MONITORING_NOT_REQUIRED");
  if (!policy.daily_evaluation_required) issues.push("DAILY_EVALUATION_NOT_REQUIRED");
  if (!policy.daily_error_budget_required) issues.push("DAILY_ERROR_BUDGET_NOT_REQUIRED");
  if (policy.regulated_high_risk_public_beta_enabled) issues.push("REGULATED_HIGH_RISK_PUBLIC_BETA_ENABLED");
  if (!monitoring_owner_present) issues.push("MONITORING_OWNER_MISSING");
  if (!rollback_owner_present) issues.push("ROLLBACK_OWNER_MISSING");

  return {
    valid: issues.length === 0,
    issues,
    external_beta_flag_approval: policy.external_beta_flag_approval,
    full_public_rollout_enabled: policy.full_public_rollout_enabled,
    public_beta_enabled: policy.public_beta_enabled,
    limited_public_beta_enabled_by_default: policy.limited_public_beta_enabled_by_default,
    limited_public_beta_ready: issues.length === 0,
    manual_enable_required: policy.manual_enable_required,
    initial_public_beta_percent_lte_0_1,
    max_public_beta_percent_lte_0_5,
    user_allowlist_required: policy.user_allowlist_required,
    allowlist_ids_present,
    public_users_without_allowlist_excluded: policy.public_users_without_allowlist_excluded,
    country_city_allowlist_required: policy.country_city_allowlist_required,
    country_city_allowlist_valid,
    entrypoints_valid,
    kill_switch_required: policy.kill_switch_required,
    rollback_required: policy.rollback_required,
    manual_monitoring_required: policy.manual_monitoring_required,
    daily_evaluation_required: policy.daily_evaluation_required,
    daily_error_budget_required: policy.daily_error_budget_required,
    regulated_high_risk_public_beta_enabled: policy.regulated_high_risk_public_beta_enabled,
    regulated_high_risk_disabled_by_default: !policy.regulated_high_risk_public_beta_enabled,
    kill_switch_overrides_all: policy.kill_switch_required,
    rollback_plan_required: policy.rollback_required,
    monitoring_owner_present,
    rollback_owner_present,
  };
}
