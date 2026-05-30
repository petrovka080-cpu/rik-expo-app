import type { AiEstimateKillSwitchPolicy } from "../killSwitch/aiEstimateKillSwitch";
import {
  AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY,
  isAiEstimateKillSwitchBlocking,
} from "../killSwitch/aiEstimateKillSwitch";
import {
  AI_ESTIMATE_CANARY_DEFAULT_CONFIG,
  buildAiEstimateCanaryConfig,
  type AiEstimateCanaryConfig,
  type AiEstimateCanaryStatus,
} from "./aiEstimateCanaryConfig";

export type AiEstimateInternalCanaryEligibilityInput = {
  config?: AiEstimateCanaryConfig;
  killSwitch?: AiEstimateKillSwitchPolicy;
  internalStaffFlag: boolean;
  manualOptIn: boolean;
  percentBucket: number;
};

export type AiEstimateInternalCanaryEligibility = {
  eligible: boolean;
  status: AiEstimateCanaryStatus;
  reason: string;
  internal_staff_only: boolean;
  public_users_excluded: boolean;
  kill_switch_overrides_all: boolean;
};

export function resolveInternalCanaryEligibility(
  input: AiEstimateInternalCanaryEligibilityInput,
): AiEstimateInternalCanaryEligibility {
  const config = input.config ?? AI_ESTIMATE_CANARY_DEFAULT_CONFIG;
  const killSwitch = input.killSwitch ?? AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY;
  const killSwitchBlocking = isAiEstimateKillSwitchBlocking(killSwitch);

  if (killSwitchBlocking) {
    return {
      eligible: false,
      status: "blocked_by_kill_switch",
      reason: "Internal canary is blocked by the AI estimate kill switch.",
      internal_staff_only: config.internal_staff_only,
      public_users_excluded: true,
      kill_switch_overrides_all: true,
    };
  }

  if (!config.internal_canary_enabled) {
    return {
      eligible: false,
      status: "disabled",
      reason: "Internal canary execution is disabled by default.",
      internal_staff_only: config.internal_staff_only,
      public_users_excluded: true,
      kill_switch_overrides_all: true,
    };
  }

  if (!input.internalStaffFlag || !config.internal_staff_only) {
    return {
      eligible: false,
      status: "blocked_external_user",
      reason: "Internal canary execution excludes public users.",
      internal_staff_only: config.internal_staff_only,
      public_users_excluded: true,
      kill_switch_overrides_all: true,
    };
  }

  if (config.manual_opt_in_required && !input.manualOptIn) {
    return {
      eligible: false,
      status: "blocked_missing_manual_opt_in",
      reason: "Internal canary execution requires manual staff opt-in.",
      internal_staff_only: config.internal_staff_only,
      public_users_excluded: true,
      kill_switch_overrides_all: true,
    };
  }

  if (input.percentBucket < 0 || input.percentBucket >= config.max_canary_percent) {
    return {
      eligible: false,
      status: "blocked_percent_bucket",
      reason: "Internal canary bucket is outside the configured one-percent cap.",
      internal_staff_only: config.internal_staff_only,
      public_users_excluded: true,
      kill_switch_overrides_all: true,
    };
  }

  return {
    eligible: true,
    status: "eligible_internal_opt_in",
    reason: "Internal staff opt-in is eligible for internal canary execution.",
    internal_staff_only: true,
    public_users_excluded: true,
    kill_switch_overrides_all: true,
  };
}

export function buildInternalCanaryEnabledConfig(
  overrides: Partial<AiEstimateCanaryConfig> = {},
): AiEstimateCanaryConfig {
  return buildAiEstimateCanaryConfig({
    ...overrides,
    internal_canary_enabled: true,
  });
}
