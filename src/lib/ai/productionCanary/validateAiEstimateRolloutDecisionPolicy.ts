import {
  type AiEstimateCanaryEvaluationPolicy,
} from "./canaryEvaluationTypes";

export type AiEstimateCanaryEvaluationPolicyValidation = {
  valid: boolean;
  issues: string[];
  production_rollout_enabled: boolean;
  public_canary_enabled: boolean;
  public_rollout_authorized: boolean;
  controlled_public_canary_ready: boolean;
  manual_approval_required: boolean;
  public_staff_seed_required: boolean;
  external_users_allowed_by_default: boolean;
  max_public_canary_percent_lte_1: boolean;
  kill_switch_required: boolean;
  rollback_required: boolean;
  observability_required: boolean;
  feedback_required: boolean;
};

export const AI_ESTIMATE_CANARY_EVALUATION_DEFAULT_POLICY: AiEstimateCanaryEvaluationPolicy =
  Object.freeze({
    production_rollout_enabled: false,
    public_canary_enabled: false,
    public_rollout_authorized: false,
    controlled_public_canary_ready: true,
    manual_approval_required: true,
    public_staff_seed_required: true,
    external_users_allowed_by_default: false,
    max_public_canary_percent: 1,
    kill_switch_required: true,
    rollback_required: true,
    observability_required: true,
    feedback_required: true,
  });

export function buildAiEstimateCanaryEvaluationPolicy(
  overrides: Partial<AiEstimateCanaryEvaluationPolicy> = {},
): AiEstimateCanaryEvaluationPolicy {
  return {
    ...AI_ESTIMATE_CANARY_EVALUATION_DEFAULT_POLICY,
    ...overrides,
  };
}

export function validateAiEstimateRolloutDecisionPolicy(
  policy: AiEstimateCanaryEvaluationPolicy = AI_ESTIMATE_CANARY_EVALUATION_DEFAULT_POLICY,
): AiEstimateCanaryEvaluationPolicyValidation {
  const issues: string[] = [];
  const max_public_canary_percent_lte_1 = policy.max_public_canary_percent <= 1;

  if (policy.production_rollout_enabled) issues.push("PRODUCTION_ROLLOUT_ENABLED");
  if (policy.public_canary_enabled) issues.push("PUBLIC_CANARY_ENABLED_BY_DEFAULT");
  if (policy.public_rollout_authorized) issues.push("PUBLIC_ROLLOUT_AUTHORIZED_TOO_EARLY");
  if (!policy.controlled_public_canary_ready) issues.push("CONTROLLED_PUBLIC_CANARY_NOT_READY");
  if (!policy.manual_approval_required) issues.push("MANUAL_APPROVAL_NOT_REQUIRED");
  if (!policy.public_staff_seed_required) issues.push("PUBLIC_STAFF_SEED_NOT_REQUIRED");
  if (policy.external_users_allowed_by_default) issues.push("EXTERNAL_USERS_ALLOWED_BY_DEFAULT");
  if (!max_public_canary_percent_lte_1) issues.push("PUBLIC_CANARY_PERCENT_GT_1");
  if (!policy.kill_switch_required) issues.push("KILL_SWITCH_NOT_REQUIRED");
  if (!policy.rollback_required) issues.push("ROLLBACK_NOT_REQUIRED");
  if (!policy.observability_required) issues.push("OBSERVABILITY_NOT_REQUIRED");
  if (!policy.feedback_required) issues.push("FEEDBACK_NOT_REQUIRED");

  return {
    valid: issues.length === 0,
    issues,
    production_rollout_enabled: policy.production_rollout_enabled,
    public_canary_enabled: policy.public_canary_enabled,
    public_rollout_authorized: policy.public_rollout_authorized,
    controlled_public_canary_ready: policy.controlled_public_canary_ready,
    manual_approval_required: policy.manual_approval_required,
    public_staff_seed_required: policy.public_staff_seed_required,
    external_users_allowed_by_default: policy.external_users_allowed_by_default,
    max_public_canary_percent_lte_1,
    kill_switch_required: policy.kill_switch_required,
    rollback_required: policy.rollback_required,
    observability_required: policy.observability_required,
    feedback_required: policy.feedback_required,
  };
}
