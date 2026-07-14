export type AiEstimateStorageSurface =
  | "estimate_ledger"
  | "server_api"
  | "browser_cache"
  | "legacy_local_storage"
  | "ui_state";

export type AiEstimateStorageSurfacePolicy = {
  surface: AiEstimateStorageSurface;
  sourceOfTruth: boolean;
  mayServeHistory: boolean;
  mayServeCurrentDraft: boolean;
  mayWriteApprovedArtifacts: boolean;
  retention: "durable" | "cache" | "transient" | "legacy_read_only";
  destructiveCleanupAllowed: false;
};

export const AI_ESTIMATE_SOURCE_OF_TRUTH_POLICY: readonly AiEstimateStorageSurfacePolicy[] = [
  {
    surface: "estimate_ledger",
    sourceOfTruth: true,
    mayServeHistory: true,
    mayServeCurrentDraft: true,
    mayWriteApprovedArtifacts: true,
    retention: "durable",
    destructiveCleanupAllowed: false,
  },
  {
    surface: "server_api",
    sourceOfTruth: true,
    mayServeHistory: true,
    mayServeCurrentDraft: true,
    mayWriteApprovedArtifacts: true,
    retention: "durable",
    destructiveCleanupAllowed: false,
  },
  {
    surface: "browser_cache",
    sourceOfTruth: false,
    mayServeHistory: false,
    mayServeCurrentDraft: false,
    mayWriteApprovedArtifacts: false,
    retention: "cache",
    destructiveCleanupAllowed: false,
  },
  {
    surface: "legacy_local_storage",
    sourceOfTruth: false,
    mayServeHistory: false,
    mayServeCurrentDraft: false,
    mayWriteApprovedArtifacts: false,
    retention: "legacy_read_only",
    destructiveCleanupAllowed: false,
  },
  {
    surface: "ui_state",
    sourceOfTruth: false,
    mayServeHistory: false,
    mayServeCurrentDraft: false,
    mayWriteApprovedArtifacts: false,
    retention: "transient",
    destructiveCleanupAllowed: false,
  },
] as const;

export function getAiEstimateStorageSurfacePolicy(surface: AiEstimateStorageSurface): AiEstimateStorageSurfacePolicy {
  const policy = AI_ESTIMATE_SOURCE_OF_TRUTH_POLICY.find((item) => item.surface === surface);
  if (!policy) throw new Error(`AI_ESTIMATE_SOURCE_OF_TRUTH_POLICY_MISSING:${surface}`);
  return policy;
}
