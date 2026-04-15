/**
 * N3: Index redirect safety — verifies that app/index.tsx resolves
 * to exactly one router.replace call under all bootstrap scenarios
 * and never enters a redirect loop.
 */
import React from "react";
import TestRenderer, { act } from "react-test-renderer";

const mockReplace = jest.fn();
const mockGetSessionSafe = jest.fn();
const mockRecordPlatformObservability = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock("../../src/lib/authRouting", () => ({
  POST_AUTH_ENTRY_ROUTE: "/(tabs)/profile",
}));

jest.mock("../../src/lib/observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) =>
    mockRecordPlatformObservability(...args),
}));

jest.mock("../../src/lib/supabaseClient", () => ({
  getSessionSafe: (...args: unknown[]) => mockGetSessionSafe(...args),
  supabase: {
    auth: {
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

// Lazy-load after mocks
 
const Index = require("../../app/index").default;

describe("Index redirect safety (N3)", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockGetSessionSafe.mockReset();
    mockRecordPlatformObservability.mockReset();
  });

  it("exactly one replace when session exists", async () => {
    mockGetSessionSafe.mockResolvedValue({
      session: { user: { id: "u1" } },
      degraded: false,
    });

    await act(async () => {
      TestRenderer.create(<Index />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/profile");
  });

  it("exactly one replace when no session", async () => {
    mockGetSessionSafe.mockResolvedValue({
      session: null,
      degraded: false,
    });

    await act(async () => {
      TestRenderer.create(<Index />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/auth/login");
  });

  it("exactly one replace when session is degraded", async () => {
    mockGetSessionSafe.mockResolvedValue({
      session: null,
      degraded: true,
    });

    await act(async () => {
      TestRenderer.create(<Index />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/profile");
  });

  it("exactly one replace when getSessionSafe throws", async () => {
    mockGetSessionSafe.mockRejectedValue(new Error("network timeout"));

    await act(async () => {
      TestRenderer.create(<Index />);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/profile");
  });

  it("does not call replace twice even if re-rendered", async () => {
    mockGetSessionSafe.mockResolvedValue({
      session: { user: { id: "u1" } },
      degraded: false,
    });

    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<Index />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Force a re-render
    await act(async () => {
      renderer!.update(<Index />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Still exactly one replace — no loop
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});
