/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * NAV-P0 regression: Auth listener lifecycle.
 *
 * Verifies that supabase.auth.onAuthStateChange listener is subscribed
 * exactly once during the lifetime of RootLayout, regardless of how
 * many times useSegments() changes.
 *
 * The P0 bug was: `segments` was in the init effect dependency array,
 * so every navigation change triggered cleanup (unsubscribe) then
 * re-ran the effect (which returned early via initStartedRef guard),
 * leaving the auth listener permanently dead.
 *
 * After the fix, segments is NOT a dependency, so the listener survives.
 */
import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import RootLayout from "../../app/_layout";

const mockReplace = jest.fn();
const mockGetSessionSafe = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockUseSegments = jest.fn();
const mockUsePathname = jest.fn();
const mockClearAppCache = jest.fn();
const mockClearDocumentSessions = jest.fn();
const mockClearCurrentSessionRoleCache = jest.fn();
const mockClearPdfRunnerSessionState = jest.fn();
const mockResetOfflineReplayCoordinator = jest.fn();
const mockClearOfficeHubBootstrapSnapshot = jest.fn();
const mockWarmCurrentSessionProfile = jest.fn();
const mockEnsureQueueWorker = jest.fn();
const mockStopQueueWorker = jest.fn();
const mockRecordPlatformObservability = jest.fn();
const mockClearCachedDraftRequestId = jest.fn();
const mockClearLocalDraftId = jest.fn();
const mockInvalidateRequestsReadCapabilitiesCache = jest.fn();
const mockResetQueryCache = jest.fn();

// ─── Mocks (same as rootLayout.recovery.test.tsx) ────────────────

jest.mock("../../src/lib/runtime/installWeakRefPolyfill", () => ({}));

jest.mock("expo-router", () => ({
  Stack: () => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, { testID: "root-stack" }, "stack");
  },
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  useSegments: (...args: unknown[]) => mockUseSegments(...args),
  usePathname: (...args: unknown[]) => mockUsePathname(...args),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-native-portalize", () => ({
  Host: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../src/ui/GlobalBusy", () => ({
  GlobalBusyProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../src/components/PlatformOfflineStatusHost", () => () => null);

jest.mock("../../src/lib/cache/clearAppCache", () => ({
  clearAppCache: (...args: unknown[]) => mockClearAppCache(...args),
}));

jest.mock("../../src/lib/supabaseClient", () => ({
  getSessionSafe: (...args: unknown[]) => mockGetSessionSafe(...args),
  supabase: {
    auth: {
      onAuthStateChange: (...args: unknown[]) =>
        mockOnAuthStateChange(...args),
    },
  },
}));

jest.mock("../../src/lib/documents/pdfDocumentSessions", () => ({
  clearDocumentSessions: (...args: unknown[]) =>
    mockClearDocumentSessions(...args),
}));

jest.mock("../../src/lib/pdfRunner", () => ({
  clearPdfRunnerSessionState: (...args: unknown[]) =>
    mockClearPdfRunnerSessionState(...args),
}));

jest.mock("../../src/lib/offline/offlineReplayCoordinator", () => ({
  resetOfflineReplayCoordinator: (...args: unknown[]) =>
    mockResetOfflineReplayCoordinator(...args),
}));

jest.mock("../../src/lib/sessionRole", () => ({
  clearCurrentSessionRoleCache: (...args: unknown[]) =>
    mockClearCurrentSessionRoleCache(...args),
  warmCurrentSessionProfile: (...args: unknown[]) =>
    mockWarmCurrentSessionProfile(...args),
}));

jest.mock("../../src/screens/office/officeHubBootstrapSnapshot", () => ({
  clearOfficeHubBootstrapSnapshot: (...args: unknown[]) =>
    mockClearOfficeHubBootstrapSnapshot(...args),
}));

jest.mock("../../src/workers/queueBootstrap", () => ({
  ensureQueueWorker: (...args: unknown[]) => mockEnsureQueueWorker(...args),
  stopQueueWorker: (...args: unknown[]) => mockStopQueueWorker(...args),
}));

jest.mock("../../src/lib/observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) =>
    mockRecordPlatformObservability(...args),
}));

jest.mock("../../src/lib/api/requests", () => ({
  clearCachedDraftRequestId: (...args: unknown[]) =>
    mockClearCachedDraftRequestId(...args),
}));

jest.mock("../../src/lib/catalog/catalog.request.service", () => ({
  clearLocalDraftId: (...args: unknown[]) =>
    mockClearLocalDraftId(...args),
}));

jest.mock("../../src/lib/api/requests.read-capabilities", () => ({
  invalidateRequestsReadCapabilitiesCache: (...args: unknown[]) =>
    mockInvalidateRequestsReadCapabilitiesCache(...args),
}));

jest.mock("../../src/lib/query/queryClient", () => ({
  AppQueryProvider: ({ children }: { children: React.ReactNode }) => children,
  resetQueryCache: (...args: unknown[]) => mockResetQueryCache(...args),
}));

jest.mock("../../src/lib/realtime/realtime.client", () => ({
  clearRealtimeSessionState: jest.fn(),
}));

// ─── Tests ───────────────────────────────────────────────────────

