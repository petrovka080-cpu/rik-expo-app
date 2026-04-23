import type { MutableRefObject, Dispatch, SetStateAction } from "react";

import { fetchRequestDetails, type RequestDetails } from "../../lib/catalog_api";
import { clearForemanMutationsForDraft } from "../../lib/offline/mutationQueue";
import type {
  ForemanDraftConflictType,
  ForemanDraftRecoveryAction,
} from "../../lib/offline/foremanSyncRuntime";
import { getForemanDurableDraftState, patchForemanDurableDraftRecoveryState } from "./foreman.durableDraft.store";
import {
  FOREMAN_LOCAL_ONLY_REQUEST_ID,
  loadForemanRemoteDraftSnapshot,
  type ForemanLocalDraftSnapshot,
} from "./foreman.localDraft";
import {
  applyForemanManualRecoveryRemotePlanToBoundary,
  discardWholeForemanDraftInBoundary,
  type ForemanDraftRestoreSource,
} from "./foreman.draftBoundary.helpers";
import {
  collectForemanTerminalRecoveryCandidates,
  hasForemanDurableRecoverySignal,
  isForemanTerminalRemoteStatus,
  resolveForemanTerminalCleanupPlan,
  buildForemanTerminalCleanupDurablePatch,
} from "./foreman.terminalRecovery";
import {
  planForemanDiscardLocalAction,
  planForemanDiscardLocalRemoteAction,
  planForemanRehydrateServerAction,
  planForemanRehydrateServerRemoteAction,
  planForemanRestoreLocalAction,
} from "./foreman.manualRecovery.model";
import {
  resolveForemanDraftBoundaryRestoreAttemptPlan,
  resolveForemanDraftBoundaryRestoreRemotePlan,
} from "./foreman.draftBoundary.logic";
import { ridStr } from "./foreman.helpers";
import type { ForemanDraftRestoreTriggerPlan } from "./foreman.draftLifecycle.model";

type FailureReporter = (params: {
  event: string;
  error: unknown;
  context?: string;
  stage: "recovery" | "cleanup" | "hydrate";
  kind?: "critical_fail" | "soft_failure" | "degraded_fallback";
  sourceKind?: string;
  extra?: Record<string, unknown>;
}) => unknown;

type RecoveryTelemetryPusher = (params: {
  recoveryAction: ForemanDraftRecoveryAction;
  result: "progress" | "success" | "retryable_failure" | "terminal_failure";
  conflictType?: ForemanDraftConflictType;
  errorClass?: string | null;
  errorCode?: string | null;
}) => Promise<void>;

type ApplyLocalDraftSnapshotToBoundary = (
  snapshot: ForemanLocalDraftSnapshot | null,
  options?: {
    restoreHeader?: boolean;
    clearWhenEmpty?: boolean;
    restoreSource?: ForemanDraftRestoreSource;
    restoreIdentity?: string | null;
  },
) => void;

type SetActiveDraftOwnerId = (
  ownerId?: string | null,
  options?: { resetSubmitted?: boolean },
) => string;

export async function runForemanClearTerminalLocalDraft(
  deps: {
    localDraftSnapshotRef: MutableRefObject<ForemanLocalDraftSnapshot | null>;
    requestId: string;
    clearDraftCache: (options?: {
      snapshot?: ForemanLocalDraftSnapshot | null;
      requestId?: string | null;
    }) => Promise<void>;
    setActiveDraftOwnerId: SetActiveDraftOwnerId;
    resetDraftState: () => void;
    refreshBoundarySyncState: (
      snapshotOverride?: ForemanLocalDraftSnapshot | null,
    ) => Promise<void>;
  },
  options: {
    snapshot?: ForemanLocalDraftSnapshot | null;
    requestId: string;
    remoteStatus?: string | null;
  },
) {
  const durableState = getForemanDurableDraftState();
  const cleanupPlan = resolveForemanTerminalCleanupPlan({
    requestId: options.requestId,
    remoteStatus: options.remoteStatus,
    optionSnapshot: options.snapshot,
    activeSnapshot: deps.localDraftSnapshotRef.current,
    durableSnapshot: durableState.snapshot,
    recoverableSnapshot: durableState.recoverableLocalSnapshot,
    queueDraftKey: durableState.queueDraftKey,
  });
  for (const key of cleanupPlan.cleanupKeys) {
    await clearForemanMutationsForDraft(key);
  }
  await deps.clearDraftCache(cleanupPlan.cacheClear);
  deps.setActiveDraftOwnerId(cleanupPlan.activeOwnerReset.nextOwnerId, {
    resetSubmitted: cleanupPlan.activeOwnerReset.resetSubmitted,
  });
  if (cleanupPlan.resetDraftState) deps.resetDraftState();
  await patchForemanDurableDraftRecoveryState(
    buildForemanTerminalCleanupDurablePatch(cleanupPlan.durablePatch, Date.now()),
  );
  await deps.refreshBoundarySyncState(cleanupPlan.refreshBoundaryRequestId);

  if (__DEV__) {
    console.info("[foreman.terminal-cleanup]", cleanupPlan.devTelemetry);
  }
}

