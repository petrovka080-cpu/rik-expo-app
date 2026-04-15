/**
 * Session Boundary — focused lifecycle tests.
 *
 * WAVE H: Verifies that resetSessionBoundary calls ALL registered cleaners.
 */

import { resetSessionBoundary } from "./sessionBoundary";

const mockClearDocumentSessions = jest.fn();
const mockClearCurrentSessionRoleCache = jest.fn();
const mockClearPdfRunnerSessionState = jest.fn();
const mockClearOfficeHubBootstrapSnapshot = jest.fn();
const mockResetOfflineReplayCoordinator = jest.fn();
const mockClearRealtimeSessionState = jest.fn();
const mockResetQueryCache = jest.fn();
const mockClearCachedDraftRequestId = jest.fn();
const mockClearLocalDraftId = jest.fn();
const mockInvalidateRequestsReadCapabilitiesCache = jest.fn();
const mockClearAppCache = jest.fn();
const mockRecordPlatformObservability = jest.fn();

jest.mock("../documents/pdfDocumentSessions", () => ({
  clearDocumentSessions: (...args: unknown[]) =>
    mockClearDocumentSessions(...args),
}));

jest.mock("../pdfRunner", () => ({
  clearPdfRunnerSessionState: (...args: unknown[]) =>
    mockClearPdfRunnerSessionState(...args),
}));

jest.mock("../sessionRole", () => ({
  clearCurrentSessionRoleCache: (...args: unknown[]) =>
    mockClearCurrentSessionRoleCache(...args),
}));

jest.mock("../realtime/realtime.client", () => ({
  clearRealtimeSessionState: (...args: unknown[]) =>
    mockClearRealtimeSessionState(...args),
}));

jest.mock("../offline/offlineReplayCoordinator", () => ({
  resetOfflineReplayCoordinator: (...args: unknown[]) =>
    mockResetOfflineReplayCoordinator(...args),
}));

jest.mock("../query/queryClient", () => ({
  resetQueryCache: (...args: unknown[]) =>
    mockResetQueryCache(...args),
}));

jest.mock("../../screens/office/officeHubBootstrapSnapshot", () => ({
  clearOfficeHubBootstrapSnapshot: (...args: unknown[]) =>
    mockClearOfficeHubBootstrapSnapshot(...args),
}));

jest.mock("../api/requests", () => ({
  clearCachedDraftRequestId: (...args: unknown[]) =>
    mockClearCachedDraftRequestId(...args),
}));

jest.mock("../api/requests.read-capabilities", () => ({
  invalidateRequestsReadCapabilitiesCache: (...args: unknown[]) =>
    mockInvalidateRequestsReadCapabilitiesCache(...args),
}));

jest.mock("../catalog/catalog.request.service", () => ({
  clearLocalDraftId: (...args: unknown[]) =>
    mockClearLocalDraftId(...args),
}));

jest.mock("../cache/clearAppCache", () => ({
  clearAppCache: (...args: unknown[]) =>
    mockClearAppCache(...args),
}));

jest.mock("../observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) =>
    mockRecordPlatformObservability(...args),
}));

describe("resetSessionBoundary", () => {
  beforeEach(() => {
    mockClearDocumentSessions.mockReset();
    mockClearCurrentSessionRoleCache.mockReset();
    mockClearPdfRunnerSessionState.mockReset();
    mockClearOfficeHubBootstrapSnapshot.mockReset();
    mockResetOfflineReplayCoordinator.mockReset();
    mockClearRealtimeSessionState.mockReset();
    mockResetQueryCache.mockReset();
    mockClearCachedDraftRequestId.mockReset();
    mockClearLocalDraftId.mockReset();
    mockInvalidateRequestsReadCapabilitiesCache.mockReset();
    mockClearAppCache.mockReset().mockResolvedValue(undefined);
    mockRecordPlatformObservability.mockReset();
  });

  it("calls all registered session cleaners on terminal_sign_out", async () => {
    await resetSessionBoundary("terminal_sign_out");

    expect(mockClearDocumentSessions).toHaveBeenCalledTimes(1);
    expect(mockClearCurrentSessionRoleCache).toHaveBeenCalledTimes(1);
    expect(mockClearPdfRunnerSessionState).toHaveBeenCalledTimes(1);
    expect(mockClearOfficeHubBootstrapSnapshot).toHaveBeenCalledTimes(1);
    expect(mockResetOfflineReplayCoordinator).toHaveBeenCalledTimes(1);
    expect(mockClearRealtimeSessionState).toHaveBeenCalledTimes(1);
    expect(mockResetQueryCache).toHaveBeenCalledTimes(1);
    expect(mockClearCachedDraftRequestId).toHaveBeenCalledTimes(1);
    expect(mockClearLocalDraftId).toHaveBeenCalledTimes(1);
    expect(mockInvalidateRequestsReadCapabilitiesCache).toHaveBeenCalledTimes(1);
    expect(mockClearAppCache).toHaveBeenCalledWith({
      mode: "session",
      owner: "session_boundary:terminal_sign_out",
    });
  });

  it("calls all registered session cleaners on bootstrap_no_session", async () => {
    await resetSessionBoundary("bootstrap_no_session");

    expect(mockClearDocumentSessions).toHaveBeenCalledTimes(1);
    expect(mockClearCachedDraftRequestId).toHaveBeenCalledTimes(1);
    expect(mockClearLocalDraftId).toHaveBeenCalledTimes(1);
    expect(mockInvalidateRequestsReadCapabilitiesCache).toHaveBeenCalledTimes(1);
    expect(mockClearAppCache).toHaveBeenCalledWith({
      mode: "session",
      owner: "session_boundary:bootstrap_no_session",
    });
  });

  it("does not throw when clearAppCache fails", async () => {
    mockClearAppCache.mockRejectedValue(new Error("purge failed"));

    await expect(
      resetSessionBoundary("terminal_sign_out"),
    ).resolves.toBeUndefined();

    // Other cleaners still called
    expect(mockClearDocumentSessions).toHaveBeenCalledTimes(1);
    expect(mockClearCachedDraftRequestId).toHaveBeenCalledTimes(1);

    // Error was observed
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "session_cache_purge_failed",
        result: "error",
        errorStage: "clear_app_cache",
        extra: expect.objectContaining({
          owner: "session_boundary",
          reason: "terminal_sign_out",
        }),
      }),
    );
  });

  it("passes through reason to clearAppCache owner tag", async () => {
    await resetSessionBoundary("custom_reason");

    expect(mockClearAppCache).toHaveBeenCalledWith({
      mode: "session",
      owner: "session_boundary:custom_reason",
    });
  });
});
