export type PlatformOfflineSyncStatus =
  | "idle"
  | "dirty_local"
  | "queued"
  | "syncing"
  | "synced"
  | "retry_wait"
  | "failed_terminal";

export type PlatformOfflineRetryTriggerSource =
  | "bootstrap_complete"
  | "app_active"
  | "network_back"
  | "manual_retry";

export const PLATFORM_OFFLINE_SYNC_STATUSES: PlatformOfflineSyncStatus[] = [
  "idle",
  "dirty_local",
  "queued",
  "syncing",
  "synced",
  "retry_wait",
  "failed_terminal",
];

export const PLATFORM_OFFLINE_RETRY_TRIGGERS: PlatformOfflineRetryTriggerSource[] = [
  "bootstrap_complete",
  "app_active",
  "network_back",
  "manual_retry",
];

export type PlatformOfflineStateKind = "online" | "offline" | "unknown";

export type PlatformConnectionKind = string | null;

export type PlatformNetworkSnapshot = {
  hydrated: boolean;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  offlineState: PlatformOfflineStateKind;
  networkKnownOffline: boolean;
  lastOnlineAt: number | null;
  networkRestoredAt: number | null;
  appCameOnlineSinceLastOffline: boolean;
  connectionKind: PlatformConnectionKind;
  updatedAt: number | null;
};

export type PlatformOfflineContourSummary = {
  key: string;
  label: string;
  syncStatus: PlatformOfflineSyncStatus;
  pendingCount: number;
  retryCount: number;
  lastSyncAt: number | null;
  lastError: string | null;
};

export type PlatformOfflineOverview = {
  visible: boolean;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
  label: string;
  detail: string | null;
  unsyncedContours: number;
  syncingContours: number;
  retryContours: number;
  failedContours: number;
  offlineContours: number;
};

const trim = (value: unknown) => String(value ?? "").trim();

const formatStatusLabel = (status: PlatformOfflineSyncStatus) => {
  switch (status) {
    case "dirty_local":
      return "\u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e";
    case "queued":
      return "\u0432 \u043e\u0447\u0435\u0440\u0435\u0434\u0438";
    case "syncing":
      return "\u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0430\u0446\u0438\u044f";
    case "synced":
      return "\u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043d\u043e";
    case "retry_wait":
      return "\u0436\u0434\u0435\u0442 \u043f\u043e\u0432\u0442\u043e\u0440";
    case "failed_terminal":
      return "\u043d\u0443\u0436\u043d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430";
    case "idle":
    default:
      return "\u0433\u043e\u0442\u043e\u0432\u043e";
  }
};

const syncStatusPriority: Record<PlatformOfflineSyncStatus, number> = {
  failed_terminal: 6,
  retry_wait: 5,
  syncing: 4,
  queued: 3,
  dirty_local: 2,
  synced: 1,
  idle: 0,
};

export const normalizePlatformOfflineState = (params: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}): PlatformOfflineStateKind => {
  if (params.isInternetReachable === true || (params.isInternetReachable == null && params.isConnected === true)) {
    return "online";
  }
  if (params.isInternetReachable === false || params.isConnected === false) {
    return "offline";
  }
  return "unknown";
};

export const selectPlatformOnlineFlag = (snapshot: PlatformNetworkSnapshot): boolean | null => {
  if (snapshot.offlineState === "online") return true;
  if (snapshot.offlineState === "offline") return false;
  return null;
};

export const selectPlatformNetworkKnownOffline = (snapshot: PlatformNetworkSnapshot) =>
  snapshot.networkKnownOffline || snapshot.offlineState === "offline";

export const isPlatformUnsyncedStatus = (status: PlatformOfflineSyncStatus) =>
  status === "dirty_local" ||
  status === "queued" ||
  status === "syncing" ||
  status === "retry_wait" ||
  status === "failed_terminal";

export const pickDominantPlatformSyncStatus = (
  statuses: PlatformOfflineSyncStatus[],
): PlatformOfflineSyncStatus =>
  statuses.length
    ? [...statuses].sort((left, right) => syncStatusPriority[right] - syncStatusPriority[left])[0]
    : "idle";

