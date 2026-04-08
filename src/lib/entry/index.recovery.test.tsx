import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { RequestTimeoutError } from "../requestTimeoutPolicy";
import Index from "../../../app/index";

const mockReplace = jest.fn();
const mockGetSessionSafe = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock("../supabaseClient", () => ({
  getSessionSafe: (...args: unknown[]) => mockGetSessionSafe(...args),
  supabase: {
    auth: {},
  },
}));

describe("Index recovery bootstrap", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockGetSessionSafe.mockReset();
  });

  it("routes to the profile hub when session bootstrap times out", async () => {
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
