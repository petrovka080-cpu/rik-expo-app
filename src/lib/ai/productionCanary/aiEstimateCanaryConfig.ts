export const AI_ESTIMATE_PRODUCTION_CANARY_WAVE =
  "S_AI_ESTIMATE_PRODUCTION_CANARY_CONTROL_PLANE_REAL_USAGE_REPLAY_POINT_OF_NO_RETURN";

export const AI_ESTIMATE_PRODUCTION_CANARY_GREEN_STATUS =
  "GREEN_AI_ESTIMATE_PRODUCTION_CANARY_CONTROL_PLANE_READY";

export const AI_ESTIMATE_PRODUCTION_CANARY_ARTIFACT_DIR =
  "artifacts/S_AI_ESTIMATE_PRODUCTION_CANARY";

export type AiEstimateCanaryEntrypoint =
  | "/request"
  | "/ai?context=foreman"
  | "/ai?context=request";

export type AiEstimateCanaryStatus =
  | "disabled"
  | "eligible_internal_opt_in"
  | "blocked_by_kill_switch"
  | "blocked_external_user"
  | "blocked_missing_manual_opt_in"
  | "blocked_percent_bucket";

export type AiEstimateCanaryConfig = {
  production_rollout_enabled: boolean;
  public_canary_enabled: boolean;
  internal_canary_enabled: boolean;
  internal_canary_default_enabled: boolean;
  internal_staff_only: boolean;
  manual_opt_in_required: boolean;
  max_canary_percent: number;
  eligible_cohort: "internal_staff_only";
  entrypoints: AiEstimateCanaryEntrypoint[];
};

export type AiEstimateCanaryPrerequisite = {
  key: string;
  path: string;
  expectedStatus: string;
};

export const AI_ESTIMATE_CANARY_ENTRYPOINTS: readonly AiEstimateCanaryEntrypoint[] = Object.freeze([
  "/request",
  "/ai?context=foreman",
  "/ai?context=request",
]);

export const AI_ESTIMATE_CANARY_DEFAULT_CONFIG: AiEstimateCanaryConfig = Object.freeze({
  production_rollout_enabled: false,
  public_canary_enabled: false,
  internal_canary_enabled: false,
  internal_canary_default_enabled: false,
  internal_staff_only: true,
  manual_opt_in_required: true,
  max_canary_percent: 1,
  eligible_cohort: "internal_staff_only",
  entrypoints: [...AI_ESTIMATE_CANARY_ENTRYPOINTS],
});

export const AI_ESTIMATE_CANARY_REQUIRED_PREREQUISITES: readonly AiEstimateCanaryPrerequisite[] = Object.freeze([
  {
    key: "universal_estimator_kernel",
    path: "artifacts/S_UNIVERSAL_ESTIMATOR_KERNEL/matrix.json",
    expectedStatus: "GREEN_AI_ESTIMATE_UNIVERSAL_ESTIMATOR_KERNEL_DYNAMIC_BOQ_READY",
  },
  {
    key: "real_500_acceptance",
    path: "artifacts/S_REAL_500_DIVERSE_CONSTRUCTION_WORKS/matrix.json",
    expectedStatus: "GREEN_REAL_500_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_READY",
  },
  {
    key: "real_10000_acceptance",
    path: "artifacts/S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS/matrix.json",
    expectedStatus: "GREEN_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_READY",
  },
  {
    key: "performance_cost_guard",
    path: "artifacts/S_AI_ESTIMATE_PERFORMANCE/matrix.json",
    expectedStatus: "GREEN_AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD_READY",
  },
  {
    key: "global_local_platform",
    path: "artifacts/S_GLOBAL_LOCAL_ESTIMATE_PLATFORM/matrix.json",
    expectedStatus: "GREEN_AI_ESTIMATE_GLOBAL_LOCAL_CONTEXT_RATE_SOURCE_PLATFORM_READY",
  },
  {
    key: "change_control",
    path: "artifacts/S_AI_ESTIMATE_CHANGE_CONTROL/matrix.json",
    expectedStatus: "GREEN_AI_ESTIMATE_TEMPLATE_RATE_CATALOG_ONTOLOGY_CHANGE_CONTROL_READY",
  },
  {
    key: "android_api34_canonical",
    path: "artifacts/S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING/matrix.json",
    expectedStatus: "GREEN_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING_READY",
  },
]);

export function buildAiEstimateCanaryConfig(
  overrides: Partial<AiEstimateCanaryConfig> = {},
): AiEstimateCanaryConfig {
  return {
    ...AI_ESTIMATE_CANARY_DEFAULT_CONFIG,
    ...overrides,
    entrypoints: overrides.entrypoints ?? [...AI_ESTIMATE_CANARY_ENTRYPOINTS],
  };
}
