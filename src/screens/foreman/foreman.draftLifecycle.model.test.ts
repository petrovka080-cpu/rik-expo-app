import { readFileSync } from "fs";
import { join } from "path";

import {
  FOREMAN_BOOTSTRAP_HYDRATE_TELEMETRY_COMMANDS,
  buildForemanDraftRestoreFailureTelemetry,
  buildForemanBootstrapStaleDurableResetPatch,
  getForemanBootstrapReconciliationRequestId,
  planForemanAppActiveRestoreTrigger,
  planForemanBootstrapReenqueueCommand,
  planForemanFocusRestoreTrigger,
  planForemanNetworkBackRestoreTrigger,
  resolveForemanBootstrapCompletionStartPlan,
  resolveForemanBootstrapHydrateTelemetryPlan,
  resolveForemanBootstrapOwnerPlan,
  resolveForemanBootstrapReconciliationPlan,
  resolveForemanBootstrapReenqueuePlan,
  resolveForemanBootstrapStaleDurableResetExecutionPlan,
  resolveForemanActiveLocalDraftSnapshotPlan,
  resolveForemanDraftCacheClearPlan,
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
    expect(source).not.toContain("pushForemanDurableDraftTelemetry");
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

  it("selects only active local draft snapshots by content, owner, and request identity", () => {
    const snapshot = makeSnapshot({
      ownerId: "owner-active",
      requestId: "req-active",
    });

    expect(resolveForemanActiveLocalDraftSnapshotPlan({
      snapshot: null,
      activeDraftOwnerId: "owner-active",
      activeRequestId: "req-active",
    })).toEqual({
      action: "skip",
      snapshot: null,
      reason: "missing_or_empty_snapshot",
    });

    expect(resolveForemanActiveLocalDraftSnapshotPlan({
      snapshot: emptySnapshot(),
      activeDraftOwnerId: "owner-active",
      activeRequestId: null,
    })).toEqual({
      action: "skip",
      snapshot: null,
      reason: "missing_or_empty_snapshot",
    });

    expect(resolveForemanActiveLocalDraftSnapshotPlan({
      snapshot,
      activeDraftOwnerId: "owner-other",
      activeRequestId: "req-active",
    })).toEqual({
      action: "skip",
      snapshot: null,
      reason: "owner_mismatch",
    });

    expect(resolveForemanActiveLocalDraftSnapshotPlan({
      snapshot,
      activeDraftOwnerId: "owner-active",
      activeRequestId: "req-active",
    })).toEqual({
      action: "use_snapshot",
      snapshot,
      reason: "active_request_match",
    });

    expect(resolveForemanActiveLocalDraftSnapshotPlan({
      snapshot,
      activeDraftOwnerId: "owner-active",
      targetRequestId: "req-other",
      activeRequestId: "req-active",
    })).toEqual({
      action: "skip",
      snapshot: null,
      reason: "request_mismatch",
    });
  });

  it("preserves local-only draft selection and explicit empty target request semantics", () => {
    const localOnlySnapshot = makeSnapshot({
      ownerId: "owner-local",
      requestId: "",
    });

    expect(resolveForemanActiveLocalDraftSnapshotPlan({
      snapshot: localOnlySnapshot,
      activeDraftOwnerId: "owner-local",
      activeRequestId: null,
    })).toEqual({
      action: "use_snapshot",
      snapshot: localOnlySnapshot,
      reason: "local_only_without_active_request",
    });

    expect(resolveForemanActiveLocalDraftSnapshotPlan({
      snapshot: localOnlySnapshot,
      activeDraftOwnerId: "owner-local",
      activeRequestId: "req-active",
    })).toEqual({
      action: "skip",
      snapshot: null,
      reason: "local_only_with_active_request",
    });

    expect(resolveForemanActiveLocalDraftSnapshotPlan({
      snapshot: localOnlySnapshot,
      activeDraftOwnerId: "owner-local",
      targetRequestId: "",
      activeRequestId: "req-active",
    })).toEqual({
      action: "use_snapshot",
      snapshot: localOnlySnapshot,
      reason: "local_only_without_active_request",
    });
  });

  it("plans draft cache cleanup queue keys with legacy snapshot priority and dedupe", () => {
    expect(resolveForemanDraftCacheClearPlan({
      activeSnapshot: makeSnapshot({ requestId: "req-snapshot" }),
      optionRequestId: "req-option",
      activeRequestId: "req-active",
      localOnlyRequestId: "__foreman_local_draft__",
    })).toEqual({
      action: "clear_draft_cache",
      cleanupRequestId: "req-option",
      queueKeys: ["__foreman_local_draft__", "req-snapshot"],
    });

    expect(resolveForemanDraftCacheClearPlan({
      activeSnapshot: makeSnapshot({ requestId: "" }),
      optionRequestId: "req-option",
      activeRequestId: "req-active",
      localOnlyRequestId: "__foreman_local_draft__",
    })).toEqual({
      action: "clear_draft_cache",
      cleanupRequestId: "req-option",
      queueKeys: ["__foreman_local_draft__", "req-option"],
    });

    expect(resolveForemanDraftCacheClearPlan({
      activeSnapshot: null,
      optionRequestId: null,
      activeRequestId: " req-active ",
      localOnlyRequestId: "__foreman_local_draft__",
    })).toEqual({
      action: "clear_draft_cache",
      cleanupRequestId: "req-active",
      queueKeys: ["__foreman_local_draft__", "req-active"],
    });

    expect(resolveForemanDraftCacheClearPlan({
      activeSnapshot: null,
      optionRequestId: null,
      activeRequestId: null,
      localOnlyRequestId: "__foreman_local_draft__",
    })).toEqual({
      action: "clear_draft_cache",
      cleanupRequestId: "",
      queueKeys: ["__foreman_local_draft__"],
    });
  });

  it("keeps clearDraftCache side effects in the established order", () => {
    const source = readFileSync(join(__dirname, "hooks", "useForemanDraftBoundary.ts"), "utf8");
    const start = source.indexOf("const clearDraftCache = useCallback");
    const end = source.indexOf("const resetDraftState = useCallback", start);
    const block = source.slice(start, end);
    const expectedOrder = [
      "const activeSnapshot = options?.snapshot ?? localDraftSnapshotRef.current",
      "const cacheClearPlan = resolveForemanDraftCacheClearPlan",
      "Array.from(cacheClearPlan.queueKeys)",
      "clearForemanMutationsForDraft(key)",
      "clearForemanDraftCacheState(persistLocalDraftSnapshot, patchBoundaryState)",
      "refreshBoundarySyncState(null)",
    ];

    let previousIndex = -1;
    for (const marker of expectedOrder) {
      const nextIndex = block.indexOf(marker);
      expect(nextIndex).toBeGreaterThan(previousIndex);
      previousIndex = nextIndex;
    }
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

  it("plans stale durable bootstrap reset execution without running hook effects", () => {
    const lastSyncAt = 123456;
    const durableState = {
      ...baseDurableState,
      syncStatus: "failed_terminal" as const,
      attentionNeeded: true,
      conflictType: "server_terminal_conflict" as const,
      pendingOperationsCount: 4,
      retryCount: 5,
      lastSyncAt,
    };
    const resetPlan = resolveForemanBootstrapCompletionStartPlan({
      durableSnapshot: null,
      durableState,
      requestId: "req-active",
    });

    expect(resetPlan.action).toBe("reset_stale_durable");
    if (resetPlan.action !== "reset_stale_durable") {
      throw new Error("expected reset plan");
    }

    expect(resolveForemanBootstrapStaleDurableResetExecutionPlan({
      resetPlan,
      durableState,
    })).toEqual({
      durablePatch: buildForemanBootstrapStaleDurableResetPatch({ lastSyncAt }),
      activeOwnerReset: { nextOwnerId: undefined, resetSubmitted: true },
      resetDraftState: true,
      clearLocalSnapshotRef: true,
      nextLocalSnapshot: null,
      refreshBoundarySnapshot: null,
      devTelemetry: {
        syncStatus: "failed_terminal",
        attentionNeeded: true,
        conflictType: "server_terminal_conflict",
        pendingOps: 4,
        retryCount: 5,
      },
    });
  });

  it("keeps bootstrap stale reset side effects in the legacy order", () => {
    const source = readFileSync(join(__dirname, "hooks", "useForemanDraftBoundary.ts"), "utf8");
    const start = source.indexOf("const completionStartPlan = resolveForemanBootstrapCompletionStartPlan");
    const end = source.indexOf("const ownerPlan = completionStartPlan.ownerPlan", start);
    const block = source.slice(start, end);
    const expectedOrder = [
      "resolveForemanBootstrapCompletionStartPlan",
      "resolveForemanBootstrapStaleDurableResetExecutionPlan",
      'console.info("[foreman.bootstrap] resetting stale durable sync metadata"',
      "patchForemanDurableDraftRecoveryState(staleResetExecutionPlan.durablePatch)",
      "setActiveDraftOwnerId(staleResetExecutionPlan.activeOwnerReset.nextOwnerId",
      "resetDraftState()",
      "localDraftSnapshotRef.current = staleResetExecutionPlan.nextLocalSnapshot",
      "setLocalDraftSnapshot(staleResetExecutionPlan.nextLocalSnapshot)",
      "refreshBoundarySyncState(staleResetExecutionPlan.refreshBoundarySnapshot)",
      "return;",
    ];

    let previousIndex = -1;
    for (const marker of expectedOrder) {
      const nextIndex = block.indexOf(marker);
      expect(nextIndex).toBeGreaterThan(previousIndex);
      previousIndex = nextIndex;
    }
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

  it("plans bootstrap hydrate telemetry payload without owning telemetry side effects", () => {
    const snapshot = makeSnapshot({
      requestId: " req-hydrate ",
      updatedAt: "2026-04-17T10:00:00.000Z",
    });

    expect(resolveForemanBootstrapHydrateTelemetryPlan({
      snapshot,
      draftKey: "req-hydrate",
      durableConflictType: "retryable_sync_failure",
      networkOnline: false,
      localOnlyRequestId: "__foreman_local_draft__",
    })).toEqual({
      action: "push_hydrate_success_telemetry",
      commands: FOREMAN_BOOTSTRAP_HYDRATE_TELEMETRY_COMMANDS,
      telemetry: {
        stage: "hydrate",
        result: "success",
        draftKey: "req-hydrate",
        requestId: "req-hydrate",
        localOnlyDraftKey: false,
        attemptNumber: 0,
        queueSizeBefore: null,
        queueSizeAfter: null,
        coalescedCount: 0,
        conflictType: "retryable_sync_failure",
        recoveryAction: null,
        errorClass: null,
        errorCode: null,
        offlineState: "offline",
        triggerSource: "bootstrap_complete",
      },
    });

    expect(resolveForemanBootstrapHydrateTelemetryPlan({
      snapshot: makeSnapshot({ requestId: "" }),
      draftKey: "__foreman_local_draft__",
      durableConflictType: "none",
      networkOnline: undefined,
      localOnlyRequestId: "__foreman_local_draft__",
    }).telemetry).toMatchObject({
      requestId: null,
      localOnlyDraftKey: true,
      offlineState: "unknown",
    });
  });

  it("keeps bootstrap hydrate telemetry before pending-count and re-enqueue work", () => {
    const source = readFileSync(join(__dirname, "hooks", "useForemanDraftBoundary.ts"), "utf8");
    const start = source.indexOf("if (durableSnapshot && completionStartPlan.hasDurableSnapshotContent)");
    const end = source.indexOf("await refreshBoundarySyncState(durableSnapshot ?? null)", start);
    const block = source.slice(start, end);
    const expectedOrder = [
      "const hydrateDraftKey = getDraftQueueKey(durableSnapshot)",
      "const hydrateTelemetryPlan = resolveForemanBootstrapHydrateTelemetryPlan",
      "pushForemanDurableDraftTelemetry(hydrateTelemetryPlan.telemetry)",
      "const pendingOperationsCount = await getForemanPendingMutationCountForDraftKeys",
      "const reconciledRequestId = getForemanBootstrapReconciliationRequestId(durableSnapshot)",
      "const reenqueueState = getForemanDurableDraftState()",
      "const reenqueuePlan = planForemanBootstrapReenqueueCommand",
      "await enqueueForemanMutation(reenqueuePlan.enqueue)",
      "await markForemanSnapshotQueued(durableSnapshot",
    ];

    let previousIndex = -1;
    for (const marker of expectedOrder) {
      const nextIndex = block.indexOf(marker);
      expect(nextIndex).toBeGreaterThan(previousIndex);
      previousIndex = nextIndex;
    }
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
