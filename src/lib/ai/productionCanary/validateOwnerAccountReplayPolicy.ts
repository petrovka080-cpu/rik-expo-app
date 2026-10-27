import type { AiEstimateOwnerAccountReplayPolicy } from "./ownerAccountReplayTypes";

export type AiEstimateOwnerAccountReplayPolicyValidation = {
  valid: boolean;
  issues: string[];
  owner_account_replay_enabled: boolean;
  owner_account_only: boolean;
  public_beta_enabled: boolean;
  production_rollout_enabled: boolean;
  external_users_included: boolean;
  regulated_high_risk_public_beta_enabled: boolean;
  kill_switch_required: boolean;
  rollback_required: boolean;
  telemetry_required: boolean;
  feedback_required: boolean;
};

export const AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_DEFAULT_POLICY: AiEstimateOwnerAccountReplayPolicy =
  Object.freeze({
    owner_account_replay_enabled: true,
    owner_account_only: true,
    public_beta_enabled: false,
    production_rollout_enabled: false,
    external_users_included: false,
    regulated_high_risk_public_beta_enabled: false,
    kill_switch_required: true,
    rollback_required: true,
    telemetry_required: true,
    feedback_required: true,
  });

export function buildAiEstimateOwnerAccountReplayPolicy(
  overrides: Partial<AiEstimateOwnerAccountReplayPolicy> = {},
): AiEstimateOwnerAccountReplayPolicy {
  return {
    ...AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_DEFAULT_POLICY,
    ...overrides,
  };
}

export function validateOwnerAccountReplayPolicy(
  policy: AiEstimateOwnerAccountReplayPolicy = AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_DEFAULT_POLICY,
): AiEstimateOwnerAccountReplayPolicyValidation {
  const issues: string[] = [];
  if (!policy.owner_account_replay_enabled) issues.push("OWNER_ACCOUNT_REPLAY_DISABLED");
  if (!policy.owner_account_only) issues.push("OWNER_ACCOUNT_ONLY_NOT_ENFORCED");
  if (policy.public_beta_enabled) issues.push("PUBLIC_BETA_ENABLED");
  if (policy.production_rollout_enabled) issues.push("PRODUCTION_ROLLOUT_ENABLED");
  if (policy.external_users_included) issues.push("EXTERNAL_USERS_INCLUDED_WITHOUT_PUBLIC_BETA_IDS");
  if (policy.regulated_high_risk_public_beta_enabled) issues.push("REGULATED_HIGH_RISK_PUBLIC_BETA_ENABLED");
  if (!policy.kill_switch_required) issues.push("KILL_SWITCH_NOT_REQUIRED");
  if (!policy.rollback_required) issues.push("ROLLBACK_NOT_REQUIRED");
  if (!policy.telemetry_required) issues.push("TELEMETRY_NOT_REQUIRED");
  if (!policy.feedback_required) issues.push("FEEDBACK_NOT_REQUIRED");

  return {
    valid: issues.length === 0,
    issues,
    owner_account_replay_enabled: policy.owner_account_replay_enabled,
    owner_account_only: policy.owner_account_only,
    public_beta_enabled: policy.public_beta_enabled,
    production_rollout_enabled: policy.production_rollout_enabled,
    external_users_included: policy.external_users_included,
    regulated_high_risk_public_beta_enabled: policy.regulated_high_risk_public_beta_enabled,
    kill_switch_required: policy.kill_switch_required,
    rollback_required: policy.rollback_required,
    telemetry_required: policy.telemetry_required,
    feedback_required: policy.feedback_required,
  };
}

