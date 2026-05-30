import type { AiEstimateLimitedPublicBetaPolicy } from "./limitedPublicBetaPolicy";
import { AI_ESTIMATE_LIMITED_PUBLIC_BETA_DEFAULT_POLICY } from "./limitedPublicBetaPolicy";
import type { AiEstimateLimitedPublicBetaEntrypoint } from "./limitedPublicBetaExecutionTypes";

export type AiEstimateLimitedPublicBetaEligibilityStatus =
  | "eligible_limited_public_beta"
  | "blocked_disabled_by_default"
  | "blocked_missing_manual_enable"
  | "blocked_allowlist_ids_missing"
  | "blocked_user_not_allowlisted"
  | "blocked_country_city"
  | "blocked_percent_bucket"
  | "blocked_regulated_high_risk"
  | "blocked_kill_switch"
  | "blocked_entrypoint";

export type AiEstimateLimitedPublicBetaEligibilityInput = {
  policy?: AiEstimateLimitedPublicBetaPolicy;
  userId?: string | null;
  country: string;
  city: string;
  entrypoint: AiEstimateLimitedPublicBetaEntrypoint;
  manualEnable: boolean;
  percentBucket: number;
  regulatedHighRisk: boolean;
  killSwitchActive?: boolean;
};

export type AiEstimateLimitedPublicBetaEligibility = {
  eligible: boolean;
  status: AiEstimateLimitedPublicBetaEligibilityStatus;
  reason: string;
  betaPercent: number;
  userAllowlisted: boolean;
  countryCityAllowed: boolean;
  publicRolloutEnabled: boolean;
};

export function resolveLimitedPublicBetaEligibility(
  input: AiEstimateLimitedPublicBetaEligibilityInput,
): AiEstimateLimitedPublicBetaEligibility {
  const policy = input.policy ?? AI_ESTIMATE_LIMITED_PUBLIC_BETA_DEFAULT_POLICY;
  const userAllowlisted = Boolean(input.userId && policy.user_allowlist_ids.includes(input.userId));
  const countryCityAllowed = policy.country_city_allowlist.some((item) =>
    item.country === input.country && item.city === input.city,
  );
  const betaPercent = Math.min(policy.initial_public_beta_percent, policy.max_public_beta_percent);

  if (input.killSwitchActive) {
    return {
      eligible: false,
      status: "blocked_kill_switch",
      reason: "LIMITED_PUBLIC_BETA_KILL_SWITCH_ACTIVE",
      betaPercent,
      userAllowlisted,
      countryCityAllowed,
      publicRolloutEnabled: policy.full_public_rollout_enabled,
    };
  }
  if (!policy.entrypoints_enabled.includes(input.entrypoint)) {
    return {
      eligible: false,
      status: "blocked_entrypoint",
      reason: "LIMITED_PUBLIC_BETA_ENTRYPOINT_NOT_ENABLED",
      betaPercent,
      userAllowlisted,
      countryCityAllowed,
      publicRolloutEnabled: policy.full_public_rollout_enabled,
    };
  }
  if (policy.full_public_rollout_enabled || policy.limited_public_beta_enabled_by_default || policy.public_beta_enabled) {
    return {
      eligible: false,
      status: "blocked_disabled_by_default",
      reason: "LIMITED_PUBLIC_BETA_MUST_NOT_BE_DEFAULT_PUBLIC_ROLLOUT",
      betaPercent,
      userAllowlisted,
      countryCityAllowed,
      publicRolloutEnabled: policy.full_public_rollout_enabled,
    };
  }
  if (!input.manualEnable) {
    return {
      eligible: false,
      status: "blocked_missing_manual_enable",
      reason: "LIMITED_PUBLIC_BETA_MANUAL_ENABLE_REQUIRED",
      betaPercent,
      userAllowlisted,
      countryCityAllowed,
      publicRolloutEnabled: policy.full_public_rollout_enabled,
    };
  }
  if (policy.user_allowlist_required && policy.user_allowlist_ids.length === 0) {
    return {
      eligible: false,
      status: "blocked_allowlist_ids_missing",
      reason: "BLOCKED_LIMITED_PUBLIC_BETA_ALLOWLIST_IDS_MISSING",
      betaPercent,
      userAllowlisted,
      countryCityAllowed,
      publicRolloutEnabled: policy.full_public_rollout_enabled,
    };
  }
  if (!userAllowlisted) {
    return {
      eligible: false,
      status: "blocked_user_not_allowlisted",
      reason: "LIMITED_PUBLIC_BETA_USER_NOT_ALLOWLISTED",
      betaPercent,
      userAllowlisted,
      countryCityAllowed,
      publicRolloutEnabled: policy.full_public_rollout_enabled,
    };
  }
  if (!countryCityAllowed) {
    return {
      eligible: false,
      status: "blocked_country_city",
      reason: "LIMITED_PUBLIC_BETA_COUNTRY_CITY_NOT_ALLOWLISTED",
      betaPercent,
      userAllowlisted,
      countryCityAllowed,
      publicRolloutEnabled: policy.full_public_rollout_enabled,
    };
  }
  if (input.percentBucket > betaPercent) {
    return {
      eligible: false,
      status: "blocked_percent_bucket",
      reason: "LIMITED_PUBLIC_BETA_PERCENT_BUCKET_OUTSIDE_LIMIT",
      betaPercent,
      userAllowlisted,
      countryCityAllowed,
      publicRolloutEnabled: policy.full_public_rollout_enabled,
    };
  }
  if (input.regulatedHighRisk && !policy.regulated_high_risk_public_beta_enabled) {
    return {
      eligible: false,
      status: "blocked_regulated_high_risk",
      reason: "LIMITED_PUBLIC_BETA_REGULATED_HIGH_RISK_DISABLED_BY_DEFAULT",
      betaPercent,
      userAllowlisted,
      countryCityAllowed,
      publicRolloutEnabled: policy.full_public_rollout_enabled,
    };
  }

  return {
    eligible: true,
    status: "eligible_limited_public_beta",
    reason: "LIMITED_PUBLIC_BETA_ALLOWLISTED_MANUAL_ENABLE_ONLY",
    betaPercent,
    userAllowlisted,
    countryCityAllowed,
    publicRolloutEnabled: policy.full_public_rollout_enabled,
  };
}
