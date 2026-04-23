import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import {
  clearForemanDurableDraftState,
  configureForemanDurableDraftStore,
  foremanDurableDraftStore,
  getForemanDurableDraftState,
  hydrateForemanDurableDraftStore,
  patchForemanDurableDraftRecoveryState,
  replaceForemanDurableDraftSnapshot,
} from "../src/screens/foreman/foreman.durableDraft.store";
import { FOREMAN_LOCAL_ONLY_REQUEST_ID } from "../src/screens/foreman/foreman.localDraft.constants";
import type { ForemanLocalDraftItem, ForemanLocalDraftSnapshot } from "../src/screens/foreman/foreman.localDraft";
import {
  clearForemanMutationQueue,
  clearForemanMutationsForDraft,
  configureMutationQueue,
  enqueueForemanMutation,
  getForemanMutationQueueSummary,
  getForemanPendingMutationCount,
  getForemanPendingMutationCountForDraftKeys,
  loadForemanMutationQueue,
  markForemanMutationInflight,
  peekNextForemanMutation,
} from "../src/lib/offline/mutationQueue";
import { createMemoryOfflineStorage } from "../src/lib/offline/offlineStorage";
import { buildForemanSyncUiStatus } from "../src/lib/offline/foremanSyncRuntime";
import { clearForemanMutationQueueTail, flushForemanMutationQueue } from "../src/lib/offline/mutationWorker";
import {
  getOfflineMutationTelemetryEvents,
  resetOfflineMutationTelemetryEvents,
  summarizeOfflineMutationTelemetryEvents,
} from "../src/lib/offline/mutation.telemetry";
import type { ReqItemRow } from "../src/lib/catalog_api";
import type { RequestDraftMeta } from "../src/screens/foreman/foreman.types";

type TestResult = {
  passed: boolean;
  details: Record<string, unknown>;
};

const artifactDir = path.join(process.cwd(), "artifacts");
const summaryPath = path.join(artifactDir, "foreman-field-reliability.summary.json");
const fullPath = path.join(artifactDir, "foreman-field-reliability.json");

const memoryStorage = createMemoryOfflineStorage();

configureForemanDurableDraftStore({ storage: memoryStorage });
configureMutationQueue({ storage: memoryStorage });

const baseHeader = {
  foreman: "Field Tester",
  comment: "offline durability",
  objectType: "building",
  level: "1",
  system: "power",
  zone: "A",
} satisfies ForemanLocalDraftSnapshot["header"];

const buildRequestDraftMeta = (): RequestDraftMeta => ({
  foreman_name: baseHeader.foreman,
  comment: baseHeader.comment,
  object_type_code: baseHeader.objectType,
  level_code: baseHeader.level,
  system_code: baseHeader.system,
  zone_code: baseHeader.zone,
});

const createItem = (index: number, qty: number, requestId = ""): ForemanLocalDraftItem => ({
  local_id: `local-${index}`,
  remote_item_id: null,
  rik_code: `RIK-${index}`,
  name_human: `Material ${index}`,
  qty,
  uom: "kg",
  status: "Черновик",
  note: null,
  app_code: `APP-${index}`,
  kind: "material",
  line_no: index,
});

const buildSnapshot = (params?: {
  requestId?: string;
  displayNo?: string | null;
  items?: ForemanLocalDraftItem[];
  submitRequested?: boolean;
}): ForemanLocalDraftSnapshot => ({
  version: 1,
  ownerId: `test-owner:${params?.requestId ?? "local"}:${(params?.items ?? []).length}`,
  requestId: params?.requestId ?? "",
  displayNo: params?.displayNo ?? null,
  status: "draft",
  header: { ...baseHeader },
  items: params?.items ?? [],
  qtyDrafts: Object.fromEntries((params?.items ?? []).map((item) => [item.local_id, String(item.qty)])),
  pendingDeletes: [],
  submitRequested: params?.submitRequested === true,
  lastError: null,
  updatedAt: new Date().toISOString(),
});

const mapSnapshotToRows = (snapshot: ForemanLocalDraftSnapshot, requestId: string): ReqItemRow[] =>
  snapshot.items.map((item, index) => ({
    id: item.remote_item_id ?? `${requestId}-item-${index + 1}`,
    request_id: requestId,
    rik_code: item.rik_code,
    name_human: item.name_human,
    qty: item.qty,
    uom: item.uom,
    status: item.status,
    supplier_hint: null,
    app_code: item.app_code,
    note: item.note,
    line_no: item.line_no ?? index + 1,
  }));

