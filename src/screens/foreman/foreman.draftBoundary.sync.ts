import type { MutableRefObject } from "react";

import {
  clearForemanMutationQueueTail,
  flushForemanMutationQueue,
  markForemanSnapshotQueued,
} from "../../lib/offline/mutationWorker";
import {
  enqueueForemanMutation,
  getForemanPendingMutationCountForDraftKeys,
} from "../../lib/offline/mutationQueue";
import type { RequestRecord } from "../../lib/api/types";
import {
  FOREMAN_LOCAL_ONLY_REQUEST_ID,
  loadForemanRemoteDraftSnapshot,
  markForemanLocalDraftSubmitRequested,
  syncForemanLocalDraftSnapshot,
  type ForemanLocalDraftSnapshot,
} from "./foreman.localDraft";
import type { RequestDraftMeta } from "./foreman.types";
import type { ForemanDraftMutationKind } from "./foreman.draftBoundary.helpers";
import type {
  ForemanDraftConflictType,
  ForemanDraftRecoveryAction,
} from "../../lib/offline/foremanSyncRuntime";
import {
  planForemanClearFailedQueueTailAction,
  planForemanRetryNowAction,
} from "./foreman.manualRecovery.model";
import {
  planForemanSyncFlushCompletion,
  planForemanSyncInactiveGate,
  planForemanSyncQueueCommand,
  planForemanSyncSnapshotPreflight,
  resolveForemanSyncDirtyLocalCommandPlan,
  resolveForemanSyncMutationKind,
} from "./foreman.draftSyncPlan.model";
import {
  getForemanDurableDraftState,
  markForemanDurableDraftDirtyLocal,
  patchForemanDurableDraftRecoveryState,
  pushForemanDurableDraftTelemetry,
} from "./foreman.durableDraft.store";

export type ForemanDraftBoundarySyncResultPayload = {
  requestId: string | null;
  submitted: RequestRecord | null;
};

export type ForemanDraftBoundarySyncOptions = {
  submit?: boolean;
  context?: string;
  overrideSnapshot?: ForemanLocalDraftSnapshot | null;
  mutationKind?: ForemanDraftMutationKind;
  localBeforeCount?: number | null;
  localAfterCount?: number | null;
  force?: boolean;
};

type ForemanDraftBoundarySyncDeps = {
  isDraftActive: boolean;
  requestId: string;
  buildCurrentLocalDraftSnapshot: () => ForemanLocalDraftSnapshot | null;
  getDraftQueueKey: (
    snapshot?: ForemanLocalDraftSnapshot | null,
    fallbackRequestId?: string | null,
  ) => string;
  getDraftQueueKeys: (
    snapshot?: ForemanLocalDraftSnapshot | null,
    fallbackRequestId?: string | null,
  ) => string[];
  refreshBoundarySyncState: (
    snapshotOverride?: ForemanLocalDraftSnapshot | null,
  ) => Promise<void>;
  persistLocalDraftSnapshot: (snapshot: ForemanLocalDraftSnapshot | null) => void;
  buildRequestDraftMeta: () => RequestDraftMeta;
  applyLocalDraftSnapshotToBoundary: (
    snapshot: ForemanLocalDraftSnapshot | null,
    options?: {
      restoreHeader?: boolean;
      clearWhenEmpty?: boolean;
      restoreSource?: "none" | "snapshot" | "remoteDraft";
      restoreIdentity?: string | null;
    },
  ) => void;
  localDraftSnapshotRef: MutableRefObject<ForemanLocalDraftSnapshot | null>;
  networkOnlineRef: MutableRefObject<boolean | null>;
  draftSyncInFlightRef: MutableRefObject<Promise<ForemanDraftBoundarySyncResultPayload> | null>;
  activeDraftOwnerIdRef: MutableRefObject<string | null>;
  lastSubmittedOwnerIdRef: MutableRefObject<string | null>;
  submitInFlightOwnerIdRef: MutableRefObject<string | null>;
  handlePostSubmitSuccessRef: MutableRefObject<
    (rid: string, submitted: RequestRecord | null) => Promise<void>
  >;
};

