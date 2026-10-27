import type { AiEstimateLedgerHistoryRecord } from "../ledger/AiEstimateLedgerTypes";
import { createAiEstimateExtensionPoint, type AiEstimateExtensionPoint } from "./AiEstimateExtensionPoint";

export type AiEstimateProcurementExtensionContract = AiEstimateExtensionPoint & {
  readonly extensionKind: "procurement";
  readApprovedHandoff(record: AiEstimateLedgerHistoryRecord): {
    approvedEstimateId: string;
    revisionId: string;
    buyerHandoffId: string | null;
    pdfArtifactId: string | null;
  };
};

export function createAiEstimateProcurementExtensionContract(): AiEstimateProcurementExtensionContract {
  return {
    ...createAiEstimateExtensionPoint("procurement"),
    extensionKind: "procurement",
    readApprovedHandoff: (record) => ({
      approvedEstimateId: record.approvedEstimateId,
      revisionId: record.sourceRevisionId,
      buyerHandoffId: record.buyerHandoffId,
      pdfArtifactId: record.pdfArtifactId,
    }),
  };
}
