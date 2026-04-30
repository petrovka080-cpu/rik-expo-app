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
} from "../../src/lib/offline/mutationQueue";
import { getOfflineMutationRetryPolicy } from "../../src/lib/offline/mutation.retryPolicy";
import {
  getOfflineMutationTelemetryEvents,
  resetOfflineMutationTelemetryEvents,
} from "../../src/lib/offline/mutation.telemetry";
import {
  resetOfflineReplayCoordinatorForTests,
} from "../../src/lib/offline/offlineReplayCoordinator";
import {
  FOREMAN_MUTATION_REPLAY_POLICY,
  flushForemanMutationQueue,
} from "../../src/lib/offline/mutationWorker";
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
});
