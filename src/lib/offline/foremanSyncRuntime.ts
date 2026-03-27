import type {
  PlatformOfflineRetryTriggerSource,
  PlatformOfflineSyncStatus,
} from "./platformOffline.model";

export type ForemanDraftSyncStatus = PlatformOfflineSyncStatus;

export type ForemanDraftConflictType =
  | "none"
  | "retryable_sync_failure"
  | "stale_local_snapshot"
  | "server_terminal_conflict"
  | "validation_conflict"
  | "remote_divergence_requires_attention";

export type ForemanDraftSyncStage =
  | "hydrate"
  | "enqueue"
  | "prepare_snapshot"
  | "flush_start"
  | "sync_rpc"
  | "rekey"
  | "cleanup"
  | "finalize"
  | "recovery";

export type ForemanDraftSyncResultKind =
  | "progress"
  | "success"
  | "retryable_failure"
  | "terminal_failure";

export type ForemanDraftSyncTriggerSource =
  | PlatformOfflineRetryTriggerSource
  | "focus"
  | "submit"
  | "unknown";

export type ForemanDraftRecoveryAction =
  | "retry_now"
  | "restore_local"
  | "rehydrate_server"
  | "discard_local"
  | "clear_failed_queue";

export type ForemanDraftSyncTelemetryEvent = {
  id: string;
  at: number;
  draftKey: string | null;
  requestId: string | null;
  localOnlyDraftKey: boolean;
  attemptNumber: number;
  queueSizeBefore: number | null;
  queueSizeAfter: number | null;
  coalescedCount: number;
  stage: ForemanDraftSyncStage;
  result: ForemanDraftSyncResultKind;
  conflictType: ForemanDraftConflictType;
  recoveryAction: ForemanDraftRecoveryAction | null;
  errorClass: string | null;
  errorCode: string | null;
  offlineState: "online" | "offline" | "unknown";
  triggerSource: ForemanDraftSyncTriggerSource;
};

export type ForemanSyncUiStatus = {
  label: string;
  detail: string | null;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
};

export type ForemanDraftRecoveryAvailabilityParams = {
  status: ForemanDraftSyncStatus;
  conflictType: ForemanDraftConflictType;
  pendingOperationsCount: number;
  requestIdKnown: boolean;
  hasRecoverableLocalSnapshot: boolean;
  hasSnapshot: boolean;
  attentionNeeded: boolean;
};

const MAX_FOREMAN_DRAFT_TELEMETRY_EVENTS = 40;

const trim = (value: unknown) => String(value ?? "").trim();

const shortCode = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "unknown";

const formatTime = (value: number | null) => {
  if (!Number.isFinite(value ?? NaN)) return null;
  try {
    return new Date(value as number).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date(value as number).toISOString();
  }
};

