import type { AiEstimateLedgerRecord } from "../ledger/AiEstimateLedgerTypes";
import {
  buildAiEstimateContractHeader,
  type AiEstimateVersionedContractHeader,
} from "./AiEstimateContractVersion";

export type AiEstimateLedgerContract = AiEstimateVersionedContractHeader & {
  schemaVersion: "ai-estimate-ledger-contract-v1";
  ledgerRecord: AiEstimateLedgerRecord;
};

export function createAiEstimateLedgerContract(input: {
  ledgerRecord: AiEstimateLedgerRecord;
  sourceSha?: string;
}): AiEstimateLedgerContract {
  return {
    ...buildAiEstimateContractHeader({
      schemaVersion: "ai-estimate-ledger-contract-v1",
      createdAt: input.ledgerRecord.createdAt,
      updatedAt: input.ledgerRecord.updatedAt,
      sourceSha: input.sourceSha,
    }),
    schemaVersion: "ai-estimate-ledger-contract-v1",
    ledgerRecord: input.ledgerRecord,
  };
}
