import {
  AI_ESTIMATE_CONTRACT_VERSION,
  AI_ESTIMATE_RUNTIME_VERSION,
  type AiEstimateVersionedContractHeader,
} from "./AiEstimateContractVersion";

export type AiEstimateContractCompatibilityValidation = {
  ok: boolean;
  versionedContractsCreated: true;
  schemaVersionPresent: boolean;
  contractVersionPresent: boolean;
  timestampsPresent: boolean;
  sourceShaOrRuntimeVersionPresent: boolean;
  blockingReasons: string[];
};

export function validateAiEstimateContractCompatibility(
  records: readonly Partial<AiEstimateVersionedContractHeader>[],
): AiEstimateContractCompatibilityValidation {
  const schemaVersionPresent = records.every((record) => typeof record.schemaVersion === "string" && record.schemaVersion.length > 0);
  const contractVersionPresent = records.every((record) => record.contractVersion === AI_ESTIMATE_CONTRACT_VERSION);
  const timestampsPresent = records.every((record) =>
    typeof record.createdAt === "string" &&
    record.createdAt.length > 0 &&
    typeof record.updatedAt === "string" &&
    record.updatedAt.length > 0
  );
  const sourceShaOrRuntimeVersionPresent = records.every((record) =>
    (typeof record.sourceSha === "string" && record.sourceSha.length > 0) ||
    record.runtimeVersion === AI_ESTIMATE_RUNTIME_VERSION
  );
  const checks = {
    schema_version_present: schemaVersionPresent,
    contract_version_present: contractVersionPresent,
    timestamps_present: timestampsPresent,
    source_sha_or_runtime_version_present: sourceShaOrRuntimeVersionPresent,
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    ok: blockingReasons.length === 0,
    versionedContractsCreated: true,
    schemaVersionPresent,
    contractVersionPresent,
    timestampsPresent,
    sourceShaOrRuntimeVersionPresent,
    blockingReasons,
  };
}
