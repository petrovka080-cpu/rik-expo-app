import * as ExpoSQLite from "expo-sqlite";

import type {
  DurableFailureInjector,
  EstimateRevisionDurableStore,
} from "./estimateRevisionDurableStore.contract";
import { InMemoryEstimateRevisionDurableStore } from "./estimateRevisionDurableStore.memory";
import {
  SQLiteEstimateRevisionDurableStore,
  type SQLiteDatabaseLike,
  type SQLiteModuleLike,
} from "./estimateRevisionDurableStore.sqlite";

export type EstimateRevisionDurableStoreFactoryInput = {
  platform?: "native" | "memory";
  sqliteModule?: SQLiteModuleLike;
  failureInjector?: DurableFailureInjector | null;
};

const isSQLiteBindValue = (
  value: unknown,
): value is ExpoSQLite.SQLiteBindValue =>
  value == null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean" ||
  value instanceof Uint8Array;

const requireSQLiteBindValues = (
  values: readonly unknown[],
): ExpoSQLite.SQLiteVariadicBindParams => {
  if (!values.every(isSQLiteBindValue)) {
    throw new Error("SQLITE_BIND_VALUE_UNSUPPORTED");
  }
  return [...values];
};

function adaptExpoSQLiteDatabase(
  database: ExpoSQLite.SQLiteDatabase,
): SQLiteDatabaseLike {
  return {
    execAsync: (sql) => database.execAsync(sql),
    withExclusiveTransactionAsync: async <T>(task: (
      transaction: SQLiteDatabaseLike,
    ) => Promise<T>) => {
      const results: T[] = [];
      await database.withExclusiveTransactionAsync(async (transaction) => {
        results.push(
          await task(adaptExpoSQLiteDatabase(transaction)),
        );
      });
      if (results.length !== 1) {
        throw new Error("SQLITE_EXCLUSIVE_TRANSACTION_RESULT_MISSING");
      }
      return results[0]!;
    },
    getFirstAsync: <T>(sql: string, ...params: unknown[]) =>
      database.getFirstAsync<T>(sql, ...requireSQLiteBindValues(params)),
    getAllAsync: <T>(sql: string, ...params: unknown[]) =>
      database.getAllAsync<T>(sql, ...requireSQLiteBindValues(params)),
    runAsync: (sql: string, ...params: unknown[]) =>
      database.runAsync(sql, ...requireSQLiteBindValues(params)),
  };
}

export function createEstimateRevisionDurableStore(
  input: EstimateRevisionDurableStoreFactoryInput = {},
): EstimateRevisionDurableStore {
  if (input.platform === "memory") {
    return new InMemoryEstimateRevisionDurableStore({
      failureInjector: input.failureInjector,
    });
  }
  const sqlite: SQLiteModuleLike = input.sqliteModule ?? {
    openDatabaseAsync: async (name) =>
      adaptExpoSQLiteDatabase(await ExpoSQLite.openDatabaseAsync(name)),
  };
  return new SQLiteEstimateRevisionDurableStore(() =>
    sqlite.openDatabaseAsync("rik-estimate-revisions.db")
  );
}
