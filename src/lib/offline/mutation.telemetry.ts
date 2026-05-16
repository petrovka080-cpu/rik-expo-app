import { recordPlatformObservability } from "../observability/platformObservability";
import { trackQueueBacklogMetric } from "../observability/queueBacklogMetrics";
import type { PlatformOfflineSyncStatus } from "./platformOffline.model";
import {
  recordPlatformOfflineTelemetry,
  type PlatformOfflineFailureClass,
  type PlatformOfflineQueueAction,
} from "./platformOffline.observability";
import type {
  ForemanDraftConflictType,
  ForemanDraftSyncStage,
  ForemanDraftSyncTriggerSource,
} from "./foremanSyncRuntime";
import { pushForemanDurableDraftTelemetry } from "../../screens/foreman/foreman.durableDraft.store";
import type { getForemanMutationQueueSummary } from "./mutationQueue";
import type {
  OfflineMutationErrorKind,
  OfflineMutationLifecycleStatus,
  OfflineMutationOwner,
} from "./mutation.types";

export type OfflineMutationTelemetryAction =
  | "enqueue"
  | "dedupe_suppressed"
  | "processing_started"
  | "retry_scheduled"
  | "retry_deferred"
  | "retry_exhausted"
  | "conflict_detected"
  | "failed_non_retryable"
  | "succeeded"
  | "discarded_by_policy"
  | "inflight_restored";

export type OfflineMutationTelemetryEvent = {
  id: string;
  at: number;
  owner: OfflineMutationOwner;
  entityId: string;
  mutationId: string;
  dedupeKey: string;
  lifecycleStatus: OfflineMutationLifecycleStatus;
  action: OfflineMutationTelemetryAction;
  attemptCount: number;
  retryCount: number;
  triggerSource: string | null;
  errorKind: OfflineMutationErrorKind;
  errorCode: string | null;
  nextRetryAt: number | null;
  coalescedCount: number;
  extra: Record<string, unknown> | null;
};

export type OfflineMutationTelemetrySummary = {
  totalEvents: number;
  byOwner: Record<string, number>;
  byAction: Record<string, number>;
  latestLifecycleByOwner: Record<string, OfflineMutationLifecycleStatus>;
  conflictCount: number;
  retryScheduledCount: number;
  retryExhaustedCount: number;
  dedupeSuppressedCount: number;
};

type OfflineMutationTelemetryInput = Omit<OfflineMutationTelemetryEvent, "id" | "at">;

type OfflineMutationTelemetryStore = {
  seq: number;
  events: OfflineMutationTelemetryEvent[];
};

type OfflineMutationTelemetryGlobal = typeof globalThis & {
  __RIK_OFFLINE_MUTATION_TELEMETRY__?: OfflineMutationTelemetryStore;
};

const MAX_MUTATION_EVENTS = 400;

const getStore = (): OfflineMutationTelemetryStore => {
  const root = globalThis as OfflineMutationTelemetryGlobal;
  if (!root.__RIK_OFFLINE_MUTATION_TELEMETRY__) {
    root.__RIK_OFFLINE_MUTATION_TELEMETRY__ = {
      seq: 0,
      events: [],
    };
  }
  return root.__RIK_OFFLINE_MUTATION_TELEMETRY__;
};

const toObservabilityResult = (action: OfflineMutationTelemetryAction) => {
  switch (action) {
    case "retry_scheduled":
      return "queued_rerun" as const;
    case "retry_deferred":
      return "skipped" as const;
    case "retry_exhausted":
    case "conflict_detected":
    case "failed_non_retryable":
      return "error" as const;
    default:
      return "success" as const;
  }
};

