const mockRecordPlatformObservability = jest.fn();

jest.mock("../../src/lib/observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) =>
    mockRecordPlatformObservability(...args),
}));

import { createMemoryOfflineStorage } from "../../src/lib/offline/offlineStorage";
import {
  clearForemanMutationQueue,
  configureMutationQueue,
  enqueueForemanMutation,
  loadForemanMutationQueue,
  peekNextForemanMutation,
  removeForemanMutationById,
} from "../../src/lib/offline/mutationQueue";
import {
  computeOfflineMutationBackoffMs,
  getOfflineMutationRetryPolicy,
} from "../../src/lib/offline/mutation.retryPolicy";
import {
  getOfflineMutationTelemetryEvents,
  resetOfflineMutationTelemetryEvents,
  summarizeOfflineMutationTelemetryEvents,
} from "../../src/lib/offline/mutation.telemetry";
import {
  resetOfflineReplayCoordinatorForTests,
} from "../../src/lib/offline/offlineReplayCoordinator";
import {
  FOREMAN_MUTATION_REPLAY_POLICY,
  flushForemanMutationQueue,
} from "../../src/lib/offline/mutationWorker";
import {
  classifyForemanConflict,
  resolveConflictPolicy,
} from "../../src/lib/offline/offlineConflictClassifier";
import {
  clearForemanDurableDraftState,
  configureForemanDurableDraftStore,
  getForemanDurableDraftState,
  replaceForemanDurableDraftSnapshot,
} from "../../src/screens/foreman/foreman.durableDraft.store";
import type {
  ForemanLocalDraftSnapshot,
  ForemanLocalDraftSyncResult,
} from "../../src/screens/foreman/foreman.localDraft";

const MUTATION_QUEUE_STORAGE_KEY = "offline_mutation_queue_v2";

type QueueSeedEntryParams = {
  id: string;
  draftKey: string;
  createdAt: number;
  lifecycleStatus?: "queued" | "processing" | "retry_scheduled" | "conflicted" | "failed_non_retryable";
  status?: "pending" | "inflight" | "failed";
  lastErrorKind?: "none" | "network_unreachable" | "transient_server";
  nextRetryAt?: number | null;
  attemptCount?: number;
  retryCount?: number;
};

const createSnapshot = (
  requestId: string,
  overrides: Partial<ForemanLocalDraftSnapshot> = {},
): ForemanLocalDraftSnapshot => ({
  version: 1,
  ownerId: `srv:${requestId}`,
  requestId,
  displayNo: `REQ-${requestId}`,
  status: "draft",
  baseServerRevision: "2026-04-30T09:00:00.000Z",
  header: {
    foreman: "Offline Stress Foreman",
    comment: "stress proof",
    objectType: "OBJ",
    level: "L1",
    system: "SYS",
    zone: "Z1",
  },
  items: [
    {
      local_id: "local-1",
      remote_item_id: "remote-item-1",
      rik_code: "MAT-1",
      name_human: "Material 1",
      qty: 1,
      uom: "pcs",
      status: "draft",
      note: null,
      app_code: null,
      kind: "material",
      line_no: 1,
    },
  ],
  qtyDrafts: {},
  pendingDeletes: [],
  submitRequested: false,
  lastError: null,
  updatedAt: "2026-04-30T09:05:00.000Z",
  ...overrides,
});

const createSyncResult = (
  snapshot: ForemanLocalDraftSnapshot | null,
): ForemanLocalDraftSyncResult => ({
  snapshot,
  rows: [],
  submitted: null,
});

const createQueueSeedEntry = (params: QueueSeedEntryParams) => ({
  id: params.id,
  owner: "foreman",
  entityType: "foreman_draft",
  entityId: params.draftKey,
  scope: "foreman_draft",
  type: "background_sync",
  dedupeKey: `stress:${params.draftKey}:${params.id}`,
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
  nextRetryAt: params.nextRetryAt ?? null,
  maxAttempts: 5,
});

const configureStores = () => {
  configureMutationQueue({ storage: createMemoryOfflineStorage() });
  configureForemanDurableDraftStore({ storage: createMemoryOfflineStorage() });
};

