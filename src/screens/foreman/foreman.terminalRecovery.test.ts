import {
  buildForemanAvailableRecoveryActions,
  type ForemanDraftRecoveryAction,
} from "../../lib/offline/foremanSyncRuntime";
import { summarizePlatformOfflineOverview, type PlatformNetworkSnapshot } from "../../lib/offline/platformOffline.model";
import {
  collectForemanTerminalCleanupDraftKeys,
  collectForemanTerminalRecoveryCandidates,
  hasForemanDurableRecoverySignal,
  isForemanTerminalRemoteStatus,
} from "./foreman.terminalRecovery";
import { FOREMAN_LOCAL_ONLY_REQUEST_ID, type ForemanLocalDraftSnapshot } from "./foreman.localDraft";
import type { ForemanDurableDraftRecord } from "./foreman.durableDraft.store";

const networkOnline: PlatformNetworkSnapshot = {
  hydrated: true,
  isConnected: true,
  isInternetReachable: true,
  offlineState: "online",
  networkKnownOffline: false,
  lastOnlineAt: 1,
  networkRestoredAt: 1,
  appCameOnlineSinceLastOffline: true,
  connectionKind: "wifi",
  updatedAt: 1,
};

const snapshot = (requestId: string): ForemanLocalDraftSnapshot => ({
  version: 1,
  ownerId: `srv:${requestId}`,
  requestId,
  displayNo: "REQ-0121/2026",
  status: "draft",
  header: {
    foreman: "Foreman",
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
      name_human: "Concrete",
      qty: 1,
      uom: "m3",
      status: "draft",
      note: null,
      app_code: null,
      kind: null,
      line_no: 1,
    },
  ],
  qtyDrafts: { "item-1": "1" },
  pendingDeletes: [],
  submitRequested: false,
  lastError: null,
  updatedAt: "2026-04-15T12:00:00.000Z",
});

const durable = (
  patch: Partial<ForemanDurableDraftRecord>,
): ForemanDurableDraftRecord => ({
  version: 2,
  hydrated: true,
  snapshot: null,
  syncStatus: "idle",
  lastSyncAt: null,
  lastError: null,
  lastErrorAt: null,
  lastErrorStage: null,
  conflictType: "none",
  lastConflictAt: null,
  retryCount: 0,
  repeatedFailureStageCount: 0,
  pendingOperationsCount: 0,
  queueDraftKey: null,
  requestIdKnown: false,
  attentionNeeded: false,
  availableRecoveryActions: [],
  recoverableLocalSnapshot: null,
  lastTriggerSource: "unknown",
  telemetry: [],
  updatedAt: null,
  ...patch,
});