export async function runForemanDraftBoundarySyncNow(
  deps: ForemanDraftBoundarySyncDeps,
  options?: ForemanDraftBoundarySyncOptions,
) {
  const mutationKind = resolveForemanSyncMutationKind({
    optionMutationKind: options?.mutationKind,
    submit: options?.submit === true,
  });

  const inactiveGatePlan = planForemanSyncInactiveGate({
    isDraftActive: deps.isDraftActive,
    hasOverrideSnapshot: Boolean(options?.overrideSnapshot),
    mutationKind,
    requestId: deps.requestId,
  });
  if (inactiveGatePlan.action === "skip_inactive") {
    return inactiveGatePlan;
  }

  let snapshot = options?.overrideSnapshot ?? deps.buildCurrentLocalDraftSnapshot();
  if (options?.submit) {
    snapshot = markForemanLocalDraftSubmitRequested(snapshot);
  }
  const currentDraftSyncInFlight = deps.draftSyncInFlightRef.current;
  const preflightPlan = planForemanSyncSnapshotPreflight({
    snapshot,
    submit: options?.submit === true,
    mutationKind,
    context: options?.context,
    requestId: deps.requestId,
    activeDraftOwnerId: deps.activeDraftOwnerIdRef.current,
    lastSubmittedOwnerId: deps.lastSubmittedOwnerIdRef.current,
    submitInFlightOwnerId: deps.submitInFlightOwnerIdRef.current,
    hasDraftSyncInFlight: Boolean(currentDraftSyncInFlight),
  });

  if (preflightPlan.action === "skip_empty") {
    await deps.refreshBoundarySyncState(preflightPlan.snapshot);
    return {
      requestId: preflightPlan.requestId,
      submitted: preflightPlan.submitted,
    };
  }
  if (preflightPlan.action === "throw_duplicate_submit") {
    throw new Error(preflightPlan.message);
  }
  if (preflightPlan.action === "await_in_flight_submit") {
    if (currentDraftSyncInFlight) {
      return await currentDraftSyncInFlight;
    }
    throw new Error("Expected draft sync in-flight promise to be present");
  }

  snapshot = preflightPlan.snapshot;
  const triggerSource = preflightPlan.triggerSource;
  const submitOwnerId = preflightPlan.submitOwnerId;

  const pendingOperationsCount = await getForemanPendingMutationCountForDraftKeys(
    deps.getDraftQueueKeys(snapshot),
  );
  const durableState = getForemanDurableDraftState();
  const draftKey = deps.getDraftQueueKey(snapshot);
  const dirtyLocalPlan = resolveForemanSyncDirtyLocalCommandPlan({
    snapshot,
    draftKey,
    pendingOperationsCount,
    durableConflictType: durableState.conflictType,
    networkOnline: deps.networkOnlineRef.current,
    triggerSource,
    localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
  });
  await markForemanDurableDraftDirtyLocal(snapshot, dirtyLocalPlan.dirtyLocal);
  deps.persistLocalDraftSnapshot(snapshot);
  await pushForemanDurableDraftTelemetry(dirtyLocalPlan.telemetry);

  const queuePlan = planForemanSyncQueueCommand({
    snapshot,
    mutationKind,
    triggerSource,
    durableConflictType: durableState.conflictType,
    force: options?.force === true,
    draftKey,
    localBeforeCount: options?.localBeforeCount,
    localAfterCount: options?.localAfterCount,
    submit: options?.submit === true,
    activeRequestId: deps.requestId,
  });

  if (queuePlan.action === "block_for_manual_recovery") {
    await patchForemanDurableDraftRecoveryState(queuePlan.durablePatch);
    await deps.refreshBoundarySyncState(snapshot);
    return { requestId: queuePlan.requestId, submitted: queuePlan.submitted };
  }

  await enqueueForemanMutation(queuePlan.enqueue);

  await markForemanSnapshotQueued(snapshot, {
    queueDraftKey: queuePlan.enqueue.draftKey,
    triggerSource,
  });
  await deps.refreshBoundarySyncState(snapshot);

  if (deps.draftSyncInFlightRef.current) {
    await deps.draftSyncInFlightRef.current;
  }

  if (options?.submit === true && submitOwnerId) {
    deps.submitInFlightOwnerIdRef.current = submitOwnerId;
  }

  const run = flushForemanMutationQueue({
    getSnapshot: () => deps.localDraftSnapshotRef.current,
    buildRequestDraftMeta: deps.buildRequestDraftMeta,
    persistSnapshot: deps.persistLocalDraftSnapshot,
    applySnapshotToBoundary: deps.applyLocalDraftSnapshotToBoundary,
    getNetworkOnline: () => deps.networkOnlineRef.current,
    inspectRemoteDraft: async ({ requestId: draftRequestId, localSnapshot }) => {
      const remote = await loadForemanRemoteDraftSnapshot({
        requestId: draftRequestId,
        localSnapshot,
      });
      return {
        snapshot: remote.snapshot,
        status: remote.details?.status ?? null,
        isTerminal: remote.isTerminal,
      };
    },
    syncSnapshot: syncForemanLocalDraftSnapshot,
    onSubmitted: (rid, submitted) => deps.handlePostSubmitSuccessRef.current(rid, submitted),
  }, triggerSource).then(async (result) => {
    await deps.refreshBoundarySyncState(deps.localDraftSnapshotRef.current);
    const flushCompletionPlan = planForemanSyncFlushCompletion({
      result,
      submit: options?.submit === true,
      submitOwnerId,
    });
    if (flushCompletionPlan.action === "throw_failed") {
      throw new Error(flushCompletionPlan.message);
    }
    if (flushCompletionPlan.markLastSubmittedOwnerId) {
      deps.lastSubmittedOwnerIdRef.current = flushCompletionPlan.markLastSubmittedOwnerId;
    }
    return flushCompletionPlan.result;
  });

  deps.draftSyncInFlightRef.current = run;
  try {
    return await run;
  } finally {
    if (
      options?.submit === true &&
      submitOwnerId &&
      deps.submitInFlightOwnerIdRef.current === submitOwnerId
    ) {
      deps.submitInFlightOwnerIdRef.current = null;
    }
    deps.draftSyncInFlightRef.current = null;
  }
}

