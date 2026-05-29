import {
  AI_ESTIMATE_CANARY_DEFAULT_CONFIG,
  type AiEstimateCanaryConfig,
} from "./aiEstimateCanaryConfig";

export type AiEstimateCanaryPolicyValidation = {
  valid: boolean;
  issues: string[];
  production_rollout_enabled: boolean;
  public_canary_enabled: boolean;
  internal_canary_enabled: boolean;
  internal_canary_ready: boolean;
  internal_staff_only: boolean;
  max_canary_percent_lte_1: boolean;
  canary_disabled_by_default: boolean;
};

export function validateAiEstimateCanaryPolicy(
  config: AiEstimateCanaryConfig = AI_ESTIMATE_CANARY_DEFAULT_CONFIG,
): AiEstimateCanaryPolicyValidation {
  const issues: string[] = [];
  const max_canary_percent_lte_1 = config.max_canary_percent <= 1;
  const canary_disabled_by_default = AI_ESTIMATE_CANARY_DEFAULT_CONFIG.internal_canary_enabled === false &&
    AI_ESTIMATE_CANARY_DEFAULT_CONFIG.public_canary_enabled === false &&
    AI_ESTIMATE_CANARY_DEFAULT_CONFIG.production_rollout_enabled === false;

  if (config.production_rollout_enabled) issues.push("PRODUCTION_ROLLOUT_ENABLED");
  if (config.public_canary_enabled) issues.push("PUBLIC_CANARY_ENABLED");
  if (!config.internal_staff_only || config.eligible_cohort !== "internal_staff_only") issues.push("EXTERNAL_USERS_INCLUDED");
  if (!config.manual_opt_in_required) issues.push("MANUAL_OPT_IN_NOT_REQUIRED");
  if (!max_canary_percent_lte_1) issues.push("CANARY_PERCENT_GT_1");
  if (!canary_disabled_by_default) issues.push("CANARY_ENABLED_BY_DEFAULT");

  return {
    valid: issues.length === 0,
    issues,
    production_rollout_enabled: config.production_rollout_enabled,
    public_canary_enabled: config.public_canary_enabled,
    internal_canary_enabled: config.internal_canary_enabled,
    internal_canary_ready: issues.length === 0,
    internal_staff_only: config.internal_staff_only,
    max_canary_percent_lte_1,
    canary_disabled_by_default,
  };
}
