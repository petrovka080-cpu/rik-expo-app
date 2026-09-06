import type { ConsumerRepairDraftBundle, ConsumerRepairStatus } from "./consumerRequestTypes";
import { canonicalBackendRevisionProjectionForSave } from "./consumerCanonicalBackendRevisionProjection";
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
import {
  awaitTransactionalConsumerRepairBundleCommit,
  hasPendingTransactionalConsumerRepairBundleWrite,
  isLargeConsumerRepairRevisionBundle,
  listTransactionalConsumerRepairBundleIds,
  listTransactionalConsumerRepairDurableBundleIds,
  queueTransactionalConsumerRepairBundleWrite,
  readTransactionalConsumerRepairBundle,
  setConsumerRepairTransactionalStoreForTests,
} from "../platform/consumerRepairTransactionalDurableBridge";
import type { EstimateRevisionDurableStore } from "../platform/estimateRevisionDurableStore";

const store = {
  bundles: new Map<string, ConsumerRepairDraftBundle>(),
};

const APPROVED_HISTORY_FULL_DURABLE_RECORD_LIMIT = 6;
export const TRANSACTIONAL_CONSUMER_REPAIR_HYDRATION_PAGE_SIZE = 20;

export const CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY = "rik.consumer_repair.request_bundles.v1";
export const CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY = "rik.consumer_repair.request_bundles.v2.manifest";
export const CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX = "rik.consumer_repair.request_bundle.v2:";
export const CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX = "rik.consumer_repair.request_snapshot.v3:";
export const CONSUMER_REPAIR_DURABLE_STORE_POINTER_KEY_PREFIX = "rik.consumer_repair.request_pointer.v3:";

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
let transactionalDurableBundleIndexInitialized = false;
let transactionalDurableBundleIds: string[] = [];
const hydratedTransactionalDurableBundleIds = new Set<string>();
let transactionalHydrationQueue: Promise<void> = Promise.resolve();

export type ConsumerRepairHistoryPageOptions = {
  cursorCreatedAt?: string | null;
  limit?: number;
  statuses?: ConsumerRepairStatus[];
};

export function cloneConsumerRepairValue<T>(value: T): T {
  const clone = (globalThis as typeof globalThis & {
    structuredClone?: <TValue>(input: TValue) => TValue;
  }).structuredClone;
  if (typeof clone === "function") {
    try {
      return clone(value);
    } catch {
      // Fall back for runtimes that expose structuredClone but reject host values.
    }
  }
  return safeJsonParseValue<T>(safeJsonStringify(value), value);
}

function normalizeEstimateDraftSessionCompatibilityView(
  bundle: ConsumerRepairDraftBundle,
): ConsumerRepairDraftBundle {
  const session = bundle.estimateDraftSession;
  if (!session) return bundle;
  if (session.draftId !== bundle.draft.id) {
    throw new Error("ESTIMATE_DRAFT_SESSION_BUNDLE_ID_MISMATCH");
  }
  const requirement = session.status === "SCOPE_REQUIRED"
    ? session.scopeRequirement
    : null;
  return {
    ...bundle,
    pendingRoadScopeSelection: requirement
      ? {
        pendingIntentId: `draft-session:${session.draftId}:${session.selectionEpoch}`,
        requestId: session.draftId,
        originalUserText: requirement.originalUserText,
        requestedCatalogWorkId: requirement.requestedCatalogWorkId,
        offeredScopes: [...requirement.offeredScopePresetIds],
        resolverEvidence: [...requirement.resolverEvidence],
        resolverVersion: requirement.resolverVersion,
        createdAt: requirement.createdAt,
      }
      : null,
  };
}

function isReactNativeRuntime(): boolean {
  try {
    return (
      typeof navigator !== "undefined" &&
      navigator.product === "ReactNative"
    );
  } catch {
    return false;
  }
}

function getWebDurableStorage(): Storage | null {
  try {
    if (isReactNativeRuntime()) return null;
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    return null;
  }
  return null;
}

const CONSUMER_REPAIR_DURABLE_OPERATION_TIMEOUT_MS = 3_000;

