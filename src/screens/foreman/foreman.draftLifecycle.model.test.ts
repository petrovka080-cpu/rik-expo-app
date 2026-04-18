import { readFileSync } from "fs";
import { join } from "path";

import {
  buildForemanDraftRestoreFailureTelemetry,
  buildForemanBootstrapStaleDurableResetPatch,
  getForemanBootstrapReconciliationRequestId,
  planForemanAppActiveRestoreTrigger,
  planForemanBootstrapReenqueueCommand,
  planForemanFocusRestoreTrigger,
  planForemanNetworkBackRestoreTrigger,
  resolveForemanBootstrapCompletionStartPlan,
  resolveForemanBootstrapOwnerPlan,
  resolveForemanBootstrapReconciliationPlan,
  resolveForemanBootstrapReenqueuePlan,
  resolveForemanRestoreRemoteCheckPlan,
  resolveForemanRestoreRemoteStatusPlan,
  shouldPersistForemanLifecycleSnapshot,
  shouldResetForemanBootstrapStaleDurableState,
  shouldSkipForemanRemoteDraftEffects,
  shouldSyncForemanDraftAfterRestoreCheck,
} from "./foreman.draftLifecycle.model";
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

const baseDurableState = {
  syncStatus: "idle" as const,
  attentionNeeded: false,
  conflictType: "none" as const,
  pendingOperationsCount: 0,
  retryCount: 0,
};

