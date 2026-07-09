export const AI_ESTIMATE_CONTRACT_VERSION = "ai-estimate-contract-v1" as const;
export const AI_ESTIMATE_RUNTIME_VERSION = "ai-estimate-runtime-v1" as const;

export type AiEstimateContractVersion = typeof AI_ESTIMATE_CONTRACT_VERSION;
export type AiEstimateRuntimeVersion = typeof AI_ESTIMATE_RUNTIME_VERSION;

export type AiEstimateVersionedContractHeader = {
  schemaVersion: string;
  contractVersion: AiEstimateContractVersion;
  createdAt: string;
  updatedAt: string;
  sourceSha: string;
  runtimeVersion: AiEstimateRuntimeVersion;
};

export function buildAiEstimateContractHeader(input: {
  schemaVersion: string;
  createdAt: string;
  updatedAt?: string;
  sourceSha?: string;
}): AiEstimateVersionedContractHeader {
  return {
    schemaVersion: input.schemaVersion,
    contractVersion: AI_ESTIMATE_CONTRACT_VERSION,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.createdAt,
    sourceSha: input.sourceSha ?? "runtime-local",
    runtimeVersion: AI_ESTIMATE_RUNTIME_VERSION,
  };
}
