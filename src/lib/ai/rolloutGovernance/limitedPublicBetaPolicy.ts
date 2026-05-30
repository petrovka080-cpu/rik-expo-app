import {
  AI_ESTIMATE_LIMITED_PUBLIC_BETA_COUNTRY_CITY_ALLOWLIST,
  AI_ESTIMATE_LIMITED_PUBLIC_BETA_ENTRYPOINTS,
  type AiEstimateLimitedPublicBetaAllowlistedCity,
  type AiEstimateLimitedPublicBetaEntrypoint,
} from "./limitedPublicBetaExecutionTypes";

export type AiEstimateLimitedPublicBetaPolicy = {
  external_beta_flag_approval: boolean;
  full_public_rollout_enabled: boolean;
  limited_public_beta_enabled_by_default: boolean;
  public_beta_enabled: boolean;
  manual_enable_required: boolean;
  initial_public_beta_percent: number;
  max_public_beta_percent: number;
  eligible_users: "explicit_allowlist_only";
  user_allowlist_required: boolean;
  user_allowlist_ids: string[];
  user_allowlist_source: "missing" | "env" | "repo_config" | "test_staging";
  public_users_without_allowlist_excluded: boolean;
  country_city_allowlist_required: boolean;
  country_city_allowlist: AiEstimateLimitedPublicBetaAllowlistedCity[];
  entrypoints_enabled: AiEstimateLimitedPublicBetaEntrypoint[];
  regulated_high_risk_public_beta_enabled: boolean;
  monitoring_owner: string;
  rollback_owner: string;
  daily_error_budget_required: boolean;
  kill_switch_required: boolean;
  rollback_required: boolean;
  manual_monitoring_required: boolean;
  daily_evaluation_required: boolean;
};

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_DEFAULT_POLICY: AiEstimateLimitedPublicBetaPolicy =
  Object.freeze({
    external_beta_flag_approval: true,
    full_public_rollout_enabled: false,
    limited_public_beta_enabled_by_default: false,
    public_beta_enabled: false,
    manual_enable_required: true,
    initial_public_beta_percent: 0.1,
    max_public_beta_percent: 0.5,
    eligible_users: "explicit_allowlist_only",
    user_allowlist_required: true,
    user_allowlist_ids: [],
    user_allowlist_source: "missing",
    public_users_without_allowlist_excluded: true,
    country_city_allowlist_required: true,
    country_city_allowlist: [...AI_ESTIMATE_LIMITED_PUBLIC_BETA_COUNTRY_CITY_ALLOWLIST],
    entrypoints_enabled: [...AI_ESTIMATE_LIMITED_PUBLIC_BETA_ENTRYPOINTS],
    regulated_high_risk_public_beta_enabled: false,
    monitoring_owner: "ai-estimate-release-owner",
    rollback_owner: "ai-estimate-release-owner",
    daily_error_budget_required: true,
    kill_switch_required: true,
    rollback_required: true,
    manual_monitoring_required: true,
    daily_evaluation_required: true,
  });

export function buildAiEstimateLimitedPublicBetaPolicy(
  overrides: Partial<AiEstimateLimitedPublicBetaPolicy> = {},
): AiEstimateLimitedPublicBetaPolicy {
  return {
    ...AI_ESTIMATE_LIMITED_PUBLIC_BETA_DEFAULT_POLICY,
    ...overrides,
    country_city_allowlist:
      overrides.country_city_allowlist ??
      [...AI_ESTIMATE_LIMITED_PUBLIC_BETA_COUNTRY_CITY_ALLOWLIST],
    entrypoints_enabled:
      overrides.entrypoints_enabled ??
      [...AI_ESTIMATE_LIMITED_PUBLIC_BETA_ENTRYPOINTS],
    user_allowlist_ids: overrides.user_allowlist_ids ?? [],
  };
}