const resetRuntimeState = () => {
  foremanDurableDraftStore.setState({
    version: 2,
    hydrated: false,
    snapshot: null,
    syncStatus: "idle",
    lastSyncAt: null,
    lastErrorAt: null,
    lastErrorStage: null,
    conflictType: "none",
    lastConflictAt: null,
    retryCount: 0,
    repeatedFailureStageCount: 0,
    pendingOperationsCount: 0,
    lastError: null,
    queueDraftKey: null,
    requestIdKnown: false,
    attentionNeeded: false,
    availableRecoveryActions: [],
    recoverableLocalSnapshot: null,
    lastTriggerSource: "unknown",
    telemetry: [],
    updatedAt: null,
  });
};

let runtimeSnapshot: ForemanLocalDraftSnapshot | null = null;
let serverOnline = false;
let failNextSyncCount = 0;
let requestSeq = 0;
let injectConcurrentPendingOnFirstOnlineSync = false;
type ForcedFailureMode =
  | "none"
  | "server_terminal_conflict"
  | "validation_conflict"
  | "remote_divergence_requires_attention";
let forcedFailureMode: ForcedFailureMode = "none";
const serverDraftStore = new Map<
  string,
  {
    snapshot: ForemanLocalDraftSnapshot | null;
    status: string;
    terminal: boolean;
  }
>();
const syncCallLog: Record<string, unknown>[] = [];
const submitLog: Record<string, unknown>[] = [];

const syncSnapshot = async (params: {
  snapshot: ForemanLocalDraftSnapshot;
  headerMeta: RequestDraftMeta;
  mutationKind?:
    | "catalog_add"
    | "calc_add"
    | "ai_local_add"
    | "qty_update"
    | "row_remove"
    | "whole_cancel"
    | "submit"
    | "background_sync";
  localBeforeCount?: number | null;
  localAfterCount?: number | null;
}) => {
  syncCallLog.push({
    mutationKind: params.mutationKind ?? "background_sync",
    itemCount: params.snapshot.items.length,
    requestId: params.snapshot.requestId || null,
    submitRequested: params.snapshot.submitRequested,
    localBeforeCount: params.localBeforeCount ?? null,
    localAfterCount: params.localAfterCount ?? null,
  });

  if (!serverOnline || failNextSyncCount > 0) {
    if (failNextSyncCount > 0) failNextSyncCount -= 1;
    throw new Error("offline");
  }

  if (forcedFailureMode !== "none") {
    const requestId = params.snapshot.requestId || `REQ-${++requestSeq}`;
    if (forcedFailureMode === "server_terminal_conflict") {
      serverDraftStore.set(requestId, {
        snapshot: null,
        status: "submitted",
        terminal: true,
      });
      throw new Error("server_terminal_conflict");
    }
    if (forcedFailureMode === "validation_conflict") {
      throw new Error("validation_conflict");
    }
    if (forcedFailureMode === "remote_divergence_requires_attention") {
      const divergentSnapshot = buildSnapshot({
        requestId,
        displayNo: `PR-${String(requestSeq || 1).padStart(4, "0")}`,
        items: params.snapshot.items.map((item, index) => ({
          ...item,
          qty: item.qty + index + 1,
          remote_item_id: item.remote_item_id ?? `${requestId}-item-${index + 1}`,
        })),
      });
      serverDraftStore.set(requestId, {
        snapshot: divergentSnapshot,
        status: "draft",
        terminal: false,
      });
      throw new Error("remote divergence detected");
    }
  }

  if (injectConcurrentPendingOnFirstOnlineSync && !params.snapshot.requestId) {
    injectConcurrentPendingOnFirstOnlineSync = false;
    await enqueueForemanMutation({
      draftKey: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      requestId: null,
      snapshotUpdatedAt: params.snapshot.updatedAt,
      mutationKind: "background_sync",
      localBeforeCount: params.snapshot.items.length,
      localAfterCount: params.snapshot.items.length,
      submitRequested: params.snapshot.submitRequested,
    });
  }

  const requestId = params.snapshot.requestId || `REQ-${++requestSeq}`;
  const displayNo = `PR-${String(requestSeq || 1).padStart(4, "0")}`;
  const nextSnapshot: ForemanLocalDraftSnapshot = {
    ...params.snapshot,
    requestId,
    displayNo,
    submitRequested: false,
    lastError: null,
    updatedAt: new Date().toISOString(),
    items: params.snapshot.items.map((item, index) => ({
      ...item,
      remote_item_id: item.remote_item_id ?? `${requestId}-item-${index + 1}`,
      status: "Черновик",
      line_no: index + 1,
    })),
  };

  if (params.snapshot.submitRequested || params.mutationKind === "submit") {
    serverDraftStore.set(requestId, {
      snapshot: null,
      status: "pending",
      terminal: true,
    });
    submitLog.push({
      requestId,
      displayNo,
      itemCount: nextSnapshot.items.length,
    });

    return {
      snapshot: null,
      rows: mapSnapshotToRows(nextSnapshot, requestId),
      submitted: {
        id: requestId,
        display_no: displayNo,
        status: "pending",
      },
      branchMeta: {
        sourcePath: "rpc_v2" as const,
      },
    };
  }

  serverDraftStore.set(requestId, {
    snapshot: nextSnapshot,
    status: "draft",
    terminal: false,
  });

  return {
    snapshot: nextSnapshot,
    rows: mapSnapshotToRows(nextSnapshot, requestId),
    submitted: null,
    branchMeta: {
      sourcePath: "rpc_v2" as const,
    },
  };
};

