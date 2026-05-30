export type AiEstimateLimitedPublicBetaPolicy = {
  public_beta_enabled: boolean;
  max_public_beta_percent: number;
  country_city_allowlist_required: boolean;
  kill_switch_required: boolean;
  rollback_required: boolean;
  manual_monitoring_required: boolean;
  daily_evaluation_required: boolean;
  regulated_high_risk_public_beta_enabled: boolean;
};

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_DEFAULT_POLICY: AiEstimateLimitedPublicBetaPolicy =
  Object.freeze({
    public_beta_enabled: false,
    max_public_beta_percent: 0.5,
    country_city_allowlist_required: true,
    kill_switch_required: true,
    rollback_required: true,
    manual_monitoring_required: true,
    daily_evaluation_required: true,
    regulated_high_risk_public_beta_enabled: false,
  });

export function buildAiEstimateLimitedPublicBetaPolicy(
  overrides: Partial<AiEstimateLimitedPublicBetaPolicy> = {},
): AiEstimateLimitedPublicBetaPolicy {
  return {
    ...AI_ESTIMATE_LIMITED_PUBLIC_BETA_DEFAULT_POLICY,
    ...overrides,
  };
}
