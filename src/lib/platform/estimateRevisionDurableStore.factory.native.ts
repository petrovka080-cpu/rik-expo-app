import AsyncStorage from "@react-native-async-storage/async-storage";

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
  type SQLiteModuleLike,
} from "./estimateRevisionDurableStore.sqlite";

export type EstimateRevisionDurableStoreFactoryInput = {
  platform?: "native" | "memory";
  sqliteModule?: SQLiteModuleLike;
  asyncStorage?: AsyncKeyValueStorage;
  sqliteHealthTimeoutMs?: number;
  failureInjector?: DurableFailureInjector | null;
};

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

export function createEstimateRevisionDurableStore(
  input: EstimateRevisionDurableStoreFactoryInput = {},
): EstimateRevisionDurableStore {
  if (input.platform === "memory") {
    return new InMemoryEstimateRevisionDurableStore({
      failureInjector: input.failureInjector,
    });
  }
  const asyncStorageFallback = new AsyncStorageEstimateRevisionDurableStore(
    input.asyncStorage ?? AsyncStorage,
    {
      failureInjector: input.failureInjector,
    },
  );
  // Never reflectively probe optional native modules on the render path.
  // Older binaries can advertise a module whose synchronous lookup or open
  // handshake blocks the JS thread. SQLite is therefore opt-in through an
  // explicit adapter and must still pass the bounded operational health check.
  if (!input.sqliteModule) {
    return asyncStorageFallback;
  }
  const sqlite = input.sqliteModule;
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