export const recordOfflineMutationEvent = (
  input: OfflineMutationTelemetryInput,
): OfflineMutationTelemetryEvent => {
  const store = getStore();
  store.seq += 1;
  const event: OfflineMutationTelemetryEvent = {
    id: `mut-${store.seq}`,
    at: Date.now(),
    ...input,
  };
  store.events.push(event);
  if (store.events.length > MAX_MUTATION_EVENTS) {
    store.events.splice(0, store.events.length - MAX_MUTATION_EVENTS);
  }

  recordPlatformObservability({
    screen: input.owner === "foreman" ? "foreman" : "contractor",
    surface: "offline_queue",
    category: "ui",
    event: input.action,
    result: toObservabilityResult(input.action),
    trigger: input.triggerSource ?? undefined,
    errorClass: input.errorKind !== "none" ? input.errorKind : undefined,
    extra: {
      entityId: input.entityId,
      mutationId: input.mutationId,
      lifecycleStatus: input.lifecycleStatus,
      retryCount: input.retryCount,
      nextRetryAt: input.nextRetryAt,
      coalescedCount: input.coalescedCount,
      ...(input.extra ?? {}),
    },
  });

  return event;
};

export const getOfflineMutationTelemetryEvents = () => [...getStore().events];

export const resetOfflineMutationTelemetryEvents = () => {
  const store = getStore();
  store.seq = 0;
  store.events.length = 0;
};

export const summarizeOfflineMutationTelemetryEvents = (
  events: OfflineMutationTelemetryEvent[] = getOfflineMutationTelemetryEvents(),
): OfflineMutationTelemetrySummary => {
  const byOwner: Record<string, number> = {};
  const byAction: Record<string, number> = {};
  const latestLifecycleByOwner: Record<string, OfflineMutationLifecycleStatus> = {};
  for (const event of events) {
    byOwner[event.owner] = (byOwner[event.owner] ?? 0) + 1;
    byAction[event.action] = (byAction[event.action] ?? 0) + 1;
    latestLifecycleByOwner[event.owner] = event.lifecycleStatus;
  }
  return {
    totalEvents: events.length,
    byOwner,
    byAction,
    latestLifecycleByOwner,
    conflictCount: events.filter((event) => event.action === "conflict_detected").length,
    retryScheduledCount: events.filter((event) => event.action === "retry_scheduled").length,
    retryExhaustedCount: events.filter((event) => event.action === "retry_exhausted").length,
    dedupeSuppressedCount: events.filter((event) => event.action === "dedupe_suppressed").length,
  };
};

export const toErrorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const toForemanOfflineState = (
  isOnline: boolean | null | undefined,
) => {
  if (isOnline === true) return "online" as const;
  if (isOnline === false) return "offline" as const;
  return "unknown" as const;
};

export const reportForemanPostSubmitCleanupFailure = (params: {
  error: unknown;
  requestId: string;
  draftKey: string;
  triggerSource: ForemanDraftSyncTriggerSource;
}) => {
  recordPlatformObservability({
    screen: "foreman",
    surface: "draft_sync",
    category: "ui",
    event: "post_submit_cleanup_failed_after_server_accept",
    result: "error",
    errorClass: params.error instanceof Error ? params.error.name : undefined,
    errorMessage:
      params.error instanceof Error
        ? params.error.message
        : String(params.error ?? "post_submit_cleanup_failed"),
    extra: {
      owner: "mutation_worker",
      requestId: params.requestId,
      draftKey: params.draftKey,
      triggerSource: params.triggerSource,
      stage: "post_submit_cleanup",
      serverAccepted: true,
    },
  });
};

