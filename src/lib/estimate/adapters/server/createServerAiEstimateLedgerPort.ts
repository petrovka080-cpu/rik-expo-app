import {
  createServerAiEstimateLedgerStore,
  type AiEstimateLedgerFetch,
  type ServerAiEstimateLedgerStore,
} from "../../ledger/adapters/ServerAiEstimateLedgerStore";

export type AiEstimateServerLedgerPort = ServerAiEstimateLedgerStore;

export function createServerAiEstimateLedgerPort(input: {
  baseUrl: string;
  fetcher: AiEstimateLedgerFetch;
}): AiEstimateServerLedgerPort {
  return createServerAiEstimateLedgerStore(input);
}
