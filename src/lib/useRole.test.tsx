import React, { useEffect } from "react";
import TestRenderer, { act } from "react-test-renderer";

import { getPlatformObservabilityEvents, resetPlatformObservabilityEvents } from "./observability/platformObservability";
import { useRole } from "./useRole";

const mockResolveCurrentSessionRole = jest.fn();

jest.mock("./sessionRole", () => ({
  resolveCurrentSessionRole: (...args: unknown[]) => mockResolveCurrentSessionRole(...args),
}));

type HookState = ReturnType<typeof useRole> | null;

function Harness(props: { onReady: (value: ReturnType<typeof useRole>) => void }) {
  const value = useRole();
  useEffect(() => {
    props.onReady(value);
  }, [props, value]);
  return null;
}

describe("useRole", () => {
  beforeEach(() => {
    mockResolveCurrentSessionRole.mockReset();
    resetPlatformObservabilityEvents();
  });

  it("normalizes a valid resolved role without using unsafe casts", async () => {
    mockResolveCurrentSessionRole.mockResolvedValueOnce({
      userId: "user-1",
      role: "director",
      source: "rpc",
      profileEnsured: false,
    });

    let captured: HookState = null;

    await act(async () => {
      TestRenderer.create(<Harness onReady={(value) => { captured = value; }} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(captured).toEqual({
      role: "director",
      loading: false,
    });
  });

  it("treats an invalid resolved role as null and records observability", async () => {
    mockResolveCurrentSessionRole.mockResolvedValueOnce({
      userId: "user-2",
      role: "warehouse",
      source: "rpc",
      profileEnsured: false,
    });

    let captured: HookState = null;

    await act(async () => {
      TestRenderer.create(<Harness onReady={(value) => { captured = value; }} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(captured).toEqual({
      role: null,
      loading: false,
    });
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.surface === "use_role" &&
          event.event === "use_role_invalid_role" &&
          event.result === "error" &&
          event.extra?.rawRole === "warehouse",
      ),
    ).toBe(true);
  });
});
