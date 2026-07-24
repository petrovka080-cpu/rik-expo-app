import * as ExpoSQLite from "expo-sqlite";

import type {
  DurableFailureInjector,
  EstimateRevisionDurableStore,
} from "./estimateRevisionDurableStore.contract";
import { InMemoryEstimateRevisionDurableStore } from "./estimateRevisionDurableStore.memory";
import {
  SQLiteEstimateRevisionDurableStore,
  type SQLiteModuleLike,
} from "./estimateRevisionDurableStore.sqlite";

export type EstimateRevisionDurableStoreFactoryInput = {
  platform?: "native" | "memory";
  sqliteModule?: SQLiteModuleLike;
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
  const sqlite = input.sqliteModule ??
    ExpoSQLite as unknown as SQLiteModuleLike;
  return new SQLiteEstimateRevisionDurableStore(() =>
    sqlite.openDatabaseAsync("rik-estimate-revisions.db")
  );
}