const persistSnapshot = async (snapshot: ForemanLocalDraftSnapshot | null) => {
  runtimeSnapshot = snapshot;
  if (snapshot) {
    await replaceForemanDurableDraftSnapshot(snapshot);
    return;
  }
  await clearForemanDurableDraftState();
};

const applySnapshotToBoundary = async (snapshot: ForemanLocalDraftSnapshot | null) => {
  await persistSnapshot(snapshot);
};

const onSubmitted = async (requestId: string, submitted: { display_no?: string | null } | null) => {
  submitLog.push({
    requestId,
    displayNo: submitted?.display_no ?? null,
    phase: "worker_on_submitted",
  });
};

const enqueueSnapshotMutation = async (
  snapshot: ForemanLocalDraftSnapshot,
  mutationKind:
    | "catalog_add"
    | "calc_add"
    | "ai_local_add"
    | "qty_update"
    | "row_remove"
    | "whole_cancel"
    | "submit"
    | "background_sync",
  options?: {
    triggerSource?: "bootstrap_complete" | "focus" | "app_active" | "network_back" | "manual_retry" | "submit" | "unknown";
  },
) => {
  await replaceForemanDurableDraftSnapshot(snapshot);
  runtimeSnapshot = snapshot;
  await enqueueForemanMutation({
    draftKey: snapshot.requestId || FOREMAN_LOCAL_ONLY_REQUEST_ID,
    requestId: snapshot.requestId || null,
    snapshotUpdatedAt: snapshot.updatedAt,
    mutationKind,
    localBeforeCount: snapshot.items.length,
    localAfterCount: snapshot.items.length,
    submitRequested: snapshot.submitRequested,
    triggerSource: options?.triggerSource ?? (snapshot.submitRequested ? "submit" : "manual_retry"),
  });
};

const flushQueue = async (triggerSource: "bootstrap_complete" | "app_active" | "network_back" | "manual_retry" | "submit" | "focus" | "unknown" = "manual_retry") =>
  await flushForemanMutationQueue({
    getSnapshot: () => runtimeSnapshot,
    buildRequestDraftMeta,
    persistSnapshot,
    applySnapshotToBoundary,
    getNetworkOnline: () => serverOnline,
    inspectRemoteDraft: async ({ requestId }) => {
      const remote = serverDraftStore.get(requestId);
      return {
        snapshot: remote?.snapshot ?? null,
        status: remote?.status ?? null,
        isTerminal: remote?.terminal === true,
      };
    },
    syncSnapshot,
    onSubmitted,
  }, triggerSource);

const rehydrateFromServer = async () => {
  const durableState = getForemanDurableDraftState();
  const currentSnapshot = runtimeSnapshot ?? durableState.snapshot;
  const requestId = currentSnapshot?.requestId || durableState.snapshot?.requestId || "";
  const remote = serverDraftStore.get(requestId);

  await clearForemanMutationsForDraft(FOREMAN_LOCAL_ONLY_REQUEST_ID);
  if (requestId) {
    await clearForemanMutationsForDraft(requestId);
  }

  if (remote?.snapshot) {
    runtimeSnapshot = remote.snapshot;
    await patchForemanDurableDraftRecoveryState({
      snapshot: remote.snapshot,
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
      lastSyncAt: Date.now(),
    });
    return;
  }

  runtimeSnapshot = null;
  await patchForemanDurableDraftRecoveryState({
    snapshot: null,
    syncStatus: "idle",
    pendingOperationsCount: 0,
    queueDraftKey: null,
    requestIdKnown: Boolean(requestId),
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
    lastSyncAt: Date.now(),
  });
};