export const appendForemanTelemetryEvent = (
  events: ForemanDraftSyncTelemetryEvent[],
  event: Omit<ForemanDraftSyncTelemetryEvent, "id" | "at"> & { id?: string; at?: number },
) => {
  const nextEvent: ForemanDraftSyncTelemetryEvent = {
    id: event.id ?? `fdt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: event.at ?? Date.now(),
    draftKey: event.draftKey,
    requestId: event.requestId,
    localOnlyDraftKey: event.localOnlyDraftKey,
    attemptNumber: event.attemptNumber,
    queueSizeBefore: event.queueSizeBefore,
    queueSizeAfter: event.queueSizeAfter,
    coalescedCount: event.coalescedCount,
    stage: event.stage,
    result: event.result,
    conflictType: event.conflictType,
    recoveryAction: event.recoveryAction ?? null,
    errorClass: event.errorClass,
    errorCode: event.errorCode,
    offlineState: event.offlineState,
    triggerSource: event.triggerSource,
  };

  const next = [...events, nextEvent];
  return next.slice(-MAX_FOREMAN_DRAFT_TELEMETRY_EVENTS);
};

export const normalizeForemanSyncTriggerSource = (
  context?: string | null,
  mutationKind?: string | null,
  submitRequested?: boolean,
): ForemanDraftSyncTriggerSource => {
  const key = trim(context).toLowerCase();
  if (submitRequested || trim(mutationKind).toLowerCase() === "submit") return "submit";
  if (key === "focus") return "focus";
  if (key === "appactive" || key === "app_active") return "app_active";
  if (key === "networkonline" || key === "network_back") return "network_back";
  if (key.startsWith("bootstrap") || key === "ensurerequestid") return "bootstrap_complete";
  if (key) return "manual_retry";
  if (trim(mutationKind)) return "manual_retry";
  return "unknown";
};

export const classifyForemanSyncError = (error: unknown) => {
  const message = trim(error instanceof Error ? error.message : error);
  const lower = message.toLowerCase();
  const isNetwork =
    lower.includes("offline") ||
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("internet") ||
    lower.includes("timeout");
  const isAuth =
    lower.includes("unauthorized") || lower.includes("forbidden") || lower.includes("permission");
  const isValidation =
    lower.includes("validation") ||
    lower.includes("invalid") ||
    lower.includes("required") ||
    lower.includes("schema");
  const isServerTerminal =
    lower.includes("terminal") ||
    lower.includes("submitted") ||
    lower.includes("cancelled") ||
    lower.includes("canceled") ||
    lower.includes("closed") ||
    lower.includes("finalized");
  const isRemoteDivergence =
    lower.includes("divergence") ||
    lower.includes("diverged") ||
    lower.includes("conflict") ||
    lower.includes("already changed") ||
    lower.includes("already modified");
  const isStale = lower.includes("stale") || lower.includes("outdated") || lower.includes("version mismatch");

  if (isAuth) {
    return {
      retryable: false,
      conflictType: "validation_conflict" as const,
      errorClass: "auth",
      errorCode: shortCode(message),
    };
  }
  if (isServerTerminal) {
    return {
      retryable: false,
      conflictType: "server_terminal_conflict" as const,
      errorClass: "server_terminal",
      errorCode: shortCode(message),
    };
  }
  if (isValidation) {
    return {
      retryable: false,
      conflictType: "validation_conflict" as const,
      errorClass: "validation",
      errorCode: shortCode(message),
    };
  }
  if (isStale) {
    return {
      retryable: false,
      conflictType: "stale_local_snapshot" as const,
      errorClass: "stale_local",
      errorCode: shortCode(message),
    };
  }
  if (isRemoteDivergence) {
    return {
      retryable: false,
      conflictType: "remote_divergence_requires_attention" as const,
      errorClass: "remote_divergence",
      errorCode: shortCode(message),
    };
  }
  if (isNetwork) {
    return {
      retryable: true,
      conflictType: "retryable_sync_failure" as const,
      errorClass: "network",
      errorCode: shortCode(message),
    };
  }
  return {
    retryable: true,
    conflictType: "retryable_sync_failure" as const,
    errorClass: "runtime",
    errorCode: shortCode(message),
  };
};

export const isForemanConflictAutoRecoverable = (conflictType: ForemanDraftConflictType) =>
  conflictType === "none" || conflictType === "retryable_sync_failure";

export const shouldFlagForemanSyncAttention = (params: {
  status: ForemanDraftSyncStatus;
  conflictType: ForemanDraftConflictType;
  retryCount: number;
  repeatedFailureStageCount: number;
}) =>
  params.conflictType === "server_terminal_conflict" ||
  params.conflictType === "validation_conflict" ||
  params.conflictType === "remote_divergence_requires_attention" ||
  params.conflictType === "stale_local_snapshot" ||
  params.status === "failed_terminal" ||
  ((params.status === "retry_wait" || params.status === "queued") &&
    (params.retryCount >= 2 || params.repeatedFailureStageCount >= 2));

export const buildForemanAvailableRecoveryActions = (
  params: ForemanDraftRecoveryAvailabilityParams,
): ForemanDraftRecoveryAction[] => {
  const actions = new Set<ForemanDraftRecoveryAction>();
  const inRecoveryState =
    params.conflictType !== "none" ||
    params.status === "failed_terminal" ||
    params.status === "retry_wait" ||
    params.attentionNeeded ||
    params.hasRecoverableLocalSnapshot;

  if (
    params.conflictType === "retryable_sync_failure" &&
    (params.pendingOperationsCount > 0 || params.status === "retry_wait" || params.attentionNeeded)
  ) {
    actions.add("retry_now");
  }

  if (
    params.requestIdKnown &&
    params.conflictType !== "none" &&
    params.conflictType !== "retryable_sync_failure"
  ) {
    actions.add("rehydrate_server");
  }

  if (params.hasRecoverableLocalSnapshot) {
    actions.add("restore_local");
  }

  if (params.conflictType !== "none" || params.status === "failed_terminal") {
    actions.add("clear_failed_queue");
  }

  if (inRecoveryState && (params.hasSnapshot || params.hasRecoverableLocalSnapshot)) {
    actions.add("discard_local");
  }

  return Array.from(actions);
};

export const buildForemanSyncUiStatus = (params: {
  status: ForemanDraftSyncStatus;
  conflictType: ForemanDraftConflictType;
  pendingOperationsCount: number;
  lastSyncAt: number | null;
  lastErrorAt: number | null;
  attentionNeeded: boolean;
  lastErrorStage: ForemanDraftSyncStage | null;
  retryCount: number;
}): ForemanSyncUiStatus => {
  const lastSync = formatTime(params.lastSyncAt);
  const lastError = formatTime(params.lastErrorAt);

  switch (params.conflictType) {
    case "server_terminal_conflict":
      return {
        label: "Server already closed",
        detail: "Local draft was kept. Choose server, restore local, or discard local.",
        tone: "danger",
      };
    case "validation_conflict":
      return {
        label: "Needs review",
        detail: "Server rejected the current draft snapshot.",
        tone: "danger",
      };
    case "remote_divergence_requires_attention":
      return {
        label: "Server changed",
        detail: "Remote draft diverged while this device was offline.",
        tone: "danger",
      };
    case "stale_local_snapshot":
      return {
        label: "Local draft stale",
        detail: "Refresh from server or restore local draft intentionally.",
        tone: "warning",
      };
    case "none":
    case "retryable_sync_failure":
    default:
      break;
  }

  if (params.attentionNeeded) {
    return {
      label: "Need attention",
      detail:
        params.lastErrorStage != null
          ? `Retry ${params.retryCount}, stage ${params.lastErrorStage}`
          : `Retry ${params.retryCount}`,
      tone: "danger",
    };
  }

  switch (params.status) {
    case "dirty_local":
      return {
        label: "Saved locally",
        detail: params.pendingOperationsCount > 0 ? `${params.pendingOperationsCount} pending` : null,
        tone: "warning",
      };
    case "queued":
      return {
        label: "Queued",
        detail: params.pendingOperationsCount > 0 ? `${params.pendingOperationsCount} pending` : null,
        tone: "warning",
      };
    case "syncing":
      return {
        label: "Syncing",
        detail: params.pendingOperationsCount > 0 ? `${params.pendingOperationsCount} pending` : null,
        tone: "info",
      };
    case "synced":
      return {
        label: "Synced",
        detail: lastSync ? `Last sync ${lastSync}` : null,
        tone: "success",
      };
    case "retry_wait":
      return {
        label: "Waiting to retry",
        detail: lastError ? `Retry ${params.retryCount}, ${lastError}` : `Retry ${params.retryCount}`,
        tone: "warning",
      };
    case "failed_terminal":
      return {
        label: "Sync failed",
        detail: params.lastErrorStage != null ? `Stage ${params.lastErrorStage}` : null,
        tone: "danger",
      };
    case "idle":
    default:
      return {
        label: "Local draft ready",
        detail: null,
        tone: "neutral",
      };
  }
};
