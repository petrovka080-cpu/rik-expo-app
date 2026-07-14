import { createBrowserCachedAiEstimateLedgerStore, type AiEstimateLedgerCacheStorage } from "./BrowserCachedAiEstimateLedgerStore";
import { createInMemoryAiEstimateLedgerStore } from "./InMemoryAiEstimateLedgerStore";
import { type AiEstimateLedgerStore } from "../AiEstimateLedgerStore";

export type AiEstimateLedgerStoreFactoryInput =
  | { mode: "in_memory" }
  | { mode: "browser_cached"; primary: AiEstimateLedgerStore; storage: AiEstimateLedgerCacheStorage; namespace?: string };

export function createAiEstimateLedgerStore(input: AiEstimateLedgerStoreFactoryInput): AiEstimateLedgerStore {
  if (input.mode === "in_memory") return createInMemoryAiEstimateLedgerStore();
  return createBrowserCachedAiEstimateLedgerStore(input);
}