export const pushForemanMutationStageTelemetry = async (params: {
  stage: ForemanDraftSyncStage;
  result: "progress" | "success" | "retryable_failure" | "terminal_failure";
  draftKey: string;
  requestId: string | null;
  localOnlyDraftKey: boolean;
  attemptNumber: number;
  queueSizeBefore: number | null;
  queueSizeAfter: number | null;
  coalescedCount: number;
  offlineState: "online" | "offline" | "unknown";
  triggerSource: ForemanDraftSyncTriggerSource;
  errorClass?: string | null;
  errorCode?: string | null;
  conflictType?: ForemanDraftConflictType;
  recoveryAction?:
    | "retry_now"
    | "restore_local"
    | "rehydrate_server"
    | "discard_local"
    | "clear_failed_queue"
    | null;
}) => {
  await pushForemanDurableDraftTelemetry({
    stage: params.stage,
    result: params.result,
    draftKey: params.draftKey,
    requestId: params.requestId,
    localOnlyDraftKey: params.localOnlyDraftKey,
    attemptNumber: params.attemptNumber,
    queueSizeBefore: params.queueSizeBefore,
    queueSizeAfter: params.queueSizeAfter,
    coalescedCount: params.coalescedCount,
    conflictType: params.conflictType ?? "none",
    recoveryAction: params.recoveryAction ?? null,
    errorClass: params.errorClass ?? null,
    errorCode: params.errorCode ?? null,
    offlineState: params.offlineState,
    triggerSource: params.triggerSource,
  });

  const queueAction: PlatformOfflineQueueAction =
    params.stage === "hydrate"
      ? "hydrate"
      : params.stage === "enqueue"
        ? params.coalescedCount > 0
          ? "coalesce"
          : "enqueue"
        : params.result === "terminal_failure"
          ? "sync_failed_terminal"
          : params.result === "retryable_failure"
            ? "sync_retry_wait"
            : params.result === "success"
              ? "sync_success"
              : "sync_start";

  const syncStatus: PlatformOfflineSyncStatus =
    params.result === "terminal_failure"
      ? "failed_terminal"
      : params.result === "retryable_failure"
        ? "retry_wait"
        : params.stage === "enqueue"
          ? "queued"
          : params.stage === "flush_start" ||
              params.stage === "prepare_snapshot" ||
              params.stage === "sync_rpc"
            ? "syncing"
            : params.stage === "hydrate"
              ? "dirty_local"
              : params.result === "success"
                ? "synced"
                : "idle";

  const failureClass: PlatformOfflineFailureClass =
    params.result === "terminal_failure"
      ? "failed_terminal"
      : params.result === "retryable_failure"
        ? params.offlineState === "offline"
          ? "offline_wait"
          : "retryable_sync_failure"
        : "none";

  recordPlatformOfflineTelemetry({
    contourKey: "foreman_draft",
    entityKey: params.requestId ?? params.draftKey,
    syncStatus,
    queueAction,
    coalesced: params.coalescedCount > 0,
    retryCount: Math.max(0, params.attemptNumber - 1),
    pendingCount: Math.max(
      0,
      Number(params.queueSizeAfter ?? params.queueSizeBefore ?? 0) || 0,
    ),
    failureClass,
    triggerKind:
      params.triggerSource === "submit" || params.triggerSource === "focus"
        ? "unknown"
        : params.triggerSource,
    networkKnownOffline: params.offlineState === "offline",
    restoredAfterReopen:
      params.stage === "hydrate" && params.result === "success",
    manualRetry: params.triggerSource === "manual_retry",
    durationMs: null,
  });
};

export const trackForemanMutationBacklog = (
  summary: Awaited<ReturnType<typeof getForemanMutationQueueSummary>>,
  event: string,
  extra?: Record<string, unknown>,
) => {
  trackQueueBacklogMetric({
    queue: "foreman_mutation",
    event,
    size: summary.activeCount,
    oldestAgeMs: summary.oldestActiveAgeMs,
    processingCount: summary.inflightCount,
    failedCount:
      summary.failedCount +
      summary.failedNonRetryableCount +
      summary.conflictedCount,
    retryScheduledCount: summary.retryScheduledCount,
    coalescedCount: summary.coalescedCount,
    extra: {
      totalCount: summary.totalCount,
      pendingCount: summary.pendingCount,
      ...extra,
    },
  });
};
