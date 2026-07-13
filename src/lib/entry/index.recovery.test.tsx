import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { RequestTimeoutError } from "../requestTimeoutPolicy";
import Index from "../../../app/index";

const mockReplace = jest.fn();
const mockGetSessionSafe = jest.fn();
const mockHasPersistedAuthSessionHint = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock("../supabaseClient", () => ({
  getSessionSafe: (...args: unknown[]) => mockGetSessionSafe(...args),
  hasPersistedAuthSessionHint: (...args: unknown[]) =>
    mockHasPersistedAuthSessionHint(...args),
  supabase: {
    auth: {},
  },
}));

describe("Index recovery bootstrap", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockGetSessionSafe.mockReset();
    mockHasPersistedAuthSessionHint.mockReset();
    mockHasPersistedAuthSessionHint.mockResolvedValue({
      hasStoredSession: false,
      degraded: false,
    });
  });

  it("routes fresh startup to login when session bootstrap times out without persisted auth", async () => {
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

    await act(async () => {
      TestRenderer.create(<Index />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockReplace).toHaveBeenCalledWith("/auth/login");
  });

  it("routes to the profile hub when session bootstrap times out with persisted auth", async () => {
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
    mockHasPersistedAuthSessionHint.mockResolvedValue({
      hasStoredSession: true,
      degraded: false,
    });

    await act(async () => {
      TestRenderer.create(<Index />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/profile");
  });

  it("still routes to login when there is explicitly no session", async () => {
    mockGetSessionSafe.mockResolvedValue({ session: null, degraded: false });

    await act(async () => {
      TestRenderer.create(<Index />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockReplace).toHaveBeenCalledWith("/auth/login");
  });
});