describe("P6.3e foreman terminal recovery contract", () => {
  it("terminal request with stale durable snapshot is selected for cleanup", () => {
    const stale = snapshot("req-0121");
    const state = durable({
      snapshot: stale,
      syncStatus: "failed_terminal",
      conflictType: "server_terminal_conflict",
      attentionNeeded: true,
    });

    const candidates = collectForemanTerminalRecoveryCandidates({
      durableSnapshot: state.snapshot,
      recoverableSnapshot: state.recoverableLocalSnapshot,
      activeRequestId: null,
      queueDraftKey: state.queueDraftKey,
      hasRecoverySignal: hasForemanDurableRecoverySignal(state),
    });

    expect(isForemanTerminalRemoteStatus("approved")).toBe(true);
    expect(candidates).toEqual([
      { requestId: "req-0121", snapshot: stale, source: "durable_snapshot" },
      { requestId: "REQ-0121/2026", snapshot: stale, source: "durable_snapshot_display" },
    ]);
  });

  it("snapshot null plus stale recovery metadata is still request-bound cleanup work", () => {
    const recoverable = snapshot("req-0121");
    const state = durable({
      recoverableLocalSnapshot: recoverable,
      availableRecoveryActions: ["restore_local", "discard_local"],
      queueDraftKey: "req-0121",
      requestIdKnown: true,
    });

    const candidates = collectForemanTerminalRecoveryCandidates({
      durableSnapshot: state.snapshot,
      recoverableSnapshot: state.recoverableLocalSnapshot,
      activeRequestId: null,
      queueDraftKey: state.queueDraftKey,
      hasRecoverySignal: hasForemanDurableRecoverySignal(state),
    });

    expect(candidates).toEqual([
      { requestId: "req-0121", snapshot: recoverable, source: "recoverable_snapshot" },
      { requestId: "REQ-0121/2026", snapshot: recoverable, source: "recoverable_snapshot_display" },
    ]);

    const overview = summarizePlatformOfflineOverview({
      network: networkOnline,
      contours: [
        {
          key: "foreman_draft",
          label: "Foreman",
          syncStatus: "idle",
          pendingCount: 0,
          retryCount: 0,
          lastSyncAt: null,
          lastError: null,
        },
      ],
    });
    expect(overview.visible).toBe(false);
  });

  it("cleanup plan removes all requestId-bound recovery owners", () => {
    const active = snapshot("req-0121");
    const recoverable = snapshot("req-0121-recovery");

    expect(
      collectForemanTerminalCleanupDraftKeys({
        requestId: "req-0121",
        snapshots: [active, recoverable],
        queueDraftKey: "req-0121",
      }).sort(),
    ).toEqual([FOREMAN_LOCAL_ONLY_REQUEST_ID, "REQ-0121/2026", "req-0121", "req-0121-recovery"].sort());
  });

  it("display-number keyed terminal recovery entries are selected for cleanup", () => {
    const stale = {
      ...snapshot(""),
      displayNo: "REQ-0121/2026",
    };
    const state = durable({
      snapshot: stale,
      syncStatus: "failed_terminal",
      attentionNeeded: true,
    });

    const candidates = collectForemanTerminalRecoveryCandidates({
      durableSnapshot: state.snapshot,
      recoverableSnapshot: null,
      activeRequestId: null,
      queueDraftKey: null,
      hasRecoverySignal: hasForemanDurableRecoverySignal(state),
    });

    expect(candidates).toEqual([
      { requestId: "REQ-0121/2026", snapshot: stale, source: "durable_snapshot_display" },
    ]);
  });

  it("reset terminal durable state has no recovery modal actions", () => {
    const actions = buildForemanAvailableRecoveryActions({
      status: "idle",
      conflictType: "none",
      pendingOperationsCount: 0,
      requestIdKnown: false,
      hasRecoverableLocalSnapshot: false,
      hasSnapshot: false,
      attentionNeeded: false,
    });

    expect(actions).toEqual([]);
  });

  it("real offline pending request still renders warning banner", () => {
    const overview = summarizePlatformOfflineOverview({
      network: networkOnline,
      contours: [
        {
          key: "foreman_draft",
          label: "Foreman",
          syncStatus: "queued",
          pendingCount: 1,
          retryCount: 0,
          lastSyncAt: null,
          lastError: null,
        },
      ],
    });

    expect(overview.visible).toBe(true);
    expect(overview.tone).toBe("warning");
    expect(overview.unsyncedContours).toBe(1);
  });

  it("attention and retry actions remain for actual unresolved local sync", () => {
    const actions: ForemanDraftRecoveryAction[] = buildForemanAvailableRecoveryActions({
      status: "retry_wait",
      conflictType: "retryable_sync_failure",
      pendingOperationsCount: 1,
      requestIdKnown: true,
      hasRecoverableLocalSnapshot: false,
      hasSnapshot: true,
      attentionNeeded: true,
    });

    expect(actions).toContain("retry_now");
    expect(actions).toContain("clear_failed_queue");
    expect(actions).toContain("discard_local");
  });

  it("draft-like remote status is not terminal and does not force cleanup classification", () => {
    expect(isForemanTerminalRemoteStatus("draft")).toBe(false);
    expect(isForemanTerminalRemoteStatus("")).toBe(false);
    expect(isForemanTerminalRemoteStatus(null)).toBe(false);
  });
});
