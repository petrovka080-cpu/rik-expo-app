import type { AiEstimateKillSwitchPolicy } from "../killSwitch/aiEstimateKillSwitch";
import {
  AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY,
  isAiEstimateKillSwitchBlocking,
} from "../killSwitch/aiEstimateKillSwitch";
import {
  AI_ESTIMATE_CANARY_DEFAULT_CONFIG,
  type AiEstimateCanaryConfig,
  type AiEstimateCanaryStatus,
} from "./aiEstimateCanaryConfig";

export type AiEstimateCanaryEligibilityInput = {
  config?: AiEstimateCanaryConfig;
  killSwitch?: AiEstimateKillSwitchPolicy;
  isInternalStaff: boolean;
  manualOptIn: boolean;
  percentBucket: number;
};

export type AiEstimateCanaryEligibility = {
  eligible: boolean;
  status: AiEstimateCanaryStatus;
  reason: string;
};

export function resolveAiEstimateCanaryEligibility(
  input: AiEstimateCanaryEligibilityInput,
): AiEstimateCanaryEligibility {
  const config = input.config ?? AI_ESTIMATE_CANARY_DEFAULT_CONFIG;
  const killSwitch = input.killSwitch ?? AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY;

  if (isAiEstimateKillSwitchBlocking(killSwitch)) {
    return {
      eligible: false,
      status: "blocked_by_kill_switch",
      reason: "AI estimate kill switch overrides all canary eligibility.",
    };
  }

  if (!config.internal_canary_enabled) {
    return {
      eligible: false,
      status: "disabled",
      reason: "Internal canary is disabled by default.",
    };
  }

  if (!input.isInternalStaff || !config.internal_staff_only) {
    return {
      eligible: false,
      status: "blocked_external_user",
      reason: "AI estimate canary is restricted to internal staff.",
    };
  }

  if (config.manual_opt_in_required && !input.manualOptIn) {
    return {
      eligible: false,
      status: "blocked_missing_manual_opt_in",
      reason: "Manual internal opt-in is required.",
    };
  }

  if (input.percentBucket < 0 || input.percentBucket >= config.max_canary_percent) {
    return {
      eligible: false,
      status: "blocked_percent_bucket",
      reason: "User bucket is outside the canary percentage.",
    };
  }

  return {
    eligible: true,
    status: "eligible_internal_opt_in",
    reason: "Internal staff manual opt-in is inside the canary percentage.",
  };
}
