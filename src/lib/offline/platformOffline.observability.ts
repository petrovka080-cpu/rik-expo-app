import type {
  PlatformOfflineRetryTriggerSource,
  PlatformOfflineSyncStatus,
} from "./platformOffline.model";

export type PlatformOfflineContourKey =
  | "platform_network"
  | "foreman_draft"
  | "warehouse_receive"
  | "contractor_progress";

export type PlatformOfflineQueueAction =
  | "network_state"
  | "hydrate"
  | "enqueue"
  | "coalesce"
  | "reset_inflight"
  | "sync_start"
  | "sync_success"
  | "sync_retry_wait"
  | "sync_failed_terminal"
  | "manual_retry";

export type PlatformOfflineFailureClass =
  | "none"
  | "offline_wait"
  | "retryable_sync_failure"
  | "failed_terminal";

export type PlatformOfflineTelemetryEvent = {
  id: string;
  at: number;
  contourKey: PlatformOfflineContourKey;
  entityKey: string | null;
  syncStatus: PlatformOfflineSyncStatus;
  queueAction: PlatformOfflineQueueAction;
  coalesced: boolean;
  retryCount: number;
  pendingCount: number;
  failureClass: PlatformOfflineFailureClass;
  triggerKind: PlatformOfflineRetryTriggerSource | "submit" | "system" | "unknown";
  networkKnownOffline: boolean;
  restoredAfterReopen: boolean;
  manualRetry: boolean;
  durationMs: number | null;
};

export type PlatformOfflineTelemetrySummary = {
  totalEvents: number;
  alignedContours: PlatformOfflineContourKey[];
  retryWaitCount: number;
  terminalFailureCount: number;
  manualRetryCount: number;
  networkShortCircuitCount: number;
  restoredAfterReopenCount: number;
  successfulRecoveryCount: number;
  contourLatestStatus: Record<string, PlatformOfflineSyncStatus>;
};

type PlatformOfflineTelemetryInput = Omit<PlatformOfflineTelemetryEvent, "id" | "at">;

type PlatformOfflineTelemetryStore = {
  seq: number;
  events: PlatformOfflineTelemetryEvent[];
};

type PlatformOfflineTelemetryGlobal = typeof globalThis & {
  __RIK_PLATFORM_OFFLINE_OBSERVABILITY__?: PlatformOfflineTelemetryStore;
};

const MAX_PLATFORM_OFFLINE_EVENTS = 240;

const getStore = (): PlatformOfflineTelemetryStore => {
  const root = globalThis as PlatformOfflineTelemetryGlobal;
  if (!root.__RIK_PLATFORM_OFFLINE_OBSERVABILITY__) {
    root.__RIK_PLATFORM_OFFLINE_OBSERVABILITY__ = {
      seq: 0,
      events: [],
    };
  }
  return root.__RIK_PLATFORM_OFFLINE_OBSERVABILITY__;
};

export const recordPlatformOfflineTelemetry = (
  input: PlatformOfflineTelemetryInput,
): PlatformOfflineTelemetryEvent => {
  const store = getStore();
  store.seq += 1;
  const event: PlatformOfflineTelemetryEvent = {
    id: `off-${store.seq}`,
    at: Date.now(),
    ...input,
  };
  store.events.push(event);
  if (store.events.length > MAX_PLATFORM_OFFLINE_EVENTS) {
    store.events.splice(0, store.events.length - MAX_PLATFORM_OFFLINE_EVENTS);
  }
  return event;
};

export const getPlatformOfflineTelemetryEvents = (): PlatformOfflineTelemetryEvent[] => [
  ...getStore().events,
];

export const resetPlatformOfflineTelemetryEvents = () => {
  const store = getStore();
  store.seq = 0;
  store.events.length = 0;
};

export const summarizePlatformOfflineTelemetryEvents = (
  events: PlatformOfflineTelemetryEvent[] = getPlatformOfflineTelemetryEvents(),
): PlatformOfflineTelemetrySummary => {
  const contourLatestStatus: Record<string, PlatformOfflineSyncStatus> = {};
  const alignedContours = new Set<PlatformOfflineContourKey>();

  for (const event of events) {
    alignedContours.add(event.contourKey);
    contourLatestStatus[event.contourKey] = event.syncStatus;
  }

  return {
    totalEvents: events.length,
    alignedContours: [...alignedContours.values()],
    retryWaitCount: events.filter((event) => event.syncStatus === "retry_wait").length,
    terminalFailureCount: events.filter((event) => event.syncStatus === "failed_terminal").length,
    manualRetryCount: events.filter((event) => event.manualRetry).length,
    networkShortCircuitCount: events.filter(
      (event) => event.networkKnownOffline && event.queueAction === "sync_retry_wait",
    ).length,
    restoredAfterReopenCount: events.filter((event) => event.restoredAfterReopen).length,
    successfulRecoveryCount: events.filter(
      (event) =>
        event.queueAction === "sync_success" &&
        (event.triggerKind === "network_back" ||
          event.triggerKind === "app_active" ||
          event.triggerKind === "bootstrap_complete" ||
          event.manualRetry ||
          event.restoredAfterReopen),
    ).length,
    contourLatestStatus,
  };
};
