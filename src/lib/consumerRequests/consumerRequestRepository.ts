import type { ConsumerRepairDraftBundle, ConsumerRepairStatus } from "./consumerRequestTypes";
import { safeJsonParseValue, safeJsonStringify } from "../format";
import {
  bindConsumerRepairEstimateRevisionHistory,
  ensureConsumerRepairBundleEditableEstimateSnapshot,
  ensureConsumerRepairBundleEstimateRevisionState,
} from "./consumerRequestEditableEstimateSnapshot";
import {
  compactConsumerRepairApprovedHistorySummaryBundleForDurableStorage,
  compactConsumerRepairBundleForDurableStorage,
  compactConsumerRepairBundleForEmergencyDurableStorage,
  decodeConsumerRepairBundleFromDurableStorage,
  encodeConsumerRepairBundleForDurableStorage,
} from "../platform/compactConsumerRepairDurableState";
import {
  appendConsumerRepairDurableSaveDiagnosticEvent,
  consumerRepairDurableEvictionPriority,
  isConsumerRepairApprovedHistoryStatus,
  isConsumerRepairDurableEvictionCandidate,
  resetConsumerRepairDurableSaveDiagnosticsForTests,
} from "../platform/consumerRepairDurableSavePolicy";
import {
  resetConsumerRepairAiEstimateLedgerForTests,
  syncConsumerRepairBundleToAiEstimateLedger,
} from "./consumerRequestLedgerBridge";

const store = {
  bundles: new Map<string, ConsumerRepairDraftBundle>(),
};

const APPROVED_HISTORY_FULL_DURABLE_RECORD_LIMIT = 6;

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
const durablePrunedBundleIds = new Set<string>();

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
  const value = safeJsonParseValue<unknown | null>(raw, null);
  return decodeConsumerRepairBundleFromDurableStorage(value);
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
      .filter((bundle) => !durablePrunedBundleIds.has(bundle.draft.id))
      .sort((a, b) => b.draft.createdAt.localeCompare(a.draft.createdAt))
      .map((bundle) => bundle.draft.id),
    recordCount: Array.from(store.bundles.values())
      .filter((bundle) => !durablePrunedBundleIds.has(bundle.draft.id))
      .length,
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

function persistConsumerRepairDurableRecord(
  storage: Storage,
  bundle: ConsumerRepairDraftBundle,
  input: { emergencyCompact?: boolean } = {},
): boolean {
  const serialized = safeJsonStringify(
    encodeConsumerRepairBundleForDurableStorage(
      input.emergencyCompact
        ? compactConsumerRepairBundleForEmergencyDurableStorage(bundle)
        : compactConsumerRepairBundleForDurableStorage(bundle),
    ),
    "",
  );
  if (!serialized) return false;
  try {
    storage.setItem(durableBundleKey(bundle.draft.id), serialized);
    durablePrunedBundleIds.delete(bundle.draft.id);
    return true;
  } catch {
    return false;
  }
}

function removeLegacyDurableStoreIfV2Exists(storage: Storage): void {
  const hasV2Records = listDurableStorageKeys(storage).some((key) =>
    key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX)
  );
  if (!hasV2Records) return;
  try {
    storage.removeItem(CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY);
    legacyMigrationPending = false;
  } catch {
    // Pruning draft records below remains the next recovery path.
  }
}

function approvedHistoryCreatedAt(bundle: ConsumerRepairDraftBundle): string {
  return bundle.draft.approvedAt ?? bundle.draft.updatedAt ?? bundle.draft.createdAt;
}

function isApprovedHistorySummaryOnlyBundle(bundle: ConsumerRepairDraftBundle): boolean {
  return isConsumerRepairApprovedHistoryStatus(bundle.draft.status) &&
    bundle.items.length === 0 &&
    bundle.durableHistorySummary?.fullSnapshotAvailable === false;
}

