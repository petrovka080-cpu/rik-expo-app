import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import {
  normalizePlatformRetryTriggerSource,
  PLATFORM_OFFLINE_RETRY_TRIGGERS,
  PLATFORM_OFFLINE_SYNC_STATUSES,
  summarizePlatformOfflineOverview,
  type PlatformOfflineContourSummary,
  type PlatformOfflineRetryTriggerSource,
  type PlatformOfflineSyncStatus,
  type PlatformNetworkSnapshot,
} from "../src/lib/offline/platformOffline.model";
import { summarizePlatformOfflineTelemetryEvents } from "../src/lib/offline/platformOffline.observability";

type SummaryArtifact = {
  status?: string;
  [key: string]: unknown;
};

type CheckResult = {
  passed: boolean;
  details: Record<string, unknown>;
};

const artifactDir = path.join(process.cwd(), "artifacts");
const summaryPath = path.join(artifactDir, "platform-offline-wave1.summary.json");
const fullPath = path.join(artifactDir, "platform-offline-wave1.json");

const sharedStatuses: PlatformOfflineSyncStatus[] = [
  ...PLATFORM_OFFLINE_SYNC_STATUSES,
];

const sharedTriggers: PlatformOfflineRetryTriggerSource[] = [
  ...PLATFORM_OFFLINE_RETRY_TRIGGERS,
];

const safeReadJson = <T,>(relativePath: string): T => {
  const absolutePath = path.join(process.cwd(), relativePath);
  return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
};

const safeReadText = (relativePath: string) => readFileSync(path.join(process.cwd(), relativePath), "utf8");

const readSummary = (relativePath: string) => safeReadJson<SummaryArtifact>(relativePath);

const buildNetworkSnapshot = (offlineState: PlatformNetworkSnapshot["offlineState"]): PlatformNetworkSnapshot => ({
  hydrated: true,
  isConnected: offlineState === "unknown" ? null : offlineState === "online",
  isInternetReachable: offlineState === "unknown" ? null : offlineState === "online",
  offlineState,
  networkKnownOffline: offlineState === "offline",
  lastOnlineAt: offlineState === "online" ? Date.now() : null,
  networkRestoredAt: offlineState === "online" ? Date.now() : null,
  appCameOnlineSinceLastOffline: offlineState === "online",
  connectionKind: offlineState === "online" ? "wifi" : null,
  updatedAt: Date.now(),
});

const buildContour = (
  key: string,
  label: string,
  syncStatus: PlatformOfflineSyncStatus,
  pendingCount: number,
): PlatformOfflineContourSummary => ({
  key,
  label,
  syncStatus,
  pendingCount,
  retryCount: syncStatus === "retry_wait" ? 1 : 0,
  lastSyncAt: syncStatus === "synced" ? Date.now() : null,
  lastError: syncStatus === "failed_terminal" ? "failed_terminal" : null,
});

const foremanSummary = readSummary("artifacts/foreman-field-reliability.summary.json");
const warehouseSummary = readSummary("artifacts/warehouse-receive-wave1.summary.json");
const contractorSummary = readSummary("artifacts/contractor-reliability-wave1.summary.json");

const serviceSource = safeReadText("src/lib/offline/platformNetwork.service.ts");
const modelSource = safeReadText("src/lib/offline/platformOffline.model.ts");
const offlineObservabilitySource = safeReadText("src/lib/offline/platformOffline.observability.ts");
const hostSource = safeReadText("src/components/PlatformOfflineStatusHost.tsx");
const rootLayoutSource = safeReadText("app/_layout.tsx");
const warehouseFlowSource = safeReadText("src/screens/warehouse/hooks/useWarehouseReceiveFlow.ts");
const warehouseWorkerSource = safeReadText("src/screens/warehouse/warehouseReceiveWorker.ts");
const contractorFlowSource = safeReadText("src/screens/contractor/hooks/useContractorProgressReliability.ts");
const contractorWorkerSource = safeReadText("src/lib/offline/contractorProgressWorker.ts");
const foremanBoundarySource = safeReadText("src/screens/foreman/hooks/useForemanDraftBoundary.ts");
const foremanWorkerSource = safeReadText("src/lib/offline/mutationWorker.ts");

const vocabularyCheck: CheckResult = {
  passed: sharedStatuses.length === 7 && sharedTriggers.length === 4,
  details: {
    sharedStatuses,
    sharedTriggers,
    constantsExported:
      modelSource.includes("PLATFORM_OFFLINE_SYNC_STATUSES") &&
      modelSource.includes("PLATFORM_OFFLINE_RETRY_TRIGGERS"),
    normalizedLegacyTriggers: {
      bootstrap: normalizePlatformRetryTriggerSource("bootstrap"),
      appActive: normalizePlatformRetryTriggerSource("appActive"),
      networkOnline: normalizePlatformRetryTriggerSource("networkOnline"),
      manual: normalizePlatformRetryTriggerSource("manual"),
    },
  },
};

