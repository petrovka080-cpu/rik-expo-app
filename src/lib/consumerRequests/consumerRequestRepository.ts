import type { ConsumerRepairDraftBundle, ConsumerRepairStatus } from "./consumerRequestTypes";
import { safeJsonParseValue, safeJsonStringify } from "../format";
import {
  bindConsumerRepairEstimateRevisionHistory,
  ensureConsumerRepairBundleEditableEstimateSnapshot,
  ensureConsumerRepairBundleEstimateRevisionState,
} from "./consumerRequestEditableEstimateSnapshot";

const store = {
  bundles: new Map<string, ConsumerRepairDraftBundle>(),
};

export const CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY = "rik.consumer_repair.request_bundles.v1";
export const CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY = "rik.consumer_repair.request_bundles.v2.manifest";
export const CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX = "rik.consumer_repair.request_bundle.v2:";

type ConsumerRepairDurableManifest = {
  version: 2;
  bundleIds: string[];
  recordCount: number;
  updatedAt: string;
};

type ConsumerRepairDurableV2Snapshot = {
  manifestRaw: string | null;
  records: { key: string; raw: string }[];
};

let durableHydrated = false;
let legacyMigrationPending = false;

export type ConsumerRepairHistoryPageOptions = {
  cursorCreatedAt?: string | null;
  limit?: number;
  statuses?: ConsumerRepairStatus[];
};

export function cloneConsumerRepairValue<T>(value: T): T {
  return safeJsonParseValue<T>(safeJsonStringify(value), value);
}

function getWebDurableStorage(): Storage | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    return null;
  }
  return null;
}

function durableBundleKey(requestDraftId: string): string {
  return `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(requestDraftId)}`;
}

function requestDraftIdFromDurableBundleKey(key: string): string | null {
  if (!key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX)) return null;
  const encoded = key.slice(CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX.length);
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded || null;
  }
}

function listDurableStorageKeys(storage: Storage): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key) keys.push(key);
  }
  return keys;
}

function parseDurableManifest(raw: string | null | undefined): ConsumerRepairDurableManifest | null {
  const manifest = safeJsonParseValue<Partial<ConsumerRepairDurableManifest> | null>(raw, null);
  if (!manifest || manifest.version !== 2 || !Array.isArray(manifest.bundleIds)) return null;
  return {
    version: 2,
    bundleIds: manifest.bundleIds.filter((id): id is string => typeof id === "string" && id.length > 0),
    recordCount: typeof manifest.recordCount === "number" ? manifest.recordCount : manifest.bundleIds.length,
    updatedAt: typeof manifest.updatedAt === "string" ? manifest.updatedAt : new Date(0).toISOString(),
  };
}

function parseDurableBundle(raw: string | null | undefined): ConsumerRepairDraftBundle | null {
  const bundle = safeJsonParseValue<ConsumerRepairDraftBundle | null>(raw, null);
  return bundle?.draft?.id ? bundle : null;
}

function readLegacyDurableBundles(storage: Storage): ConsumerRepairDraftBundle[] {
  try {
    const persisted = safeJsonParseValue<ConsumerRepairDraftBundle[]>(
      storage.getItem(CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY),
      [],
    );
    return persisted.filter((bundle) => Boolean(bundle?.draft?.id));
  } catch {
    return [];
  }
}

function readDurableRecordIds(storage: Storage): string[] {
  const ids = new Set<string>();
  try {
    parseDurableManifest(storage.getItem(CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY))
      ?.bundleIds.forEach((id) => ids.add(id));
  } catch {
    // Prefix scan below is the recovery path for a stale or unreadable manifest.
  }
  for (const key of listDurableStorageKeys(storage)) {
    const id = requestDraftIdFromDurableBundleKey(key);
    if (id) ids.add(id);
  }
  return Array.from(ids);
}

function snapshotDurableV2Storage(storage: Storage): ConsumerRepairDurableV2Snapshot {
  return {
    manifestRaw: storage.getItem(CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY),
    records: listDurableStorageKeys(storage)
      .filter((key) => key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX))
      .map((key) => ({ key, raw: storage.getItem(key) ?? "" })),
  };
}