export async function runForemanClearTerminalRecoveryOwnerIfNeeded(
  deps: {
    localDraftSnapshotRef: MutableRefObject<ForemanLocalDraftSnapshot | null>;
    requestId: string;
    clearTerminalLocalDraft: (options: {
      snapshot?: ForemanLocalDraftSnapshot | null;
      requestId: string;
      remoteStatus?: string | null;
    }) => Promise<void>;
    reportDraftBoundaryFailure: FailureReporter;
  },
  context: string,
  options?: { cancelled?: () => boolean },
) {
  const durableState = getForemanDurableDraftState();
  const candidates = collectForemanTerminalRecoveryCandidates({
    activeSnapshot: deps.localDraftSnapshotRef.current,
    durableSnapshot: durableState.snapshot,
    recoverableSnapshot: durableState.recoverableLocalSnapshot,
    activeRequestId: deps.requestId,
    queueDraftKey: durableState.queueDraftKey,
    hasRecoverySignal: hasForemanDurableRecoverySignal(durableState),
  });

  for (const candidate of candidates) {
    if (options?.cancelled?.()) return true;
    try {
      const remoteDetails = await fetchRequestDetails(candidate.requestId);
      const remoteStatus = remoteDetails?.status ?? null;
      if (!isForemanTerminalRemoteStatus(remoteStatus)) continue;
      if (__DEV__) {
        console.info("[foreman.terminal-recovery] clearing request-bound recovery owner", {
          requestId: candidate.requestId,
          remoteStatus,
          source: candidate.source,
          context,
        });
      }
      await deps.clearTerminalLocalDraft({
        snapshot: candidate.snapshot,
        requestId: candidate.requestId,
        remoteStatus,
      });
      return true;
    } catch (error) {
      deps.reportDraftBoundaryFailure({
        event: "terminal_recovery_remote_check_failed",
        error,
        context,
        stage: "recovery",
        kind: "degraded_fallback",
        sourceKind: "rpc:fetch_request_details",
        extra: {
          candidateRequestId: candidate.requestId,
          candidateSource: candidate.source,
          fallbackReason: "keep_recovery_owner_for_next_check",
        },
      });
    }
  }

  return false;
}

