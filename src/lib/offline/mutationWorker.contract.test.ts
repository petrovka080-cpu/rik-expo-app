import { createMemoryOfflineStorage } from "./offlineStorage";
import {
  clearForemanMutationQueue,
  configureMutationQueue,
  enqueueForemanMutation,
  loadForemanMutationQueue,
  markForemanMutationInflight,
} from "./mutationQueue";
import {
  FOREMAN_MUTATION_REPLAY_POLICY,
  flushForemanMutationQueue,
} from "./mutationWorker";
import { resetOfflineReplayCoordinatorForTests } from "./offlineReplayCoordinator";
import {
  clearForemanDurableDraftState,
  configureForemanDurableDraftStore,
  getForemanDurableDraftState,
  hydrateForemanDurableDraftStore,
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
import { FOREMAN_LOCAL_ONLY_REQUEST_ID } from "../../screens/foreman/foreman.localDraft.constants";
import { recordPlatformObservability } from "../observability/platformObservability";

jest.mock("../observability/platformObservability", () => ({
  recordPlatformObservability: jest.fn(),
}));

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
  nextRetryAt?: number | null;
  mutationKind?: string;
  triggerSource?: string;
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

const mockedRecordPlatformObservability =
  recordPlatformObservability as unknown as jest.Mock;

const waitUntil = async (predicate: () => boolean, message: string) => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(message);
};