function clearDurableV2Storage(storage: Storage): void {
  storage.removeItem(CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY);
  for (const key of listDurableStorageKeys(storage)) {
    if (key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX)) storage.removeItem(key);
  }
}

function restoreDurableV2Storage(storage: Storage, snapshot: ConsumerRepairDurableV2Snapshot): void {
  clearDurableV2Storage(storage);
  for (const record of snapshot.records) {
    if (record.raw) storage.setItem(record.key, record.raw);
  }
  if (snapshot.manifestRaw != null) {
    storage.setItem(CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY, snapshot.manifestRaw);
  }
}

function hydrateConsumerRepairRequestStore(): void {
  if (durableHydrated) return;
  durableHydrated = true;
  const storage = getWebDurableStorage();
  if (!storage) return;
  const legacyBundles = readLegacyDurableBundles(storage);
  legacyMigrationPending = legacyBundles.length > 0;
  for (const bundle of legacyBundles) {
    store.bundles.set(bundle.draft.id, bundle);
  }
  for (const requestDraftId of readDurableRecordIds(storage)) {
    const bundle = parseDurableBundle(storage.getItem(durableBundleKey(requestDraftId)));
    if (bundle) store.bundles.set(bundle.draft.id, bundle);
  }
}

function buildDurableManifest(): ConsumerRepairDurableManifest {
  return {
    version: 2,
    bundleIds: Array.from(store.bundles.values())
      .sort((a, b) => b.draft.createdAt.localeCompare(a.draft.createdAt))
      .map((bundle) => bundle.draft.id),
    recordCount: store.bundles.size,
    updatedAt: new Date().toISOString(),
  };
}

function persistConsumerRepairDurableManifest(storage: Storage): boolean {
  try {
    storage.setItem(CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY, safeJsonStringify(buildDurableManifest(), "{}"));
    return true;
  } catch {
    return false;
  }
}

function persistConsumerRepairDurableRecord(storage: Storage, bundle: ConsumerRepairDraftBundle): boolean {
  const serialized = safeJsonStringify(compactConsumerRepairBundleForDurableStorage(bundle), "");
  if (!serialized) return false;
  try {
    storage.setItem(durableBundleKey(bundle.draft.id), serialized);
    return true;
  } catch {
    return false;
  }
}

function compactConsumerRepairBundleForDurableStorage(
  bundle: ConsumerRepairDraftBundle,
): ConsumerRepairDraftBundle {
  return {
    ...bundle,
    structuredEstimatePayload: null,
  };
}

function persistAllConsumerRepairDurableRecords(storage: Storage): boolean {
  let allPersisted = true;
  for (const bundle of store.bundles.values()) {
    allPersisted = persistConsumerRepairDurableRecord(storage, bundle) && allPersisted;
  }
  persistConsumerRepairDurableManifest(storage);
  return allPersisted;
}

function migrateLegacyConsumerRepairDurableStore(storage: Storage): void {
  if (!legacyMigrationPending) return;
  const previousV2 = snapshotDurableV2Storage(storage);
  if (persistAllConsumerRepairDurableRecords(storage)) {
    try {
      storage.removeItem(CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY);
    } catch {
      // Keeping legacy is safer than failing the current in-memory flow.
    }
    legacyMigrationPending = false;
    return;
  }

  const legacyRaw = storage.getItem(CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY);
  try {
    storage.removeItem(CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY);
  } catch {
    return;
  }

  if (persistAllConsumerRepairDurableRecords(storage)) {
    legacyMigrationPending = false;
    return;
  }

  try {
    restoreDurableV2Storage(storage, previousV2);
    if (legacyRaw != null) storage.setItem(CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY, legacyRaw);
  } catch {
    // The in-memory store still contains the data; the caller will surface the durable save failure.
  }
  legacyMigrationPending = true;
}

function persistConsumerRepairBundleRecord(bundle: ConsumerRepairDraftBundle): boolean {
  const storage = getWebDurableStorage();
  if (!storage) return true;
  migrateLegacyConsumerRepairDurableStore(storage);
  const recordPersisted = persistConsumerRepairDurableRecord(storage, bundle);
  persistConsumerRepairDurableManifest(storage);
  return recordPersisted;
}

