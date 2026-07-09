import {
  createBrowserCachedAiEstimateLedgerStore,
  type AiEstimateLedgerCacheStorage,
} from "../../ledger/adapters/BrowserCachedAiEstimateLedgerStore";
import type { AiEstimateLedgerPort } from "../../ports/AiEstimateLedgerPort";

export function createBrowserAiEstimateLedgerPort(input: {
  primary: AiEstimateLedgerPort;
  storage: AiEstimateLedgerCacheStorage;
  namespace?: string;
}): AiEstimateLedgerPort {
  return createBrowserCachedAiEstimateLedgerStore(input);
}