export const normalizePlatformRetryTriggerSource = (
  value: string | null | undefined,
): PlatformOfflineRetryTriggerSource | null => {
  const key = trim(value).toLowerCase();
  if (!key) return null;
  if (key === "bootstrap" || key === "bootstrap_complete") return "bootstrap_complete";
  if (key === "appactive" || key === "app_active") return "app_active";
  if (key === "networkonline" || key === "network_back") return "network_back";
  if (key === "manual" || key === "manual_retry") return "manual_retry";
  return null;
};

export const summarizePlatformOfflineOverview = (params: {
  network: PlatformNetworkSnapshot;
  contours: PlatformOfflineContourSummary[];
}): PlatformOfflineOverview => {
  const activeContours = params.contours.filter(
    (contour) => contour.pendingCount > 0 || isPlatformUnsyncedStatus(contour.syncStatus),
  );
  const syncingContours = activeContours.filter((contour) => contour.syncStatus === "syncing").length;
  const retryContours = activeContours.filter((contour) => contour.syncStatus === "retry_wait").length;
  const failedContours = activeContours.filter((contour) => contour.syncStatus === "failed_terminal").length;
  const unsyncedContours = activeContours.length;
  const offlineContours = params.network.offlineState === "offline" ? activeContours.length : 0;

  if (!unsyncedContours && params.network.offlineState !== "offline") {
    return {
      visible: false,
      tone: "neutral",
      label: "",
      detail: null,
      unsyncedContours: 0,
      syncingContours: 0,
      retryContours: 0,
      failedContours: 0,
      offlineContours: 0,
    };
  }

  const contourLabels = activeContours
    .slice(0, 3)
    .map((contour) => `${contour.label}: ${formatStatusLabel(contour.syncStatus)}`);
  const remainingCount = Math.max(0, activeContours.length - contourLabels.length);
  const detailBase = contourLabels.join(" \u2022 ");
  const detail = remainingCount > 0 ? `${detailBase} \u2022 +${remainingCount}` : detailBase || null;

  if (params.network.offlineState === "offline") {
    return {
      visible: true,
      tone: retryContours > 0 || failedContours > 0 ? "danger" : "warning",
      label: "\u041d\u0435\u0442 \u0441\u0432\u044f\u0437\u0438",
      detail:
        unsyncedContours > 0
          ? `\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e. ${detail ?? ""}`.trim()
          : "\u041e\u0436\u0438\u0434\u0430\u0435\u043c \u0432\u043e\u0437\u0432\u0440\u0430\u0442 \u0441\u0435\u0442\u0438.",
      unsyncedContours,
      syncingContours,
      retryContours,
      failedContours,
      offlineContours,
    };
  }

  if (failedContours > 0) {
    return {
      visible: true,
      tone: "danger",
      label: "\u041d\u0443\u0436\u043d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430",
      detail: detail ?? "\u0415\u0441\u0442\u044c \u043d\u0435\u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0435 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f.",
      unsyncedContours,
      syncingContours,
      retryContours,
      failedContours,
      offlineContours,
    };
  }

  if (retryContours > 0) {
    return {
      visible: true,
      tone: "warning",
      label: "\u041e\u0436\u0438\u0434\u0430\u0435\u0442 \u043f\u043e\u0432\u0442\u043e\u0440\u0430",
      detail: detail ?? "\u0421\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0430\u0446\u0438\u044f \u0431\u0443\u0434\u0435\u0442 \u043f\u043e\u0432\u0442\u043e\u0440\u0435\u043d\u0430.",
      unsyncedContours,
      syncingContours,
      retryContours,
      failedContours,
      offlineContours,
    };
  }

  if (syncingContours > 0) {
    return {
      visible: true,
      tone: "info",
      label: "\u0421\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0430\u0446\u0438\u044f",
      detail: detail ?? "\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u043c \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u043d\u0430 \u0441\u0435\u0440\u0432\u0435\u0440.",
      unsyncedContours,
      syncingContours,
      retryContours,
      failedContours,
      offlineContours,
    };
  }

  return {
    visible: true,
    tone: "warning",
    label: "\u0415\u0441\u0442\u044c \u043d\u0435\u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0435 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f",
    detail: detail ?? "\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b \u0438 \u0431\u0443\u0434\u0443\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u044b \u043f\u043e\u0437\u0436\u0435.",
    unsyncedContours,
    syncingContours,
    retryContours,
    failedContours,
    offlineContours,
  };
};
