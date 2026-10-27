import type {
  AiEstimateLedgerAppendRevisionInput,
  AiEstimateLedgerApproveRevisionInput,
  AiEstimateLedgerBindArtifactsInput,
  AiEstimateLedgerHistoryQuery,
  AiEstimateLedgerSetStatusInput,
  AiEstimateLedgerUpsertDraftInput,
} from "../AiEstimateLedgerTypes";
import { type AiEstimateLedgerStore } from "../AiEstimateLedgerStore";

export type AiEstimateLedgerCacheStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type BrowserCachedAiEstimateLedgerStoreOptions = {
  primary: AiEstimateLedgerStore;
  storage: AiEstimateLedgerCacheStorage;
  namespace?: string;
};

export function createBrowserCachedAiEstimateLedgerStore(
  options: BrowserCachedAiEstimateLedgerStoreOptions,
): AiEstimateLedgerStore {
  const namespace = options.namespace ?? "ai_estimate_ledger_cache_v1";

  function cacheRecord(estimateId: string): void {
    const record = options.primary.getRecord(estimateId);
    if (!record) return;
    options.storage.setItem(`${namespace}:record:${estimateId}`, JSON.stringify({
      schemaVersion: "ai-estimate-browser-cache-v1",
      estimateId,
      cachedAt: new Date().toISOString(),
      record,
      sourceOfTruth: false,
    }));
  }

  function writeThrough<T extends { estimateId: string }>(
    input: T,
    operation: () => ReturnType<AiEstimateLedgerStore["upsertDraft"]>,
  ) {
    const result = operation();
    cacheRecord(input.estimateId);
    return result;
  }

  return {
    adapterKind: "browser_cached",

    upsertDraft(input: AiEstimateLedgerUpsertDraftInput) {
      return writeThrough(input, () => options.primary.upsertDraft(input));
    },

    appendRevision(input: AiEstimateLedgerAppendRevisionInput) {
      return writeThrough(input, () => options.primary.appendRevision(input));
    },

    bindArtifacts(input: AiEstimateLedgerBindArtifactsInput) {
      return writeThrough(input, () => options.primary.bindArtifacts(input));
    },

    approveRevision(input: AiEstimateLedgerApproveRevisionInput) {
      return writeThrough(input, () => options.primary.approveRevision(input));
    },

    setStatus(input: AiEstimateLedgerSetStatusInput) {
      return writeThrough(input, () => options.primary.setStatus(input));
    },

    getRecord(estimateId: string) {
      return options.primary.getRecord(estimateId);
    },

    listApprovedHistory(query: AiEstimateLedgerHistoryQuery) {
      return options.primary.listApprovedHistory(query);
    },

    countApprovedHistory(query) {
      return options.primary.countApprovedHistory(query);
    },

    resetForTests() {
      options.primary.resetForTests();
    },
  };
}