export async function runForemanRestoreDraftIfNeeded(
  deps: {
    bootstrapReady: boolean;
    localDraftSnapshotRef: MutableRefObject<ForemanLocalDraftSnapshot | null>;
    clearTerminalRecoveryOwnerIfNeeded: (
      context: string,
      options?: { cancelled?: () => boolean },
    ) => Promise<boolean>;
    clearTerminalLocalDraft: (options: {
      snapshot?: ForemanLocalDraftSnapshot | null;
      requestId: string;
      remoteStatus?: string | null;
    }) => Promise<void>;
    reportDraftBoundaryFailure: FailureReporter;
    syncLocalDraftNow: (options?: {
      submit?: boolean;
      context?: string;
      overrideSnapshot?: ForemanLocalDraftSnapshot | null;
      mutationKind?: string;
      localBeforeCount?: number | null;
      localAfterCount?: number | null;
      force?: boolean;
    }) => Promise<unknown>;
  },
  context: string,
) {
  const durableState = getForemanDurableDraftState();
  const restoreAttemptPlan = resolveForemanDraftBoundaryRestoreAttemptPlan({
    bootstrapReady: deps.bootstrapReady,
    durableState,
    localSnapshot: deps.localDraftSnapshotRef.current,
  });
  if (restoreAttemptPlan.action === "skip") return;
  if (await deps.clearTerminalRecoveryOwnerIfNeeded(context)) return;

  const snapshot = restoreAttemptPlan.snapshot;
  const remoteCheckPlan = restoreAttemptPlan.remoteCheckPlan;
  if (remoteCheckPlan.action === "check_terminal") {
    try {
      const remoteDetails = await fetchRequestDetails(remoteCheckPlan.requestId);
      const remoteStatusPlan = resolveForemanDraftBoundaryRestoreRemotePlan({
        requestId: remoteCheckPlan.requestId,
        remoteStatus: remoteDetails?.status ?? null,
      });
      if (remoteStatusPlan.action === "clear_terminal") {
        if (__DEV__) {
          console.info("[foreman.live-reconciliation] foreground check found terminal request", {
            requestId: remoteStatusPlan.requestId,
            remoteStatus: remoteStatusPlan.remoteStatus,
            context,
          });
        }
        await deps.clearTerminalLocalDraft({
          snapshot,
          requestId: remoteStatusPlan.requestId,
          remoteStatus: remoteStatusPlan.remoteStatus,
        });
        return;
      }
    } catch (error) {
      deps.reportDraftBoundaryFailure({
        event: "restore_remote_terminal_check_failed",
        error,
        context,
        stage: "recovery",
        kind: "degraded_fallback",
        sourceKind: "rpc:fetch_request_details",
        extra: {
          requestId: remoteCheckPlan.requestId,
          fallbackReason: "retry_next_foreground_event",
        },
      });
    }
  }

  if (!restoreAttemptPlan.shouldSyncAfterRemoteCheck) return;
  await deps.syncLocalDraftNow({ context });
}

export function runForemanRestoreTriggerPlan(
  plan: ForemanDraftRestoreTriggerPlan,
  deps: {
    restoreDraftIfNeeded: (context: string) => Promise<void>;
    reportDraftBoundaryFailure: FailureReporter;
  },
) {
  if (plan.action !== "restore") return;
  void deps.restoreDraftIfNeeded(plan.context).catch((error) => {
    deps.reportDraftBoundaryFailure({
      ...plan.failureTelemetry,
      error,
    });
  });
}