const createWorkerDeps = (options: {
  snapshot: ForemanLocalDraftSnapshot | null;
  syncSnapshot: jest.Mock<Promise<ForemanLocalDraftSyncResult>, [unknown]>;
  inspectRemoteDraft?: jest.Mock;
}) => {
  let currentSnapshot = options.snapshot;
  const applySnapshotToBoundary = jest.fn(
    async (snapshot: ForemanLocalDraftSnapshot | null) => {
      currentSnapshot = snapshot;
      await replaceForemanDurableDraftSnapshot(snapshot);
    },
  );
  const persistSnapshot = jest.fn(
    async (snapshot: ForemanLocalDraftSnapshot | null) => {
      currentSnapshot = snapshot;
      await replaceForemanDurableDraftSnapshot(snapshot);
    },
  );

  return {
    deps: {
      getSnapshot: () => currentSnapshot,
      buildRequestDraftMeta: () => ({}) as never,
      persistSnapshot,
      applySnapshotToBoundary,
      getNetworkOnline: () => true,
      inspectRemoteDraft: options.inspectRemoteDraft,
      syncSnapshot: options.syncSnapshot,
    },
    applySnapshotToBoundary,
    persistSnapshot,
  };
};

describe("S-OFFLINE-2 offline replay stress proof", () => {
  beforeEach(async () => {
    resetOfflineReplayCoordinatorForTests();
    configureStores();
    resetOfflineMutationTelemetryEvents();
    mockRecordPlatformObservability.mockReset();
    await clearForemanMutationQueue();
    await clearForemanDurableDraftState();
  });

  it("blocks a burst of stale queued replay before it can overwrite fresher server state", async () => {
    const snapshot = createSnapshot("req-offline-stale-burst", {
      baseServerRevision: "2026-04-30T09:00:00.000Z",
      updatedAt: "2026-04-30T09:05:00.000Z",
    });
    const freshRemoteSnapshot = createSnapshot("req-offline-stale-burst", {
      baseServerRevision: "2026-04-30T09:20:00.000Z",
      updatedAt: "2026-04-30T09:20:00.000Z",
    });

    await replaceForemanDurableDraftSnapshot(snapshot);

    const mutationKinds = ["qty_update", "catalog_add", "row_remove"] as const;
    for (let index = 0; index < 25; index += 1) {
      await enqueueForemanMutation({
        draftKey: snapshot.requestId,
        requestId: snapshot.requestId,
        snapshotUpdatedAt: `${snapshot.updatedAt}#${index}`,
        mutationKind: mutationKinds[index % mutationKinds.length],
        localBeforeCount: index,
        localAfterCount: index + 1,
        triggerSource: index % 2 === 0 ? "network_back" : "manual_retry",
      });
    }

    const syncSnapshot = jest.fn(async (_params: unknown) =>
      createSyncResult(snapshot),
    );
    const inspectRemoteDraft = jest.fn(async () => ({
      snapshot: freshRemoteSnapshot,
      status: "draft",
      isTerminal: false,
    }));
    const { deps, applySnapshotToBoundary, persistSnapshot } = createWorkerDeps({
      snapshot,
      syncSnapshot,
      inspectRemoteDraft,
    });

    const result = await flushForemanMutationQueue(deps, "network_back");
    const queue = await loadForemanMutationQueue();
    const durableState = getForemanDurableDraftState();

    expect(result).toMatchObject({
      failed: true,
      processedCount: 0,
      remainingCount: 0,
      requestId: snapshot.requestId,
      errorMessage: "pending offline queue is behind a newer remote draft revision",
    });
    expect(syncSnapshot).not.toHaveBeenCalled();
    expect(applySnapshotToBoundary).not.toHaveBeenCalled();
    expect(persistSnapshot).not.toHaveBeenCalled();
    expect(inspectRemoteDraft).toHaveBeenCalledTimes(1);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      lifecycleStatus: "conflicted",
      status: "failed",
      lastErrorKind: "remote_divergence",
      lastErrorCode: "offline_c3_pre_sync",
      serverVersionHint: freshRemoteSnapshot.baseServerRevision,
    });
    expect(queue[0].nextRetryAt ?? 0).toBe(0);
    expect(queue[0].coalescedCount).toBeGreaterThanOrEqual(24);
    expect(durableState).toMatchObject({
      syncStatus: "failed_terminal",
      conflictType: "remote_divergence_requires_attention",
      attentionNeeded: true,
      recoverableLocalSnapshot: expect.objectContaining({
        requestId: snapshot.requestId,
        baseServerRevision: snapshot.baseServerRevision,
      }),
    });
    expect(getOfflineMutationTelemetryEvents().map((event) => event.action)).toContain(
      "conflict_detected",
    );
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
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
          remoteBaseRevision: freshRemoteSnapshot.baseServerRevision,
          revisionAdvanced: true,
          deterministic: true,
        }),
      }),
    );
  });

  it("bounds retryable replay attempts and dead-letters without further dispatch", async () => {
    const snapshot = createSnapshot("req-offline-dead-letter");
    const policy = getOfflineMutationRetryPolicy("foreman_default");

    await replaceForemanDurableDraftSnapshot(snapshot);
    await enqueueForemanMutation({
      draftKey: snapshot.requestId,
      requestId: snapshot.requestId,
      snapshotUpdatedAt: snapshot.updatedAt,
      mutationKind: "background_sync",
      triggerSource: "manual_retry",
    });

    const syncSnapshot = jest.fn(async (_params: unknown) => {
      throw new Error("temporary service unavailable");
    });
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
    });

    const results = [];
    for (let index = 0; index < policy.maxAttempts + 2; index += 1) {
      results.push(await flushForemanMutationQueue(deps, "manual_retry"));
    }

    const queue = await loadForemanMutationQueue();
    const durableState = getForemanDurableDraftState();
    const telemetryActions = getOfflineMutationTelemetryEvents().map(
      (event) => event.action,
    );

    expect(FOREMAN_MUTATION_REPLAY_POLICY.concurrencyLimit).toBe(1);
    expect(syncSnapshot).toHaveBeenCalledTimes(policy.maxAttempts);
    expect(results[0]).toMatchObject({
      failed: true,
      processedCount: 0,
      remainingCount: 1,
    });
    expect(results.at(-1)).toMatchObject({
      failed: false,
      processedCount: 0,
      remainingCount: 0,
    });
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      lifecycleStatus: "failed_non_retryable",
      status: "failed",
      lastErrorKind: "transient_server",
      attemptCount: policy.maxAttempts,
    });
    expect(queue[0].nextRetryAt ?? 0).toBe(0);
    expect(durableState).toMatchObject({
      syncStatus: "failed_terminal",
      pendingOperationsCount: 0,
      conflictType: "retryable_sync_failure",
    });
    expect(telemetryActions).toEqual(expect.arrayContaining(["retry_scheduled", "retry_exhausted"]));
  });

  it("keeps created_at FIFO ordering when retry-scheduled work becomes eligible", async () => {
    configureMutationQueue({
      storage: createMemoryOfflineStorage({
        [MUTATION_QUEUE_STORAGE_KEY]: JSON.stringify([
          createQueueSeedEntry({
            id: "retry-oldest",
            draftKey: "req-stress-order-oldest",
            createdAt: 10,
            lifecycleStatus: "retry_scheduled",
            status: "failed",
            lastErrorKind: "transient_server",
            nextRetryAt: 1_500,
            attemptCount: 1,
            retryCount: 1,
          }),
          createQueueSeedEntry({
            id: "queued-middle",
            draftKey: "req-stress-order-middle",
            createdAt: 20,
          }),
          createQueueSeedEntry({
            id: "queued-latest",
            draftKey: "req-stress-order-latest",
            createdAt: 30,
          }),
        ]),
      }),
    });

    const beforeRetryWindow = await peekNextForemanMutation({
      triggerSource: "unknown",
      now: 1_000,
    });
    const afterRetryWindow = await peekNextForemanMutation({
      triggerSource: "unknown",
      now: 1_600,
    });
    await removeForemanMutationById("retry-oldest");
    const afterRetryRemoved = await peekNextForemanMutation({
      triggerSource: "unknown",
      now: 1_600,
    });

    expect((await loadForemanMutationQueue()).map((entry) => entry.id)).toEqual([
      "queued-middle",
      "queued-latest",
    ]);
    expect(beforeRetryWindow?.id).toBe("queued-middle");
    expect(afterRetryWindow?.id).toBe("retry-oldest");
    expect(afterRetryRemoved?.id).toBe("queued-middle");
  });

  it("suppresses a duplicate replay burst into one recoverable queue intent", async () => {
    const mutationCount = 30;

    await Promise.all(
      Array.from({ length: mutationCount }, () =>
        enqueueForemanMutation({
          draftKey: "req-stress-duplicate",
          requestId: "req-stress-duplicate",
          snapshotUpdatedAt: "2026-05-08T01:00:00.000Z",
          mutationKind: "qty_update",
          localBeforeCount: 1,
          localAfterCount: 2,
          triggerSource: "manual_retry",
        }),
      ),
    );

    const queue = await loadForemanMutationQueue();
    const telemetrySummary = summarizeOfflineMutationTelemetryEvents();

    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      lifecycleStatus: "queued",
      status: "pending",
      coalescedCount: mutationCount - 1,
      payload: {
        draftKey: "req-stress-duplicate",
        mutationKind: "qty_update",
        localBeforeCount: 1,
        localAfterCount: 2,
      },
    });
    expect(telemetrySummary.dedupeSuppressedCount).toBe(mutationCount - 1);
  });

  it("keeps retry failures recoverable with bounded backoff until manual retry succeeds", async () => {
    const snapshot = createSnapshot("req-stress-recoverable");
    const policy = getOfflineMutationRetryPolicy("foreman_default");
    const expectedBackoffMs = computeOfflineMutationBackoffMs(1, policy);

    await replaceForemanDurableDraftSnapshot(snapshot);
    await enqueueForemanMutation({
      draftKey: snapshot.requestId,
      requestId: snapshot.requestId,
      snapshotUpdatedAt: snapshot.updatedAt,
      mutationKind: "background_sync",
      triggerSource: "network_back",
    });

    const syncSnapshot = jest
      .fn<Promise<ForemanLocalDraftSyncResult>, [unknown]>()
      .mockRejectedValueOnce(new Error("Network request failed"))
      .mockResolvedValueOnce(createSyncResult(snapshot));
    const { deps } = createWorkerDeps({
      snapshot,
      syncSnapshot,
    });

    const beforeFailure = Date.now();
    const failed = await flushForemanMutationQueue(deps, "network_back");
    const afterFailure = Date.now();
    const retryQueue = await loadForemanMutationQueue();
    const scheduledRetryAt = retryQueue[0]?.nextRetryAt ?? 0;

    const deferred = await flushForemanMutationQueue(deps, "unknown");
    const recovered = await flushForemanMutationQueue(deps, "manual_retry");

    expect(failed).toMatchObject({
      failed: true,
      processedCount: 0,
      remainingCount: 1,
    });
    expect(retryQueue[0]).toMatchObject({
      lifecycleStatus: "retry_scheduled",
      status: "failed",
      lastErrorKind: "network_unreachable",
    });
    expect(scheduledRetryAt).toBeGreaterThanOrEqual(beforeFailure + expectedBackoffMs);
    expect(scheduledRetryAt).toBeLessThanOrEqual(afterFailure + expectedBackoffMs);
    expect(deferred).toMatchObject({
      failed: false,
      processedCount: 0,
      remainingCount: 1,
    });
    expect(recovered).toMatchObject({
      failed: false,
      processedCount: 1,
      remainingCount: 0,
    });
    expect(await loadForemanMutationQueue()).toEqual([]);
    expect(syncSnapshot).toHaveBeenCalledTimes(2);
  });

  it("classifies conflict winner rules before queued replay can overwrite server truth", () => {
    const localSnapshot = createSnapshot("req-stress-conflict", {
      baseServerRevision: "2026-05-08T01:00:00.000Z",
    });
    const newerRemoteSnapshot = createSnapshot("req-stress-conflict", {
      baseServerRevision: "2026-05-08T01:10:00.000Z",
    });

    const pendingAgainstNewerRemote = classifyForemanConflict({
      localSnapshot,
      remoteSnapshot: newerRemoteSnapshot,
      remoteStatus: "draft",
      remoteIsTerminal: false,
      remoteMissing: false,
      pendingCount: 2,
      requestIdKnown: true,
    });
    const terminalRemote = classifyForemanConflict({
      localSnapshot,
      remoteSnapshot: null,
      remoteStatus: "submitted",
      remoteIsTerminal: true,
      remoteMissing: false,
      pendingCount: 1,
      requestIdKnown: true,
    });

    expect(pendingAgainstNewerRemote).toMatchObject({
      conflictClass: "local_queue_pending_against_new_remote",
      deterministic: true,
      revisionAdvanced: true,
      pendingCount: 2,
    });
    expect(resolveConflictPolicy(pendingAgainstNewerRemote.conflictClass)).toBe("hold_for_attention");
    expect(terminalRemote).toMatchObject({
      conflictClass: "remote_missing_but_local_pending",
      deterministic: true,
      remoteMissing: true,
    });
    expect(resolveConflictPolicy(terminalRemote.conflictClass)).toBe("server_wins");
  });
});