async function settleDurableOperation<T>(
  operation: Promise<T>,
  fallback: T,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      operation.catch(() => fallback),
      new Promise<T>((resolve) => {
        timeout = setTimeout(
          () => resolve(fallback),
          CONSUMER_REPAIR_DURABLE_OPERATION_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function durableBundleKey(requestDraftId: string): string {
  return `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(requestDraftId)}`;
}

function stableDurableChecksum(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function durablePointerKey(requestDraftId: string): string {
  return `${CONSUMER_REPAIR_DURABLE_STORE_POINTER_KEY_PREFIX}${encodeURIComponent(requestDraftId)}`;
}

function durableSnapshotKey(requestDraftId: string, checksum: string): string {
  return `${CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX}${encodeURIComponent(requestDraftId)}:${checksum}`;
}

type DurablePointerV3 = { version: 3; currentChecksum: string; previousChecksum: string | null };

function parseDurablePointer(raw: string | null): DurablePointerV3 | null {
  const value = safeJsonParseValue<Partial<DurablePointerV3> | null>(raw, null);
  return value?.version === 3 && typeof value.currentChecksum === "string"
    ? {
        version: 3,
        currentChecksum: value.currentChecksum,
        previousChecksum: typeof value.previousChecksum === "string" ? value.previousChecksum : null,
      }
    : null;
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

function readVersionedDurableBundle(storage: Storage, requestDraftId: string): ConsumerRepairDraftBundle | null {
  const pointer = parseDurablePointer(storage.getItem(durablePointerKey(requestDraftId)));
  if (!pointer) return null;
  for (const checksum of [pointer.currentChecksum, pointer.previousChecksum]) {
    if (!checksum) continue;
    const raw = storage.getItem(durableSnapshotKey(requestDraftId, checksum));
    if (!raw || stableDurableChecksum(raw) !== checksum) continue;
    const bundle = parseDurableBundle(raw);
    if (bundle?.draft.id === requestDraftId) {
      const recoveredPointer: DurablePointerV3 = checksum === pointer.currentChecksum
        ? pointer
        : { version: 3, currentChecksum: checksum, previousChecksum: null };
      try {
        if (checksum !== pointer.currentChecksum) {
          storage.setItem(durablePointerKey(requestDraftId), safeJsonStringify(recoveredPointer, "{}"));
        }
        const retained = new Set(
          [recoveredPointer.currentChecksum, recoveredPointer.previousChecksum].filter(Boolean),
        );
        const ownPrefix = `${CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX}${encodeURIComponent(requestDraftId)}:`;
        for (const key of listDurableStorageKeys(storage)) {
          if (key.startsWith(ownPrefix) && !retained.has(key.slice(ownPrefix.length))) storage.removeItem(key);
        }
      } catch {
        // Recovery remains readable even when best-effort cleanup cannot be persisted.
      }
      return bundle;
    }
  }
  return null;
}

function readDurableBundle(storage: Storage, requestDraftId: string): ConsumerRepairDraftBundle | null {
  return readVersionedDurableBundle(storage, requestDraftId)
    ?? parseDurableBundle(storage.getItem(durableBundleKey(requestDraftId)));
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
    if (key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_POINTER_KEY_PREFIX)) {
      const encoded = key.slice(CONSUMER_REPAIR_DURABLE_STORE_POINTER_KEY_PREFIX.length);
      try {
        ids.add(decodeURIComponent(encoded));
      } catch {
        // Ignore malformed secondary pointer; manifest and v2 scan remain available.
      }
      continue;
    }
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
    store.bundles.set(bundle.draft.id, normalizeEstimateDraftSessionCompatibilityView(bundle));
  }
  for (const requestDraftId of readDurableRecordIds(storage)) {
    const bundle = readDurableBundle(storage, requestDraftId);
    if (bundle) {
      store.bundles.set(bundle.draft.id, normalizeEstimateDraftSessionCompatibilityView(bundle));
    }
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
  options: { emergency?: boolean } = {},
): boolean {
  const serialized = safeJsonStringify(
    encodeConsumerRepairBundleForDurableStorage(
      options.emergency
        ? compactConsumerRepairBundleForEmergencyDurableStorage(bundle)
        : compactConsumerRepairBundleForDurableStorage(bundle),
    ),
    "",
  );
  if (!serialized) return false;
  try {
    const checksum = stableDurableChecksum(serialized);
    const pointerKey = durablePointerKey(bundle.draft.id);
    const previous = parseDurablePointer(storage.getItem(pointerKey));
    const compatibilityKey = durableBundleKey(bundle.draft.id);
    const previousCurrentRaw = previous?.currentChecksum
      ? storage.getItem(durableSnapshotKey(bundle.draft.id, previous.currentChecksum))
      : null;
    const previousCurrentIsValid = Boolean(
      previous?.currentChecksum
      && previousCurrentRaw
      && stableDurableChecksum(previousCurrentRaw) === previous.currentChecksum,
    );
    // A normal V3 record already owns two full localStorage copies: the
    // committed snapshot and the V2 compatibility record. Writing the next
    // snapshot before releasing that redundant V2 copy needs three full
    // records and crosses the common Web Storage quota for ~1.7 MiB drafts.
    // Keep the last committed V3 snapshot as the recovery owner, discard only
    // redundant/stale copies, then atomically append and point to the new one.
    if (
      previousCurrentIsValid
      && previous?.currentChecksum !== checksum
    ) {
      storage.removeItem(compatibilityKey);
      if (
        previous?.previousChecksum
        && previous.previousChecksum !== previous.currentChecksum
      ) {
        storage.removeItem(durableSnapshotKey(bundle.draft.id, previous.previousChecksum));
      }
    }
    storage.setItem(durableSnapshotKey(bundle.draft.id, checksum), serialized);
    const nextPointer: DurablePointerV3 =
      previous?.currentChecksum === checksum
        ? previous
        : {
            version: 3,
            currentChecksum: checksum,
            previousChecksum: previousCurrentIsValid
              ? previous?.currentChecksum ?? null
              : null,
          };
    storage.setItem(pointerKey, safeJsonStringify(nextPointer, "{}"));
    try {
      storage.setItem(compatibilityKey, serialized);
    } catch {
      // V3 is already committed. The V2 record is compatibility-only.
    }
    const retained = new Set([nextPointer.currentChecksum, nextPointer.previousChecksum].filter(Boolean));
    const ownPrefix = `${CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX}${encodeURIComponent(bundle.draft.id)}:`;
    for (const key of listDurableStorageKeys(storage)) {
      if (key.startsWith(ownPrefix) && !retained.has(key.slice(ownPrefix.length))) storage.removeItem(key);
    }
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
  options: { updateMemoryStore?: boolean } = {},
): boolean {
  const summaryBundle = compactConsumerRepairApprovedHistorySummaryBundleForDurableStorage(bundle);
  const serialized = safeJsonStringify(
    encodeConsumerRepairBundleForDurableStorage(summaryBundle),
    "",
  );
  if (!serialized) return false;
  try {
    storage.setItem(durableBundleKey(summaryBundle.draft.id), serialized);
    if (options.updateMemoryStore !== false) {
      store.bundles.set(
        summaryBundle.draft.id,
        cloneConsumerRepairValue(summaryBundle),
      );
    }
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
  const transactionallyCommittedIds = new Set(
    listTransactionalConsumerRepairBundleIds(storage),
  );
  const approved = readDurableRecordIds(storage)
    .filter((requestDraftId) => requestDraftId !== protectedBundle.draft.id)
    .map((requestDraftId) =>
      store.bundles.get(requestDraftId) ??
      readDurableBundle(storage, requestDraftId) ??
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

  let migrated = false;
  for (const candidate of approved.slice(APPROVED_HISTORY_FULL_DURABLE_RECORD_LIMIT)) {
    if (isApprovedHistorySummaryOnlyBundle(candidate)) continue;
    const compactCommittedCandidate = () => {
      const latest = store.bundles.get(candidate.draft.id) ?? candidate;
      persistConsumerRepairDurableApprovedSummaryRecord(storage, latest, {
        updateMemoryStore: true,
      });
      hydratedTransactionalDurableBundleIds.delete(candidate.draft.id);
      if (
        transactionalDurableBundleIndexInitialized &&
        !transactionalDurableBundleIds.includes(candidate.draft.id)
      ) {
        transactionalDurableBundleIds = [
          ...transactionalDurableBundleIds,
          candidate.draft.id,
        ].sort(newestTransactionalDraftIdsFirst);
      }
      removeLocalPayloadForTransactionalBundle(storage, candidate.draft.id, true);
      persistConsumerRepairDurableManifest(storage);
    };
    // A transactional pointer is written only after an atomic full-snapshot
    // commit. Re-queueing the same approved bundle on every newer approval
    // made history growth quadratic and delayed the user's acknowledgement.
    if (transactionallyCommittedIds.has(candidate.draft.id)) {
      migrated = true;
      compactCommittedCandidate();
      continue;
    }
    if (hasPendingTransactionalConsumerRepairBundleWrite(candidate.draft.id)) continue;
    migrated = true;
    void queueTransactionalConsumerRepairBundleWrite({
      bundle: candidate,
      storage,
      onCommitted: compactCommittedCandidate,
    });
  }
  return migrated;
}

function pruneDurableDraftRecordsForBundle(
  storage: Storage,
  bundle: ConsumerRepairDraftBundle,
): boolean {
  removeLegacyDurableStoreIfV2Exists(storage);
  const candidates = readDurableRecordIds(storage)
    .filter((requestDraftId) => requestDraftId !== bundle.draft.id)
    .map((requestDraftId) =>
      store.bundles.get(requestDraftId) ??
      readDurableBundle(storage, requestDraftId) ??
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
      storage.removeItem(durablePointerKey(candidate.draft.id));
      const ownPrefix = `${CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX}${encodeURIComponent(candidate.draft.id)}:`;
      for (const key of listDurableStorageKeys(storage)) {
        if (key.startsWith(ownPrefix)) storage.removeItem(key);
      }
      durablePrunedBundleIds.add(candidate.draft.id);
      persistConsumerRepairDurableManifest(storage);
      if (persistConsumerRepairDurableRecord(storage, bundle)) {
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
  const newestApprovedId = [...store.bundles.values()]
    .filter((bundle) => isConsumerRepairApprovedHistoryStatus(bundle.draft.status))
    .sort((left, right) => {
      const byCreatedAt = approvedHistoryCreatedAt(right).localeCompare(approvedHistoryCreatedAt(left));
      return byCreatedAt === 0 ? right.draft.id.localeCompare(left.draft.id) : byCreatedAt;
    })[0]?.draft.id ?? null;
  let allPersisted = true;
  for (const bundle of store.bundles.values()) {
    if (durablePrunedBundleIds.has(bundle.draft.id)) continue;
    const persisted =
      isConsumerRepairApprovedHistoryStatus(bundle.draft.status)
      && bundle.draft.id !== newestApprovedId
        ? persistConsumerRepairDurableApprovedSummaryRecord(storage, bundle, {
            updateMemoryStore: false,
          })
        : persistConsumerRepairDurableRecord(storage, bundle);
    allPersisted = persisted && allPersisted;
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
  if (
    isReactNativeRuntime() ||
    isLargeConsumerRepairRevisionBundle(bundle) ||
    isConsumerRepairApprovedHistoryStatus(bundle.draft.status)
  ) {
    const preserveApprovedSummary =
      isConsumerRepairApprovedHistoryStatus(bundle.draft.status);
    if (storage && preserveApprovedSummary) {
      migrateLegacyConsumerRepairDurableStore(storage);
      compactOlderApprovedHistoryRecordsForStorage(storage, bundle);
      persistConsumerRepairDurableApprovedSummaryRecord(storage, bundle, {
        updateMemoryStore: false,
      });
      persistConsumerRepairDurableManifest(storage);
    }
    void queueTransactionalConsumerRepairBundleWrite({
      bundle,
      storage,
      onCommitted: () => {
        if (storage) {
          const latestBundle = store.bundles.get(bundle.draft.id) ?? bundle;
          const preserveLatestApprovedSummary =
            preserveApprovedSummary ||
            isConsumerRepairApprovedHistoryStatus(latestBundle.draft.status);
          if (preserveLatestApprovedSummary) {
            persistConsumerRepairDurableApprovedSummaryRecord(
              storage,
              latestBundle,
              { updateMemoryStore: false },
            );
          }
          removeLocalPayloadForTransactionalBundle(
            storage,
            bundle.draft.id,
            preserveLatestApprovedSummary,
          );
        }
      },
      onFailed: () => {
        const latest = store.bundles.get(bundle.draft.id);
        if (!latest) return;
        const diagnostic = appendConsumerRepairDurableSaveDiagnosticEvent({
          bundle: latest,
          reason: "transactional_durable_persist_failed_previous_commit_remains_active",
        });
        store.bundles.set(bundle.draft.id, cloneConsumerRepairValue(diagnostic));
        syncConsumerRepairBundleToAiEstimateLedger(diagnostic);
      },
    });
    return true;
  }
  if (!storage) return true;
  migrateLegacyConsumerRepairDurableStore(storage);
  compactOlderApprovedHistoryRecordsForStorage(storage, bundle);
  const recordPersisted =
    persistConsumerRepairDurableRecord(storage, bundle) ||
    (compactOlderApprovedHistoryRecordsForStorage(storage, bundle) &&
      persistConsumerRepairDurableRecord(storage, bundle)) ||
    persistConsumerRepairDurableRecord(storage, bundle, { emergency: true }) ||
    pruneDurableDraftRecordsForBundle(storage, bundle);
  persistConsumerRepairDurableManifest(storage);
  return recordPersisted;
}

function removeLocalPayloadForTransactionalBundle(
  storage: Storage,
  requestDraftId: string,
  preserveApprovedSummary = false,
): void {
  if (!preserveApprovedSummary) {
    storage.removeItem(durableBundleKey(requestDraftId));
  }
  storage.removeItem(durablePointerKey(requestDraftId));
  const ownPrefix =
    `${CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX}${encodeURIComponent(requestDraftId)}:`;
  for (const key of listDurableStorageKeys(storage)) {
    if (key.startsWith(ownPrefix)) storage.removeItem(key);
  }
}

function transactionalDraftIdTimestamp(requestDraftId: string): number | null {
  const timestamp = requestDraftId.match(/^consumer_draft_([0-9a-z]+)_/i)?.[1];
  if (!timestamp) return null;
  const parsed = Number.parseInt(timestamp, 36);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function newestTransactionalDraftIdsFirst(left: string, right: string): number {
  const leftTimestamp = transactionalDraftIdTimestamp(left);
  const rightTimestamp = transactionalDraftIdTimestamp(right);
  if (leftTimestamp != null && rightTimestamp != null && leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }
  if (leftTimestamp != null && rightTimestamp == null) return -1;
  if (leftTimestamp == null && rightTimestamp != null) return 1;
  return right.localeCompare(left);
}

function enqueueTransactionalHydration<T>(operation: () => Promise<T>): Promise<T> {
  const next = transactionalHydrationQueue.then(operation, operation);
  transactionalHydrationQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function initializeTransactionalDurableBundleIndex(storage: Storage | null): Promise<void> {
  if (transactionalDurableBundleIndexInitialized) return;
  const ids = new Set(await settleDurableOperation(
    listTransactionalConsumerRepairDurableBundleIds(),
    [],
  ));
  if (storage) {
    for (const requestDraftId of listTransactionalConsumerRepairBundleIds(storage)) {
      ids.add(requestDraftId);
    }
    for (const requestDraftId of readDurableRecordIds(storage)) {
      const legacyBundle = readDurableBundle(storage, requestDraftId);
      if (!legacyBundle || !isLargeConsumerRepairRevisionBundle(legacyBundle)) continue;
      ids.add(requestDraftId);
      await queueTransactionalConsumerRepairBundleWrite({
        bundle: legacyBundle,
        storage,
        onCommitted: () =>
          removeLocalPayloadForTransactionalBundle(
            storage,
            requestDraftId,
            isConsumerRepairApprovedHistoryStatus(legacyBundle.draft.status),
          ),
      });
    }
  }
  transactionalDurableBundleIds = [...ids].sort(newestTransactionalDraftIdsFirst);
  transactionalDurableBundleIndexInitialized = true;
}

async function hydrateTransactionalDurableBundleIds(
  requestDraftIds: readonly string[],
): Promise<number> {
  const ids = requestDraftIds.filter((requestDraftId) =>
    !hydratedTransactionalDurableBundleIds.has(requestDraftId)
  );
  if (ids.length === 0) return 0;
  const recovered = await Promise.all(ids.map(async (requestDraftId) => ({
    requestDraftId,
    bundle: await readTransactionalConsumerRepairBundle(requestDraftId)
      .catch(() => null),
  })));
  for (const { requestDraftId, bundle } of recovered) {
    hydratedTransactionalDurableBundleIds.add(requestDraftId);
    if (!bundle) continue;
    const normalized = normalizeEstimateDraftSessionCompatibilityView(bundle);
    store.bundles.set(requestDraftId, cloneConsumerRepairValue(normalized));
    syncConsumerRepairBundleToAiEstimateLedger(normalized);
  }
  return ids.length;
}

export async function hydrateTransactionalConsumerRepairRequestStore(
  requestedDraftId?: string,
): Promise<void> {
  hydrateConsumerRepairRequestStore();
  const storage = getWebDurableStorage();
  await enqueueTransactionalHydration(async () => {
    await initializeTransactionalDurableBundleIndex(storage);
    const unhydratedIds = transactionalDurableBundleIds.filter((requestDraftId) =>
      !hydratedTransactionalDurableBundleIds.has(requestDraftId)
    );
    const eagerIds = storage
      ? unhydratedIds
      : unhydratedIds.slice(0, TRANSACTIONAL_CONSUMER_REPAIR_HYDRATION_PAGE_SIZE);
    const exactRequestedDraftId = requestedDraftId?.trim();
    if (
      exactRequestedDraftId
      && transactionalDurableBundleIds.includes(exactRequestedDraftId)
      && !hydratedTransactionalDurableBundleIds.has(exactRequestedDraftId)
      && !eagerIds.includes(exactRequestedDraftId)
    ) {
      eagerIds.push(exactRequestedDraftId);
    }
    await hydrateTransactionalDurableBundleIds(eagerIds);
  });
}

export async function hydrateNextTransactionalConsumerRepairHistoryPage(
  limit = TRANSACTIONAL_CONSUMER_REPAIR_HYDRATION_PAGE_SIZE,
): Promise<number> {
  const boundedLimit = Math.min(
    Math.max(Math.trunc(limit), 1),
    TRANSACTIONAL_CONSUMER_REPAIR_HYDRATION_PAGE_SIZE,
  );
  return enqueueTransactionalHydration(async () => {
    await initializeTransactionalDurableBundleIndex(getWebDurableStorage());
    const nextIds = transactionalDurableBundleIds
      .filter((requestDraftId) => !hydratedTransactionalDurableBundleIds.has(requestDraftId))
      .slice(0, boundedLimit);
    return hydrateTransactionalDurableBundleIds(nextIds);
  });
}

export function hasUnhydratedTransactionalConsumerRepairBundles(): boolean {
  return transactionalDurableBundleIds.some((requestDraftId) =>
    !hydratedTransactionalDurableBundleIds.has(requestDraftId)
  );
}

function isCanonicalBackendOwnedBundle(bundle: ConsumerRepairDraftBundle): boolean {
  if (bundle.items.length === 0) return false;
  const revisionIds = new Set(bundle.items.map((item) =>
    String(item.sourceParameters?.canonicalBackendRevisionId ?? "").trim(),
  ));
  const releaseIds = new Set(bundle.items.map((item) =>
    String(item.sourceParameters?.canonicalBackendReleaseId ?? "").trim(),
  ));
  return revisionIds.size === 1 && releaseIds.size === 1 &&
    !revisionIds.has("") && !releaseIds.has("");
}

export function saveConsumerRepairBundle(bundle: ConsumerRepairDraftBundle): ConsumerRepairDraftBundle {
  hydrateConsumerRepairRequestStore();
  const parameterCollectionOnly = bundle.items.length === 0 &&
    bundle.estimateDraftRevisionState == null &&
    bundle.estimateRevisionState == null &&
    bundle.canonicalParameterSession?.status === "BLOCKING_REQUIRED";
  const canonicalBackendOwned = isCanonicalBackendOwnedBundle(bundle);
  const canonicalBackendCalculationState = canonicalBackendOwned
    ? canonicalBackendRevisionProjectionForSave(bundle)
    : null;
  // A fail-closed parameter session is a request/session artifact, not an
  // estimate. Creating an empty editable snapshot or immutable compatibility
  // revision here would be a partial estimate mutation before P0 is complete.
  const normalized = normalizeEstimateDraftSessionCompatibilityView(
    canonicalBackendOwned
      ? {
        ...bundle,
        editableEstimateSnapshot: undefined,
        estimateRevisionState: undefined,
        estimateDraftRevisionState: canonicalBackendCalculationState,
        estimateDraftSession: null,
        canonicalParameterSession: null,
        pendingRoadScopeSelection: null,
      }
      : parameterCollectionOnly
      ? { ...bundle, editableEstimateSnapshot: null }
      : ensureConsumerRepairBundleEstimateRevisionState(
        ensureConsumerRepairBundleEditableEstimateSnapshot(bundle),
      ),
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
  const normalized = normalizeEstimateDraftSessionCompatibilityView(bundle);
  store.bundles.set(normalized.draft.id, normalized);
  syncConsumerRepairBundleToAiEstimateLedger(normalized);
  if (!persistConsumerRepairBundleRecord(normalized)) {
    const memoryOnly = appendConsumerRepairDurableSaveDiagnosticEvent({
      bundle: normalized,
      reason: "prepared_durable_persist_failed_memory_only_request_kept_alive",
    });
    store.bundles.set(normalized.draft.id, memoryOnly);
    syncConsumerRepairBundleToAiEstimateLedger(memoryOnly);
    return memoryOnly;
  }
  return normalized;
}

export async function awaitConsumerRepairBundleDurableCommit(input: {
  requestDraftId: string;
  expectedStatus: ConsumerRepairDraftBundle["draft"]["status"];
  expectedRevisionId: string | null;
}): Promise<void> {
  const current = store.bundles.get(input.requestDraftId) ?? null;
  if (!current) throw new Error("CONSUMER_REPAIR_DURABLE_COMMIT_BUNDLE_MISSING");
  const storage = getWebDurableStorage();
  const usesTransactionalStorage =
    isReactNativeRuntime() ||
    isLargeConsumerRepairRevisionBundle(current) ||
    isConsumerRepairApprovedHistoryStatus(current.draft.status);
  if (usesTransactionalStorage) {
    await awaitTransactionalConsumerRepairBundleCommit(input);
    return;
  }
  if (!storage) return;
  const persisted = readDurableBundle(storage, input.requestDraftId);
  const persistedRevisionId =
    persisted?.estimateDraftRevisionState?.currentRevisionId ?? null;
  if (
    !persisted ||
    persisted.draft.status !== input.expectedStatus ||
    persistedRevisionId !== input.expectedRevisionId
  ) {
    throw new Error("CONSUMER_REPAIR_LOCAL_DURABLE_COMMIT_NOT_DURABLE");
  }
}

export function findConsumerRepairBundle(
  requestDraftId: string,
): ConsumerRepairDraftBundle | null {
  hydrateConsumerRepairRequestStore();
  let bundle = store.bundles.get(requestDraftId);
  if (!bundle) {
    const storage = getWebDurableStorage();
    const durableBundle = storage
      ? readDurableBundle(storage, requestDraftId)
      : null;
    if (durableBundle) {
      const normalized =
        normalizeEstimateDraftSessionCompatibilityView(durableBundle);
      store.bundles.set(requestDraftId, cloneConsumerRepairValue(normalized));
      syncConsumerRepairBundleToAiEstimateLedger(normalized);
      bundle = normalized;
    }
  }
  return bundle ? cloneConsumerRepairValue(bundle) : null;
}

export function getConsumerRepairBundle(requestDraftId: string): ConsumerRepairDraftBundle {
  const bundle = findConsumerRepairBundle(requestDraftId);
  if (!bundle) {
    const storage = getWebDurableStorage();
    const localRecordPresent = Boolean(
      storage && readDurableRecordIds(storage).includes(requestDraftId),
    );
    const transactionalPointerPresent = Boolean(
      storage &&
        listTransactionalConsumerRepairBundleIds(storage).includes(
          requestDraftId,
        ),
    );
    throw new Error(
      `Consumer repair request draft not found. id=${requestDraftId}; local=${localRecordPresent}; transactionalPointer=${transactionalPointerPresent}`,
    );
  }
  return bundle;
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

/**
 * One-time backend cutover ingress. Call only after transactional hydration has
 * drained; unlike the UI history query this deliberately has no page ceiling.
 * The returned values are clones, so migration cannot mutate local history.
 */
export function listAllConsumerRepairBundlesForBackendMigration(
  consumerUserId: string,
): ConsumerRepairDraftBundle[] {
  hydrateConsumerRepairRequestStore();
  return Array.from(store.bundles.values())
    .filter((bundle) => bundle.draft.consumerUserId === consumerUserId)
    .filter((bundle) => bundle.draft.status !== "deleted_by_user")
    .sort((a, b) => a.draft.createdAt.localeCompare(b.draft.createdAt))
    .map((bundle) => cloneConsumerRepairValue(bundle));
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
  transactionalDurableBundleIndexInitialized = false;
  transactionalDurableBundleIds = [];
  hydratedTransactionalDurableBundleIds.clear();
  transactionalHydrationQueue = Promise.resolve();
  resetConsumerRepairDurableSaveDiagnosticsForTests();
  resetConsumerRepairAiEstimateLedgerForTests();
  setConsumerRepairTransactionalStoreForTests(null);
  try {
    const storage = getWebDurableStorage();
    if (!storage) return;
    storage.removeItem(CONSUMER_REPAIR_DURABLE_STORE_LEGACY_KEY);
    storage.removeItem(CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY);
    for (const key of listDurableStorageKeys(storage)) {
      if (
        key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX) ||
        key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_POINTER_KEY_PREFIX) ||
        key.startsWith(CONSUMER_REPAIR_DURABLE_STORE_SNAPSHOT_KEY_PREFIX)
      ) storage.removeItem(key);
    }
  } catch {
    // Test cleanup should not fail when web storage is unavailable.
  }
}

export function getConsumerRepairRepositoryMemoryStatsForTests(): {
  totalBundles: number;
  approvedFullBundles: number;
  approvedSummaryBundles: number;
} {
  const bundles = [...store.bundles.values()];
  const approved = bundles.filter((bundle) =>
    isConsumerRepairApprovedHistoryStatus(bundle.draft.status)
  );
  return {
    totalBundles: bundles.length,
    approvedFullBundles: approved.filter((bundle) =>
      !isApprovedHistorySummaryOnlyBundle(bundle)
    ).length,
    approvedSummaryBundles: approved.filter(isApprovedHistorySummaryOnlyBundle).length,
  };
}

export function simulateConsumerRepairRequestStoreReloadForTests(): void {
  store.bundles.clear();
  durableHydrated = false;
  transactionalDurableBundleIndexInitialized = false;
  transactionalDurableBundleIds = [];
  hydratedTransactionalDurableBundleIds.clear();
  transactionalHydrationQueue = Promise.resolve();
}

export function setConsumerRepairTransactionalDurableStoreForTests(
  durableStore: EstimateRevisionDurableStore | null,
): void {
  transactionalDurableBundleIndexInitialized = false;
  transactionalDurableBundleIds = [];
  hydratedTransactionalDurableBundleIds.clear();
  transactionalHydrationQueue = Promise.resolve();
  setConsumerRepairTransactionalStoreForTests(durableStore);
}