export async function runForemanRehydrateDraftFromServer(
  deps: {
    localDraftSnapshotRef: MutableRefObject<ForemanLocalDraftSnapshot | null>;
    requestId: string;
    clearTerminalLocalDraft: (options: {
      snapshot?: ForemanLocalDraftSnapshot | null;
      requestId: string;
      remoteStatus?: string | null;
    }) => Promise<void>;
    setActiveDraftOwnerId: SetActiveDraftOwnerId;
    applyLocalDraftSnapshotToBoundary: ApplyLocalDraftSnapshotToBoundary;
    refreshBoundarySyncState: (
      snapshotOverride?: ForemanLocalDraftSnapshot | null,
    ) => Promise<void>;
    persistLocalDraftSnapshot: (snapshot: ForemanLocalDraftSnapshot | null) => void;
    setRequestIdState: Dispatch<SetStateAction<string>>;
    setRequestDetails: Dispatch<SetStateAction<RequestDetails | null>>;
    syncHeaderFromDetails: (details: RequestDetails) => void;
    loadItems: (rid?: string | null, options?: { forceRemote?: boolean }) => Promise<void>;
    pushRecoveryTelemetry: RecoveryTelemetryPusher;
  },
) {
  const durableState = getForemanDurableDraftState();
  const currentSnapshot = deps.localDraftSnapshotRef.current ?? durableState.snapshot;
  const rehydratePlan = planForemanRehydrateServerAction({
    currentSnapshot,
    requestId: deps.requestId,
  });
  if (rehydratePlan.action === "skip") return;

  await deps.pushRecoveryTelemetry({
    recoveryAction: "rehydrate_server",
    result: "progress",
  });

  const remote = await loadForemanRemoteDraftSnapshot({
    requestId: rehydratePlan.requestId,
    localSnapshot: rehydratePlan.currentSnapshot,
  });

  const remotePlan = planForemanRehydrateServerRemoteAction({
    requestId: rehydratePlan.requestId,
    currentSnapshot: rehydratePlan.currentSnapshot,
    remote,
    now: Date.now(),
  });

  if (remotePlan.action === "clear_terminal") {
    await applyForemanManualRecoveryRemotePlanToBoundary({
      remotePlan,
      clearTerminalLocalDraft: deps.clearTerminalLocalDraft,
      setActiveDraftOwnerId: deps.setActiveDraftOwnerId,
      applyLocalDraftSnapshotToBoundary: deps.applyLocalDraftSnapshotToBoundary,
      patchForemanDurableDraftRecoveryState,
      refreshBoundarySyncState: deps.refreshBoundarySyncState,
      persistLocalDraftSnapshot: deps.persistLocalDraftSnapshot,
      setRequestIdState: deps.setRequestIdState,
      setRequestDetails: deps.setRequestDetails,
      syncHeaderFromDetails: deps.syncHeaderFromDetails,
      loadItems: deps.loadItems,
    });
    await deps.pushRecoveryTelemetry({
      recoveryAction: "rehydrate_server",
      result: "success",
      conflictType: "none",
    });
    return;
  }

  await clearForemanMutationsForDraft(FOREMAN_LOCAL_ONLY_REQUEST_ID);
  await clearForemanMutationsForDraft(rehydratePlan.requestId);

  await applyForemanManualRecoveryRemotePlanToBoundary({
    remotePlan,
    clearTerminalLocalDraft: deps.clearTerminalLocalDraft,
    setActiveDraftOwnerId: deps.setActiveDraftOwnerId,
    applyLocalDraftSnapshotToBoundary: deps.applyLocalDraftSnapshotToBoundary,
    patchForemanDurableDraftRecoveryState,
    refreshBoundarySyncState: deps.refreshBoundarySyncState,
    persistLocalDraftSnapshot: deps.persistLocalDraftSnapshot,
    setRequestIdState: deps.setRequestIdState,
    setRequestDetails: deps.setRequestDetails,
    syncHeaderFromDetails: deps.syncHeaderFromDetails,
    loadItems: deps.loadItems,
  });

  await deps.pushRecoveryTelemetry({
    recoveryAction: "rehydrate_server",
    result: "success",
    conflictType: "none",
  });
}

export async function runForemanRestoreLocalDraftAfterConflict(
  deps: {
    setActiveDraftOwnerId: SetActiveDraftOwnerId;
    applyLocalDraftSnapshotToBoundary: ApplyLocalDraftSnapshotToBoundary;
    refreshBoundarySyncState: (
      snapshotOverride?: ForemanLocalDraftSnapshot | null,
    ) => Promise<void>;
    pushRecoveryTelemetry: RecoveryTelemetryPusher;
  },
) {
  const durableState = getForemanDurableDraftState();
  const restorePlan = planForemanRestoreLocalAction({
    durableState,
    now: Date.now(),
  });
  if (restorePlan.action === "skip") return;
  const recoverableSnapshot = restorePlan.snapshot;
  deps.setActiveDraftOwnerId(recoverableSnapshot.ownerId, { resetSubmitted: true });

  await deps.pushRecoveryTelemetry({
    recoveryAction: "restore_local",
    result: "progress",
    conflictType: durableState.conflictType,
  });

  deps.applyLocalDraftSnapshotToBoundary(recoverableSnapshot, {
    restoreHeader: true,
    clearWhenEmpty: true,
    restoreSource: "snapshot",
    restoreIdentity: restorePlan.restoreIdentity,
  });
  await patchForemanDurableDraftRecoveryState(restorePlan.durablePatch);
  await deps.refreshBoundarySyncState(recoverableSnapshot);
  await deps.pushRecoveryTelemetry({
    recoveryAction: "restore_local",
    result: "success",
    conflictType: restorePlan.conflictType,
  });
}

