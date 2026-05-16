import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useBusyAction } from "../../src/lib/useBusyAction";

type BusyAction = ReturnType<typeof useBusyAction>;

describe("useBusyAction timer cleanup", () => {
  let action: BusyAction | null = null;
  const onError = jest.fn();

  function Harness() {
    action = useBusyAction({ timeoutMs: 1000, onError });
    return null;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    action = null;
    onError.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    action = null;
  });

  it("cancels the timeout when the action completes before the deadline", async () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    const rendererRef: { current: TestRenderer.ReactTestRenderer | null } = {
      current: null,
    };
    await act(async () => {
      rendererRef.current = TestRenderer.create(<Harness />);
    });

    await act(async () => {
      await action?.run("fast", async () => undefined);
    });

    expect(onError).not.toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    await act(async () => {
      rendererRef.current?.unmount();
    });
  });

  it("reports timeout errors without leaving the busy state stuck", async () => {
    await act(async () => {
      TestRenderer.create(<Harness />);
    });

    await act(async () => {
      const promise = action?.run("slow", () => new Promise<void>(() => undefined));
      jest.advanceTimersByTime(1000);
      await promise;
    });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(action?.busyKey).toBe(null);
  });
});