const restoreLocalDraft = async () => {
  const recoverableSnapshot = getForemanDurableDraftState().recoverableLocalSnapshot;
  if (!recoverableSnapshot) return;
  runtimeSnapshot = recoverableSnapshot;
  await patchForemanDurableDraftRecoveryState({
    snapshot: recoverableSnapshot,
    syncStatus: "dirty_local",
    pendingOperationsCount: 0,
    queueDraftKey: null,
    requestIdKnown: Boolean(recoverableSnapshot.requestId),
    attentionNeeded: true,
    conflictType: recoverableSnapshot.requestId ? "stale_local_snapshot" : "retryable_sync_failure",
    lastConflictAt: Date.now(),
    recoverableLocalSnapshot: null,
    lastTriggerSource: "manual_retry",
  });
};

const discardLocalDraft = async () => {
  const durableState = getForemanDurableDraftState();
  const currentSnapshot = runtimeSnapshot ?? durableState.snapshot;
  const requestId = currentSnapshot?.requestId || "";
  await clearForemanMutationsForDraft(FOREMAN_LOCAL_ONLY_REQUEST_ID);
  if (requestId) {
    await clearForemanMutationsForDraft(requestId);
  }
  runtimeSnapshot = null;
  await patchForemanDurableDraftRecoveryState({
    snapshot: null,
    syncStatus: "idle",
    pendingOperationsCount: 0,
    queueDraftKey: null,
    requestIdKnown: Boolean(requestId),
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
    lastSyncAt: durableState.lastSyncAt,
  });
};

const resetEnvironment = async () => {
  runtimeSnapshot = null;
  serverOnline = false;
  failNextSyncCount = 0;
  requestSeq = 0;
  injectConcurrentPendingOnFirstOnlineSync = false;
  forcedFailureMode = "none";
  serverDraftStore.clear();
  syncCallLog.length = 0;
  submitLog.length = 0;
  await clearForemanMutationQueue();
  await clearForemanDurableDraftState();
  resetRuntimeState();
};

const simulateRestart = async () => {
  runtimeSnapshot = null;
  resetRuntimeState();
  await hydrateForemanDurableDraftStore();
  runtimeSnapshot = getForemanDurableDraftState().snapshot;
};

