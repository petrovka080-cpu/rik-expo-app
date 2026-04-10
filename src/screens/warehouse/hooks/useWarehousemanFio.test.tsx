import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useWarehousemanFio } from "./useWarehousemanFio";

const mockLoadStoredFioState = jest.fn();
const mockSaveStoredFioState = jest.fn();
const mockSetIsFioConfirmVisible = jest.fn();

jest.mock("expo-router", () => {
  const ReactRuntime = require("react");
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactRuntime.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === "function" ? cleanup : undefined;
      }, [callback]);
    },
  };
});

jest.mock("../../../lib/storage/fioPersistence", () => ({
  loadStoredFioState: (...args: unknown[]) => mockLoadStoredFioState(...args),
  saveStoredFioState: (...args: unknown[]) => mockSaveStoredFioState(...args),
}));

jest.mock("../warehouseUi.store", () => ({
  useWarehouseUiStore: (selector: (state: {
    isFioConfirmVisible: boolean;
    setIsFioConfirmVisible: typeof mockSetIsFioConfirmVisible;
  }) => unknown) =>
    selector({
      isFioConfirmVisible: false,
      setIsFioConfirmVisible: mockSetIsFioConfirmVisible,
    }),
}));

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function Harness(props: {
  getTodaySixAM: () => Date;
  onError?: (error: unknown) => void;
}) {
  useWarehousemanFio(props);
  return null;
}

describe("useWarehousemanFio", () => {
  beforeEach(() => {
    mockLoadStoredFioState.mockReset();
    mockSaveStoredFioState.mockReset();
    mockSetIsFioConfirmVisible.mockReset();
  });

  it("suppresses focus confirmation writes after unmount", async () => {
    const deferred = createDeferred<{
      currentFio?: string;
      history: string[];
      lastConfirmIso: string | null;
    }>();
    mockLoadStoredFioState.mockReturnValue(deferred.promise);
    const onError = jest.fn();

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          getTodaySixAM={() => new Date("2026-04-10T06:00:00.000Z")}
          onError={onError}
        />,
      );
    });

    mockSetIsFioConfirmVisible.mockClear();

    await act(async () => {
      renderer.unmount();
    });

    await act(async () => {
      deferred.resolve({
        currentFio: "",
        history: [],
        lastConfirmIso: null,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSetIsFioConfirmVisible).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
