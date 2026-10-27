import type { DraftRevisionSnapshot } from "../../../features/estimates/createSnapshotFromDraftRevision";
import type { DraftRevisionPdfArtifact } from "../../../features/pdf/renderPdfFromDraftRevision";
import type { DraftRevisionBuyerHandoff } from "../../../features/procurement/createBuyerHandoffFromDraftRevision";
import {
  buildAiEstimateContractHeader,
  type AiEstimateVersionedContractHeader,
} from "./AiEstimateContractVersion";

export type AiEstimateArtifactContract = AiEstimateVersionedContractHeader & {
  schemaVersion: "ai-estimate-artifact-v1";
  revisionId: string;
  snapshot: DraftRevisionSnapshot | null;
  pdf: DraftRevisionPdfArtifact | null;
  buyerPackage: DraftRevisionBuyerHandoff | null;
};

export function createAiEstimateArtifactContract(input: {
  revisionId: string;
  snapshot?: DraftRevisionSnapshot | null;
  pdf?: DraftRevisionPdfArtifact | null;
  buyerPackage?: DraftRevisionBuyerHandoff | null;
  createdAt: string;
  sourceSha?: string;
}): AiEstimateArtifactContract {
  return {
    ...buildAiEstimateContractHeader({
      schemaVersion: "ai-estimate-artifact-v1",
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      sourceSha: input.sourceSha,
    }),
    schemaVersion: "ai-estimate-artifact-v1",
    revisionId: input.revisionId,
    snapshot: input.snapshot ?? null,
    pdf: input.pdf ?? null,
    buyerPackage: input.buyerPackage ?? null,
  };
}