export async function runForemanDraftBoundaryRetrySyncNow(deps: {
  localDraftSnapshotRef: MutableRefObject<ForemanLocalDraftSnapshot | null>;
  pushRecoveryTelemetry: (params: {
    recoveryAction: ForemanDraftRecoveryAction;
    result: "progress" | "success" | "retryable_failure" | "terminal_failure";
    conflictType?: ForemanDraftConflictType;
    errorClass?: string | null;
    errorCode?: string | null;
  }) => Promise<void>;
  syncLocalDraftNow: (options?: ForemanDraftBoundarySyncOptions) => Promise<unknown>;
}) {
  const snapshot = deps.localDraftSnapshotRef.current ?? getForemanDurableDraftState().snapshot;
  const retryPlan = planForemanRetryNowAction({ snapshot });
  if (retryPlan.action === "skip") return;
  await deps.pushRecoveryTelemetry({
    recoveryAction: "retry_now",
    result: "progress",
  });
  try {
    await deps.syncLocalDraftNow({
      context: "retryNow",
      overrideSnapshot: retryPlan.snapshot,
      mutationKind: retryPlan.mutationKind,
      localBeforeCount: retryPlan.localBeforeCount,
      localAfterCount: retryPlan.localAfterCount,
      force: retryPlan.force,
    });
    await deps.pushRecoveryTelemetry({
      recoveryAction: "retry_now",
      result: "success",
      conflictType: "none",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    await deps.pushRecoveryTelemetry({
      recoveryAction: "retry_now",
      result: "terminal_failure",
      errorClass: "recovery",
      errorCode: message.slice(0, 48) || "retry_failed",
    });
    throw error;
  }
}

export async function runForemanDraftBoundaryClearFailedQueueTailNow(deps: {
  localDraftSnapshotRef: MutableRefObject<ForemanLocalDraftSnapshot | null>;
  getDraftQueueKey: (
    snapshot?: ForemanLocalDraftSnapshot | null,
    fallbackRequestId?: string | null,
  ) => string;
  refreshBoundarySyncState: (
    snapshotOverride?: ForemanLocalDraftSnapshot | null,
  ) => Promise<void>;
  pushRecoveryTelemetry: (params: {
    recoveryAction: ForemanDraftRecoveryAction;
    result: "progress" | "success" | "retryable_failure" | "terminal_failure";
    conflictType?: ForemanDraftConflictType;
    errorClass?: string | null;
    errorCode?: string | null;
  }) => Promise<void>;
}) {
  const snapshot = deps.localDraftSnapshotRef.current ?? getForemanDurableDraftState().snapshot;
  const clearPlan = planForemanClearFailedQueueTailAction({ snapshot });
  await deps.pushRecoveryTelemetry({
    recoveryAction: "clear_failed_queue",
    result: "progress",
  });
  await clearForemanMutationQueueTail({
    snapshot: clearPlan.snapshot,
    draftKey: deps.getDraftQueueKey(clearPlan.snapshot),
    triggerSource: clearPlan.triggerSource,
  });
  await deps.refreshBoundarySyncState(clearPlan.snapshot);
  await deps.pushRecoveryTelemetry({
    recoveryAction: "clear_failed_queue",
    result: "success",
  });
}
