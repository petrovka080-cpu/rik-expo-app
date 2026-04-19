import { readFileSync } from "fs";
import { join } from "path";

import {
  FOREMAN_MANUAL_RECOVERY_TELEMETRY_COMMANDS,
  planForemanClearFailedQueueTailAction,
  planForemanDiscardLocalAction,
  planForemanDiscardLocalRemoteAction,
  planForemanRehydrateServerAction,
  planForemanRehydrateServerRemoteAction,
  planForemanRestoreLocalAction,
  planForemanRetryNowAction,
  resolveForemanManualRecoveryTelemetryPlan,
} from "./foreman.manualRecovery.model";
import { applyForemanManualRecoveryRemotePlanToBoundary } from "./foreman.draftBoundary.helpers";
import type { ForemanLocalDraftSnapshot } from "./foreman.localDraft";

const NOW = 1_777_000_000_000;

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
      remote_item_id: "item-1",
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
  updatedAt: "2026-04-17T00:00:00.000Z",
  ...patch,
});

const emptySnapshot = (
  patch: Partial<ForemanLocalDraftSnapshot> = {},
): ForemanLocalDraftSnapshot =>
  makeSnapshot({
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

const createRemoteApplyDeps = () => ({
  clearTerminalLocalDraft: jest.fn(async () => undefined),
  setActiveDraftOwnerId: jest.fn(),
  applyLocalDraftSnapshotToBoundary: jest.fn(),
  patchForemanDurableDraftRecoveryState: jest.fn(async () => ({})),
  refreshBoundarySyncState: jest.fn(async () => undefined),
  persistLocalDraftSnapshot: jest.fn(),
  setRequestIdState: jest.fn(),
  setRequestDetails: jest.fn(),
  syncHeaderFromDetails: jest.fn(),
  loadItems: jest.fn(async () => undefined),
});

describe("foreman manual recovery command planner", () => {
  it("stays free of queue, persistence, subscription, and fetch side effects", () => {
    const source = readFileSync(join(__dirname, "foreman.manualRecovery.model.ts"), "utf8");

    expect(source).not.toContain("clearForemanMutationsForDraft");
    expect(source).not.toContain("clearForemanMutationQueueTail");
    expect(source).not.toContain("patchForemanDurableDraftRecoveryState");
    expect(source).not.toContain("persistForemanLocalDraftSnapshot");
    expect(source).not.toContain("loadForemanRemoteDraftSnapshot");
    expect(source).not.toContain("pushForemanDurableDraftTelemetry");
    expect(source).not.toContain("fetchRequestDetails");
    expect(source).not.toContain("AppState");
    expect(source).not.toContain("subscribePlatformNetwork");
  });

  it("plans retry_now skip and sync commands without changing mutation semantics", () => {
    expect(planForemanRetryNowAction({ snapshot: null })).toEqual({ action: "skip" });
    expect(planForemanRetryNowAction({ snapshot: emptySnapshot() })).toEqual({ action: "skip" });

    const backgroundSnapshot = makeSnapshot({ submitRequested: false });
    expect(planForemanRetryNowAction({ snapshot: backgroundSnapshot })).toEqual({
      action: "sync_local_draft",
      snapshot: backgroundSnapshot,
      mutationKind: "background_sync",
      localBeforeCount: 1,
      localAfterCount: 1,
      force: true,
    });

    const submitSnapshot = makeSnapshot({ submitRequested: true });
    expect(planForemanRetryNowAction({ snapshot: submitSnapshot })).toEqual({
      action: "sync_local_draft",
      snapshot: submitSnapshot,
      mutationKind: "submit",
      localBeforeCount: 1,
      localAfterCount: 1,
      force: true,
    });
  });

  it("plans rehydrate_server target request and skip behavior", () => {
    expect(planForemanRehydrateServerAction({
      currentSnapshot: null,
      requestId: null,
    })).toEqual({ action: "skip", requestId: null, currentSnapshot: null });

    const snapshot = makeSnapshot({ requestId: "req-from-snapshot" });
    expect(planForemanRehydrateServerAction({
      currentSnapshot: snapshot,
      requestId: "req-route",
    })).toEqual({
      action: "load_remote",
      requestId: "req-from-snapshot",
      currentSnapshot: snapshot,
    });

    expect(planForemanRehydrateServerAction({
      currentSnapshot: emptySnapshot(),
      requestId: "req-route",
    })).toEqual({
      action: "load_remote",
      requestId: "req-route",
      currentSnapshot: emptySnapshot(),
    });
  });

  it("plans rehydrate_server terminal, remote snapshot, and no-snapshot branches", () => {
    const currentSnapshot = makeSnapshot({ requestId: "req-1" });
    const remoteSnapshot = makeSnapshot({ requestId: "req-remote", ownerId: "owner-remote" });

    expect(planForemanRehydrateServerRemoteAction({
      requestId: "req-1",
      currentSnapshot,
      remote: {
        snapshot: null,
        details: { id: "req-1", status: "approved" } as never,
        isTerminal: true,
      },
      now: NOW,
    })).toEqual({
      action: "clear_terminal",
      requestId: "req-1",
      currentSnapshot,
      remoteStatus: "approved",
    });

    expect(planForemanRehydrateServerRemoteAction({
      requestId: "req-1",
      currentSnapshot,
      remote: {
        snapshot: remoteSnapshot,
        details: { id: "req-1", status: "draft" } as never,
        isTerminal: false,
      },
      now: NOW,
    })).toEqual({
      action: "apply_remote_snapshot",
      requestId: "req-1",
      currentSnapshot,
      remoteSnapshot,
      restoreIdentity: "manual:remote:req-1",
      durablePatch: {
        snapshot: remoteSnapshot,
        syncStatus: "synced",
        pendingOperationsCount: 0,
        queueDraftKey: null,
        requestIdKnown: true,
        attentionNeeded: false,
        conflictType: "none",
        lastConflictAt: null,
        recoverableLocalSnapshot: currentSnapshot,
        lastError: null,
        lastErrorAt: null,
        lastErrorStage: null,
        retryCount: 0,
        repeatedFailureStageCount: 0,
        lastTriggerSource: "manual_retry",
        lastSyncAt: NOW,
      },
    });

    expect(planForemanRehydrateServerRemoteAction({
      requestId: "req-1",
      currentSnapshot,
      remote: {
        snapshot: null,
        details: { id: "req-1", status: "draft" } as never,
        isTerminal: false,
      },
      now: NOW,
    })).toMatchObject({
      action: "load_remote_details",
      requestId: "req-1",
      currentSnapshot,
      durablePatch: {
        snapshot: null,
        syncStatus: "idle",
        recoverableLocalSnapshot: currentSnapshot,
        lastSyncAt: NOW,
      },
    });
  });

  it("plans restore_local skip and dirty local recovery patch", () => {
    expect(planForemanRestoreLocalAction({
      durableState: { recoverableLocalSnapshot: null },
      now: NOW,
    })).toEqual({ action: "skip" });

    const snapshot = makeSnapshot({ requestId: "req-restore" });
    expect(planForemanRestoreLocalAction({
      durableState: { recoverableLocalSnapshot: snapshot },
      now: NOW,
    })).toEqual({
      action: "restore_local_snapshot",
      snapshot,
      restoreIdentity: "manual:restore:2026-04-17T00:00:00.000Z",
      conflictType: "stale_local_snapshot",
      durablePatch: {
        snapshot,
        syncStatus: "dirty_local",
        pendingOperationsCount: 0,
        queueDraftKey: null,
        requestIdKnown: true,
        attentionNeeded: true,
        conflictType: "stale_local_snapshot",
        lastConflictAt: NOW,
        recoverableLocalSnapshot: null,
        lastTriggerSource: "manual_retry",
      },
    });

    const localOnlySnapshot = makeSnapshot({ requestId: "" });
    expect(planForemanRestoreLocalAction({
      durableState: { recoverableLocalSnapshot: localOnlySnapshot },
      now: NOW,
    })).toMatchObject({
      action: "restore_local_snapshot",
      conflictType: "retryable_sync_failure",
      durablePatch: {
        requestIdKnown: false,
        conflictType: "retryable_sync_failure",
      },
    });

    const whitespaceRequestIdSnapshot = makeSnapshot({ requestId: "   " });
    expect(planForemanRestoreLocalAction({
      durableState: { recoverableLocalSnapshot: whitespaceRequestIdSnapshot },
      now: NOW,
    })).toMatchObject({
      action: "restore_local_snapshot",
      conflictType: "stale_local_snapshot",
      durablePatch: {
        requestIdKnown: true,
        conflictType: "stale_local_snapshot",
      },
    });
  });

  it("plans discard_local no-target and remote-load branches", () => {
    expect(planForemanDiscardLocalAction({
      durableState: { lastSyncAt: 123 },
      currentSnapshot: null,
      requestId: null,
    })).toEqual({
      action: "clear_local_without_remote",
      requestId: null,
      currentSnapshot: null,
      durablePatch: {
        snapshot: null,
        syncStatus: "idle",
        pendingOperationsCount: 0,
        queueDraftKey: null,
        requestIdKnown: false,
        attentionNeeded: false,
        conflictType: "none",
        lastConflictAt: null,
        recoverableLocalSnapshot: null,
        lastError: null,
        lastErrorAt: null,
        lastErrorStage: null,
        retryCount: 0,
        repeatedFailureStageCount: 0,
        lastTriggerSource: "manual_retry",
        lastSyncAt: 123,
      },
    });

    const snapshot = makeSnapshot({ requestId: "req-discard" });
    expect(planForemanDiscardLocalAction({
      durableState: { lastSyncAt: null },
      currentSnapshot: snapshot,
      requestId: "req-route",
    })).toEqual({
      action: "load_remote",
      requestId: "req-discard",
      currentSnapshot: snapshot,
    });
  });

  it("plans discard_local terminal, remote snapshot, and no-snapshot branches", () => {
    const currentSnapshot = makeSnapshot({ requestId: "req-1" });
    const remoteSnapshot = makeSnapshot({ requestId: "req-1", ownerId: "owner-remote" });

    expect(planForemanDiscardLocalRemoteAction({
      requestId: "req-1",
      currentSnapshot,
      remote: {
        snapshot: null,
        details: { id: "req-1", status: "submitted" } as never,
        isTerminal: true,
      },
      now: NOW,
    })).toEqual({
      action: "clear_terminal",
      requestId: "req-1",
      currentSnapshot,
      remoteStatus: "submitted",
    });

    expect(planForemanDiscardLocalRemoteAction({
      requestId: "req-1",
      currentSnapshot,
      remote: {
        snapshot: remoteSnapshot,
        details: { id: "req-1", status: "draft" } as never,
        isTerminal: false,
      },
      now: NOW,
    })).toMatchObject({
      action: "apply_remote_snapshot",
      requestId: "req-1",
      currentSnapshot,
      remoteSnapshot,
      restoreIdentity: "manual:discard:req-1",
      durablePatch: {
        snapshot: remoteSnapshot,
        syncStatus: "synced",
        recoverableLocalSnapshot: null,
        lastSyncAt: NOW,
      },
    });

    expect(planForemanDiscardLocalRemoteAction({
      requestId: "req-1",
      currentSnapshot,
      remote: {
        snapshot: null,
        details: { id: "req-1", status: "draft" } as never,
        isTerminal: false,
      },
      now: NOW,
    })).toMatchObject({
      action: "load_remote_details",
      requestId: "req-1",
      currentSnapshot,
      durablePatch: {
        snapshot: null,
        syncStatus: "idle",
        recoverableLocalSnapshot: null,
        lastSyncAt: NOW,
      },
    });
  });

  it("plans clear_failed_queue without owning queue side effects", () => {
    const snapshot = makeSnapshot();
    expect(planForemanClearFailedQueueTailAction({ snapshot })).toEqual({
      action: "clear_queue_tail",
      snapshot,
      triggerSource: "manual_retry",
    });
  });

  it("plans manual recovery telemetry payload without owning telemetry side effects", () => {
    const snapshot = makeSnapshot({ requestId: " req-telemetry " });

    expect(resolveForemanManualRecoveryTelemetryPlan({
      snapshot,
      draftKey: "req-telemetry",
      durableState: {
        conflictType: "retryable_sync_failure",
        retryCount: 2,
        pendingOperationsCount: 3,
      },
      recoveryAction: "retry_now",
      result: "terminal_failure",
      conflictType: "server_terminal_conflict",
      errorClass: "recovery",
      errorCode: "retry_failed",
      networkOnline: false,
      localOnlyRequestId: "__foreman_local_draft__",
    })).toEqual({
      action: "push_recovery_telemetry",
      commands: FOREMAN_MANUAL_RECOVERY_TELEMETRY_COMMANDS,
      telemetry: {
        stage: "recovery",
        result: "terminal_failure",
        draftKey: "req-telemetry",
        requestId: "req-telemetry",
        localOnlyDraftKey: false,
        attemptNumber: 3,
        queueSizeBefore: 3,
        queueSizeAfter: 3,
        coalescedCount: 0,
        conflictType: "server_terminal_conflict",
        recoveryAction: "retry_now",
        errorClass: "recovery",
        errorCode: "retry_failed",
        offlineState: "offline",
        triggerSource: "manual_retry",
      },
    });

    expect(resolveForemanManualRecoveryTelemetryPlan({
      snapshot: makeSnapshot({ requestId: "" }),
      draftKey: "__foreman_local_draft__",
      durableState: {
        conflictType: "none",
        retryCount: 0,
        pendingOperationsCount: 0,
      },
      recoveryAction: "discard_local",
      result: "success",
      networkOnline: undefined,
      localOnlyRequestId: "__foreman_local_draft__",
    }).telemetry).toMatchObject({
      requestId: null,
      localOnlyDraftKey: true,
      attemptNumber: 1,
      conflictType: "none",
      errorClass: null,
      errorCode: null,
      offlineState: "unknown",
    });
  });

  it("keeps pushRecoveryTelemetry side effects in the established order", () => {
    const source = readFileSync(join(__dirname, "hooks", "useForemanDraftBoundary.ts"), "utf8");
    const start = source.indexOf("const pushRecoveryTelemetry = useCallback");
    const end = source.indexOf("const reportDraftBoundaryFailure = useCallback", start);
    const block = source.slice(start, end);
    const expectedOrder = [
      "const durableState = getForemanDurableDraftState()",
      "const snapshot = localDraftSnapshotRef.current ?? durableState.snapshot",
      "const recoveryDraftKey = getDraftQueueKey(snapshot)",
      "const recoveryTelemetryPlan = resolveForemanManualRecoveryTelemetryPlan",
      "pushForemanDurableDraftTelemetry(recoveryTelemetryPlan.telemetry)",
    ];

    let previousIndex = -1;
    for (const marker of expectedOrder) {
      const nextIndex = block.indexOf(marker);
      expect(nextIndex).toBeGreaterThan(previousIndex);
      previousIndex = nextIndex;
    }
  });
});

describe("foreman manual recovery remote boundary apply", () => {
  it("applies remote snapshots in the same order used by rehydrate/discard flows", async () => {
    const deps = createRemoteApplyDeps();
    const remoteSnapshot = makeSnapshot({ ownerId: "remote-owner" });
    const durablePatch = { snapshot: remoteSnapshot, syncStatus: "synced" as const };

    await expect(applyForemanManualRecoveryRemotePlanToBoundary({
      ...deps,
      remotePlan: {
        action: "apply_remote_snapshot",
        requestId: "req-1",
        currentSnapshot: makeSnapshot({ ownerId: "local-owner" }),
        remoteSnapshot,
        restoreIdentity: "manual:remote:req-1",
        durablePatch,
      },
    })).resolves.toEqual({ action: "applied_remote_snapshot", requestId: "req-1" });

    expect(deps.setActiveDraftOwnerId).toHaveBeenCalledWith("remote-owner", {
      resetSubmitted: true,
    });
    expect(deps.applyLocalDraftSnapshotToBoundary).toHaveBeenCalledWith(remoteSnapshot, {
      restoreHeader: true,
      clearWhenEmpty: true,
      restoreSource: "remoteDraft",
      restoreIdentity: "manual:remote:req-1",
    });
    expect(deps.patchForemanDurableDraftRecoveryState).toHaveBeenCalledWith(durablePatch);
    expect(deps.refreshBoundarySyncState).toHaveBeenCalledWith(remoteSnapshot);
    expect(deps.loadItems).not.toHaveBeenCalled();
  });

  it("loads remote details without rebuilding a local snapshot", async () => {
    const deps = createRemoteApplyDeps();
    const details = { id: "req-2", status: "draft" } as never;
    const durablePatch = { snapshot: null, syncStatus: "idle" as const };

    await expect(applyForemanManualRecoveryRemotePlanToBoundary({
      ...deps,
      remotePlan: {
        action: "load_remote_details",
        requestId: "req-2",
        currentSnapshot: makeSnapshot(),
        details,
        durablePatch,
      },
    })).resolves.toEqual({ action: "loaded_remote_details", requestId: "req-2" });

    expect(deps.setActiveDraftOwnerId).toHaveBeenCalledWith(undefined, {
      resetSubmitted: true,
    });
    expect(deps.persistLocalDraftSnapshot).toHaveBeenCalledWith(null);
    expect(deps.setRequestIdState).toHaveBeenCalledWith("req-2");
    expect(deps.setRequestDetails).toHaveBeenCalledWith(details);
    expect(deps.syncHeaderFromDetails).toHaveBeenCalledWith(details);
    expect(deps.loadItems).toHaveBeenCalledWith("req-2", { forceRemote: true });
    expect(deps.patchForemanDurableDraftRecoveryState).toHaveBeenCalledWith(durablePatch);
    expect(deps.refreshBoundarySyncState).toHaveBeenCalledWith(null);
  });

  it("clears terminal remote plans without touching non-terminal apply effects", async () => {
    const deps = createRemoteApplyDeps();
    const snapshot = makeSnapshot();

    await expect(applyForemanManualRecoveryRemotePlanToBoundary({
      ...deps,
      remotePlan: {
        action: "clear_terminal",
        requestId: "req-3",
        currentSnapshot: snapshot,
        remoteStatus: "submitted",
      },
    })).resolves.toEqual({ action: "cleared_terminal", requestId: "req-3" });

    expect(deps.clearTerminalLocalDraft).toHaveBeenCalledWith({
      snapshot,
      requestId: "req-3",
      remoteStatus: "submitted",
    });
    expect(deps.applyLocalDraftSnapshotToBoundary).not.toHaveBeenCalled();
    expect(deps.patchForemanDurableDraftRecoveryState).not.toHaveBeenCalled();
    expect(deps.refreshBoundarySyncState).not.toHaveBeenCalled();
  });
});
