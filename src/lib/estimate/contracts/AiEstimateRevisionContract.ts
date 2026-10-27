import type { EstimateDraftRevision } from "../estimateDraftRevisionContract";
import {
  buildAiEstimateContractHeader,
  type AiEstimateVersionedContractHeader,
} from "./AiEstimateContractVersion";

export type AiEstimateRevisionContract = AiEstimateVersionedContractHeader & {
  schemaVersion: "ai-estimate-revision-v1";
  revision: EstimateDraftRevision;
};

export function createAiEstimateRevisionContract(input: {
  revision: EstimateDraftRevision;
  sourceSha?: string;
}): AiEstimateRevisionContract {
  const timestamps = Object.values(input.revision.params).map((param) => param.lastChangedAt).sort();
  const createdAt = timestamps[0] ?? "1970-01-01T00:00:00.000Z";
  const updatedAt = timestamps[timestamps.length - 1] ?? createdAt;
  return {
    ...buildAiEstimateContractHeader({
      schemaVersion: "ai-estimate-revision-v1",
      createdAt,
      updatedAt,
      sourceSha: input.sourceSha,
    }),
    schemaVersion: "ai-estimate-revision-v1",
    revision: input.revision,
  };
}
