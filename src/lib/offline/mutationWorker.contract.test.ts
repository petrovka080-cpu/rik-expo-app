jest.mock("../observability/platformObservability", () => ({
  recordPlatformObservability: jest.fn(),
}));

import { createMemoryOfflineStorage } from "./offlineStorage";
import {
  clearForemanMutationQueue,
  configureMutationQueue,
  enqueueForemanMutation,
  loadForemanMutationQueue,
  markForemanMutationInflight,
} from "./mutationQueue";
import {
  flushForemanMutationQueue,
} from "./mutationWorker";
import {
  clearForemanDurableDraftState,
  configureForemanDurableDraftStore,
  getForemanDurableDraftState,
  replaceForemanDurableDraftSnapshot,
} from "../../screens/foreman/foreman.durableDraft.store";
import type {
  ForemanLocalDraftSnapshot,
  ForemanLocalDraftSyncResult,
} from "../../screens/foreman/foreman.localDraft";
import {
  getOfflineMutationTelemetryEvents,
  resetOfflineMutationTelemetryEvents,
} from "./mutation.telemetry";
import {
  getPlatformOfflineTelemetryEvents,
  resetPlatformOfflineTelemetryEvents,
} from "./platformOffline.observability";

const MUTATION_QUEUE_STORAGE_KEY = "offline_mutation_queue_v2";

type SeedEntryParams = {
  id: string;
  draftKey: string;
  createdAt: number;
  lifecycleStatus?: string;
  status?: string;
  attemptCount?: number;
  retryCount?: number;
  lastErrorKind?: string;
};

const createSnapshot = (requestId: string): ForemanLocalDraftSnapshot => ({
  version: 1,
  ownerId: `srv:${requestId}`,
  requestId,
  displayNo: `REQ-${requestId}`,
  status: "draft",
  header: {
    foreman: "Wave3 Foreman",
    comment: "offline test",
    objectType: "OBJ",
    level: "L1",
    system: "SYS",
    zone: "Z1",
  },
  items: [],
  qtyDrafts: {},
  pendingDeletes: [],
  submitRequested: false,
  lastError: null,
  updatedAt: "2026-03-31T10:00:00.000Z",
});

const createSyncResult = (
  snapshot: ForemanLocalDraftSnapshot | null,
): ForemanLocalDraftSyncResult => ({
  snapshot,
  rows: [],
  submitted: null,
});

const createSeedEntry = (params: SeedEntryParams) => ({
  id: params.id,
  owner: "foreman",
  entityType: "foreman_draft",
  entityId: params.draftKey,
  scope: "foreman_draft",
  type: "background_sync",
  dedupeKey: `seed:${params.draftKey}:${params.id}`,
  baseVersion: "snap-seed",
  serverVersionHint: null,
  coalescedCount: 0,
  payload: {
    draftKey: params.draftKey,
    requestId: params.draftKey,
    snapshotUpdatedAt: "snap-seed",
    mutationKind: "background_sync",
    localBeforeCount: 1,
    localAfterCount: 1,
    submitRequested: false,
    triggerSource: "manual_retry",
  },
  createdAt: params.createdAt,
  updatedAt: params.createdAt,
  attemptCount: params.attemptCount ?? 0,
  retryCount: params.retryCount ?? 0,
  status: params.status ?? "pending",
  lifecycleStatus: params.lifecycleStatus ?? "queued",
  lastAttemptAt: null,
  lastError: null,
  lastErrorCode: null,
  lastErrorKind: params.lastErrorKind ?? "none",
  nextRetryAt: null,
  maxAttempts: 5,
});

const configureStores = () => {
  configureMutationQueue({ storage: createMemoryOfflineStorage() });
  configureForemanDurableDraftStore({ storage: createMemoryOfflineStorage() });
};

