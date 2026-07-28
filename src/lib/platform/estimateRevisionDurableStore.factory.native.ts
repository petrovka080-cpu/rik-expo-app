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
import { serializeRevisionBundle } from "./estimateRevisionDurableStore.contract";
import { InMemoryEstimateRevisionDurableStore } from "./estimateRevisionDurableStore.memory";
import {
  SQLiteEstimateRevisionDurableStore,
  type SQLiteModuleLike,
} from "./estimateRevisionDurableStore.sqlite";

export type EstimateRevisionDurableStoreFactoryInput = {
  platform?: "native" | "memory";
  sqliteModule?: SQLiteModuleLike;
  legacySQLiteStore?: EstimateRevisionDurableStore;
  asyncStorage?: AsyncKeyValueStorage;
  sqliteHealthTimeoutMs?: number;
  failureInjector?: DurableFailureInjector | null;
};

const DEFAULT_SQLITE_HEALTH_TIMEOUT_MS = 3_000;
export const NATIVE_ESTIMATE_REVISION_BACKEND_ID = "async_storage_v1";
export const LEGACY_NATIVE_ESTIMATE_REVISION_BACKEND_ID = "sqlite_v1";
const BACKEND_MARKER_KEY_PREFIX =
  "rik.estimate_revision_durable.backend_marker.v1:";

type HealthyLegacyStore = {
  store: EstimateRevisionDurableStore;
  keys: string[];
};

type NativeDurableBackendMarker = {
  schemaVersion: "estimate_revision_native_backend_marker_v1";
  activeBackend: typeof NATIVE_ESTIMATE_REVISION_BACKEND_ID;
  legacyBackend: typeof LEGACY_NATIVE_ESTIMATE_REVISION_BACKEND_ID | null;
  migrationState: "primary" | "migrated_from_legacy";
  version: string;
  checksum: string;
};

function backendMarkerKey(key: string): string {
  return `${BACKEND_MARKER_KEY_PREFIX}${encodeURIComponent(key)}`;
}