const networkServiceCheck: CheckResult = {
  passed:
    serviceSource.includes("Network.getNetworkStateAsync") &&
    serviceSource.includes("Network.addNetworkStateListener") &&
    serviceSource.includes("platformNetworkStore") &&
    serviceSource.includes("networkKnownOffline") &&
    serviceSource.includes("appCameOnlineSinceLastOffline"),
  details: {
    sharedServicePresent: true,
    usesExpoNetworkListener: serviceSource.includes("Network.addNetworkStateListener"),
    exposesSnapshotStore: serviceSource.includes("platformNetworkStore"),
    exposesSubscribeApi: serviceSource.includes("subscribePlatformNetwork"),
    networkKnownOfflinePresent: serviceSource.includes("networkKnownOffline"),
    appCameOnlineSinceLastOfflinePresent: serviceSource.includes("appCameOnlineSinceLastOffline"),
  },
};

const foremanCheck: CheckResult = {
  passed:
    foremanSummary.status === "passed" &&
    foremanBoundarySource.includes("ensurePlatformNetworkService") &&
    foremanBoundarySource.includes("subscribePlatformNetwork") &&
    foremanBoundarySource.includes('"manual_retry"') &&
    foremanBoundarySource.includes('"bootstrap_complete"') &&
    foremanWorkerSource.includes("recordPlatformOfflineTelemetry") &&
    !foremanBoundarySource.includes('from "expo-network"'),
  details: {
    reliabilitySummary: foremanSummary.status ?? "missing",
    networkServiceWired: foremanBoundarySource.includes("ensurePlatformNetworkService"),
    sharedSubscriptionWired: foremanBoundarySource.includes("subscribePlatformNetwork"),
    unifiedTriggerVocabulary:
      foremanBoundarySource.includes('"manual_retry"') &&
      foremanBoundarySource.includes('"bootstrap_complete"'),
    sharedOfflineTelemetryWired: foremanWorkerSource.includes("recordPlatformOfflineTelemetry"),
    directExpoNetworkRemoved: !foremanBoundarySource.includes('from "expo-network"'),
  },
};

const warehouseCheck: CheckResult = {
  passed:
    warehouseSummary.status === "passed" &&
    warehouseFlowSource.includes("bootstrap_complete") &&
    warehouseFlowSource.includes("manual_retry") &&
    warehouseFlowSource.includes("ensurePlatformNetworkService") &&
    warehouseFlowSource.includes("subscribePlatformNetwork") &&
    warehouseFlowSource.includes("recordPlatformOfflineTelemetry") &&
    warehouseWorkerSource.includes("recordPlatformOfflineTelemetry") &&
    !warehouseFlowSource.includes('from "expo-network"'),
  details: {
    reliabilitySummary: warehouseSummary.status ?? "missing",
    triggerVocabulary: {
      bootstrap_complete: warehouseFlowSource.includes("bootstrap_complete"),
      network_back: warehouseFlowSource.includes("network_back"),
      app_active: warehouseFlowSource.includes("app_active"),
      manual_retry: warehouseFlowSource.includes("manual_retry"),
    },
    sharedNetworkServiceWired: warehouseFlowSource.includes("ensurePlatformNetworkService"),
    sharedOfflineTelemetryWired:
      warehouseFlowSource.includes("recordPlatformOfflineTelemetry") &&
      warehouseWorkerSource.includes("recordPlatformOfflineTelemetry"),
    directExpoNetworkRemoved: !warehouseFlowSource.includes('from "expo-network"'),
  },
};

const contractorCheck: CheckResult = {
  passed:
    contractorSummary.status === "passed" &&
    contractorFlowSource.includes("bootstrap_complete") &&
    contractorFlowSource.includes("manual_retry") &&
    contractorFlowSource.includes("ensurePlatformNetworkService") &&
    contractorFlowSource.includes("subscribePlatformNetwork") &&
    contractorFlowSource.includes("recordPlatformOfflineTelemetry") &&
    contractorWorkerSource.includes("recordPlatformOfflineTelemetry") &&
    !contractorFlowSource.includes('from "expo-network"'),
  details: {
    reliabilitySummary: contractorSummary.status ?? "missing",
    triggerVocabulary: {
      bootstrap_complete: contractorFlowSource.includes("bootstrap_complete"),
      network_back: contractorFlowSource.includes("network_back"),
      app_active: contractorFlowSource.includes("app_active"),
      manual_retry: contractorFlowSource.includes("manual_retry"),
    },
    sharedNetworkServiceWired: contractorFlowSource.includes("ensurePlatformNetworkService"),
    sharedOfflineTelemetryWired:
      contractorFlowSource.includes("recordPlatformOfflineTelemetry") &&
      contractorWorkerSource.includes("recordPlatformOfflineTelemetry"),
    directExpoNetworkRemoved: !contractorFlowSource.includes('from "expo-network"'),
  },
};

