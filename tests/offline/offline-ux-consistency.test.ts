/**
 * Offline UX consistency tests.
 *
 * WAVE R: Validates the offline state machine and UX overview
 * produce consistent, predictable results for all state combinations.
 */

import {
  normalizePlatformOfflineState,
  summarizePlatformOfflineOverview,
  isPlatformUnsyncedStatus,
  pickDominantPlatformSyncStatus,
  normalizePlatformRetryTriggerSource,
  PLATFORM_OFFLINE_SYNC_STATUSES,
  PLATFORM_OFFLINE_RETRY_TRIGGERS,
  type PlatformNetworkSnapshot,
  type PlatformOfflineContourSummary,
} from "../../src/lib/offline/platformOffline.model";

const makeNetwork = (
  partial: Partial<PlatformNetworkSnapshot> = {},
): PlatformNetworkSnapshot => ({
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
  ...partial,
});

const makeContour = (
  partial: Partial<PlatformOfflineContourSummary> = {},
): PlatformOfflineContourSummary => ({
  key: "test",
  label: "Test",
  syncStatus: "idle",
  pendingCount: 0,
  retryCount: 0,
  lastSyncAt: null,
  lastError: null,
  ...partial,
});

describe("offline state normalization", () => {
  it("connected + reachable → online", () => {
    expect(normalizePlatformOfflineState({
      isConnected: true,
      isInternetReachable: true,
    })).toBe("online");
  });

  it("connected + unknown reachable → online", () => {
    expect(normalizePlatformOfflineState({
      isConnected: true,
      isInternetReachable: null,
    })).toBe("online");
  });

  it("disconnected → offline", () => {
    expect(normalizePlatformOfflineState({
      isConnected: false,
      isInternetReachable: null,
    })).toBe("offline");
  });

  it("connected + not reachable → offline", () => {
    expect(normalizePlatformOfflineState({
      isConnected: true,
      isInternetReachable: false,
    })).toBe("offline");
  });

  it("null + null → unknown", () => {
    expect(normalizePlatformOfflineState({
      isConnected: null,
      isInternetReachable: null,
    })).toBe("unknown");
  });
});

describe("offline UX overview consistency", () => {
  it("online + no contours → not visible", () => {
    const result = summarizePlatformOfflineOverview({
      network: makeNetwork(),
      contours: [],
    });
    expect(result.visible).toBe(false);
    expect(result.tone).toBe("neutral");
  });

  it("online + idle contours → not visible", () => {
    const result = summarizePlatformOfflineOverview({
      network: makeNetwork(),
      contours: [makeContour({ syncStatus: "idle", pendingCount: 0 })],
    });
    expect(result.visible).toBe(false);
  });

  it("offline + no pending → visible + warning", () => {
    const result = summarizePlatformOfflineOverview({
      network: makeNetwork({ offlineState: "offline", networkKnownOffline: true }),
      contours: [],
    });
    // Even with 0 contours, offline state shows banner
    // (The model returns not visible when no contours and no offline)
    // But when offline + 0 contours, the function returns visible=false per line 165
    // Actually let me check: line 165 says !unsyncedContours && offlineState !== "offline"
    // So offline + 0 contours → the condition is !0 && false → false → falls through
    // Then line 186: offlineState === "offline" → visible: true 
    expect(result.visible).toBe(true);
    expect(result.tone).toBe("warning");
  });

  it("offline + unsynced → visible + warning/danger", () => {
    const result = summarizePlatformOfflineOverview({
      network: makeNetwork({ offlineState: "offline", networkKnownOffline: true }),
      contours: [makeContour({ syncStatus: "dirty_local", pendingCount: 1 })],
    });
    expect(result.visible).toBe(true);
    expect(["warning", "danger"]).toContain(result.tone);
  });

  it("online + failed_terminal → visible + danger", () => {
    const result = summarizePlatformOfflineOverview({
      network: makeNetwork(),
      contours: [makeContour({ syncStatus: "failed_terminal", pendingCount: 1 })],
    });
    expect(result.visible).toBe(true);
    expect(result.tone).toBe("danger");
  });

  it("online + syncing → visible + info", () => {
    const result = summarizePlatformOfflineOverview({
      network: makeNetwork(),
      contours: [makeContour({ syncStatus: "syncing", pendingCount: 1 })],
    });
    expect(result.visible).toBe(true);
    expect(result.tone).toBe("info");
  });

  it("online + retry_wait → visible + warning", () => {
    const result = summarizePlatformOfflineOverview({
      network: makeNetwork(),
      contours: [makeContour({ syncStatus: "retry_wait", pendingCount: 1 })],
    });
    expect(result.visible).toBe(true);
    expect(result.tone).toBe("warning");
  });

  it("label is non-empty when visible", () => {
    const result = summarizePlatformOfflineOverview({
      network: makeNetwork({ offlineState: "offline", networkKnownOffline: true }),
      contours: [makeContour({ syncStatus: "queued", pendingCount: 2 })],
    });
    expect(result.visible).toBe(true);
    expect(result.label.length).toBeGreaterThan(0);
  });
});

describe("sync status helpers", () => {
  it("isPlatformUnsyncedStatus is true for non-idle/synced statuses", () => {
    expect(isPlatformUnsyncedStatus("dirty_local")).toBe(true);
    expect(isPlatformUnsyncedStatus("queued")).toBe(true);
    expect(isPlatformUnsyncedStatus("syncing")).toBe(true);
    expect(isPlatformUnsyncedStatus("retry_wait")).toBe(true);
    expect(isPlatformUnsyncedStatus("failed_terminal")).toBe(true);
  });

  it("isPlatformUnsyncedStatus is false for idle and synced", () => {
    expect(isPlatformUnsyncedStatus("idle")).toBe(false);
    expect(isPlatformUnsyncedStatus("synced")).toBe(false);
  });

  it("pickDominantPlatformSyncStatus returns highest priority", () => {
    expect(pickDominantPlatformSyncStatus(["idle", "failed_terminal", "syncing"]))
      .toBe("failed_terminal");
    expect(pickDominantPlatformSyncStatus(["idle", "syncing"]))
      .toBe("syncing");
    expect(pickDominantPlatformSyncStatus([]))
      .toBe("idle");
  });

  it("all sync statuses are defined in PLATFORM_OFFLINE_SYNC_STATUSES", () => {
    expect(PLATFORM_OFFLINE_SYNC_STATUSES).toHaveLength(7);
  });

  it("all retry triggers are defined in PLATFORM_OFFLINE_RETRY_TRIGGERS", () => {
    expect(PLATFORM_OFFLINE_RETRY_TRIGGERS).toHaveLength(4);
  });
});

describe("retry trigger normalization", () => {
  it("normalizes known triggers", () => {
    expect(normalizePlatformRetryTriggerSource("bootstrap_complete")).toBe("bootstrap_complete");
    expect(normalizePlatformRetryTriggerSource("app_active")).toBe("app_active");
    expect(normalizePlatformRetryTriggerSource("network_back")).toBe("network_back");
    expect(normalizePlatformRetryTriggerSource("manual_retry")).toBe("manual_retry");
  });

  it("normalizes aliases", () => {
    expect(normalizePlatformRetryTriggerSource("bootstrap")).toBe("bootstrap_complete");
    expect(normalizePlatformRetryTriggerSource("manual")).toBe("manual_retry");
  });

  it("returns null for unknown values", () => {
    expect(normalizePlatformRetryTriggerSource("")).toBeNull();
    expect(normalizePlatformRetryTriggerSource(null)).toBeNull();
    expect(normalizePlatformRetryTriggerSource("garbage")).toBeNull();
  });
});
