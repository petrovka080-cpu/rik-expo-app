import type { AiEstimateLimitedPublicBetaAllowlistedCity } from "./limitedPublicBetaExecutionTypes";

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_CLOSEOUT_WAVE =
  "S_AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_AND_RELEASE_CLOSEOUT_POINT_OF_NO_RETURN";

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_CLOSEOUT_GREEN_STATUS =
  "GREEN_AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_READY";

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_CONTROL_PLANE_READY_STATUS =
  "GREEN_LIMITED_PUBLIC_BETA_ALLOWLIST_CONTROL_PLANE_READY";

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_CLOSEOUT_RELEASE_GUARD =
  "ai-estimate-limited-public-beta-allowlist-closeout-proof";

export type AiEstimateLimitedPublicBetaAllowlistSource =
  | "missing"
  | "env"
  | "repo_config"
  | "test_staging";

export type AiEstimateLimitedPublicBetaAllowlistCohort =
  | "beta_residential_small"
  | "beta_commercial_fitout"
  | "beta_engineering_mep"
  | "beta_landscaping_infrastructure"
  | "beta_industrial_non_regulated";

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_COHORTS: readonly AiEstimateLimitedPublicBetaAllowlistCohort[] =
  Object.freeze([
    "beta_residential_small",
    "beta_commercial_fitout",
    "beta_engineering_mep",
    "beta_landscaping_infrastructure",
    "beta_industrial_non_regulated",
  ]);

export type AiEstimateLimitedPublicBetaAllowlistEntry = {
  userId?: string | null;
  accountId?: string | null;
  organizationId?: string | null;
  country: string;
  city: string;
  cohort: AiEstimateLimitedPublicBetaAllowlistCohort;
  enabled: boolean;
  createdBy: string;
  approvedBy: string;
  expiresAt: string;
  reason: string;
  regulatedHighRiskEnabled?: boolean;
};

export type AiEstimateLimitedPublicBetaAllowlist = {
  source: AiEstimateLimitedPublicBetaAllowlistSource;
  external_beta_eligibility: "explicit_allowlist_only";
  entries: AiEstimateLimitedPublicBetaAllowlistEntry[];
  enablesAllUsers: boolean;
  wildcardAllowlist: boolean;
  regulatedHighRiskPublicBetaEnabled: boolean;
  updatedAt: string | null;
};

export type AiEstimateLimitedPublicBetaRolloutContract = {
  external_beta_flag_approval: true;
  full_public_rollout_enabled: false;
  limited_public_beta_enabled_by_default: false;
  manual_enable_required: true;
  initial_public_beta_percent: 0.1;
  max_public_beta_percent: 0.5;
  eligible_users: "explicit_allowlist_only";
  country_city_allowlist: AiEstimateLimitedPublicBetaAllowlistedCity[];
  regulated_high_risk_public_beta_enabled: false;
  monitoring_owner: string;
  rollback_owner: string;
  daily_error_budget_required: true;
  kill_switch_required: true;
  rollback_required: true;
};

export type AiEstimateLimitedPublicBetaAllowlistEligibilityInput = {
  allowlist: AiEstimateLimitedPublicBetaAllowlist;
  userId?: string | null;
  accountId?: string | null;
  organizationId?: string | null;
  country: string;
  city: string;
  manualEnable: boolean;
  regulatedHighRisk: boolean;
  killSwitchActive?: boolean;
  now?: Date;
};

export type AiEstimateLimitedPublicBetaAllowlistEligibility = {
  eligible: boolean;
  status:
    | "eligible_limited_public_beta"
    | "blocked_public_beta_disabled_by_default"
    | "blocked_missing_manual_enable"
    | "blocked_allowlist_empty"
    | "blocked_user_not_allowlisted"
    | "blocked_country_city"
    | "blocked_expired"
    | "blocked_disabled"
    | "blocked_regulated_high_risk"
    | "blocked_kill_switch";
  reason: string;
  matchedIdentifier: string | null;
  matchedCohort: AiEstimateLimitedPublicBetaAllowlistCohort | null;
};
