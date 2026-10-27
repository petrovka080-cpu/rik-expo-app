import type { AiEstimateLedgerHistoryRecord } from "../ledger/AiEstimateLedgerTypes";
import { createAiEstimateExtensionPoint, type AiEstimateExtensionPoint } from "./AiEstimateExtensionPoint";

export type AiEstimateFulfillmentExtensionContract = AiEstimateExtensionPoint & {
  readonly extensionKind: "fulfillment";
  readFulfillmentEnvelope(record: AiEstimateLedgerHistoryRecord): {
    approvedEstimateId: string;
    revisionId: string;
    status: AiEstimateLedgerHistoryRecord["status"];
    createdAt: string;
  };
};

export function createAiEstimateFulfillmentExtensionContract(): AiEstimateFulfillmentExtensionContract {
  return {
    ...createAiEstimateExtensionPoint("fulfillment"),
    extensionKind: "fulfillment",
    readFulfillmentEnvelope: (record) => ({
      approvedEstimateId: record.approvedEstimateId,
      revisionId: record.sourceRevisionId,
      status: record.status,
      createdAt: record.createdAt,
    }),
  };
}
