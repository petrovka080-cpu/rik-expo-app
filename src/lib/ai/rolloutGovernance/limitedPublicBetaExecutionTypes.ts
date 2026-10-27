import type { AiEstimateCanaryEntrypoint, AiEstimateCanaryPrerequisite } from "../productionCanary/aiEstimateCanaryConfig";

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_WAVE =
  "S_AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_EXPLICIT_ROLLOUT_CONTRACT_POINT_OF_NO_RETURN";

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_GREEN_STATUS =
  "GREEN_AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_READY";

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_ARTIFACT_DIR =
  "artifacts/S_AI_ESTIMATE_LIMITED_PUBLIC_BETA";

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_RELEASE_GUARD =
  "ai-estimate-limited-public-beta-execution-proof";

export type AiEstimateLimitedPublicBetaDecision =
  | "GO_LIMITED_PUBLIC_BETA_EXECUTION"
  | "NO_GO_PREREQUISITE_NOT_GREEN"
  | "NO_GO_POLICY_INVALID"
  | "NO_GO_ALLOWLIST_IDS_MISSING"
  | "NO_GO_ERROR_BUDGET_EXCEEDED"
  | "NO_GO_PDF_MOJIBAKE"
  | "NO_GO_OBJECT_MISCLASSIFICATION"
  | "NO_GO_WEAK_GENERIC_ROWS"
  | "NO_GO_FEEDBACK_RATE_HIGH"
  | "NO_GO_KILL_SWITCH_FAILED"
  | "NO_GO_ROLLBACK_FAILED"
  | "NO_GO_ANDROID_API34_MISSING"
  | "UNKNOWN_NEEDS_TRACE";

export type AiEstimateLimitedPublicBetaAllowlistedCity = {
  country: "Kyrgyzstan" | "Kazakhstan";
  city: "Bishkek" | "Almaty";
};

export type AiEstimateLimitedPublicBetaEntrypoint = AiEstimateCanaryEntrypoint;

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_ENTRYPOINTS: readonly AiEstimateLimitedPublicBetaEntrypoint[] =
  Object.freeze([
    "/request",
    "/ai?context=foreman",
    "/ai?context=request",
  ]);

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_COUNTRY_CITY_ALLOWLIST: readonly AiEstimateLimitedPublicBetaAllowlistedCity[] =
  Object.freeze([
    { country: "Kyrgyzstan", city: "Bishkek" },
    { country: "Kazakhstan", city: "Almaty" },
  ]);

export const AI_ESTIMATE_LIMITED_PUBLIC_BETA_REQUIRED_PREREQUISITES: readonly AiEstimateCanaryPrerequisite[] =
  Object.freeze([
    {
      key: "canary_evaluation",
      path: "artifacts/S_AI_ESTIMATE_CANARY_EVALUATION/matrix.json",
      expectedStatus: "GREEN_AI_ESTIMATE_CANARY_EVALUATION_READY",
    },
    {
      key: "internal_canary_execution",
      path: "artifacts/S_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION/matrix.json",
      expectedStatus: "GREEN_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_READY",
    },
    {
      key: "production_canary_control_plane",
      path: "artifacts/S_AI_ESTIMATE_PRODUCTION_CANARY/matrix.json",
      expectedStatus: "GREEN_AI_ESTIMATE_PRODUCTION_CANARY_CONTROL_PLANE_READY",
    },
    {
      key: "real_10000_acceptance",
      path: "artifacts/S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS/matrix.json",
      expectedStatus: "GREEN_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_READY",
    },
    {
      key: "real_500_acceptance",
      path: "artifacts/S_REAL_500_DIVERSE_CONSTRUCTION_WORKS/matrix.json",
      expectedStatus: "GREEN_REAL_500_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_READY",
    },
    {
      key: "universal_estimator_kernel",
      path: "artifacts/S_UNIVERSAL_ESTIMATOR_KERNEL/matrix.json",
      expectedStatus: "GREEN_AI_ESTIMATE_UNIVERSAL_ESTIMATOR_KERNEL_DYNAMIC_BOQ_READY",
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
