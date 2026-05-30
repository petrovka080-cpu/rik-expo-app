import {
  AI_ESTIMATE_CANARY_DEFAULT_CONFIG,
  type AiEstimateCanaryConfig,
} from "./aiEstimateCanaryConfig";
import { validateAiEstimateCanaryPolicy } from "./validateAiEstimateCanaryPolicy";

export type AiEstimateInternalCanaryExecutionPolicyValidation = {
  valid: boolean;
  issues: string[];
  internal_canary_disabled_by_default: boolean;
  internal_staff_only: boolean;
  public_users_excluded: boolean;
  production_rollout_enabled: boolean;
  public_canary_enabled: boolean;
  max_canary_percent_lte_1: boolean;
  manual_opt_in_required: boolean;
  kill_switch_overrides_all: boolean;
};

export function validateInternalCanaryExecutionPolicy(
  config: AiEstimateCanaryConfig = AI_ESTIMATE_CANARY_DEFAULT_CONFIG,
): AiEstimateInternalCanaryExecutionPolicyValidation {
  const base = validateAiEstimateCanaryPolicy(config);
  const issues = [...base.issues];
  const internal_canary_disabled_by_default =
    AI_ESTIMATE_CANARY_DEFAULT_CONFIG.internal_canary_enabled === false;
  const public_users_excluded =
    config.internal_staff_only && config.eligible_cohort === "internal_staff_only";

  if (!internal_canary_disabled_by_default) issues.push("INTERNAL_CANARY_ENABLED_BY_DEFAULT");
  if (!public_users_excluded) issues.push("PUBLIC_USERS_INCLUDED");

  return {
    valid: issues.length === 0,
    issues,
    internal_canary_disabled_by_default,
    internal_staff_only: config.internal_staff_only,
    public_users_excluded,
    production_rollout_enabled: config.production_rollout_enabled,
    public_canary_enabled: config.public_canary_enabled,
    max_canary_percent_lte_1: config.max_canary_percent <= 1,
    manual_opt_in_required: config.manual_opt_in_required,
    kill_switch_overrides_all: true,
  };
}
