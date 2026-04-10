/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { RequestTimeoutError } from "../requestTimeoutPolicy";
import RootLayout from "../../../app/_layout";

const mockReplace = jest.fn();
const mockGetSessionSafe = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockUseSegments = jest.fn();
const mockUsePathname = jest.fn();
const mockClearDocumentSessions = jest.fn();
const mockClearCurrentSessionRoleCache = jest.fn();
const mockWarmCurrentSessionProfile = jest.fn();
const mockEnsureQueueWorker = jest.fn();
const mockStopQueueWorker = jest.fn();

jest.mock("../runtime/installWeakRefPolyfill", () => ({}));

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

jest.mock("../../ui/GlobalBusy", () => ({
  GlobalBusyProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../components/PlatformOfflineStatusHost", () => () => null);

jest.mock("../cache/clearAppCache", () => ({
  clearAppCache: jest.fn(),
}));

jest.mock("../supabaseClient", () => ({
  getSessionSafe: (...args: unknown[]) => mockGetSessionSafe(...args),
  supabase: {
    auth: {
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

jest.mock("../documents/pdfDocumentSessions", () => ({
  clearDocumentSessions: (...args: unknown[]) => mockClearDocumentSessions(...args),
}));

jest.mock("../sessionRole", () => ({
  clearCurrentSessionRoleCache: (...args: unknown[]) =>
    mockClearCurrentSessionRoleCache(...args),
  warmCurrentSessionProfile: (...args: unknown[]) =>
    mockWarmCurrentSessionProfile(...args),
}));

jest.mock("../../workers/queueBootstrap", () => ({
  ensureQueueWorker: (...args: unknown[]) => mockEnsureQueueWorker(...args),
  stopQueueWorker: (...args: unknown[]) => mockStopQueueWorker(...args),
}));

describe("RootLayout recovery bootstrap", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockGetSessionSafe.mockReset();
    mockOnAuthStateChange.mockReset();
    mockUseSegments.mockReset();
    mockUsePathname.mockReset();
    mockClearDocumentSessions.mockReset();
    mockClearCurrentSessionRoleCache.mockReset();
    mockWarmCurrentSessionProfile.mockReset();
    mockEnsureQueueWorker.mockReset();
    mockStopQueueWorker.mockReset();

    mockUseSegments.mockReturnValue(["(tabs)", "profile"]);
    mockUsePathname.mockReturnValue("/(tabs)/profile");
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    });
    mockWarmCurrentSessionProfile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not redirect to login when initial session bootstrap times out", async () => {
    mockGetSessionSafe.mockRejectedValue(
      new RequestTimeoutError({
        requestClass: "lightweight_lookup",
        timeoutMs: 8000,
        owner: "supabase_client",
        operation: "user",
        elapsedMs: 8000,
        urlPath: "/auth/v1/user",
      }),
    );

    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<RootLayout />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(renderer!.root.findByProps({ testID: "root-stack" })).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalledWith("/auth/login");
    expect(mockStopQueueWorker).not.toHaveBeenCalled();
    expect(mockClearDocumentSessions).not.toHaveBeenCalled();
    expect(mockClearCurrentSessionRoleCache).not.toHaveBeenCalled();
  });

  it("still redirects to login when session bootstrap confirms no session", async () => {
    mockGetSessionSafe.mockResolvedValue({ session: null, degraded: false });

    await act(async () => {
      TestRenderer.create(<RootLayout />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockReplace).toHaveBeenCalledWith("/auth/login");
    expect(mockStopQueueWorker).toHaveBeenCalledTimes(1);
    expect(mockClearDocumentSessions).toHaveBeenCalledTimes(1);
    expect(mockClearCurrentSessionRoleCache).toHaveBeenCalledTimes(1);
  });

  it("redirects authenticated users away from the auth stack", async () => {
    mockUseSegments.mockReturnValue(["auth", "login"]);
    mockUsePathname.mockReturnValue("/auth/login");
    mockGetSessionSafe.mockResolvedValue({
      session: {
        user: { id: "user-1" },
      },
      degraded: false,
    });

    await act(async () => {
      TestRenderer.create(<RootLayout />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/profile");
    expect(mockEnsureQueueWorker).toHaveBeenCalledTimes(1);
  });

  it("does not redirect to login when SIGNED_IN fires after initial null session (iOS race)", async () => {
    // Simulate the iOS race condition:
    // 1. getSessionSafe returns null initially (AsyncStorage is slow)
    // 2. onAuthStateChange fires SIGNED_IN with a valid session
    // The route guard should use the SIGNED_IN session, NOT the stale null.

    let capturedAuthCallback: ((event: string, session: unknown) => void) | null = null;

    mockOnAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
      capturedAuthCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      };
    });

    // Start on auth/login (user just submitted login form)
    mockUseSegments.mockReturnValue(["auth", "login"]);
    mockUsePathname.mockReturnValue("/auth/login");

    // getSessionSafe returns null — the session hasn't been persisted yet
    mockGetSessionSafe.mockResolvedValue({ session: null, degraded: false });

    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<RootLayout />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // At this point, hasSession=false, and route guard fires router.replace("/auth/login").
    // But user is already on auth/login so inAuthStack=true → no redirect. Good.
    mockReplace.mockClear();

    // Now simulate: login.tsx called router.replace → segments change to (tabs)/profile
    mockUseSegments.mockReturnValue(["(tabs)", "profile"]);
    mockUsePathname.mockReturnValue("/(tabs)/profile");

    // SIGNED_IN fires from supabase
    await act(async () => {
      capturedAuthCallback?.("SIGNED_IN", { user: { id: "user-1" }, access_token: "tok" });
    });

    await act(async () => {
      await Promise.resolve();
    });

    // The critical assertion: after SIGNED_IN, the route guard must NOT send user back to login.
    expect(mockReplace).not.toHaveBeenCalledWith("/auth/login");
  });

  it("re-checks session after auth stack exit before sending user back to login", async () => {
    mockUseSegments.mockReturnValue(["auth", "login"]);
    mockUsePathname.mockReturnValue("/auth/login");
    mockGetSessionSafe
      .mockResolvedValueOnce({ session: null, degraded: false })
      .mockResolvedValueOnce({
        session: { user: { id: "user-1" }, access_token: "tok" },
        degraded: false,
      });

    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<RootLayout />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    mockReplace.mockClear();

    mockUseSegments.mockReturnValue(["(tabs)", "profile"]);
    mockUsePathname.mockReturnValue("/(tabs)/profile");

    await act(async () => {
      renderer!.update(<RootLayout />);
      await Promise.resolve();
    });

    expect(mockGetSessionSafe).toHaveBeenNthCalledWith(2, {
      caller: "root_layout_post_auth_exit",
    });
    expect(mockReplace).not.toHaveBeenCalledWith("/auth/login");
  });

  it("redirects to login when the post-auth session settle window confirms no session", async () => {
    jest.useFakeTimers();
    mockUseSegments.mockReturnValue(["auth", "login"]);
    mockUsePathname.mockReturnValue("/auth/login");
    mockGetSessionSafe.mockResolvedValue({ session: null, degraded: false });

    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<RootLayout />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    mockReplace.mockClear();

    mockUseSegments.mockReturnValue(["(tabs)", "profile"]);
    mockUsePathname.mockReturnValue("/(tabs)/profile");

    await act(async () => {
      renderer!.update(<RootLayout />);
      await Promise.resolve();
    });

    expect(mockReplace).not.toHaveBeenCalledWith("/auth/login");

    await act(async () => {
      jest.advanceTimersByTime(3_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockReplace).toHaveBeenCalledWith("/auth/login");
  });
});
