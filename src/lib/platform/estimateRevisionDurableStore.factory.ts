import type {
  DurableFailureInjector,
  EstimateRevisionDurableStore,
} from "./estimateRevisionDurableStore.contract";
import { IndexedDbEstimateRevisionDurableStore } from "./estimateRevisionDurableStore.indexedDb";
import { InMemoryEstimateRevisionDurableStore } from "./estimateRevisionDurableStore.memory";
import {
  SQLiteEstimateRevisionDurableStore,
  type SQLiteModuleLike,
} from "./estimateRevisionDurableStore.sqlite";
import { UnavailableEstimateRevisionDurableStore } from "./estimateRevisionDurableStore.unavailable";

export type EstimateRevisionDurableStoreFactoryInput = {
  platform?: "web" | "native" | "memory";
  indexedDb?: IDBFactory;
  sqliteModule?: SQLiteModuleLike;
  failureInjector?: DurableFailureInjector | null;
};

export function createEstimateRevisionDurableStore(
  input: EstimateRevisionDurableStoreFactoryInput = {},
): EstimateRevisionDurableStore {
  const inferredPlatform = input.platform ??
    (typeof globalThis.indexedDB !== "undefined" ? "web" : "native");
  if (inferredPlatform === "memory") {
    return new InMemoryEstimateRevisionDurableStore({
      failureInjector: input.failureInjector,
    });
  }
  if (inferredPlatform === "web") {
    const indexedDb = input.indexedDb ?? globalThis.indexedDB;
    return indexedDb
      ? new IndexedDbEstimateRevisionDurableStore(indexedDb)
      : new UnavailableEstimateRevisionDurableStore();
  }
  if (!input.sqliteModule) return new UnavailableEstimateRevisionDurableStore();
  return new SQLiteEstimateRevisionDurableStore(() =>
    input.sqliteModule!.openDatabaseAsync("rik-estimate-revisions.db")
  );
}
