import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireOptionalNativeModule } from "expo-modules-core";

import {
  AsyncStorageEstimateRevisionDurableStore,
  type AsyncKeyValueStorage,
} from "./estimateRevisionDurableStore.asyncStorage";

import type {
  DurableFailureInjector,
  DurableWriteResult,
  EstimateRevisionDurableStore,
  RevisionBundle,
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
  asyncStorage?: AsyncKeyValueStorage;
  nativeModuleAvailable?: (moduleName: string) => boolean;
  sqliteHealthTimeoutMs?: number;
  failureInjector?: DurableFailureInjector | null;
};

type ExpoSQLiteModule = typeof import("expo-sqlite");
const DEFAULT_SQLITE_HEALTH_TIMEOUT_MS = 3_000;

class HealthCheckedNativeEstimateRevisionDurableStore
implements EstimateRevisionDurableStore {
  private readonly selectedStore: Promise<EstimateRevisionDurableStore>;

  constructor(input: {
    sqliteStore: EstimateRevisionDurableStore;
    fallbackStore: EstimateRevisionDurableStore;
    healthTimeoutMs: number;
  }) {
    this.selectedStore = this.selectStore(input);
  }

  private async selectStore(input: {
    sqliteStore: EstimateRevisionDurableStore;
    fallbackStore: EstimateRevisionDurableStore;
    healthTimeoutMs: number;
  }): Promise<EstimateRevisionDurableStore> {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    try {
      const healthy = await Promise.race([
        input.sqliteStore.listKeys().then(
          () => true,
          () => false,
        ),
        new Promise<boolean>((resolve) => {
          timeout = setTimeout(() => resolve(false), input.healthTimeoutMs);
        }),
      ]);
      return healthy ? input.sqliteStore : input.fallbackStore;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private async activeStore(): Promise<EstimateRevisionDurableStore> {
    return this.selectedStore;
  }

  async readBundle(key: string): Promise<RevisionBundle | null> {
    return (await this.activeStore()).readBundle(key);
  }

  async writeBundleAtomically(
    key: string,
    expectedVersion: string | null,
    bundle: RevisionBundle,
  ): Promise<DurableWriteResult> {
    return (await this.activeStore()).writeBundleAtomically(
      key,
      expectedVersion,
      bundle,
    );
  }

  async recoverLastValid(key: string): Promise<RevisionBundle | null> {
    return (await this.activeStore()).recoverLastValid(key);
  }

  async deleteOrphans(key: string): Promise<void> {
    await (await this.activeStore()).deleteOrphans(key);
  }

  async listKeys(): Promise<string[]> {
    return (await this.activeStore()).listKeys();
  }
}

const isSQLiteBindValue = (
  value: unknown,
): value is import("expo-sqlite").SQLiteBindValue =>
  value == null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean" ||
  value instanceof Uint8Array;

const requireSQLiteBindValues = (
  values: readonly unknown[],
): import("expo-sqlite").SQLiteVariadicBindParams => {
  if (!values.every(isSQLiteBindValue)) {
    throw new Error("SQLITE_BIND_VALUE_UNSUPPORTED");
  }
  return [...values];
};

function adaptExpoSQLiteDatabase(
  database: import("expo-sqlite").SQLiteDatabase,
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
  const nativeModuleAvailable = input.nativeModuleAvailable ??
    ((moduleName: string) => Boolean(requireOptionalNativeModule(moduleName)));
  const asyncStorageFallback = new AsyncStorageEstimateRevisionDurableStore(
    input.asyncStorage ?? AsyncStorage,
    {
      failureInjector: input.failureInjector,
    },
  );
  if (!input.sqliteModule && !nativeModuleAvailable("ExpoSQLite")) {
    return asyncStorageFallback;
  }
  const sqlite: SQLiteModuleLike = input.sqliteModule ?? {
    openDatabaseAsync: async (name) => {
      const expoSQLite: ExpoSQLiteModule = await import("expo-sqlite");
      return adaptExpoSQLiteDatabase(await expoSQLite.openDatabaseAsync(name));
    },
  };
  const sqliteStore = new SQLiteEstimateRevisionDurableStore(() =>
    sqlite.openDatabaseAsync("rik-estimate-revisions.db")
  );
  return new HealthCheckedNativeEstimateRevisionDurableStore({
    sqliteStore,
    fallbackStore: asyncStorageFallback,
    healthTimeoutMs: Math.max(
      1,
      input.sqliteHealthTimeoutMs ?? DEFAULT_SQLITE_HEALTH_TIMEOUT_MS,
    ),
  });
}