export function saveConsumerRepairBundle(bundle: ConsumerRepairDraftBundle): ConsumerRepairDraftBundle {
  hydrateConsumerRepairRequestStore();
  const normalized = ensureConsumerRepairBundleEstimateRevisionState(
    ensureConsumerRepairBundleEditableEstimateSnapshot(bundle),
  );
  store.bundles.set(bundle.draft.id, cloneConsumerRepairValue(normalized));
  if (!persistConsumerRepairBundleRecord(normalized)) {
    throw new Error("CONSUMER_REPAIR_DURABLE_SAVE_FAILED");
  }
  return cloneConsumerRepairValue(normalized);
}

export function getConsumerRepairBundle(requestDraftId: string): ConsumerRepairDraftBundle {
  hydrateConsumerRepairRequestStore();
  const bundle = store.bundles.get(requestDraftId);
  if (!bundle) throw new Error("Consumer repair request draft not found.");
  return cloneConsumerRepairValue(bundle);
}

export function deleteConsumerRepairBundle(requestDraftId: string): ConsumerRepairDraftBundle {
  hydrateConsumerRepairRequestStore();
  const bundle = store.bundles.get(requestDraftId);
  if (!bundle) throw new Error("Consumer repair request draft not found.");
  const deletedAt = new Date().toISOString();
  const deleted: ConsumerRepairDraftBundle = {
    ...bundle,
    draft: {
      ...bundle.draft,
      status: "deleted_by_user",
      updatedAt: deletedAt,
      deletedAt,
    },
  };
  store.bundles.set(requestDraftId, cloneConsumerRepairValue(deleted));
  if (!persistConsumerRepairBundleRecord(deleted)) {
    throw new Error("CONSUMER_REPAIR_DURABLE_SAVE_FAILED");
  }
  return cloneConsumerRepairValue(deleted);
}

export function listConsumerRepairBundlesForUser(
  consumerUserId: string,
  options: ConsumerRepairHistoryPageOptions = {},
): ConsumerRepairDraftBundle[] {
  hydrateConsumerRepairRequestStore();
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 20);
  const allowedStatuses = options.statuses?.length ? new Set(options.statuses) : null;
  return Array.from(store.bundles.values())
    .filter((bundle) => bundle.draft.consumerUserId === consumerUserId)
    .filter((bundle) => bundle.draft.status !== "deleted_by_user")
    .filter((bundle) => !allowedStatuses || allowedStatuses.has(bundle.draft.status))
    .filter((bundle) => !options.cursorCreatedAt || bundle.draft.createdAt < options.cursorCreatedAt)
    .sort((a, b) => b.draft.createdAt.localeCompare(a.draft.createdAt))
    .slice(0, limit)
    .map((bundle) => cloneConsumerRepairValue(bindConsumerRepairEstimateRevisionHistory({
      bundle,
      history_entry_id: `consumer_repair_history:${bundle.draft.id}`,
    })));
}

export function countConsumerRepairBundlesForUser(
  consumerUserId: string,
  options: Pick<ConsumerRepairHistoryPageOptions, "statuses"> = {},
): number {
  hydrateConsumerRepairRequestStore();
  const allowedStatuses = options.statuses?.length ? new Set(options.statuses) : null;
  return Array.from(store.bundles.values())
    .filter((bundle) => bundle.draft.consumerUserId === consumerUserId)
    .filter((bundle) => bundle.draft.status !== "deleted_by_user")
    .filter((bundle) => !allowedStatuses || allowedStatuses.has(bundle.draft.status))
    .length;
}

export function resetConsumerRepairRequestStoreForTests(): void {
  store.bundles.clear();
  durableHydrated = true;
  legacyMigrationPending = false;
  try {
    const storage = getWebDurableStorage();
    if (!storage) return;
    storage.removeItem(CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY);
    storage.removeItem(CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY);
    for (const key of listDurableStorageKeys(storage)) {
      if (key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX)) storage.removeItem(key);
    }
  } catch {
    // Test cleanup should not fail when web storage is unavailable.
  }
}

export function simulateConsumerRepairRequestStoreReloadForTests(): void {
  store.bundles.clear();
  durableHydrated = false;
}