export async function runForemanDiscardLocalDraftNow(
  deps: {
    localDraftSnapshotRef: MutableRefObject<ForemanLocalDraftSnapshot | null>;
    requestId: string;
    clearDraftCache: (options?: {
      snapshot?: ForemanLocalDraftSnapshot | null;
      requestId?: string | null;
    }) => Promise<void>;
    resetDraftState: () => void;
    clearTerminalLocalDraft: (options: {
      snapshot?: ForemanLocalDraftSnapshot | null;
      requestId: string;
      remoteStatus?: string | null;
    }) => Promise<void>;
    setActiveDraftOwnerId: SetActiveDraftOwnerId;
    applyLocalDraftSnapshotToBoundary: ApplyLocalDraftSnapshotToBoundary;
    refreshBoundarySyncState: (
      snapshotOverride?: ForemanLocalDraftSnapshot | null,
    ) => Promise<void>;
    persistLocalDraftSnapshot: (snapshot: ForemanLocalDraftSnapshot | null) => void;
    setRequestIdState: Dispatch<SetStateAction<string>>;
    setRequestDetails: Dispatch<SetStateAction<RequestDetails | null>>;
    syncHeaderFromDetails: (details: RequestDetails) => void;
    loadItems: (rid?: string | null, options?: { forceRemote?: boolean }) => Promise<void>;
    pushRecoveryTelemetry: RecoveryTelemetryPusher;
  },
) {
  const durableState = getForemanDurableDraftState();
  const currentSnapshot = deps.localDraftSnapshotRef.current ?? durableState.snapshot;
  const discardPlan = planForemanDiscardLocalAction({
    durableState,
    currentSnapshot,
    requestId: deps.requestId,
  });

  await deps.pushRecoveryTelemetry({
    recoveryAction: "discard_local",
    result: "progress",
    conflictType: durableState.conflictType,
  });

  await clearForemanMutationsForDraft(FOREMAN_LOCAL_ONLY_REQUEST_ID);
  if (discardPlan.action === "load_remote") {
    await clearForemanMutationsForDraft(discardPlan.requestId);
  }

  if (discardPlan.action === "load_remote") {
    const remote = await loadForemanRemoteDraftSnapshot({
      requestId: discardPlan.requestId,
      localSnapshot: discardPlan.currentSnapshot,
    });
    const remotePlan = planForemanDiscardLocalRemoteAction({
      requestId: discardPlan.requestId,
      currentSnapshot: discardPlan.currentSnapshot,
      remote,
      now: Date.now(),
    });
    if (remotePlan.action === "clear_terminal") {
      await applyForemanManualRecoveryRemotePlanToBoundary({
        remotePlan,
        clearTerminalLocalDraft: deps.clearTerminalLocalDraft,
        setActiveDraftOwnerId: deps.setActiveDraftOwnerId,
        applyLocalDraftSnapshotToBoundary: deps.applyLocalDraftSnapshotToBoundary,
        patchForemanDurableDraftRecoveryState,
        refreshBoundarySyncState: deps.refreshBoundarySyncState,
        persistLocalDraftSnapshot: deps.persistLocalDraftSnapshot,
        setRequestIdState: deps.setRequestIdState,
        setRequestDetails: deps.setRequestDetails,
        syncHeaderFromDetails: deps.syncHeaderFromDetails,
        loadItems: deps.loadItems,
      });
      await deps.pushRecoveryTelemetry({
        recoveryAction: "discard_local",
        result: "success",
        conflictType: "none",
      });
      return;
    }
    await applyForemanManualRecoveryRemotePlanToBoundary({
      remotePlan,
      clearTerminalLocalDraft: deps.clearTerminalLocalDraft,
      setActiveDraftOwnerId: deps.setActiveDraftOwnerId,
      applyLocalDraftSnapshotToBoundary: deps.applyLocalDraftSnapshotToBoundary,
      patchForemanDurableDraftRecoveryState,
      refreshBoundarySyncState: deps.refreshBoundarySyncState,
      persistLocalDraftSnapshot: deps.persistLocalDraftSnapshot,
      setRequestIdState: deps.setRequestIdState,
      setRequestDetails: deps.setRequestDetails,
      syncHeaderFromDetails: deps.syncHeaderFromDetails,
      loadItems: deps.loadItems,
    });
  } else {
    await deps.clearDraftCache();
    deps.resetDraftState();
    await patchForemanDurableDraftRecoveryState(discardPlan.durablePatch);
  }

  await deps.pushRecoveryTelemetry({
    recoveryAction: "discard_local",
    result: "success",
    conflictType: "none",
  });
}

