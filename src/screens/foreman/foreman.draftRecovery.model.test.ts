import { readFileSync } from "fs";
import { join } from "path";

import { buildForemanSyncUiStatus } from "../../lib/offline/foremanSyncRuntime";
import {
  buildForemanDraftRecoveryBoundaryPatch,
  resolveForemanTerminalRecoveryCleanupDecision,
} from "./foreman.draftRecovery.model";
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

const baseDurableState = {
  syncStatus: "idle" as const,
  lastSyncAt: null,
  lastError: null,
  lastErrorAt: null,
  lastErrorStage: null,
  conflictType: "none" as const,
  retryCount: 0,
  queueDraftKey: null,
  requestIdKnown: false,
  attentionNeeded: false,
  availableRecoveryActions: [],
};

const baseTerminalDurableState = {
  syncStatus: "idle" as const,
  attentionNeeded: false,
  conflictType: "none" as const,
  pendingOperationsCount: 0,
  retryCount: 0,
  availableRecoveryActions: [],
  recoverableLocalSnapshot: null,
};

describe("foreman draft recovery model", () => {
  it("stays free of queue, persistence, and subscription side effects", () => {
    const source = readFileSync(join(__dirname, "foreman.draftRecovery.model.ts"), "utf8");

    expect(source).not.toContain("enqueueForemanMutation");
    expect(source).not.toContain("flushForemanMutationQueue");
    expect(source).not.toContain("clearForemanMutationsForDraft");
    expect(source).not.toContain("patchForemanDurableDraftRecoveryState");
    expect(source).not.toContain("persistLocalDraftSnapshot");
    expect(source).not.toContain("AppState");
    expect(source).not.toContain("subscribePlatformNetwork");
    expect(source).not.toContain("supabase");
  });

  it("preserves retry-wait recovery state and visible manual actions", () => {
    const availableRecoveryActions = ["retry_now", "discard_local"] as const;
    const patch = buildForemanDraftRecoveryBoundaryPatch({
      durableState: {
        ...baseDurableState,
        syncStatus: "retry_wait",
        lastError: "offline",
        conflictType: "retryable_sync_failure",
        retryCount: 2,
        requestIdKnown: true,
        attentionNeeded: true,
        availableRecoveryActions: [...availableRecoveryActions],
      },
      snapshot: makeSnapshot(),
      pendingOperationsCount: 0,
    });

    expect(patch).toMatchObject({
      draftDirty: true,
      syncNeeded: true,
      syncStatus: "retry_wait",
      conflictType: "retryable_sync_failure",
      retryCount: 2,
      pendingOperationsCount: 0,
      requestIdKnown: true,
      attentionNeeded: true,
      availableRecoveryActions: ["retry_now", "discard_local"],
    });

    expect(
      buildForemanSyncUiStatus({
        status: patch.syncStatus,
        conflictType: patch.conflictType,
        pendingOperationsCount: patch.pendingOperationsCount,
        lastSyncAt: patch.lastSyncAt,
        lastErrorAt: patch.lastErrorAt,
        attentionNeeded: patch.attentionNeeded,
        lastErrorStage: patch.lastErrorStage,
        retryCount: patch.retryCount,
      }),
    ).toEqual({
      label: "Need attention",
      detail: "Retry 2",
      tone: "danger",
    });
  });

  it("keeps pending local snapshot changes sync-needed even when durable status is synced", () => {
    const patch = buildForemanDraftRecoveryBoundaryPatch({
      durableState: {
        ...baseDurableState,
        syncStatus: "synced",
      },
      snapshot: makeSnapshot({
        requestId: "",
        items: [
          {
            ...makeSnapshot().items[0],
            remote_item_id: null,
          },
        ],
      }),
      pendingOperationsCount: 0,
    });

    expect(patch.draftDirty).toBe(false);
    expect(patch.syncNeeded).toBe(true);
    expect(patch.syncStatus).toBe("synced");
  });

  it("preserves terminal conflict state, labels, and recovery action visibility", () => {
    const patch = buildForemanDraftRecoveryBoundaryPatch({
      durableState: {
        ...baseDurableState,
        syncStatus: "failed_terminal",
        conflictType: "server_terminal_conflict",
        availableRecoveryActions: [
          "rehydrate_server",
          "restore_local",
          "clear_failed_queue",
          "discard_local",
        ],
      },
      snapshot: makeSnapshot(),
      pendingOperationsCount: 0,
    });

    expect(patch.syncNeeded).toBe(true);
    expect(patch.availableRecoveryActions).toEqual([
      "rehydrate_server",
      "restore_local",
      "clear_failed_queue",
      "discard_local",
    ]);
    expect(
      buildForemanSyncUiStatus({
        status: patch.syncStatus,
        conflictType: patch.conflictType,
        pendingOperationsCount: patch.pendingOperationsCount,
        lastSyncAt: patch.lastSyncAt,
        lastErrorAt: patch.lastErrorAt,
        attentionNeeded: patch.attentionNeeded,
        lastErrorStage: patch.lastErrorStage,
        retryCount: patch.retryCount,
      }),
    ).toEqual({
      label: "Server already closed",
      detail: "Local draft was kept. Choose server, restore local, or discard local.",
      tone: "danger",
    });
  });

  it("chooses snapshot id first for terminal conflict cleanup", () => {
    const snapshot = makeSnapshot({ requestId: "req-snapshot" });
    const decision = resolveForemanTerminalRecoveryCleanupDecision({
      bootstrapReady: true,
      boundaryConflictType: "server_terminal_conflict",
      requestId: "req-active",
      remoteStatus: null,
      snapshot,
      durableState: {
        ...baseTerminalDurableState,
        syncStatus: "failed_terminal",
        conflictType: "server_terminal_conflict",
        recoverableLocalSnapshot: makeSnapshot({ requestId: "req-recoverable" }),
      },
    });

    expect(decision).toMatchObject({
      shouldClear: true,
      requestId: "req-snapshot",
      remoteStatus: null,
      isTerminalConflict: true,
      isTerminalStatus: false,
    });
    expect(decision.snapshotForCleanup).toBe(snapshot);
  });

  it("falls back to recoverable id for terminal conflict cleanup", () => {
    const decision = resolveForemanTerminalRecoveryCleanupDecision({
      bootstrapReady: true,
      boundaryConflictType: "server_terminal_conflict",
      requestId: "req-active",
      remoteStatus: null,
      snapshot: makeSnapshot({ requestId: "" }),
      durableState: {
        ...baseTerminalDurableState,
        syncStatus: "failed_terminal",
        conflictType: "server_terminal_conflict",
        recoverableLocalSnapshot: makeSnapshot({ requestId: "req-recoverable" }),
      },
    });

    expect(decision.shouldClear).toBe(true);
    expect(decision.requestId).toBe("req-recoverable");
  });

  it("keeps active request id behavior for terminal remote status cleanup", () => {
    const decision = resolveForemanTerminalRecoveryCleanupDecision({
      bootstrapReady: true,
      boundaryConflictType: "none",
      requestId: "req-active",
      remoteStatus: "submitted",
      snapshot: makeSnapshot({ requestId: "req-other" }),
      durableState: {
        ...baseTerminalDurableState,
        pendingOperationsCount: 1,
      },
    });

    expect(decision).toMatchObject({
      shouldClear: true,
      requestId: "req-active",
      remoteStatus: "submitted",
      isTerminalConflict: false,
      isTerminalStatus: true,
    });
  });

  it("keeps Cyrillic draft status non-terminal", () => {
    const decision = resolveForemanTerminalRecoveryCleanupDecision({
      bootstrapReady: true,
      boundaryConflictType: "none",
      requestId: "req-active",
      remoteStatus: "черновик",
      snapshot: makeSnapshot({ requestId: "req-active" }),
      durableState: {
        ...baseTerminalDurableState,
        pendingOperationsCount: 1,
      },
    });

    expect(decision).toEqual({
      shouldClear: false,
      requestId: null,
      remoteStatus: "черновик",
      isTerminalConflict: false,
      isTerminalStatus: false,
      snapshotForCleanup: null,
    });
  });

  it("does not request cleanup for already clean terminal state", () => {
    const decision = resolveForemanTerminalRecoveryCleanupDecision({
      bootstrapReady: true,
      boundaryConflictType: "none",
      requestId: "req-active",
      remoteStatus: "submitted",
      snapshot: null,
      durableState: baseTerminalDurableState,
    });

    expect(decision).toEqual({
      shouldClear: false,
      requestId: null,
      remoteStatus: "submitted",
      isTerminalConflict: false,
      isTerminalStatus: true,
      snapshotForCleanup: null,
    });
  });

  it("does not request cleanup before bootstrap", () => {
    const decision = resolveForemanTerminalRecoveryCleanupDecision({
      bootstrapReady: false,
      boundaryConflictType: "server_terminal_conflict",
      requestId: "req-active",
      remoteStatus: null,
      snapshot: makeSnapshot(),
      durableState: {
        ...baseTerminalDurableState,
        syncStatus: "failed_terminal",
        conflictType: "server_terminal_conflict",
      },
    });

    expect(decision.shouldClear).toBe(false);
  });
});