function persistConsumerRepairDurableApprovedSummaryRecord(
  storage: Storage,
  bundle: ConsumerRepairDraftBundle,
): boolean {
  const summaryBundle = compactConsumerRepairApprovedHistorySummaryBundleForDurableStorage(bundle);
  const serialized = safeJsonStringify(
    encodeConsumerRepairBundleForDurableStorage(summaryBundle),
    "",
  );
  if (!serialized) return false;
  try {
    storage.setItem(durableBundleKey(summaryBundle.draft.id), serialized);
    store.bundles.set(summaryBundle.draft.id, cloneConsumerRepairValue(summaryBundle));
    durablePrunedBundleIds.delete(summaryBundle.draft.id);
    return true;
  } catch {
    return false;
  }
}

function compactOlderApprovedHistoryRecordsForStorage(
  storage: Storage,
  protectedBundle: ConsumerRepairDraftBundle,
): boolean {
  removeLegacyDurableStoreIfV2Exists(storage);
  const approved = readDurableRecordIds(storage)
    .filter((requestDraftId) => requestDraftId !== protectedBundle.draft.id)
    .map((requestDraftId) =>
      parseDurableBundle(storage.getItem(durableBundleKey(requestDraftId))) ??
      store.bundles.get(requestDraftId) ??
      null
    )
    .filter((candidate): candidate is ConsumerRepairDraftBundle => {
      if (!candidate?.draft?.id) return false;
      return isConsumerRepairApprovedHistoryStatus(candidate.draft.status);
    })
    .sort((left, right) => {
      const byCreatedAt = approvedHistoryCreatedAt(right).localeCompare(approvedHistoryCreatedAt(left));
      return byCreatedAt === 0 ? right.draft.id.localeCompare(left.draft.id) : byCreatedAt;
    });

  let compacted = false;
  for (const candidate of approved.slice(APPROVED_HISTORY_FULL_DURABLE_RECORD_LIMIT)) {
    if (isApprovedHistorySummaryOnlyBundle(candidate)) continue;
    if (!persistConsumerRepairDurableApprovedSummaryRecord(storage, candidate)) return compacted;
    compacted = true;
  }
  if (compacted) persistConsumerRepairDurableManifest(storage);
  return compacted;
}

function pruneDurableDraftRecordsForBundle(
  storage: Storage,
  bundle: ConsumerRepairDraftBundle,
  input: { emergencyCompact?: boolean } = {},
): boolean {
  removeLegacyDurableStoreIfV2Exists(storage);
  const candidates = readDurableRecordIds(storage)
    .filter((requestDraftId) => requestDraftId !== bundle.draft.id)
    .map((requestDraftId) =>
      parseDurableBundle(storage.getItem(durableBundleKey(requestDraftId))) ??
      store.bundles.get(requestDraftId) ??
      null
    )
    .filter((candidate): candidate is ConsumerRepairDraftBundle => {
      if (candidate === null || !candidate.draft.id) return false;
      return isConsumerRepairDurableEvictionCandidate(candidate);
    })
    .sort((left, right) => {
      const priority = consumerRepairDurableEvictionPriority(left) - consumerRepairDurableEvictionPriority(right);
      if (priority !== 0) return priority;
      return left.draft.createdAt.localeCompare(right.draft.createdAt);
    });

  for (const candidate of candidates) {
    try {
      storage.removeItem(durableBundleKey(candidate.draft.id));
      durablePrunedBundleIds.add(candidate.draft.id);
      persistConsumerRepairDurableManifest(storage);
      if (persistConsumerRepairDurableRecord(storage, bundle, input)) {
        persistConsumerRepairDurableManifest(storage);
        return true;
      }
    } catch {
      // Continue pruning lower-value durable cache entries before giving up.
    }
  }
  return false;
}

