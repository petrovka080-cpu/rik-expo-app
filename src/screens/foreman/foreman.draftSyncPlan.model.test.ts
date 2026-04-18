import { readFileSync } from "fs";
import { join } from "path";

import {
  FOREMAN_SYNC_DIRTY_LOCAL_COMMANDS,
  FOREMAN_DUPLICATE_SUBMIT_MESSAGE,
  planForemanSyncInactiveGate,
  planForemanSyncQueueCommand,
  planForemanSyncSnapshotPreflight,
  resolveForemanSyncDirtyLocalCommandPlan,
  resolveForemanSyncMutationKind,
  resolveForemanSyncOfflineState,
} from "./foreman.draftSyncPlan.model";
import type { ForemanLocalDraftSnapshot } from "./foreman.localDraft";

const makeSnapshot = (
  patch: Partial<ForemanLocalDraftSnapshot> = {},
): ForemanLocalDraftSnapshot => ({
  version: 1,
  ownerId: "owner-1",
  requestId: "req-1",
  displayNo: null,
  status: "draft",
  header: {
    foreman: "",
    comment: "",
    objectType: "",
    level: "",
    system: "",
    zone: "",
  },
  items: [
    {
      local_id: "local-1",
      remote_item_id: "remote-1",
      rik_code: "MAT-1",
      name_human: "Material",
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
  updatedAt: "2026-04-18T00:00:00.000Z",
  ...patch,
});

const emptySnapshot = (
  patch: Partial<ForemanLocalDraftSnapshot> = {},
): ForemanLocalDraftSnapshot =>
  makeSnapshot({
    ownerId: "owner-empty",
    requestId: "",
    header: {
      foreman: "",
      comment: "",
      objectType: "",
      level: "",
      system: "",
      zone: "",
    },
    items: [],
    pendingDeletes: [],
    submitRequested: false,
    ...patch,
  });

describe("foreman draft sync pre-flush planner", () => {
  it("stays free of queue, durable, persistence, fetch, and subscription side effects", () => {
    const source = readFileSync(join(__dirname, "foreman.draftSyncPlan.model.ts"), "utf8");

    expect(source).not.toContain("enqueueForemanMutation");
    expect(source).not.toContain("flushForemanMutationQueue");
    expect(source).not.toContain("markForemanDurableDraftDirtyLocal");
    expect(source).not.toContain("markForemanSnapshotQueued");
    expect(source).not.toContain("patchForemanDurableDraftRecoveryState");
    expect(source).not.toContain("persistForemanLocalDraftSnapshot");
    expect(source).not.toContain("loadForemanRemoteDraftSnapshot");
    expect(source).not.toContain("AppState");
    expect(source).not.toContain("subscribePlatformNetwork");
  });

  it("keeps mutation kind defaults identical", () => {
    expect(resolveForemanSyncMutationKind({ submit: true })).toBe("submit");
    expect(resolveForemanSyncMutationKind({ submit: false })).toBe("background_sync");
    expect(resolveForemanSyncMutationKind({ optionMutationKind: "qty_update", submit: true })).toBe("qty_update");
  });

  it("normalizes the enqueue telemetry offline state deterministically", () => {
    expect(resolveForemanSyncOfflineState(true)).toBe("online");
    expect(resolveForemanSyncOfflineState(false)).toBe("offline");
    expect(resolveForemanSyncOfflineState(null)).toBe("unknown");
    expect(resolveForemanSyncOfflineState(undefined)).toBe("unknown");
  });

  it("skips inactive non-background sync without an override snapshot", () => {
    expect(planForemanSyncInactiveGate({
      isDraftActive: false,
      hasOverrideSnapshot: false,
      mutationKind: "submit",
      requestId: "req-active",
    })).toEqual({ action: "skip_inactive", requestId: "req-active", submitted: null });

    expect(planForemanSyncInactiveGate({
      isDraftActive: false,
      hasOverrideSnapshot: false,
      mutationKind: "background_sync",
      requestId: "req-active",
    })).toEqual({ action: "continue" });

    expect(planForemanSyncInactiveGate({
      isDraftActive: false,
      hasOverrideSnapshot: true,
      mutationKind: "submit",
      requestId: "req-active",
    })).toEqual({ action: "continue" });
  });

  it("skips empty snapshots with the current request result shape", () => {
    expect(planForemanSyncSnapshotPreflight({
      snapshot: emptySnapshot(),
      submit: false,
      mutationKind: "background_sync",
      context: null,
      requestId: "req-active",
      activeDraftOwnerId: null,
      lastSubmittedOwnerId: null,
      submitInFlightOwnerId: null,
      hasDraftSyncInFlight: false,
    })).toEqual({
      action: "skip_empty",
      snapshot: emptySnapshot(),
      requestId: "req-active",
      submitted: null,
    });
  });

  it("keeps duplicate submit and in-flight submit guards explicit", () => {
    expect(planForemanSyncSnapshotPreflight({
      snapshot: makeSnapshot({ ownerId: "owner-submit" }),
      submit: true,
      mutationKind: "submit",
      context: "submit",
      requestId: "req-active",
      activeDraftOwnerId: null,
      lastSubmittedOwnerId: "owner-submit",
      submitInFlightOwnerId: null,
      hasDraftSyncInFlight: false,
    })).toEqual({
      action: "throw_duplicate_submit",
      submitOwnerId: "owner-submit",
      message: FOREMAN_DUPLICATE_SUBMIT_MESSAGE,
    });

    expect(planForemanSyncSnapshotPreflight({
      snapshot: makeSnapshot({ ownerId: "" }),
      submit: true,
      mutationKind: "submit",
      context: "submit",
      requestId: "req-active",
      activeDraftOwnerId: "owner-active",
      lastSubmittedOwnerId: null,
      submitInFlightOwnerId: "owner-active",
      hasDraftSyncInFlight: true,
    })).toEqual({
      action: "await_in_flight_submit",
      submitOwnerId: "owner-active",
    });
  });

  it("plans continue with normalized trigger source", () => {
    expect(planForemanSyncSnapshotPreflight({
      snapshot: makeSnapshot(),
      submit: false,
      mutationKind: "background_sync",
      context: "network_back",
      requestId: null,
      activeDraftOwnerId: null,
      lastSubmittedOwnerId: null,
      submitInFlightOwnerId: null,
      hasDraftSyncInFlight: false,
    })).toMatchObject({
      action: "continue",
      triggerSource: "network_back",
      submitOwnerId: null,
    });

    expect(planForemanSyncSnapshotPreflight({
      snapshot: makeSnapshot({ submitRequested: true }),
      submit: false,
      mutationKind: "background_sync",
      context: "focus",
      requestId: null,
      activeDraftOwnerId: null,
      lastSubmittedOwnerId: null,
      submitInFlightOwnerId: null,
      hasDraftSyncInFlight: false,
    })).toMatchObject({
      action: "continue",
      triggerSource: "submit",
    });
  });

  it("plans dirty-local command payloads before queue planning", () => {
    const snapshot = makeSnapshot({ requestId: " req-1 " });

    expect(resolveForemanSyncDirtyLocalCommandPlan({
      snapshot,
      draftKey: "req-1",
      pendingOperationsCount: 2,
      durableConflictType: "retryable_sync_failure",
      networkOnline: false,
      triggerSource: "network_back",
      localOnlyRequestId: "local-only",
    })).toEqual({
      action: "record_dirty_local",
      commands: FOREMAN_SYNC_DIRTY_LOCAL_COMMANDS,
      dirtyLocal: {
        queueDraftKey: "req-1",
        triggerSource: "network_back",
      },
      telemetry: {
        stage: "enqueue",
        result: "progress",
        draftKey: "req-1",
        requestId: "req-1",
        localOnlyDraftKey: false,
        attemptNumber: 0,
        queueSizeBefore: 2,
        queueSizeAfter: null,
        coalescedCount: 0,
        conflictType: "retryable_sync_failure",
        recoveryAction: null,
        errorClass: null,
        errorCode: null,
        offlineState: "offline",
        triggerSource: "network_back",
      },
    });

    expect(resolveForemanSyncDirtyLocalCommandPlan({
      snapshot: makeSnapshot({ requestId: "" }),
      draftKey: "local-only",
      pendingOperationsCount: 0,
      durableConflictType: "none",
      networkOnline: true,
      triggerSource: "submit",
      localOnlyRequestId: "local-only",
    }).telemetry).toMatchObject({
      requestId: null,
      localOnlyDraftKey: true,
      offlineState: "online",
    });
  });

  it("blocks non-auto-recoverable conflicts without force", () => {
    const snapshot = makeSnapshot({ requestId: "req-conflict" });

    expect(planForemanSyncQueueCommand({
      snapshot,
      mutationKind: "background_sync",
      triggerSource: "manual_retry",
      durableConflictType: "remote_divergence_requires_attention",
      force: false,
      draftKey: "req-conflict",
      submit: false,
      activeRequestId: "req-active",
    })).toEqual({
      action: "block_for_manual_recovery",
      snapshot,
      durablePatch: {
        snapshot,
        syncStatus: "dirty_local",
        pendingOperationsCount: 0,
        queueDraftKey: null,
        requestIdKnown: true,
        attentionNeeded: true,
        lastTriggerSource: "manual_retry",
      },
      requestId: "req-conflict",
      submitted: null,
    });
  });

  it("plans enqueue payload without executing queue or flush", () => {
    const snapshot = makeSnapshot({ requestId: "", submitRequested: false });

    expect(planForemanSyncQueueCommand({
      snapshot,
      mutationKind: "submit",
      triggerSource: "submit",
      durableConflictType: "remote_divergence_requires_attention",
      force: true,
      draftKey: "local-only",
      localBeforeCount: 2,
      localAfterCount: 3,
      submit: true,
      activeRequestId: "req-active",
    })).toEqual({
      action: "enqueue_and_flush",
      snapshot,
      enqueue: {
        draftKey: "local-only",
        requestId: null,
        snapshotUpdatedAt: "2026-04-18T00:00:00.000Z",
        mutationKind: "submit",
        localBeforeCount: 2,
        localAfterCount: 3,
        submitRequested: true,
        triggerSource: "submit",
      },
    });
  });

  it("keeps syncLocalDraftNow side effects in the established order", () => {
    const source = readFileSync(
      join(__dirname, "hooks", "useForemanDraftBoundary.ts"),
      "utf8",
    );
    const syncStart = source.indexOf("const syncLocalDraftNow = useCallback");
    const syncEnd = source.indexOf("const retryDraftSyncNow = useCallback");
    const syncSource = source.slice(syncStart, syncEnd);

    expect(syncStart).toBeGreaterThanOrEqual(0);
    expect(syncEnd).toBeGreaterThan(syncStart);

    const orderedTokens = [
      "const dirtyLocalPlan = resolveForemanSyncDirtyLocalCommandPlan",
      "await markForemanDurableDraftDirtyLocal(snapshot, dirtyLocalPlan.dirtyLocal)",
      "persistLocalDraftSnapshot(snapshot)",
      "await pushForemanDurableDraftTelemetry(dirtyLocalPlan.telemetry)",
      "const queuePlan = planForemanSyncQueueCommand",
      "await enqueueForemanMutation(queuePlan.enqueue)",
      "await markForemanSnapshotQueued(snapshot",
      "const run = flushForemanMutationQueue",
      "draftSyncInFlightRef.current = run",
      "return await run",
      "draftSyncInFlightRef.current = null",
    ];

    let previousIndex = -1;
    for (const token of orderedTokens) {
      const nextIndex = syncSource.indexOf(token);
      expect(nextIndex).toBeGreaterThan(previousIndex);
      previousIndex = nextIndex;
    }
  });
});