class ReadThroughMigratingNativeEstimateRevisionDurableStore
implements EstimateRevisionDurableStore {
  private readonly healthyLegacyStore: Promise<HealthyLegacyStore | null>;
  private readonly migrationQueues = new Map<string, Promise<RevisionBundle | null>>();

  constructor(input: {
    primaryStore: EstimateRevisionDurableStore;
    legacyStore: EstimateRevisionDurableStore;
    markerStorage: AsyncKeyValueStorage;
    healthTimeoutMs: number;
  }) {
    this.primaryStore = input.primaryStore;
    this.markerStorage = input.markerStorage;
    this.healthTimeoutMs = input.healthTimeoutMs;
    this.healthyLegacyStore = this.probeLegacyStore(
      input.legacyStore,
      input.healthTimeoutMs,
    );
  }

  private readonly primaryStore: EstimateRevisionDurableStore;
  private readonly markerStorage: AsyncKeyValueStorage;
  private readonly healthTimeoutMs: number;

  private async bounded<T>(
    operation: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            reject(new Error("NATIVE_DURABLE_STORAGE_OPERATION_TIMEOUT"));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private async probeLegacyStore(
    store: EstimateRevisionDurableStore,
    timeoutMs: number,
  ): Promise<HealthyLegacyStore | null> {
    try {
      return {
        store,
        keys: await this.bounded(store.listKeys(), timeoutMs),
      };
    } catch {
      return null;
    }
  }

  private async publishBackendMarker(input: {
    key: string;
    bundle: RevisionBundle;
    migrationState: NativeDurableBackendMarker["migrationState"];
  }): Promise<void> {
    const serialized = serializeRevisionBundle(input.bundle);
    const marker: NativeDurableBackendMarker = {
      schemaVersion: "estimate_revision_native_backend_marker_v1",
      activeBackend: NATIVE_ESTIMATE_REVISION_BACKEND_ID,
      legacyBackend: input.migrationState === "migrated_from_legacy"
        ? LEGACY_NATIVE_ESTIMATE_REVISION_BACKEND_ID
        : null,
      migrationState: input.migrationState,
      version: serialized.version,
      checksum: serialized.checksum,
    };
    try {
      await this.bounded(
        this.markerStorage.setItem(
          backendMarkerKey(input.key),
          JSON.stringify(marker),
        ),
        this.healthTimeoutMs,
      );
    } catch {
      // The immutable revision plus its pointer remain authoritative. A marker
      // is diagnostic migration metadata and is never the commit point.
    }
  }

  private async migrateLegacyBundle(
    key: string,
  ): Promise<RevisionBundle | null> {
    const existingQueue = this.migrationQueues.get(key);
    if (existingQueue) return existingQueue;
    const migration = (async () => {
      const primary = await this.primaryStore.recoverLastValid(key);
      if (primary) return primary;
      const legacy = await this.healthyLegacyStore;
      if (!legacy?.keys.includes(key)) return null;
      const legacyBundle = await this.bounded(
        legacy.store.recoverLastValid(key),
        this.healthTimeoutMs,
      ).catch(() => null);
      if (!legacyBundle) return null;
      const result = await this.primaryStore.writeBundleAtomically(
        key,
        null,
        legacyBundle,
      );
      if (result.status === "FAILED") {
        // A competing primary commit wins deterministically. Otherwise expose
        // the untouched legacy value read-only; migration remains repeatable.
        return await this.primaryStore.recoverLastValid(key) ?? legacyBundle;
      }
      const migrated = await this.primaryStore.recoverLastValid(key);
      if (
        !migrated ||
        serializeRevisionBundle(migrated).checksum !==
          serializeRevisionBundle(legacyBundle).checksum
      ) {
        return legacyBundle;
      }
      await this.publishBackendMarker({
        key,
        bundle: migrated,
        migrationState: "migrated_from_legacy",
      });
      return migrated;
    })().finally(() => {
      if (this.migrationQueues.get(key) === migration) {
        this.migrationQueues.delete(key);
      }
    });
    this.migrationQueues.set(key, migration);
    return migration;
  }

  async readBundle(key: string): Promise<RevisionBundle | null> {
    return await this.primaryStore.readBundle(key) ??
      this.migrateLegacyBundle(key);
  }

  async writeBundleAtomically(
    key: string,
    expectedVersion: string | null,
    bundle: RevisionBundle,
  ): Promise<DurableWriteResult> {
    const primary = await this.primaryStore.readBundle(key);
    if (!primary) await this.migrateLegacyBundle(key);
    const result = await this.primaryStore.writeBundleAtomically(
      key,
      expectedVersion,
      bundle,
    );
    if (result.status !== "FAILED") {
      await this.publishBackendMarker({
        key,
        bundle,
        migrationState: "primary",
      });
    }
    return result;
  }

  async recoverLastValid(key: string): Promise<RevisionBundle | null> {
    return await this.primaryStore.recoverLastValid(key) ??
      this.migrateLegacyBundle(key);
  }

  async deleteOrphans(key: string): Promise<void> {
    await this.primaryStore.deleteOrphans(key);
  }

  async listKeys(): Promise<string[]> {
    const primaryKeys = await this.primaryStore.listKeys();
    const legacy = await this.healthyLegacyStore;
    return [...new Set([
      ...primaryKeys,
      ...(legacy?.keys ?? []),
    ])].sort();
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
  const asyncStorage = input.asyncStorage ?? AsyncStorage;
  const asyncStoragePrimary = new AsyncStorageEstimateRevisionDurableStore(
    asyncStorage,
    {
      failureInjector: input.failureInjector,
    },
  );
  // Never reflectively probe optional native modules on the render path.
  // Older binaries can advertise a module whose synchronous lookup or open
  // handshake blocks the JS thread. SQLite is therefore opt-in through an
  // explicit adapter and must still pass the bounded operational health check.
  if (!input.sqliteModule && !input.legacySQLiteStore) {
    return asyncStoragePrimary;
  }
  const legacyStore = input.legacySQLiteStore ??
    new SQLiteEstimateRevisionDurableStore(() =>
      input.sqliteModule!.openDatabaseAsync("rik-estimate-revisions.db")
    );
  return new ReadThroughMigratingNativeEstimateRevisionDurableStore({
    primaryStore: asyncStoragePrimary,
    legacyStore,
    markerStorage: asyncStorage,
    healthTimeoutMs: Math.max(
      1,
      input.sqliteHealthTimeoutMs ?? DEFAULT_SQLITE_HEALTH_TIMEOUT_MS,
    ),
  });
}