const createWorkerDeps = (options: {
  snapshot: ForemanLocalDraftSnapshot | null;
  syncSnapshot: (params: unknown) => Promise<ForemanLocalDraftSyncResult>;
  inspectRemoteDraft?: jest.Mock;
  onSubmitted?: jest.Mock;
  getNetworkOnline?: () => boolean | null;
}) => {
  let currentSnapshot = options.snapshot;
  return {
    deps: {
      getSnapshot: () => currentSnapshot,
      buildRequestDraftMeta: () => ({}) as never,
      persistSnapshot: jest.fn(async (snapshot: ForemanLocalDraftSnapshot | null) => {
        currentSnapshot = snapshot;
        await replaceForemanDurableDraftSnapshot(snapshot);
      }),
      applySnapshotToBoundary: jest.fn(async (snapshot: ForemanLocalDraftSnapshot | null) => {
        currentSnapshot = snapshot;
        await replaceForemanDurableDraftSnapshot(snapshot);
      }),
      onSubmitted: options.onSubmitted,
      getNetworkOnline: options.getNetworkOnline,
      inspectRemoteDraft: options.inspectRemoteDraft,
      syncSnapshot: options.syncSnapshot,
    },
    getCurrentSnapshot: () => currentSnapshot,
  };
};

describe("mutationWorker contract", () => {
  beforeEach(async () => {
    configureStores();
    resetOfflineMutationTelemetryEvents();
    resetPlatformOfflineTelemetryEvents();
    await clearForemanMutationQueue();
    await clearForemanDurableDraftState();
  });

  it("turns retryable sync failures into retry_scheduled queue state", async () => {
    const snapshot = createSnapshot("req-worker-retry");
    await replaceForemanDurableDraftSnapshot(snapshot);
    await enqueueForemanMutation({
      draftKey: snapshot.requestId,
      requestId: snapshot.requestId,
      snapshotUpdatedAt: snapshot.updatedAt,
      mutationKind: "background_sync",
      triggerSource: "manual_retry",
    });

    const syncSnapshot = jest.fn(async (_params: unknown) => {
      throw new Error("Network request failed");
    });
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
      getNetworkOnline: () => false,
    });

    const result = await flushForemanMutationQueue(deps);
    const queue = await loadForemanMutationQueue();
    const durableState = getForemanDurableDraftState();

    expect(result).toMatchObject({
      failed: true,
      processedCount: 0,
      remainingCount: 1,
    });
    expect(queue[0]).toMatchObject({
      lifecycleStatus: "retry_scheduled",
      status: "failed",
      lastErrorKind: "network_unreachable",
    });
    expect(queue[0].nextRetryAt).toEqual(expect.any(Number));
    expect(durableState.syncStatus).toBe("retry_wait");
    expect(getOfflineMutationTelemetryEvents().map((event) => event.action)).toContain("retry_scheduled");
    expect(getPlatformOfflineTelemetryEvents().some((event) => event.syncStatus === "retry_wait")).toBe(true);
  });

  it("turns exhausted retries into failed_non_retryable terminal state", async () => {
    const snapshot = createSnapshot("req-worker-exhausted");
    await replaceForemanDurableDraftSnapshot(snapshot);
    const storage = createMemoryOfflineStorage({
      [MUTATION_QUEUE_STORAGE_KEY]: JSON.stringify([
        createSeedEntry({
          id: "exhausted-1",
          draftKey: snapshot.requestId,
          createdAt: 1,
          attemptCount: 5,
        }),
      ]),
    });
    configureMutationQueue({ storage });

    const syncSnapshot = jest.fn(async (_params: unknown) => {
      throw new Error("Network request failed");
    });
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
      getNetworkOnline: () => true,
    });

    const result = await flushForemanMutationQueue(deps);
    const queue = await loadForemanMutationQueue();
    const durableState = getForemanDurableDraftState();

    expect(result.failed).toBe(true);
    expect(queue[0]).toMatchObject({
      lifecycleStatus: "failed_non_retryable",
      status: "failed",
      lastErrorKind: "network_unreachable",
    });
    expect(durableState.syncStatus).toBe("failed_terminal");
    expect(getOfflineMutationTelemetryEvents().map((event) => event.action)).toContain("retry_exhausted");
  });

  it("turns stale/conflict failures into conflicted queue state", async () => {
    const snapshot = createSnapshot("req-worker-conflict");
    await replaceForemanDurableDraftSnapshot(snapshot);
    await enqueueForemanMutation({
      draftKey: snapshot.requestId,
      requestId: snapshot.requestId,
      snapshotUpdatedAt: snapshot.updatedAt,
      mutationKind: "qty_update",
      triggerSource: "manual_retry",
    });

    const syncSnapshot = jest.fn(async (_params: unknown) => {
      throw new Error("Version mismatch against remote draft");
    });
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
      getNetworkOnline: () => true,
    });

    const result = await flushForemanMutationQueue(deps);
    const queue = await loadForemanMutationQueue();
    const durableState = getForemanDurableDraftState();

    expect(result.failed).toBe(true);
    expect(queue[0]).toMatchObject({
      lifecycleStatus: "conflicted",
      status: "failed",
      lastErrorKind: "stale_state",
    });
    expect(durableState.syncStatus).toBe("failed_terminal");
    expect(durableState.conflictType).toBe("stale_local_snapshot");
    expect(getOfflineMutationTelemetryEvents().map((event) => event.action)).toContain("conflict_detected");
  });

  it("restores stuck processing mutations before retrying them through the worker", async () => {
    const snapshot = createSnapshot("req-worker-recover");
    await replaceForemanDurableDraftSnapshot(snapshot);
    await enqueueForemanMutation({
      draftKey: snapshot.requestId,
      requestId: snapshot.requestId,
      snapshotUpdatedAt: snapshot.updatedAt,
      mutationKind: "background_sync",
      triggerSource: "manual_retry",
    });
    const [queuedEntry] = await loadForemanMutationQueue();
    await markForemanMutationInflight(queuedEntry.id);

    const syncSnapshot = jest.fn(async (_params: unknown) => createSyncResult(snapshot));
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
      getNetworkOnline: () => true,
    });

    const result = await flushForemanMutationQueue(deps);
    const queue = await loadForemanMutationQueue();

    expect(result).toMatchObject({
      failed: false,
      processedCount: 1,
      remainingCount: 0,
    });
    expect(queue).toHaveLength(0);
    expect(syncSnapshot).toHaveBeenCalledTimes(1);
    expect(getOfflineMutationTelemetryEvents().map((event) => event.action)).toEqual(
      expect.arrayContaining(["inflight_restored", "succeeded"]),
    );
  });

  it("removes completed mutations from active processing and does not reprocess them on the next flush", async () => {
    const snapshot = createSnapshot("req-worker-complete");
    await replaceForemanDurableDraftSnapshot(snapshot);
    await enqueueForemanMutation({
      draftKey: snapshot.requestId,
      requestId: snapshot.requestId,
      snapshotUpdatedAt: snapshot.updatedAt,
      mutationKind: "background_sync",
      triggerSource: "manual_retry",
    });

    const syncSnapshot = jest.fn(async (_params: unknown) => createSyncResult(snapshot));
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
      getNetworkOnline: () => true,
    });

    const firstFlush = await flushForemanMutationQueue(deps);
    const secondFlush = await flushForemanMutationQueue(deps);
    const queue = await loadForemanMutationQueue();
    const durableState = getForemanDurableDraftState();

    expect(firstFlush).toMatchObject({
      failed: false,
      processedCount: 1,
      remainingCount: 0,
    });
    expect(secondFlush).toMatchObject({
      failed: false,
      processedCount: 0,
      remainingCount: 0,
    });
    expect(queue).toHaveLength(0);
    expect(syncSnapshot).toHaveBeenCalledTimes(1);
    expect(durableState.syncStatus).toBe("synced");
  });
});
