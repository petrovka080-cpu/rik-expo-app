/**
 * P6.3d — Global foreman contour + banner derivation tests.
 *
 * Validates that the global banner correctly handles stale durable
 * metadata when the draft snapshot is null (terminal request).
 */
import {
  summarizePlatformOfflineOverview,
  isPlatformUnsyncedStatus,
  type PlatformOfflineContourSummary,
  type PlatformNetworkSnapshot,
} from "../lib/offline/platformOffline.model";

const onlineNetwork: PlatformNetworkSnapshot = {
  hydrated: true,
  isConnected: true,
  isInternetReachable: true,
  offlineState: "online",
  networkKnownOffline: false,
  lastOnlineAt: Date.now(),
  networkRestoredAt: null,
  appCameOnlineSinceLastOffline: false,
  connectionKind: "wifi",
  updatedAt: Date.now(),
};

/**
 * Simulates buildForemanContour with snapshot guard (P6.3d logic).
 */
const buildForemanContourWithGuard = (params: {
  hasActiveSnapshot: boolean;
  syncStatus: PlatformOfflineContourSummary["syncStatus"];
  pendingCount: number;
  retryCount: number;
  lastError: string | null;
}): PlatformOfflineContourSummary => ({
  key: "foreman_draft",
  label: "Прораб",
  syncStatus: params.hasActiveSnapshot ? params.syncStatus : "idle",
  pendingCount: params.hasActiveSnapshot ? params.pendingCount : 0,
  retryCount: params.hasActiveSnapshot ? params.retryCount : 0,
  lastSyncAt: null,
  lastError: params.hasActiveSnapshot ? params.lastError : null,
});

const idleWarehouse: PlatformOfflineContourSummary = {
  key: "warehouse_receive",
  label: "Склад",
  syncStatus: "idle",
  pendingCount: 0,
  retryCount: 0,
  lastSyncAt: null,
  lastError: null,
};

const idleContractor: PlatformOfflineContourSummary = {
  key: "contractor_progress",
  label: "Подрядчик",
  syncStatus: "idle",
  pendingCount: 0,
  retryCount: 0,
  lastSyncAt: null,
  lastError: null,
};

describe("P6.3d — global foreman contour snapshot guard", () => {
  it("terminal request excluded from global foreman contour (snapshot null + stale durable flags)", () => {
    const foremanContour = buildForemanContourWithGuard({
      hasActiveSnapshot: false,
      syncStatus: "failed_terminal",
      pendingCount: 3,
      retryCount: 2,
      lastError: "some error",
    });

    // With guard applied, contour should report idle
    expect(foremanContour.syncStatus).toBe("idle");
    expect(foremanContour.pendingCount).toBe(0);
    expect(foremanContour.retryCount).toBe(0);
    expect(foremanContour.lastError).toBeNull();
    expect(isPlatformUnsyncedStatus(foremanContour.syncStatus)).toBe(false);
  });

  it("snapshot null + stale durable flags does not render banner", () => {
    const foremanContour = buildForemanContourWithGuard({
      hasActiveSnapshot: false,
      syncStatus: "retry_wait",
      pendingCount: 1,
      retryCount: 5,
      lastError: "network timeout",
    });

    const overview = summarizePlatformOfflineOverview({
      network: onlineNetwork,
      contours: [foremanContour, idleWarehouse, idleContractor],
    });

    expect(overview.visible).toBe(false);
  });

  it("terminal request does not render draft card", () => {
    const foremanContour = buildForemanContourWithGuard({
      hasActiveSnapshot: false,
      syncStatus: "queued",
      pendingCount: 2,
      retryCount: 0,
      lastError: null,
    });

    const overview = summarizePlatformOfflineOverview({
      network: onlineNetwork,
      contours: [foremanContour, idleWarehouse, idleContractor],
    });

    expect(overview.visible).toBe(false);
    expect(overview.unsyncedContours).toBe(0);
  });

  it("real offline pending request still renders warning banner", () => {
    const foremanContour = buildForemanContourWithGuard({
      hasActiveSnapshot: true,
      syncStatus: "queued",
      pendingCount: 2,
      retryCount: 0,
      lastError: null,
    });

    const overview = summarizePlatformOfflineOverview({
      network: onlineNetwork,
      contours: [foremanContour, idleWarehouse, idleContractor],
    });

    expect(overview.visible).toBe(true);
    expect(overview.unsyncedContours).toBe(1);
  });

  it("attention/retry state remains for actual unresolved local sync", () => {
    const foremanContour = buildForemanContourWithGuard({
      hasActiveSnapshot: true,
      syncStatus: "failed_terminal",
      pendingCount: 1,
      retryCount: 3,
      lastError: "sync error",
    });

    const overview = summarizePlatformOfflineOverview({
      network: onlineNetwork,
      contours: [foremanContour, idleWarehouse, idleContractor],
    });

    expect(overview.visible).toBe(true);
    expect(overview.tone).toBe("danger");
    expect(overview.failedContours).toBe(1);
  });
});
