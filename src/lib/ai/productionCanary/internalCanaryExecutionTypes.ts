import {
  AI_ESTIMATE_CANARY_REQUIRED_PREREQUISITES,
  type AiEstimateCanaryEntrypoint,
  type AiEstimateCanaryPrerequisite,
  type AiEstimateCanaryStatus,
} from "./aiEstimateCanaryConfig";

export const AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_WAVE =
  "S_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_AND_OBSERVABILITY_REPLAY_POINT_OF_NO_RETURN";

export const AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_GREEN_STATUS =
  "GREEN_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_READY";

export const AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_ARTIFACT_DIR =
  "artifacts/S_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION";

export type AiEstimateInternalCanaryUserCohort = "internal_staff" | "public_user";

export type AiEstimateInternalCanaryExecutionSession = {
  runtimeTraceId: string;
  userCohort: AiEstimateInternalCanaryUserCohort;
  internalStaffFlag: boolean;
  route: AiEstimateCanaryEntrypoint;
  entrypoint: AiEstimateCanaryEntrypoint;
  canaryEnabled: boolean;
  canaryStatus: AiEstimateCanaryStatus;
  killSwitchState: "clear" | "blocking";
  dynamicBoqEnabled: boolean;
  pdfEnabled: boolean;
  catalogBindingEnabled: boolean;
  localRateSourceEnabled: boolean;
};

export type AiEstimateInternalCanaryPrerequisite = AiEstimateCanaryPrerequisite;

export const AI_ESTIMATE_INTERNAL_CANARY_REQUIRED_PREREQUISITES: readonly AiEstimateInternalCanaryPrerequisite[] =
  Object.freeze([
    ...AI_ESTIMATE_CANARY_REQUIRED_PREREQUISITES,
    {
      key: "production_canary_control_plane",
      path: "artifacts/S_AI_ESTIMATE_PRODUCTION_CANARY/matrix.json",
      expectedStatus: "GREEN_AI_ESTIMATE_PRODUCTION_CANARY_CONTROL_PLANE_READY",
    },
  ]);
