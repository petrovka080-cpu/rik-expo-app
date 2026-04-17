import { readFileSync } from "fs";
import { join } from "path";

import {
  planForemanClearFailedQueueTailAction,
  planForemanDiscardLocalAction,
  planForemanDiscardLocalRemoteAction,
  planForemanRehydrateServerAction,
  planForemanRehydrateServerRemoteAction,
  planForemanRestoreLocalAction,
  planForemanRetryNowAction,
} from "./foreman.manualRecovery.model";
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

describe("foreman manual recovery command planner", () => {
  it("stays free of queue, persistence, subscription, and fetch side effects", () => {
    const source = readFileSync(join(__dirname, "foreman.manualRecovery.model.ts"), "utf8");

    expect(source).not.toContain("clearForemanMutationsForDraft");
    expect(source).not.toContain("clearForemanMutationQueueTail");
    expect(source).not.toContain("patchForemanDurableDraftRecoveryState");
    expect(source).not.toContain("persistForemanLocalDraftSnapshot");
    expect(source).not.toContain("loadForemanRemoteDraftSnapshot");
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
});