const createDeferred = <T,>() => {
  let resolveValue!: (value: T) => void;
  let rejectValue!: (error: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolveValue = resolve;
    rejectValue = reject;
  });

  return {
    promise,
    resolve: resolveValue,
    reject: rejectValue,
  };
};

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
    mutationKind: params.mutationKind ?? "background_sync",
    localBeforeCount: 1,
    localAfterCount: 1,
    submitRequested: false,
    triggerSource: params.triggerSource ?? "manual_retry",
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
  nextRetryAt: params.nextRetryAt ?? null,
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
      persistSnapshot: jest.fn(
        async (snapshot: ForemanLocalDraftSnapshot | null) => {
          currentSnapshot = snapshot;
          await replaceForemanDurableDraftSnapshot(snapshot);
        },
      ),
      applySnapshotToBoundary: jest.fn(
        async (snapshot: ForemanLocalDraftSnapshot | null) => {
          currentSnapshot = snapshot;
          await replaceForemanDurableDraftSnapshot(snapshot);
        },
      ),
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
    resetOfflineReplayCoordinatorForTests();
    configureStores();
    resetOfflineMutationTelemetryEvents();
    resetPlatformOfflineTelemetryEvents();
    mockedRecordPlatformObservability.mockReset();
    await clearForemanMutationQueue();
    await clearForemanDurableDraftState();
  });

  it("declares a serial FIFO replay policy owned by the mutation worker", () => {
    expect(FOREMAN_MUTATION_REPLAY_POLICY).toMatchObject({
      queueKey: "foreman_draft",
      owner: "foreman_mutation_worker",
      concurrencyLimit: 1,
      ordering: "created_at_fifo",
      backpressure: "coalesce_triggers_and_rerun_once",
    });
  });

  it("does not run parallel draft sync when reconnect and manual retry collide", async () => {
    const snapshot = createSnapshot("req-worker-serial");
    await replaceForemanDurableDraftSnapshot(snapshot);
    await enqueueForemanMutation({
      draftKey: snapshot.requestId,
      requestId: snapshot.requestId,
      snapshotUpdatedAt: snapshot.updatedAt,
      mutationKind: "background_sync",
      triggerSource: "network_back",
    });

    const deferred = createDeferred<ForemanLocalDraftSyncResult>();
    let active = 0;
    let maxActive = 0;
    const syncSnapshot = jest.fn(async (_params: unknown) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      try {
        return await deferred.promise;
      } finally {
        active -= 1;
      }
    });
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
      getNetworkOnline: () => true,
    });

    const first = flushForemanMutationQueue(deps, "network_back");
    const second = flushForemanMutationQueue(deps, "manual_retry");

    await waitUntil(
      () => syncSnapshot.mock.calls.length === 1,
      "draft sync did not start",
    );
    expect(syncSnapshot).toHaveBeenCalledTimes(1);

    deferred.resolve(createSyncResult(snapshot));
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult.failed).toBe(false);
    expect(secondResult.failed).toBe(false);
    expect(maxActive).toBe(1);
    expect(await loadForemanMutationQueue()).toEqual([]);
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
    expect(
      getOfflineMutationTelemetryEvents().map((event) => event.action),
    ).toContain("retry_scheduled");
    expect(
      getPlatformOfflineTelemetryEvents().some(
        (event) => event.syncStatus === "retry_wait",
      ),
    ).toBe(true);
  });

  it("uses server revision to avoid false remote divergence on retryable failures", async () => {
    const baseServerRevision = "2026-04-01T10:00:00.000Z";
    const snapshot: ForemanLocalDraftSnapshot = {
      ...createSnapshot("req-worker-revision"),
      baseServerRevision,
      updatedAt: "2026-04-01T10:05:00.000Z",
      items: Array.from({ length: 150 }, (_, index) => ({
        local_id: `local-${index}`,
        remote_item_id: `item-${index}`,
        rik_code: `MAT-${index}`,
        name_human: `Material ${index}`,
        qty: index + 1,
        uom: "pcs",
        status: "draft",
        note: null,
        app_code: null,
        kind: "material",
        line_no: index + 1,
      })),
    };
    const remoteSnapshot: ForemanLocalDraftSnapshot = {
      ...snapshot,
      updatedAt: "2026-04-01T10:06:00.000Z",
      items: [],
    };
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
    const inspectRemoteDraft = jest.fn(async () => ({
      snapshot: remoteSnapshot,
      status: "draft",
      isTerminal: false,
    }));
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
      inspectRemoteDraft,
      getNetworkOnline: () => true,
    });

    const result = await flushForemanMutationQueue(deps);
    const queue = await loadForemanMutationQueue();
    const durableState = getForemanDurableDraftState();

    expect(result.failed).toBe(true);
    expect(queue[0]).toMatchObject({
      lifecycleStatus: "retry_scheduled",
      lastErrorKind: "network_unreachable",
    });
    expect(durableState.conflictType).toBe("retryable_sync_failure");
    expect(inspectRemoteDraft).toHaveBeenCalledTimes(2);
  });

  it("blocks pre-sync replay when a pending queue is behind a newer remote revision", async () => {
    const snapshot: ForemanLocalDraftSnapshot = {
      ...createSnapshot("req-worker-c3-pre-sync"),
      baseServerRevision: "2026-04-01T10:00:00.000Z",
      updatedAt: "2026-04-01T10:05:00.000Z",
    };
    const remoteSnapshot: ForemanLocalDraftSnapshot = {
      ...snapshot,
      baseServerRevision: "2026-04-01T10:10:00.000Z",
      updatedAt: "2026-04-01T10:10:00.000Z",
    };
    await replaceForemanDurableDraftSnapshot(snapshot);
    await enqueueForemanMutation({
      draftKey: snapshot.requestId,
      requestId: snapshot.requestId,
      snapshotUpdatedAt: snapshot.updatedAt,
      mutationKind: "qty_update",
      triggerSource: "manual_retry",
    });

    const syncSnapshot = jest.fn(async (_params: unknown) =>
      createSyncResult(snapshot),
    );
    const inspectRemoteDraft = jest.fn(async () => ({
      snapshot: remoteSnapshot,
      status: "draft",
      isTerminal: false,
    }));
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
      inspectRemoteDraft,
      getNetworkOnline: () => true,
    });

    const result = await flushForemanMutationQueue(deps);
    const queue = await loadForemanMutationQueue();
    const durableState = getForemanDurableDraftState();

    expect(result).toMatchObject({
      failed: true,
      processedCount: 0,
      remainingCount: 0,
      errorMessage: "pending offline queue is behind a newer remote draft revision",
    });
    expect(syncSnapshot).not.toHaveBeenCalled();
    expect(inspectRemoteDraft).toHaveBeenCalledTimes(1);
    expect(queue[0]).toMatchObject({
      lifecycleStatus: "conflicted",
      status: "failed",
      lastErrorKind: "remote_divergence",
      lastErrorCode: "offline_c3_pre_sync",
      serverVersionHint: remoteSnapshot.baseServerRevision,
    });
    expect(durableState.syncStatus).toBe("failed_terminal");
    expect(durableState.conflictType).toBe("remote_divergence_requires_attention");
    expect(durableState.attentionNeeded).toBe(true);
    expect(durableState.recoverableLocalSnapshot?.requestId).toBe(snapshot.requestId);
    expect(
      getOfflineMutationTelemetryEvents().map((event) => event.action),
    ).toContain("conflict_detected");
    expect(mockedRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "foreman",
        surface: "offline_conflict",
        event: "pre_sync_conflict_c3_blocked",
        result: "error",
        sourceKind: "offline:foreman_draft",
        errorClass: "local_queue_pending_against_new_remote",
        extra: expect.objectContaining({
          requestId: snapshot.requestId,
          localBaseRevision: snapshot.baseServerRevision,
          remoteBaseRevision: remoteSnapshot.baseServerRevision,
          deterministic: true,
          revisionAdvanced: true,
        }),
      }),
    );
  });

  it("holds later replay while an attention-required durable conflict is unresolved", async () => {
    const snapshot: ForemanLocalDraftSnapshot = {
      ...createSnapshot("req-worker-attention-hold"),
      baseServerRevision: "2026-04-01T10:00:00.000Z",
    };
    await replaceForemanDurableDraftSnapshot(snapshot, {
      syncStatus: "failed_terminal",
      pendingOperationsCount: 1,
      queueDraftKey: snapshot.requestId,
      conflictType: "remote_divergence_requires_attention",
      attentionNeeded: true,
      recoverableLocalSnapshot: snapshot,
      lastConflictAt: 123,
    });
    await enqueueForemanMutation({
      draftKey: snapshot.requestId,
      requestId: snapshot.requestId,
      snapshotUpdatedAt: snapshot.updatedAt,
      mutationKind: "background_sync",
      triggerSource: "manual_retry",
    });

    const syncSnapshot = jest.fn(async (_params: unknown) =>
      createSyncResult(snapshot),
    );
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
      getNetworkOnline: () => true,
    });

    const result = await flushForemanMutationQueue(deps);
    const queue = await loadForemanMutationQueue();
    const durableState = getForemanDurableDraftState();

    expect(result).toMatchObject({
      failed: true,
      processedCount: 0,
      remainingCount: 1,
      errorMessage: "offline replay held for attention-required conflict",
    });
    expect(syncSnapshot).not.toHaveBeenCalled();
    expect(queue[0]).toMatchObject({
      lifecycleStatus: "queued",
      status: "pending",
    });
    expect(durableState.conflictType).toBe("remote_divergence_requires_attention");
    expect(durableState.attentionNeeded).toBe(true);
    expect(mockedRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "foreman",
        surface: "offline_mutation_worker",
        event: "offline_replay_attention_hold",
        result: "skipped",
        sourceKind: "offline:foreman_draft",
        extra: expect.objectContaining({
          draftKey: snapshot.requestId,
          requestId: snapshot.requestId,
          conflictType: "remote_divergence_requires_attention",
          pendingCount: 1,
        }),
      }),
    );
  });

  it("replays a compact-hydrated durable snapshot without changing sync payload", async () => {
    const durableStorage = createMemoryOfflineStorage();
    configureForemanDurableDraftStore({ storage: durableStorage });
    await clearForemanDurableDraftState();
    const snapshot: ForemanLocalDraftSnapshot = {
      ...createSnapshot("req-worker-compact-replay"),
      baseServerRevision: "2026-04-16T09:00:00.000Z",
      items: Array.from({ length: 150 }, (_, index) => ({
        local_id: `local-${index}`,
        remote_item_id: `item-${index}`,
        rik_code: `MAT-${index}`,
        name_human: `Material ${index}`,
        qty: index + 1,
        uom: "pcs",
        status: "draft",
        note: index % 2 === 0 ? `note ${index}` : null,
        app_code: index % 5 === 0 ? `APP-${index}` : null,
        kind: "material",
        line_no: index + 1,
      })),
      qtyDrafts: Object.fromEntries(
        Array.from({ length: 150 }, (_, index) => [`item-${index}`, String(index + 1)]),
      ),
    };
    await replaceForemanDurableDraftSnapshot(snapshot, {
      syncStatus: "queued",
      pendingOperationsCount: 1,
      queueDraftKey: snapshot.requestId,
      requestIdKnown: true,
    });
    await hydrateForemanDurableDraftStore();
    await enqueueForemanMutation({
      draftKey: snapshot.requestId,
      requestId: snapshot.requestId,
      snapshotUpdatedAt: snapshot.updatedAt,
      mutationKind: "background_sync",
      localBeforeCount: snapshot.items.length,
      localAfterCount: snapshot.items.length,
      triggerSource: "manual_retry",
    });
    const syncSnapshot = jest.fn(async (params: { snapshot: ForemanLocalDraftSnapshot }) =>
      createSyncResult(params.snapshot),
    );
    const { deps } = createWorkerDeps({
      snapshot: null,
      syncSnapshot,
      getNetworkOnline: () => true,
    });

    const result = await flushForemanMutationQueue(deps);
    const replayedSnapshot = syncSnapshot.mock.calls[0]?.[0]?.snapshot;

    expect(result.failed).toBe(false);
    expect(syncSnapshot).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(replayedSnapshot)).toBe(JSON.stringify(snapshot));
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
    const secondFlush = await flushForemanMutationQueue(deps);
    const queue = await loadForemanMutationQueue();
    const durableState = getForemanDurableDraftState();

    expect(result.failed).toBe(true);
    expect(secondFlush).toMatchObject({
      failed: false,
      processedCount: 0,
      remainingCount: 0,
    });
    expect(queue[0]).toMatchObject({
      lifecycleStatus: "failed_non_retryable",
      status: "failed",
      lastErrorKind: "network_unreachable",
    });
    expect(durableState.syncStatus).toBe("failed_terminal");
    expect(syncSnapshot).toHaveBeenCalledTimes(1);
    expect(
      getOfflineMutationTelemetryEvents().map((event) => event.action),
    ).toContain("retry_exhausted");
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
    expect(
      getOfflineMutationTelemetryEvents().map((event) => event.action),
    ).toContain("conflict_detected");
  });

  it("surfaces best-effort remote inspection failures instead of swallowing them", async () => {
    const snapshot = createSnapshot("req-worker-inspect-fail");
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
    const inspectRemoteDraft = jest.fn(async () => {
      throw Object.assign(new Error("remote read failed"), {
        code: "PGRST500",
      });
    });
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
      inspectRemoteDraft,
      getNetworkOnline: () => true,
    });

    const result = await flushForemanMutationQueue(deps);

    expect(result.failed).toBe(true);
    // P6.3e: inspectRemoteDraft is now called twice — once in the
    // pre-sync terminal guard (which throws non-fatally here) and
    // once in deriveConflictFromFailure during finalizeFailure.
    expect(inspectRemoteDraft).toHaveBeenCalledTimes(2);
    expect(mockedRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "foreman",
        surface: "offline_mutation_worker",
        event: "terminal_guard_remote_inspection_failed",
        result: "error",
        sourceKind: "offline:foreman_draft",
        errorClass: "pgrst500",
        errorMessage: "remote read failed",
        extra: expect.objectContaining({
          requestId: snapshot.requestId,
          draftKey: snapshot.requestId,
          appErrorSeverity: "warn",
          fallbackReason: "proceed_with_normal_sync",
        }),
      }),
    );
    expect(mockedRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "foreman",
        surface: "offline_mutation_worker",
        event: "remote_draft_inspection_failed",
        result: "error",
        sourceKind: "offline:foreman_draft",
        errorClass: "pgrst500",
        errorMessage: "remote read failed",
        extra: expect.objectContaining({
          requestId: snapshot.requestId,
          appErrorSeverity: "warn",
        }),
      }),
    );
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

    const syncSnapshot = jest.fn(async (_params: unknown) =>
      createSyncResult(snapshot),
    );
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
    expect(
      getOfflineMutationTelemetryEvents().map((event) => event.action),
    ).toEqual(expect.arrayContaining(["inflight_restored", "succeeded"]));
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

    const syncSnapshot = jest.fn(async (_params: unknown) =>
      createSyncResult(snapshot),
    );
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

  it("processes multiple queued items in createdAt order when every sync succeeds", async () => {
    const snapshot = createSnapshot("req-worker-batch");
    await replaceForemanDurableDraftSnapshot(snapshot);
    const storage = createMemoryOfflineStorage({
      [MUTATION_QUEUE_STORAGE_KEY]: JSON.stringify([
        createSeedEntry({
          id: "batch-1",
          draftKey: snapshot.requestId,
          createdAt: 1,
          mutationKind: "catalog_add",
        }),
        createSeedEntry({
          id: "batch-2",
          draftKey: snapshot.requestId,
          createdAt: 2,
          mutationKind: "qty_update",
        }),
      ]),
    });
    configureMutationQueue({ storage });

    const seenMutationKinds: string[] = [];
    const syncSnapshot = jest.fn(async (params: unknown) => {
      const record = params as { mutationKind?: string };
      seenMutationKinds.push(String(record.mutationKind ?? ""));
      return createSyncResult(snapshot);
    });
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
      getNetworkOnline: () => true,
    });

    const result = await flushForemanMutationQueue(deps);
    const queue = await loadForemanMutationQueue();

    expect(result).toMatchObject({
      failed: false,
      processedCount: 2,
      remainingCount: 0,
    });
    expect(queue).toHaveLength(0);
    expect(syncSnapshot).toHaveBeenCalledTimes(2);
    expect(seenMutationKinds).toEqual(["catalog_add", "qty_update"]);
  });

  it("cleans orphaned queued items when no snapshot exists and avoids dispatching sync", async () => {
    const storage = createMemoryOfflineStorage({
      [MUTATION_QUEUE_STORAGE_KEY]: JSON.stringify([
        createSeedEntry({
          id: "orphan-1",
          draftKey: "req-worker-orphan",
          createdAt: 1,
        }),
      ]),
    });
    configureMutationQueue({ storage });

    const syncSnapshot = jest.fn(async (_params: unknown) =>
      createSyncResult(null),
    );
    const { deps } = createWorkerDeps({
      snapshot: null,
      syncSnapshot,
      getNetworkOnline: () => true,
    });

    const result = await flushForemanMutationQueue(deps);
    const queue = await loadForemanMutationQueue();
    const durableState = getForemanDurableDraftState();
    const succeededCleanupEvent = getOfflineMutationTelemetryEvents().find(
      (event) =>
        event.action === "succeeded" &&
        event.extra?.reason === "missing_snapshot_cleanup",
    );

    expect(result).toMatchObject({
      failed: false,
      processedCount: 0,
      remainingCount: 0,
    });
    expect(queue).toHaveLength(0);
    expect(syncSnapshot).not.toHaveBeenCalled();
    expect(durableState.syncStatus).toBe("idle");
    expect(succeededCleanupEvent).toBeTruthy();
  });

  it("lets a later queued item sync on the next run after an earlier retryable failure", async () => {
    const snapshot = createSnapshot("req-worker-partial");
    await replaceForemanDurableDraftSnapshot(snapshot);
    const storage = createMemoryOfflineStorage({
      [MUTATION_QUEUE_STORAGE_KEY]: JSON.stringify([
        createSeedEntry({
          id: "partial-1",
          draftKey: snapshot.requestId,
          createdAt: 1,
          mutationKind: "catalog_add",
          triggerSource: "unknown",
        }),
        createSeedEntry({
          id: "partial-2",
          draftKey: snapshot.requestId,
          createdAt: 2,
          mutationKind: "qty_update",
          triggerSource: "unknown",
        }),
      ]),
    });
    configureMutationQueue({ storage });

    const syncSnapshot = jest.fn(async (_params: unknown) =>
      createSyncResult(snapshot),
    );
    syncSnapshot.mockRejectedValueOnce(new Error("Network request failed"));
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
      getNetworkOnline: () => true,
    });

    const firstFlush = await flushForemanMutationQueue(deps);
    const queueAfterFirstFlush = await loadForemanMutationQueue();
    const secondFlush = await flushForemanMutationQueue(deps);
    const queueAfterSecondFlush = await loadForemanMutationQueue();

    expect(firstFlush).toMatchObject({
      failed: true,
      processedCount: 0,
      remainingCount: 2,
    });
    expect(queueAfterFirstFlush).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "partial-1",
          lifecycleStatus: "retry_scheduled",
        }),
        expect.objectContaining({
          id: "partial-2",
          lifecycleStatus: "queued",
        }),
      ]),
    );

    expect(secondFlush).toMatchObject({
      failed: false,
      processedCount: 1,
      remainingCount: 1,
    });
    expect(syncSnapshot).toHaveBeenCalledTimes(2);
    expect(queueAfterSecondFlush).toEqual([
      expect.objectContaining({
        id: "partial-1",
        lifecycleStatus: "retry_scheduled",
      }),
    ]);
  });

  it("rebinds a local-only submitted draft to the server request id and clears queued state", async () => {
    const snapshot = createSnapshot(FOREMAN_LOCAL_ONLY_REQUEST_ID);
    await replaceForemanDurableDraftSnapshot(snapshot);
    await enqueueForemanMutation({
      draftKey: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      requestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      snapshotUpdatedAt: snapshot.updatedAt,
      mutationKind: "submit",
      triggerSource: "submit",
      submitRequested: true,
    });

    const submittedRecord = {
      id: "server-request-123",
      status: "РќР° СѓС‚РІРµСЂР¶РґРµРЅРёРё",
    } as never;
    const syncSnapshot = jest.fn(async (_params: unknown) => ({
      snapshot: null,
      rows: [],
      submitted: submittedRecord,
    }));
    const onSubmitted = jest.fn(async () => undefined);
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
      onSubmitted,
      getNetworkOnline: () => true,
    });

    const result = await flushForemanMutationQueue(deps);
    const queue = await loadForemanMutationQueue();
    const durableState = getForemanDurableDraftState();

    expect(result).toMatchObject({
      failed: false,
      processedCount: 1,
      remainingCount: 0,
      requestId: "server-request-123",
      submitted: submittedRecord,
    });
    expect(queue).toHaveLength(0);
    expect(onSubmitted).toHaveBeenCalledWith(
      "server-request-123",
      submittedRecord,
    );
    expect(durableState.syncStatus).toBe("idle");
    expect(durableState.attentionNeeded).toBe(false);
    expect(durableState.pendingOperationsCount).toBe(0);
  });

  it("does not regress durable sync state when post-submit cleanup throws after server acceptance", async () => {
    const snapshot = createSnapshot(FOREMAN_LOCAL_ONLY_REQUEST_ID);
    await replaceForemanDurableDraftSnapshot(snapshot);
    await enqueueForemanMutation({
      draftKey: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      requestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      snapshotUpdatedAt: snapshot.updatedAt,
      mutationKind: "submit",
      triggerSource: "submit",
      submitRequested: true,
    });

    const submittedRecord = {
      id: "server-request-456",
      status: "РќР° СѓС‚РІРµСЂР¶РґРµРЅРёРё",
    } as never;
    const syncSnapshot = jest.fn(async (_params: unknown) => ({
      snapshot: null,
      rows: [],
      submitted: submittedRecord,
    }));
    const onSubmitted = jest.fn(async () => {
      throw new Error("cleanup failed");
    });
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
      onSubmitted,
      getNetworkOnline: () => true,
    });

    const result = await flushForemanMutationQueue(deps);
    const durableState = getForemanDurableDraftState();
    const queue = await loadForemanMutationQueue();

    expect(result).toMatchObject({
      failed: false,
      processedCount: 1,
      remainingCount: 0,
      requestId: "server-request-456",
    });
    expect(queue).toHaveLength(0);
    expect(durableState.syncStatus).toBe("idle");
    expect(durableState.attentionNeeded).toBe(false);
    expect(durableState.conflictType).toBe("none");
    expect(durableState.pendingOperationsCount).toBe(0);
    expect(mockedRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "foreman",
        surface: "draft_sync",
        event: "post_submit_cleanup_failed_after_server_accept",
        result: "error",
      }),
    );
  });
});
