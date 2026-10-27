import type { EstimateDraftRevision } from "../estimateDraftRevisionContract";
import {
  buildAiEstimateContractHeader,
  type AiEstimateVersionedContractHeader,
} from "./AiEstimateContractVersion";

export type AiEstimateDraftContract = AiEstimateVersionedContractHeader & {
  schemaVersion: "ai-estimate-draft-v1";
  estimateDraftId: string;
  currentRevisionId: string;
  selectedTemplateId: string;
  rawInput: string;
};

export function createAiEstimateDraftContract(input: {
  revision: EstimateDraftRevision;
  sourceSha?: string;
}): AiEstimateDraftContract {
  const createdAt = input.revision.params.q?.lastChangedAt
    ?? Object.values(input.revision.params)[0]?.lastChangedAt
    ?? "1970-01-01T00:00:00.000Z";
  return {
    ...buildAiEstimateContractHeader({
      schemaVersion: "ai-estimate-draft-v1",
      createdAt,
      updatedAt: createdAt,
      sourceSha: input.sourceSha,
    }),
    schemaVersion: "ai-estimate-draft-v1",
    estimateDraftId: input.revision.estimateDraftId,
    currentRevisionId: input.revision.revisionId,
    selectedTemplateId: input.revision.selectedTemplateId,
    rawInput: input.revision.rawInput,
  };
}
