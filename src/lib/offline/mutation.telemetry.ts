import { recordPlatformObservability } from "../observability/platformObservability";
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