function persistAllConsumerRepairDurableRecords(storage: Storage): boolean {
  let allPersisted = true;
  for (const bundle of store.bundles.values()) {
    if (durablePrunedBundleIds.has(bundle.draft.id)) continue;
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
  compactOlderApprovedHistoryRecordsForStorage(storage, bundle);
  const recordPersisted =
    persistConsumerRepairDurableRecord(storage, bundle) ||
    (compactOlderApprovedHistoryRecordsForStorage(storage, bundle) &&
      persistConsumerRepairDurableRecord(storage, bundle)) ||
    pruneDurableDraftRecordsForBundle(storage, bundle) ||
    persistConsumerRepairDurableRecord(storage, bundle, { emergencyCompact: true }) ||
    (compactOlderApprovedHistoryRecordsForStorage(storage, bundle) &&
      persistConsumerRepairDurableRecord(storage, bundle, { emergencyCompact: true })) ||
    pruneDurableDraftRecordsForBundle(storage, bundle, { emergencyCompact: true });
  persistConsumerRepairDurableManifest(storage);
  return recordPersisted;
}

export function saveConsumerRepairBundle(bundle: ConsumerRepairDraftBundle): ConsumerRepairDraftBundle {
  hydrateConsumerRepairRequestStore();
  const normalized = ensureConsumerRepairBundleEstimateRevisionState(
    ensureConsumerRepairBundleEditableEstimateSnapshot(bundle),
  );
  store.bundles.set(bundle.draft.id, cloneConsumerRepairValue(normalized));
  syncConsumerRepairBundleToAiEstimateLedger(normalized);
  if (!persistConsumerRepairBundleRecord(normalized)) {
    const memoryOnly = appendConsumerRepairDurableSaveDiagnosticEvent({
      bundle: normalized,
      reason: "durable_persist_failed_memory_only_request_kept_alive",
    });
    store.bundles.set(bundle.draft.id, cloneConsumerRepairValue(memoryOnly));
    syncConsumerRepairBundleToAiEstimateLedger(memoryOnly);
    return cloneConsumerRepairValue(memoryOnly);
  }
  return cloneConsumerRepairValue(normalized);
}

function bundleHasPreparedRevisionState(bundle: ConsumerRepairDraftBundle): boolean {
  const currentRevisionId = bundle.estimateRevisionState?.current_revision_id;
  if (!currentRevisionId || !bundle.editableEstimateSnapshot) return false;
  return Boolean(bundle.estimateRevisionState?.revisions.some((revision) =>
    revision.revision_id === currentRevisionId &&
    revision.editable_estimate_snapshot.hash === bundle.editableEstimateSnapshot?.hash
  ));
}

export function savePreparedConsumerRepairBundle(bundle: ConsumerRepairDraftBundle): ConsumerRepairDraftBundle {
  hydrateConsumerRepairRequestStore();
  if (!bundleHasPreparedRevisionState(bundle)) return saveConsumerRepairBundle(bundle);
  store.bundles.set(bundle.draft.id, bundle);
  syncConsumerRepairBundleToAiEstimateLedger(bundle);
  if (!persistConsumerRepairBundleRecord(bundle)) {
    const memoryOnly = appendConsumerRepairDurableSaveDiagnosticEvent({
      bundle,
      reason: "prepared_durable_persist_failed_memory_only_request_kept_alive",
    });
    store.bundles.set(bundle.draft.id, memoryOnly);
    syncConsumerRepairBundleToAiEstimateLedger(memoryOnly);
    return memoryOnly;
  }
  return bundle;
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
  syncConsumerRepairBundleToAiEstimateLedger(deleted);
  if (!persistConsumerRepairBundleRecord(deleted)) {
    const memoryOnly = appendConsumerRepairDurableSaveDiagnosticEvent({
      bundle: deleted,
      reason: "durable_delete_persist_failed_memory_only_request_kept_alive",
    });
    store.bundles.set(requestDraftId, cloneConsumerRepairValue(memoryOnly));
    syncConsumerRepairBundleToAiEstimateLedger(memoryOnly);
    return cloneConsumerRepairValue(memoryOnly);
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

export function hydrateConsumerRepairRequestStoreForLedger(): void {
  hydrateConsumerRepairRequestStore();
  for (const bundle of store.bundles.values()) {
    syncConsumerRepairBundleToAiEstimateLedger(bundle);
  }
}

export function resetConsumerRepairRequestStoreForTests(): void {
  store.bundles.clear();
  durableHydrated = true;
  legacyMigrationPending = false;
  durablePrunedBundleIds.clear();
  resetConsumerRepairDurableSaveDiagnosticsForTests();
  resetConsumerRepairAiEstimateLedgerForTests();
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