describe("NAV-P0 regression: auth listener lifecycle", () => {
  let mockUnsubscribe: jest.Mock;
  let capturedAuthCallback:
    | ((event: string, session: unknown) => void)
    | null;

  beforeEach(() => {
    mockReplace.mockReset();
    mockGetSessionSafe.mockReset();
    mockOnAuthStateChange.mockReset();
    mockUseSegments.mockReset();
    mockUsePathname.mockReset();
    mockClearAppCache.mockReset();
    mockClearDocumentSessions.mockReset();
    mockClearCurrentSessionRoleCache.mockReset();
    mockClearPdfRunnerSessionState.mockReset();
    mockResetOfflineReplayCoordinator.mockReset();
    mockClearOfficeHubBootstrapSnapshot.mockReset();
    mockWarmCurrentSessionProfile.mockReset();
    mockEnsureQueueWorker.mockReset();
    mockStopQueueWorker.mockReset();
    mockRecordPlatformObservability.mockReset();
    mockClearCachedDraftRequestId.mockReset();
    mockClearLocalDraftId.mockReset();
    mockInvalidateRequestsReadCapabilitiesCache.mockReset();
    mockResetQueryCache.mockReset();

    capturedAuthCallback = null;
    mockUnsubscribe = jest.fn();

    mockOnAuthStateChange.mockImplementation(
      (callback: (event: string, session: unknown) => void) => {
        capturedAuthCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: mockUnsubscribe,
            },
          },
        };
      },
    );

    mockUseSegments.mockReturnValue(["(tabs)", "profile"]);
    mockUsePathname.mockReturnValue("/(tabs)/profile");
    mockGetSessionSafe.mockResolvedValue({
      session: { user: { id: "user-1" }, access_token: "tok" },
      degraded: false,
    });
    mockClearAppCache.mockResolvedValue(undefined);
    mockWarmCurrentSessionProfile.mockResolvedValue(undefined);
  });

  it("subscribes to auth state change exactly once on mount", async () => {
    await act(async () => {
      TestRenderer.create(<RootLayout />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it("auth listener is NOT unsubscribed when segments change (NAV-P0 fix)", async () => {
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<RootLayout />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Initial subscribe
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).not.toHaveBeenCalled();

    // Simulate navigation: profile → office
    mockUseSegments.mockReturnValue(["(tabs)", "office"]);
    mockUsePathname.mockReturnValue("/(tabs)/office");

    await act(async () => {
      renderer!.update(<RootLayout />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Listener must NOT be unsubscribed or re-subscribed
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).not.toHaveBeenCalled();

    // Simulate navigation: office → office/warehouse
    mockUseSegments.mockReturnValue(["(tabs)", "office", "warehouse"]);
    mockUsePathname.mockReturnValue("/(tabs)/office/warehouse");

    await act(async () => {
      renderer!.update(<RootLayout />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Still exactly 1 subscribe, still no unsubscribe
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).not.toHaveBeenCalled();

    // Simulate navigation: warehouse → back to office
    mockUseSegments.mockReturnValue(["(tabs)", "office"]);
    mockUsePathname.mockReturnValue("/(tabs)/office");

    await act(async () => {
      renderer!.update(<RootLayout />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // After 4 segment changes: still exactly 1 subscribe, 0 unsubscribe
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it("auth listener still fires SIGNED_OUT after 10 segment changes", async () => {
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<RootLayout />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Simulate 10 rapid navigation changes
    const routes = [
      { segments: ["(tabs)", "office"], path: "/(tabs)/office" },
      { segments: ["(tabs)", "office", "warehouse"], path: "/(tabs)/office/warehouse" },
      { segments: ["(tabs)", "office"], path: "/(tabs)/office" },
      { segments: ["(tabs)", "office", "foreman"], path: "/(tabs)/office/foreman" },
      { segments: ["(tabs)", "office"], path: "/(tabs)/office" },
      { segments: ["(tabs)", "office", "director"], path: "/(tabs)/office/director" },
      { segments: ["(tabs)", "office"], path: "/(tabs)/office" },
      { segments: ["(tabs)", "office", "buyer"], path: "/(tabs)/office/buyer" },
      { segments: ["(tabs)", "office"], path: "/(tabs)/office" },
      { segments: ["(tabs)", "profile"], path: "/(tabs)/profile" },
    ];

    for (const route of routes) {
      mockUseSegments.mockReturnValue(route.segments);
      mockUsePathname.mockReturnValue(route.path);

      await act(async () => {
        renderer!.update(<RootLayout />);
      });

      await act(async () => {
        await Promise.resolve();
      });
    }

    // After 10 navigations, listener must still be alive
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).not.toHaveBeenCalled();
    expect(capturedAuthCallback).not.toBeNull();

    // Fire SIGNED_OUT — the listener must respond
    mockReplace.mockClear();

    await act(async () => {
      capturedAuthCallback?.("SIGNED_OUT", null);
      await Promise.resolve();
    });

    // Auth cleanup should have happened (proves listener was alive)
    expect(mockClearDocumentSessions).toHaveBeenCalledTimes(1);
    expect(mockClearCurrentSessionRoleCache).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/auth/login");
  });

  it("auth listener responds to SIGNED_IN after navigating to office child and back", async () => {
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<RootLayout />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Navigate to office/warehouse
    mockUseSegments.mockReturnValue(["(tabs)", "office", "warehouse"]);
    mockUsePathname.mockReturnValue("/(tabs)/office/warehouse");

    await act(async () => {
      renderer!.update(<RootLayout />);
    });

    // Navigate back to office
    mockUseSegments.mockReturnValue(["(tabs)", "office"]);
    mockUsePathname.mockReturnValue("/(tabs)/office");

    await act(async () => {
      renderer!.update(<RootLayout />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Listener should still be alive
    expect(capturedAuthCallback).not.toBeNull();

    // Simulate SIGNED_IN (e.g. token refresh)
    await act(async () => {
      capturedAuthCallback?.("SIGNED_IN", {
        user: { id: "user-1" },
        access_token: "new-tok",
      });
      await Promise.resolve();
    });

    // The listener was alive: it should NOT trigger login redirect
    expect(mockReplace).not.toHaveBeenCalledWith("/auth/login");
  });
});