export async function runForemanOpenRequestById(
  deps: {
    localDraftSnapshotRef: MutableRefObject<ForemanLocalDraftSnapshot | null>;
    clearTerminalLocalDraft: (options: {
      snapshot?: ForemanLocalDraftSnapshot | null;
      requestId: string;
      remoteStatus?: string | null;
    }) => Promise<void>;
    setActiveDraftOwnerId: SetActiveDraftOwnerId;
    applyLocalDraftSnapshotToBoundary: ApplyLocalDraftSnapshotToBoundary;
    refreshBoundarySyncState: (
      snapshotOverride?: ForemanLocalDraftSnapshot | null,
    ) => Promise<void>;
    persistLocalDraftSnapshot: (snapshot: ForemanLocalDraftSnapshot | null) => void;
    setRequestIdState: Dispatch<SetStateAction<string>>;
    setRequestDetails: Dispatch<SetStateAction<RequestDetails | null>>;
    syncHeaderFromDetails: (details: RequestDetails) => void;
    loadItems: (rid?: string | null, options?: { forceRemote?: boolean }) => Promise<void>;
  },
  targetId: string | number | null | undefined,
) {
  const id = ridStr(targetId);
  if (!id) return null;
  deps.setActiveDraftOwnerId(undefined, { resetSubmitted: true });
  deps.setRequestDetails(null);
  const remote = await loadForemanRemoteDraftSnapshot({
    requestId: id,
    localSnapshot: deps.localDraftSnapshotRef.current,
  });
  if (remote.isTerminal) {
    const durableState = getForemanDurableDraftState();
    await deps.clearTerminalLocalDraft({
      snapshot:
        deps.localDraftSnapshotRef.current ??
        durableState.snapshot ??
        durableState.recoverableLocalSnapshot,
      requestId: id,
      remoteStatus: remote.details?.status ?? null,
    });
    return null;
  }
  if (remote.snapshot) {
    deps.applyLocalDraftSnapshotToBoundary(remote.snapshot, {
      restoreHeader: true,
      clearWhenEmpty: true,
      restoreSource: "remoteDraft",
      restoreIdentity: `open:${id}`,
    });
    await deps.refreshBoundarySyncState(remote.snapshot);
    return id;
  }
  deps.persistLocalDraftSnapshot(null);
  deps.setRequestIdState(id);
  deps.setRequestDetails(remote.details);
  if (remote.details) {
    deps.syncHeaderFromDetails(remote.details);
  }
  await deps.loadItems(id, { forceRemote: true });
  return id;
}

export async function runForemanDiscardWholeDraft(
  deps: {
    buildCurrentLocalDraftSnapshot: () => ForemanLocalDraftSnapshot | null;
    applyLocalDraftSnapshotToBoundary: ApplyLocalDraftSnapshotToBoundary;
    syncLocalDraftNow: (options?: {
      submit?: boolean;
      context?: string;
      overrideSnapshot?: ForemanLocalDraftSnapshot | null;
      mutationKind?: string;
      localBeforeCount?: number | null;
      localAfterCount?: number | null;
      force?: boolean;
    }) => Promise<unknown>;
    clearDraftCache: (options?: {
      snapshot?: ForemanLocalDraftSnapshot | null;
      requestId?: string | null;
    }) => Promise<void>;
    resetDraftState: () => void;
  },
) {
  await discardWholeForemanDraftInBoundary({
    buildCurrentLocalDraftSnapshot: deps.buildCurrentLocalDraftSnapshot,
    applyLocalDraftSnapshotToBoundary: deps.applyLocalDraftSnapshotToBoundary,
    syncLocalDraftNow: deps.syncLocalDraftNow,
    clearDraftCache: deps.clearDraftCache,
    resetDraftState: deps.resetDraftState,
  });
}