const offlineTelemetrySummary = summarizePlatformOfflineTelemetryEvents([
  {
    id: "evt-1",
    at: Date.now(),
    contourKey: "warehouse_receive",
    entityKey: "incoming-1",
    syncStatus: "queued",
    queueAction: "enqueue",
    coalesced: false,
    retryCount: 0,
    pendingCount: 1,
    failureClass: "none",
    triggerKind: "submit",
    networkKnownOffline: false,
    restoredAfterReopen: false,
    manualRetry: false,
    durationMs: null,
  },
  {
    id: "evt-2",
    at: Date.now(),
    contourKey: "contractor_progress",
    entityKey: "progress-1",
    syncStatus: "retry_wait",
    queueAction: "sync_retry_wait",
    coalesced: false,
    retryCount: 1,
    pendingCount: 1,
    failureClass: "offline_wait",
    triggerKind: "network_back",
    networkKnownOffline: true,
    restoredAfterReopen: false,
    manualRetry: false,
    durationMs: 120,
  },
  {
    id: "evt-3",
    at: Date.now(),
    contourKey: "foreman_draft",
    entityKey: "request-1",
    syncStatus: "synced",
    queueAction: "sync_success",
    coalesced: true,
    retryCount: 1,
    pendingCount: 0,
    failureClass: "none",
    triggerKind: "manual_retry",
    networkKnownOffline: false,
    restoredAfterReopen: true,
    manualRetry: true,
    durationMs: 240,
  },
]);

const offlineTelemetryCheck: CheckResult = {
  passed:
    offlineObservabilitySource.includes("recordPlatformOfflineTelemetry") &&
    offlineTelemetrySummary.alignedContours.length === 3 &&
    offlineTelemetrySummary.retryWaitCount === 1 &&
    offlineTelemetrySummary.manualRetryCount === 1 &&
    offlineTelemetrySummary.restoredAfterReopenCount === 1,
  details: {
    helperPresent: offlineObservabilitySource.includes("recordPlatformOfflineTelemetry"),
    summary: offlineTelemetrySummary,
  },
};

const offlineOverview = summarizePlatformOfflineOverview({
  network: buildNetworkSnapshot("offline"),
  contours: [
    buildContour("foreman", "Прораб", "retry_wait", 1),
    buildContour("warehouse", "Склад", "dirty_local", 0),
  ],
});

const syncingOverview = summarizePlatformOfflineOverview({
  network: buildNetworkSnapshot("online"),
  contours: [
    buildContour("contractor", "Подрядчик", "syncing", 1),
  ],
});

const hostCheck: CheckResult = {
  passed:
    hostSource.includes("summarizePlatformOfflineOverview") &&
    hostSource.includes("usePlatformNetworkStore") &&
    rootLayoutSource.includes("PlatformOfflineStatusHost") &&
    offlineOverview.visible === true &&
    syncingOverview.visible === true,
  details: {
    hostPresent: true,
    rootLayoutWired: rootLayoutSource.includes("PlatformOfflineStatusHost"),
    offlineOverview,
    syncingOverview,
  },
};

const result = {
  status: [
    vocabularyCheck,
    networkServiceCheck,
    foremanCheck,
    warehouseCheck,
    contractorCheck,
    offlineTelemetryCheck,
    hostCheck,
  ].every((check) => check.passed)
    ? "passed"
    : "failed",
  vocabulary: vocabularyCheck,
  network_service: networkServiceCheck,
  foreman_alignment: foremanCheck,
  warehouse_alignment: warehouseCheck,
  contractor_alignment: contractorCheck,
  offline_telemetry: offlineTelemetryCheck,
  global_offline_host: hostCheck,
};

mkdirSync(artifactDir, { recursive: true });
writeFileSync(fullPath, JSON.stringify(result, null, 2));
writeFileSync(
  summaryPath,
  JSON.stringify(
    {
      status: result.status,
      sharedStatuses,
      sharedTriggers,
      foremanAligned: foremanCheck.passed,
      warehouseAligned: warehouseCheck.passed,
      contractorAligned: contractorCheck.passed,
      offlineTelemetryReady: offlineTelemetryCheck.passed,
      globalHostReady: hostCheck.passed,
      networkServiceReady: networkServiceCheck.passed,
      offlineOverviewLabel: offlineOverview.label,
      syncingOverviewLabel: syncingOverview.label,
    },
    null,
    2,
  ),
);

if (result.status !== "passed") {
  process.exitCode = 1;
}
