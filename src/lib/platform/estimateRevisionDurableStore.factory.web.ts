import type {
  DurableFailureInjector,
  EstimateRevisionDurableStore,
} from "./estimateRevisionDurableStore.contract";
import { IndexedDbEstimateRevisionDurableStore } from "./estimateRevisionDurableStore.indexedDb";
import { InMemoryEstimateRevisionDurableStore } from "./estimateRevisionDurableStore.memory";
import { UnavailableEstimateRevisionDurableStore } from "./estimateRevisionDurableStore.unavailable";

export type EstimateRevisionDurableStoreFactoryInput = {
  platform?: "web" | "memory";
  indexedDb?: IDBFactory;
  failureInjector?: DurableFailureInjector | null;
};

export function createEstimateRevisionDurableStore(
  input: EstimateRevisionDurableStoreFactoryInput = {},
): EstimateRevisionDurableStore {
  if (input.platform === "memory") {
    return new InMemoryEstimateRevisionDurableStore({
      failureInjector: input.failureInjector,
    });
  }
  const indexedDb = input.indexedDb ?? globalThis.indexedDB;
  return indexedDb
    ? new IndexedDbEstimateRevisionDurableStore(indexedDb)
    : new UnavailableEstimateRevisionDurableStore();
}
