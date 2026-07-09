import { createInMemoryAiEstimateLedgerStore } from "../../ledger/adapters/InMemoryAiEstimateLedgerStore";
import type { AiEstimateLedgerPort } from "../../ports/AiEstimateLedgerPort";

export function createInMemoryAiEstimateLedgerPort(): AiEstimateLedgerPort {
  return createInMemoryAiEstimateLedgerStore();
}