const run = async () => {
  const testResults: Record<string, TestResult> = {};
  resetOfflineMutationTelemetryEvents();

  await resetEnvironment();
  const noisySnapshots = [1, 2, 3, 4, 5].map((qty) =>
    buildSnapshot({
      items: [createItem(1, qty)],
    }),
  );
  for (const snapshot of noisySnapshots) {
    await enqueueSnapshotMutation(snapshot, "qty_update", { triggerSource: "manual_retry" });
  }
  const noisyQueue = await loadForemanMutationQueue();
  const noisyQueueSummary = await getForemanMutationQueueSummary([FOREMAN_LOCAL_ONLY_REQUEST_ID]);
  serverOnline = true;
  const noisyFlush = await flushQueue();
  const noisyFinalSnapshot = getForemanDurableDraftState().snapshot;
  testResults.noisy_local_editing = {
    passed:
      noisyQueue.length === 1 &&
      noisyQueueSummary.coalescedCount >= 4 &&
      noisyFlush.failed === false &&
      (noisyFinalSnapshot?.items[0]?.qty ?? 0) === 5,
    details: {
      queueLengthBeforeFlush: noisyQueue.length,
      coalescedCount: noisyQueueSummary.coalescedCount,
      finalQty: noisyFinalSnapshot?.items[0]?.qty ?? null,
      syncStatus: getForemanDurableDraftState().syncStatus,
    },
  };

  await resetEnvironment();
  const initialSnapshot = buildSnapshot({
    items: Array.from({ length: 5 }, (_, index) => createItem(index + 1, index + 2)),
  });
  await enqueueSnapshotMutation(initialSnapshot, "catalog_add", { triggerSource: "manual_retry" });
  const offlineFlush = await flushQueue();
  await simulateRestart();
  injectConcurrentPendingOnFirstOnlineSync = true;
  const restoredBeforeOnline = getForemanDurableDraftState();
  serverOnline = true;
  const syncCallsBeforeOnline = syncCallLog.length;
  const onlineFlush = await flushQueue();
  const afterOnline = getForemanDurableDraftState();
  const syncedSnapshot = afterOnline.snapshot;
  const localPendingAfterSync = await getForemanPendingMutationCount(FOREMAN_LOCAL_ONLY_REQUEST_ID);
  const requestPendingAfterSync = await getForemanPendingMutationCount(syncedSnapshot?.requestId ?? null);
  const combinedPendingAfterSync = await getForemanPendingMutationCountForDraftKeys([
    syncedSnapshot?.requestId ?? null,
    FOREMAN_LOCAL_ONLY_REQUEST_ID,
  ]);
  const syncCallsDuringOnline = syncCallLog.length - syncCallsBeforeOnline;
  testResults.first_sync_concurrent_mutation = {
    passed:
      offlineFlush.failed === true &&
      restoredBeforeOnline.syncStatus === "retry_wait" &&
      onlineFlush.failed === false &&
      onlineFlush.remainingCount === 0 &&
      Boolean(syncedSnapshot?.requestId) &&
      syncedSnapshot?.items.every((item) => Boolean(item.remote_item_id)) === true &&
      afterOnline.syncStatus === "synced" &&
      afterOnline.lastSyncAt != null &&
      localPendingAfterSync === 0 &&
      requestPendingAfterSync === 0 &&
      combinedPendingAfterSync === 0 &&
      syncCallsDuringOnline >= 2,
    details: {
      restoredSyncStatus: restoredBeforeOnline.syncStatus,
      restoredPendingCount: restoredBeforeOnline.pendingOperationsCount,
      requestId: syncedSnapshot?.requestId ?? null,
      remainingCount: onlineFlush.remainingCount,
      lastSyncAt: afterOnline.lastSyncAt,
      syncedItemCount: syncedSnapshot?.items.length ?? 0,
      localPendingAfterSync,
      requestPendingAfterSync,
      combinedPendingAfterSync,
      syncCallsDuringOnline,
    },
  };

  const restartSnapshot = buildSnapshot({
    requestId: syncedSnapshot?.requestId ?? "REQ-1",
    displayNo: syncedSnapshot?.displayNo ?? "PR-0001",
    items: [...(syncedSnapshot?.items ?? []), createItem(6, 3, syncedSnapshot?.requestId ?? "REQ-1")],
  });
  await enqueueSnapshotMutation(restartSnapshot, "catalog_add", { triggerSource: "manual_retry" });
  const pendingEntry = await peekNextForemanMutation();
  if (pendingEntry) {
    await markForemanMutationInflight(pendingEntry.id);
  }
  await simulateRestart();
  serverOnline = true;
  const postRestartFlush = await flushQueue();
  const afterRestart = getForemanDurableDraftState().snapshot;
  testResults.kill_reopen_recovery = {
    passed:
      (runtimeSnapshot?.items.length ?? 0) === 6 &&
      postRestartFlush.failed === false &&
      postRestartFlush.remainingCount === 0 &&
      (afterRestart?.items.length ?? 0) === 6,
    details: {
      recoveredItemCount: runtimeSnapshot?.items.length ?? 0,
      remainingCount: postRestartFlush.remainingCount,
      requestId: afterRestart?.requestId ?? null,
    },
  };

  await resetEnvironment();
  const retrySnapshot = buildSnapshot({
    requestId: "REQ-RETRY",
    displayNo: "PR-RETRY",
    items: [createItem(1, 2, "REQ-RETRY"), createItem(2, 3, "REQ-RETRY")],
  });
  await enqueueSnapshotMutation(retrySnapshot, "catalog_add", { triggerSource: "manual_retry" });
  serverOnline = true;
  failNextSyncCount = 2;
  const retryFail1 = await flushQueue();
  const afterRetryFail1 = getForemanDurableDraftState();
  const retryFail2 = await flushQueue();
  const stuckState = getForemanDurableDraftState();
  const stuckUi = buildForemanSyncUiStatus({
    status: stuckState.syncStatus,
    conflictType: stuckState.conflictType,
    pendingOperationsCount: stuckState.pendingOperationsCount,
    lastSyncAt: stuckState.lastSyncAt,
    lastErrorAt: stuckState.lastErrorAt,
    attentionNeeded: stuckState.attentionNeeded,
    lastErrorStage: stuckState.lastErrorStage,
    retryCount: stuckState.retryCount,
  });
  const retryRecover = await flushQueue();
  const retryFinalState = getForemanDurableDraftState();
  const retryFailureEvents = retryFinalState.telemetry.filter((event) => event.result === "retryable_failure");
  const retrySuccessEvents = retryFinalState.telemetry.filter(
    (event) => event.stage === "finalize" && event.result === "success",
  );
  testResults.retry_after_flaky_network = {
    passed:
      retryFail1.failed === true &&
      afterRetryFail1.syncStatus === "retry_wait" &&
      retryFail2.failed === true &&
      retryRecover.failed === false &&
      retryFinalState.syncStatus === "synced" &&
      retryFailureEvents.length >= 2 &&
      retrySuccessEvents.length >= 1,
    details: {
      firstRetryStatus: afterRetryFail1.syncStatus,
      secondRetryStatus: stuckState.syncStatus,
      finalStatus: retryFinalState.syncStatus,
      retryCount: retryFinalState.retryCount,
      retryFailureEvents: retryFailureEvents.length,
      finalizeSuccessEvents: retrySuccessEvents.length,
      telemetryStages: retryFinalState.telemetry.map((event) => `${event.stage}:${event.result}`),
    },
  };

  testResults.stuck_heuristic = {
    passed:
      stuckState.syncStatus === "retry_wait" &&
      stuckState.attentionNeeded === true &&
      stuckState.retryCount >= 2 &&
      stuckState.lastErrorStage === "sync_rpc" &&
      stuckUi.label === "Need attention",
    details: {
      syncStatus: stuckState.syncStatus,
      attentionNeeded: stuckState.attentionNeeded,
      retryCount: stuckState.retryCount,
      lastErrorStage: stuckState.lastErrorStage,
      uiLabel: stuckUi.label,
      uiDetail: stuckUi.detail,
    },
  };

  await resetEnvironment();
  const terminalBaseSnapshot = buildSnapshot({
    requestId: "REQ-SUBMIT",
    displayNo: "PR-SUBMIT",
    items: [createItem(1, 10, "REQ-SUBMIT"), createItem(2, 11, "REQ-SUBMIT")],
  });
  await enqueueSnapshotMutation(terminalBaseSnapshot, "qty_update", { triggerSource: "manual_retry" });
  const submitSnapshot = buildSnapshot({
    requestId: "REQ-SUBMIT",
    displayNo: "PR-SUBMIT",
    items: terminalBaseSnapshot.items,
    submitRequested: true,
  });
  await enqueueSnapshotMutation(submitSnapshot, "submit", { triggerSource: "submit" });
  const terminalQueueBeforeFlush = await loadForemanMutationQueue();
  serverOnline = true;
  const terminalFlush = await flushQueue();
  const terminalState = getForemanDurableDraftState();
  const terminalPending = await getForemanPendingMutationCountForDraftKeys([
    FOREMAN_LOCAL_ONLY_REQUEST_ID,
    "REQ-SUBMIT",
  ]);
  testResults.terminal_submit_cleanup = {
    passed:
      terminalQueueBeforeFlush.length === 1 &&
      terminalQueueBeforeFlush[0]?.type === "submit_draft" &&
      terminalQueueBeforeFlush[0]?.coalescedCount >= 1 &&
      terminalFlush.failed === false &&
      terminalPending === 0 &&
      terminalState.syncStatus === "idle" &&
      terminalState.snapshot == null &&
      submitLog.length >= 2,
    details: {
      queueLengthBeforeFlush: terminalQueueBeforeFlush.length,
      coalescedCount: terminalQueueBeforeFlush[0]?.coalescedCount ?? null,
      remainingCount: terminalFlush.remainingCount,
      pendingAfterSubmit: terminalPending,
      finalStatus: terminalState.syncStatus,
      submitLogCount: submitLog.length,
    },
  };

  await resetEnvironment();
  const terminalConflictSnapshot = buildSnapshot({
    requestId: "REQ-CONFLICT",
    displayNo: "PR-CONFLICT",
    items: [createItem(1, 4, "REQ-CONFLICT")],
  });
  serverDraftStore.set("REQ-CONFLICT", {
    snapshot: null,
    status: "submitted",
    terminal: true,
  });
  await enqueueSnapshotMutation(terminalConflictSnapshot, "qty_update", { triggerSource: "manual_retry" });
  serverOnline = true;
  forcedFailureMode = "server_terminal_conflict";
  const terminalConflictFlush = await flushQueue();
  forcedFailureMode = "none";
  const terminalConflictState = getForemanDurableDraftState();
  const terminalConflictQueueHistory = await loadForemanMutationQueue();
  const terminalConflictEntry =
    terminalConflictQueueHistory.find((entry) => entry.payload.draftKey === "REQ-CONFLICT") ?? null;
  const terminalPendingBeforeClear = await getForemanPendingMutationCountForDraftKeys([
    FOREMAN_LOCAL_ONLY_REQUEST_ID,
    "REQ-CONFLICT",
  ]);
  await clearForemanMutationQueueTail({
    snapshot: terminalConflictSnapshot,
    draftKey: "REQ-CONFLICT",
    triggerSource: "manual_retry",
  });
  const afterClearConflictState = getForemanDurableDraftState();
  const terminalPendingAfterClear = await getForemanPendingMutationCountForDraftKeys([
    FOREMAN_LOCAL_ONLY_REQUEST_ID,
    "REQ-CONFLICT",
  ]);
  testResults.server_terminal_conflict = {
    passed:
      terminalConflictFlush.failed === true &&
      terminalConflictState.conflictType === "server_terminal_conflict" &&
      terminalConflictState.syncStatus === "failed_terminal" &&
      terminalConflictState.availableRecoveryActions.includes("rehydrate_server") &&
      terminalConflictState.availableRecoveryActions.includes("discard_local") &&
      terminalPendingBeforeClear === 0 &&
      terminalConflictEntry?.lifecycleStatus === "conflicted" &&
      terminalPendingAfterClear === 0 &&
      afterClearConflictState.syncStatus === "dirty_local",
    details: {
      conflictType: terminalConflictState.conflictType,
      syncStatus: terminalConflictState.syncStatus,
      pendingBeforeClear: terminalPendingBeforeClear,
      pendingAfterClear: terminalPendingAfterClear,
      historyLifecycleStatus: terminalConflictEntry?.lifecycleStatus ?? null,
      actions: terminalConflictState.availableRecoveryActions,
    },
  };

  await resetEnvironment();
  const validationSnapshot = buildSnapshot({
    requestId: "REQ-VALID",
    displayNo: "PR-VALID",
    items: [createItem(1, 8, "REQ-VALID")],
  });
  await enqueueSnapshotMutation(validationSnapshot, "qty_update", { triggerSource: "manual_retry" });
  serverOnline = true;
  forcedFailureMode = "validation_conflict";
  const validationFlush = await flushQueue();
  forcedFailureMode = "none";
  const validationState = getForemanDurableDraftState();
  testResults.validation_conflict = {
    passed:
      validationFlush.failed === true &&
      validationState.conflictType === "validation_conflict" &&
      validationState.syncStatus === "failed_terminal" &&
      validationState.availableRecoveryActions.includes("rehydrate_server"),
    details: {
      conflictType: validationState.conflictType,
      syncStatus: validationState.syncStatus,
      actions: validationState.availableRecoveryActions,
    },
  };

  await resetEnvironment();
  const retryNowSnapshot = buildSnapshot({
    requestId: "REQ-RETRY-NOW",
    displayNo: "PR-RETRY-NOW",
    items: [createItem(1, 6, "REQ-RETRY-NOW")],
  });
  await enqueueSnapshotMutation(retryNowSnapshot, "qty_update", { triggerSource: "manual_retry" });
  serverOnline = true;
  failNextSyncCount = 1;
  const retryNowFail = await flushQueue();
  const retryNowMidState = getForemanDurableDraftState();
  const retryNowRecover = await flushQueue();
  const retryNowFinalState = getForemanDurableDraftState();
  testResults.retry_now_success = {
    passed:
      retryNowFail.failed === true &&
      retryNowMidState.conflictType === "retryable_sync_failure" &&
      retryNowMidState.availableRecoveryActions.includes("retry_now") &&
      retryNowRecover.failed === false &&
      retryNowFinalState.syncStatus === "synced",
    details: {
      firstStatus: retryNowMidState.syncStatus,
      firstConflictType: retryNowMidState.conflictType,
      finalStatus: retryNowFinalState.syncStatus,
      actions: retryNowMidState.availableRecoveryActions,
    },
  };

  await resetEnvironment();
  const exhaustedSnapshot = buildSnapshot({
    requestId: "REQ-EXHAUSTED",
    displayNo: "PR-EXHAUSTED",
    items: [createItem(1, 7, "REQ-EXHAUSTED")],
  });
  await enqueueSnapshotMutation(exhaustedSnapshot, "qty_update", { triggerSource: "manual_retry" });
  serverOnline = true;
  failNextSyncCount = 8;
  const exhaustionRuns: Array<Awaited<ReturnType<typeof flushQueue>>> = [];
  for (let index = 0; index < 5; index += 1) {
    exhaustionRuns.push(await flushQueue("manual_retry"));
  }
  const exhaustedState = getForemanDurableDraftState();
  const exhaustedQueueHistory = await loadForemanMutationQueue();
  const exhaustedEntry =
    exhaustedQueueHistory.find((entry) => entry.payload.draftKey === "REQ-EXHAUSTED") ?? null;
  testResults.retry_exhaustion = {
    passed:
      exhaustionRuns[0]?.failed === true &&
      exhaustionRuns[4]?.failed === true &&
      exhaustedState.syncStatus === "failed_terminal" &&
      exhaustedState.conflictType === "retryable_sync_failure" &&
      exhaustedState.availableRecoveryActions.includes("retry_now") &&
      exhaustedEntry?.lifecycleStatus === "failed_non_retryable",
    details: {
      failureMessages: exhaustionRuns.map((entry) => entry.errorMessage),
      finalStatus: exhaustedState.syncStatus,
      finalConflictType: exhaustedState.conflictType,
      retryCount: exhaustedState.retryCount,
      actions: exhaustedState.availableRecoveryActions,
      historyLifecycleStatus: exhaustedEntry?.lifecycleStatus ?? null,
    },
  };

  await resetEnvironment();
  const rehydrateSnapshot = buildSnapshot({
    requestId: "REQ-REMOTE",
    displayNo: "PR-REMOTE",
    items: [createItem(1, 2, "REQ-REMOTE")],
  });
  const remoteServerSnapshot = buildSnapshot({
    requestId: "REQ-REMOTE",
    displayNo: "PR-REMOTE",
    items: [createItem(1, 9, "REQ-REMOTE"), createItem(2, 3, "REQ-REMOTE")],
  });
  serverDraftStore.set("REQ-REMOTE", {
    snapshot: remoteServerSnapshot,
    status: "draft",
    terminal: false,
  });
  await replaceForemanDurableDraftSnapshot(rehydrateSnapshot, {
    syncStatus: "failed_terminal",
    conflictType: "remote_divergence_requires_attention",
    recoverableLocalSnapshot: rehydrateSnapshot,
    pendingOperationsCount: 1,
    attentionNeeded: true,
  });
  runtimeSnapshot = rehydrateSnapshot;
  await enqueueSnapshotMutation(rehydrateSnapshot, "qty_update", { triggerSource: "manual_retry" });
  await rehydrateFromServer();
  const rehydrateState = getForemanDurableDraftState();
  testResults.rehydrate_from_server = {
    passed:
      runtimeSnapshot?.items.length === 2 &&
      runtimeSnapshot?.items[0]?.qty === 9 &&
      rehydrateState.syncStatus === "synced" &&
      rehydrateState.recoverableLocalSnapshot?.items[0]?.qty === 2,
    details: {
      finalStatus: rehydrateState.syncStatus,
      currentItemCount: runtimeSnapshot?.items.length ?? 0,
      recoverableItemQty: rehydrateState.recoverableLocalSnapshot?.items[0]?.qty ?? null,
    },
  };

  await restoreLocalDraft();
  const restoredAfterConflictState = getForemanDurableDraftState();
  testResults.restore_local_after_conflict = {
    passed:
      runtimeSnapshot?.items[0]?.qty === 2 &&
      restoredAfterConflictState.syncStatus === "dirty_local" &&
      restoredAfterConflictState.conflictType === "stale_local_snapshot",
    details: {
      restoredQty: runtimeSnapshot?.items[0]?.qty ?? null,
      status: restoredAfterConflictState.syncStatus,
      conflictType: restoredAfterConflictState.conflictType,
    },
  };

  await discardLocalDraft();
  const discardedState = getForemanDurableDraftState();
  testResults.discard_local_draft = {
    passed:
      runtimeSnapshot == null &&
      discardedState.syncStatus === "idle" &&
      discardedState.availableRecoveryActions.length === 0,
    details: {
      finalStatus: discardedState.syncStatus,
      actions: discardedState.availableRecoveryActions,
      snapshotPresent: runtimeSnapshot != null,
    },
  };

  const summary = {
    status: Object.values(testResults).every((test) => test.passed) ? "passed" : "failed",
    mutationTelemetry: summarizeOfflineMutationTelemetryEvents(),
    ...testResults,
  };

  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  writeFileSync(
    fullPath,
    JSON.stringify(
      {
        ...summary,
        syncCallLog,
        submitLog,
        durableState: getForemanDurableDraftState(),
        mutationTelemetryEvents: getOfflineMutationTelemetryEvents(),
        storage: memoryStorage.dump(),
      },
      null,
      2,
    ),
  );

  console.log(JSON.stringify(summary, null, 2));

  if (summary.status !== "passed") {
    process.exitCode = 1;
  }
};

void run();