describe("foreman draft lifecycle decision model", () => {
  it("stays free of queue, persistence, subscription, and fetch side effects", () => {
    const source = readFileSync(join(__dirname, "foreman.draftLifecycle.model.ts"), "utf8");

    expect(source).not.toContain("enqueueForemanMutation");
    expect(source).not.toContain("flushForemanMutationQueue");
    expect(source).not.toContain("patchForemanDurableDraftRecoveryState");
    expect(source).not.toContain("persistForemanLocalDraftSnapshot");
    expect(source).not.toContain("fetchRequestDetails");
    expect(source).not.toContain("AppState");
    expect(source).not.toContain("subscribePlatformNetwork");
    expect(source).not.toContain("runForemanQueueRecovery");
    expect(source).not.toContain("clearTerminalLocalDraft");
    expect(source).not.toContain("Date.now");
  });

  it("plans lifecycle restore triggers without executing restore side effects", () => {
    expect(
      planForemanFocusRestoreTrigger({
        bootstrapReady: true,
        isScreenFocused: true,
        wasScreenFocused: false,
      }),
    ).toEqual({
      action: "restore",
      context: "focus",
      failureTelemetry: {
        event: "restore_draft_on_focus_failed",
        context: "focus",
        stage: "recovery",
        sourceKind: "draft_boundary:focus_restore",
      },
    });

    expect(
      planForemanFocusRestoreTrigger({
        bootstrapReady: false,
        isScreenFocused: true,
        wasScreenFocused: false,
      }),
    ).toEqual({ action: "skip", context: "focus", reason: "bootstrap_not_ready" });

    expect(
      planForemanFocusRestoreTrigger({
        bootstrapReady: true,
        isScreenFocused: false,
        wasScreenFocused: false,
      }),
    ).toEqual({ action: "skip", context: "focus", reason: "screen_not_focused" });

    expect(
      planForemanFocusRestoreTrigger({
        bootstrapReady: true,
        isScreenFocused: true,
        wasScreenFocused: true,
      }),
    ).toEqual({ action: "skip", context: "focus", reason: "already_focused" });
  });

  it("plans app-active and network-back restore triggers with existing failure telemetry", () => {
    expect(
      planForemanAppActiveRestoreTrigger({
        bootstrapReady: true,
        previousState: "background",
        nextState: "active",
      }),
    ).toEqual({
      action: "restore",
      context: "app_active",
      failureTelemetry: buildForemanDraftRestoreFailureTelemetry("app_active"),
    });

    expect(
      planForemanAppActiveRestoreTrigger({
        bootstrapReady: true,
        previousState: "active",
        nextState: "active",
      }),
    ).toEqual({
      action: "skip",
      context: "app_active",
      reason: "app_not_becoming_active",
    });

    expect(
      planForemanNetworkBackRestoreTrigger({
        bootstrapReady: true,
        previousOnline: false,
        nextOnline: true,
      }),
    ).toEqual({
      action: "restore",
      context: "network_back",
      failureTelemetry: {
        event: "restore_draft_on_network_back_failed",
        context: "network_back",
        stage: "recovery",
        sourceKind: "draft_boundary:network_restore",
      },
    });

    expect(
      planForemanNetworkBackRestoreTrigger({
        bootstrapReady: true,
        previousOnline: null,
        nextOnline: true,
      }),
    ).toEqual({
      action: "skip",
      context: "network_back",
      reason: "network_not_recovered",
    });
  });

  it("resets stale durable metadata only when bootstrap has no durable snapshot content", () => {
    expect(
      shouldResetForemanBootstrapStaleDurableState({
        durableSnapshot: null,
        durableState: {
          ...baseDurableState,
          syncStatus: "retry_wait",
          attentionNeeded: true,
          conflictType: "retryable_sync_failure",
          pendingOperationsCount: 2,
          retryCount: 3,
        },
      }),
    ).toBe(true);

    expect(
      shouldResetForemanBootstrapStaleDurableState({
        durableSnapshot: makeSnapshot(),
        durableState: {
          ...baseDurableState,
          syncStatus: "retry_wait",
          attentionNeeded: true,
          conflictType: "retryable_sync_failure",
          pendingOperationsCount: 2,
          retryCount: 3,
        },
      }),
    ).toBe(false);

    expect(
      shouldResetForemanBootstrapStaleDurableState({
        durableSnapshot: emptySnapshot(),
        durableState: baseDurableState,
      }),
    ).toBe(false);
  });

  it("preserves bootstrap owner handling", () => {
    expect(resolveForemanBootstrapOwnerPlan({
      durableSnapshot: makeSnapshot({ ownerId: "owner-durable" }),
      requestId: null,
    })).toEqual({ action: "set_owner", ownerId: "owner-durable" });

    expect(resolveForemanBootstrapOwnerPlan({
      durableSnapshot: null,
      requestId: null,
    })).toEqual({ action: "reset_owner" });

    expect(resolveForemanBootstrapOwnerPlan({
      durableSnapshot: null,
      requestId: "req-active",
    })).toEqual({ action: "keep_owner" });
  });

  it("plans stale durable bootstrap reset as a pure command payload", () => {
    const lastSyncAt = 123456;
    const durableState = {
      ...baseDurableState,
      syncStatus: "retry_wait" as const,
      attentionNeeded: true,
      conflictType: "retryable_sync_failure" as const,
      pendingOperationsCount: 2,
      retryCount: 3,
      lastSyncAt,
    };

    const expectedPatch = buildForemanBootstrapStaleDurableResetPatch({ lastSyncAt });
    expect(resolveForemanBootstrapCompletionStartPlan({
      durableSnapshot: null,
      durableState,
      requestId: "req-active",
    })).toEqual({
      action: "reset_stale_durable",
      durablePatch: expectedPatch,
      activeOwnerReset: { nextOwnerId: undefined, resetSubmitted: true },
      resetDraftState: true,
      clearLocalSnapshotRef: true,
      nextLocalSnapshot: null,
      refreshBoundarySnapshot: null,
    });
  });

  it("plans bootstrap continuation with owner and content signals", () => {
    const snapshot = makeSnapshot({ ownerId: "owner-durable" });

    expect(resolveForemanBootstrapCompletionStartPlan({
      durableSnapshot: snapshot,
      durableState: {
        ...baseDurableState,
        syncStatus: "retry_wait",
        attentionNeeded: true,
        conflictType: "retryable_sync_failure",
        pendingOperationsCount: 2,
        retryCount: 3,
        lastSyncAt: null,
      },
      requestId: null,
    })).toEqual({
      action: "continue",
      ownerPlan: { action: "set_owner", ownerId: "owner-durable" },
      hasDurableSnapshotContent: true,
    });

    expect(resolveForemanBootstrapCompletionStartPlan({
      durableSnapshot: emptySnapshot({ ownerId: "" }),
      durableState: { ...baseDurableState, lastSyncAt: null },
      requestId: null,
    })).toEqual({
      action: "continue",
      ownerPlan: { action: "reset_owner" },
      hasDurableSnapshotContent: false,
    });
  });

  it("plans bootstrap terminal reconciliation before any re-enqueue", () => {
    const snapshot = makeSnapshot({ requestId: "req-terminal" });

    expect(getForemanBootstrapReconciliationRequestId(snapshot)).toBe("req-terminal");
    expect(resolveForemanBootstrapReconciliationPlan({
      snapshot,
      remoteStatus: "submitted",
      remoteStatusIsTerminal: true,
    })).toEqual({
      action: "clear_terminal",
      requestId: "req-terminal",
      remoteStatus: "submitted",
    });

    expect(resolveForemanBootstrapReconciliationPlan({
      snapshot,
      remoteStatus: "draft",
      remoteStatusIsTerminal: false,
    })).toEqual({
      action: "preserve",
      requestId: "req-terminal",
      remoteStatus: "draft",
    });

    expect(resolveForemanBootstrapReconciliationPlan({
      snapshot: emptySnapshot(),
      remoteStatus: "submitted",
      remoteStatusIsTerminal: true,
    })).toEqual({
      action: "skip_remote_check",
      requestId: null,
      remoteStatus: null,
    });
  });

  it("reenqueues only the legacy eligible bootstrap cases", () => {
    expect(resolveForemanBootstrapReenqueuePlan({
      pendingOperationsCount: 0,
      conflictAutoRecoverable: true,
      snapshotSubmitRequested: true,
      snapshotHasPendingSync: false,
      syncStatus: "idle",
    })).toEqual({ shouldEnqueue: true, mutationKind: "submit" });

    expect(resolveForemanBootstrapReenqueuePlan({
      pendingOperationsCount: 0,
      conflictAutoRecoverable: true,
      snapshotSubmitRequested: false,
      snapshotHasPendingSync: true,
      syncStatus: "idle",
    })).toEqual({ shouldEnqueue: true, mutationKind: "background_sync" });

    expect(resolveForemanBootstrapReenqueuePlan({
      pendingOperationsCount: 0,
      conflictAutoRecoverable: true,
      snapshotSubmitRequested: false,
      snapshotHasPendingSync: false,
      syncStatus: "retry_wait",
    })).toEqual({ shouldEnqueue: true, mutationKind: "background_sync" });

    expect(resolveForemanBootstrapReenqueuePlan({
      pendingOperationsCount: 1,
      conflictAutoRecoverable: true,
      snapshotSubmitRequested: true,
      snapshotHasPendingSync: true,
      syncStatus: "retry_wait",
    })).toEqual({ shouldEnqueue: false, mutationKind: null });

    expect(resolveForemanBootstrapReenqueuePlan({
      pendingOperationsCount: 0,
      conflictAutoRecoverable: false,
      snapshotSubmitRequested: true,
      snapshotHasPendingSync: true,
      syncStatus: "retry_wait",
    })).toEqual({ shouldEnqueue: false, mutationKind: null });
  });

  it("plans bootstrap re-enqueue command payload without executing queue side effects", () => {
    const snapshot = makeSnapshot({
      requestId: "req-replay",
      updatedAt: "2026-04-17T10:00:00.000Z",
      submitRequested: true,
    });

    expect(planForemanBootstrapReenqueueCommand({
      snapshot,
      pendingOperationsCount: 0,
      conflictAutoRecoverable: true,
      snapshotHasPendingSync: false,
      syncStatus: "idle",
      draftKey: "req-replay",
    })).toEqual({
      action: "reenqueue",
      enqueue: {
        draftKey: "req-replay",
        requestId: "req-replay",
        snapshotUpdatedAt: "2026-04-17T10:00:00.000Z",
        mutationKind: "submit",
        localBeforeCount: 1,
        localAfterCount: 1,
        submitRequested: true,
        triggerSource: "bootstrap_complete",
      },
      markQueued: {
        queueDraftKey: "req-replay",
        triggerSource: "bootstrap_complete",
      },
      refreshBoundarySnapshot: snapshot,
    });

    expect(planForemanBootstrapReenqueueCommand({
      snapshot: makeSnapshot({ requestId: "req-bg", submitRequested: false }),
      pendingOperationsCount: 0,
      conflictAutoRecoverable: true,
      snapshotHasPendingSync: true,
      syncStatus: "idle",
      draftKey: "req-bg",
    })).toEqual(expect.objectContaining({
      action: "reenqueue",
      enqueue: expect.objectContaining({
        mutationKind: "background_sync",
        triggerSource: "bootstrap_complete",
      }),
    }));
  });

  it("skips bootstrap re-enqueue when pending queue or conflict gates block replay", () => {
    const snapshot = makeSnapshot({ requestId: "req-skip", submitRequested: true });

    expect(planForemanBootstrapReenqueueCommand({
      snapshot,
      pendingOperationsCount: 1,
      conflictAutoRecoverable: true,
      snapshotHasPendingSync: true,
      syncStatus: "retry_wait",
      draftKey: "req-skip",
    })).toEqual({
      action: "skip_reenqueue",
      refreshBoundarySnapshot: snapshot,
    });

    expect(planForemanBootstrapReenqueueCommand({
      snapshot,
      pendingOperationsCount: 0,
      conflictAutoRecoverable: false,
      snapshotHasPendingSync: true,
      syncStatus: "retry_wait",
      draftKey: "req-skip",
    })).toEqual({
      action: "skip_reenqueue",
      refreshBoundarySnapshot: snapshot,
    });
  });

  it("plans restore terminal checks without deciding side effects", () => {
    expect(resolveForemanRestoreRemoteCheckPlan({
      snapshot: makeSnapshot({ requestId: "req-restore" }),
    })).toEqual({ action: "check_terminal", requestId: "req-restore" });

    expect(resolveForemanRestoreRemoteCheckPlan({
      snapshot: emptySnapshot(),
    })).toEqual({ action: "skip_terminal_check", requestId: null });

    expect(resolveForemanRestoreRemoteStatusPlan({
      requestId: "req-restore",
      remoteStatus: "approved",
      remoteStatusIsTerminal: true,
    })).toEqual({
      action: "clear_terminal",
      requestId: "req-restore",
      remoteStatus: "approved",
    });

    expect(resolveForemanRestoreRemoteStatusPlan({
      requestId: "req-restore",
      remoteStatus: null,
      remoteStatusIsTerminal: false,
    })).toEqual({
      action: "preserve",
      requestId: "req-restore",
      remoteStatus: null,
    });
  });

  it("keeps restore sync and remote hydration suppression decisions identical", () => {
    expect(shouldSyncForemanDraftAfterRestoreCheck({ conflictAutoRecoverable: true })).toBe(true);
    expect(shouldSyncForemanDraftAfterRestoreCheck({ conflictAutoRecoverable: false })).toBe(false);

    expect(shouldSkipForemanRemoteDraftEffects({
      bootstrapReady: false,
      activeSnapshot: null,
      requestId: "req-1",
    })).toBe(true);

    expect(shouldSkipForemanRemoteDraftEffects({
      bootstrapReady: true,
      activeSnapshot: makeSnapshot({ requestId: "req-1" }),
      requestId: "req-1",
    })).toBe(true);

    expect(shouldSkipForemanRemoteDraftEffects({
      bootstrapReady: true,
      activeSnapshot: makeSnapshot({ requestId: "req-other" }),
      requestId: "req-1",
    })).toBe(false);

    expect(shouldSkipForemanRemoteDraftEffects({
      bootstrapReady: true,
      activeSnapshot: makeSnapshot({ requestId: "" }),
      requestId: null,
    })).toBe(true);

    expect(shouldSkipForemanRemoteDraftEffects({
      bootstrapReady: true,
      activeSnapshot: makeSnapshot({ requestId: "" }),
      requestId: "req-1",
    })).toBe(false);
  });

  it("keeps persist rebuild guard behavior explicit", () => {
    const baseParams = {
      bootstrapReady: true,
      isDraftActive: true,
      localDraftSnapshotRefCleared: false,
      hasRequestDetails: false,
      detailsRequestId: null,
      requestId: "req-1",
      hasLocalDraft: true,
    };

    expect(shouldPersistForemanLifecycleSnapshot(baseParams)).toBe(true);
    expect(shouldPersistForemanLifecycleSnapshot({
      ...baseParams,
      bootstrapReady: false,
    })).toBe(false);
    expect(shouldPersistForemanLifecycleSnapshot({
      ...baseParams,
      isDraftActive: false,
    })).toBe(false);
    expect(shouldPersistForemanLifecycleSnapshot({
      ...baseParams,
      localDraftSnapshotRefCleared: true,
    })).toBe(false);
    expect(shouldPersistForemanLifecycleSnapshot({
      ...baseParams,
      hasRequestDetails: true,
      detailsRequestId: "req-other",
      requestId: "req-1",
      hasLocalDraft: false,
    })).toBe(false);
  });
});
