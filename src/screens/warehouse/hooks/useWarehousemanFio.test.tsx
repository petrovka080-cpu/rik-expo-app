import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useWarehousemanFio } from "./useWarehousemanFio";

const mockLoadStoredFioState = jest.fn();
const mockSaveStoredFioState = jest.fn();
const mockSetIsFioConfirmVisible = jest.fn();
const mockRecordStateWriteAccepted = jest.fn();
const mockRecordStateWriteSkipped = jest.fn();

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

jest.mock("../../../lib/navigation/officeReentryBreadcrumbs", () => ({
  recordOfficeWarehouseRuntimeStateWriteAccepted: (...args: unknown[]) => mockRecordStateWriteAccepted(...args),
  recordOfficeWarehouseRuntimeStateWriteSkipped: (...args: unknown[]) => mockRecordStateWriteSkipped(...args),
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
  isScreenFocused: boolean;
  onError?: (error: unknown) => void;
  onSnapshot?: (snapshot: ReturnType<typeof useWarehousemanFio>) => void;
}) {
  const { onSnapshot, ...hookArgs } = props;
  const result = useWarehousemanFio(hookArgs);
  onSnapshot?.(result);
  return null;
}

describe("useWarehousemanFio", () => {
  beforeEach(() => {
    mockLoadStoredFioState.mockReset();
    mockSaveStoredFioState.mockReset();
    mockSetIsFioConfirmVisible.mockReset();
    mockRecordStateWriteAccepted.mockReset();
    mockRecordStateWriteSkipped.mockReset();
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
          isScreenFocused={true}
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

  it("suppresses shared-store writes after blur before unmount", async () => {
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
          isScreenFocused={true}
          onError={onError}
        />,
      );
    });

    mockSetIsFioConfirmVisible.mockClear();

    await act(async () => {
      renderer.update(
        <Harness
          getTodaySixAM={() => new Date("2026-04-10T06:00:00.000Z")}
          isScreenFocused={false}
          onError={onError}
        />,
      );
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

  it("suppresses bootstrap_state writes after blur before mount bootstrap completes", async () => {
    const deferred = createDeferred<{
      currentFio?: string;
      history: string[];
      lastConfirmIso: string | null;
    }>();
    mockLoadStoredFioState
      .mockImplementationOnce(() => deferred.promise)
      .mockResolvedValue({
        currentFio: "",
        history: [],
        lastConfirmIso: "2026-04-10T06:30:00.000Z",
      });

    let latestSnapshot: ReturnType<typeof useWarehousemanFio> | null = null;
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          getTodaySixAM={() => new Date("2026-04-10T06:00:00.000Z")}
          isScreenFocused={true}
          onSnapshot={(snapshot) => {
            latestSnapshot = snapshot;
          }}
        />,
      );
    });

    mockSetIsFioConfirmVisible.mockClear();
    mockRecordStateWriteAccepted.mockClear();
    mockRecordStateWriteSkipped.mockClear();

    await act(async () => {
      renderer.update(
        <Harness
          getTodaySixAM={() => new Date("2026-04-10T06:00:00.000Z")}
          isScreenFocused={false}
          onSnapshot={(snapshot) => {
            latestSnapshot = snapshot;
          }}
        />,
      );
    });

    await act(async () => {
      deferred.resolve({
        currentFio: "Ivan",
        history: ["Ivan"],
        lastConfirmIso: null,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latestSnapshot?.warehousemanFio).toBe("");
    expect(latestSnapshot?.warehousemanHistory).toEqual([]);
    expect(mockRecordStateWriteAccepted).not.toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "warehouseman_fio",
        writeTarget: "bootstrap_state",
        source: "mount_bootstrap",
      }),
    );
    expect(mockRecordStateWriteSkipped).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "warehouseman_fio",
        writeTarget: "bootstrap_state",
        source: "mount_bootstrap",
        reason: "after_blur",
      }),
    );
  });

  it("commits confirmation visibility while the screen stays focused", async () => {
    mockLoadStoredFioState.mockResolvedValue({
      currentFio: "",
      history: [],
      lastConfirmIso: null,
    });

    await act(async () => {
      TestRenderer.create(
        <Harness
          getTodaySixAM={() => new Date("2026-04-10T06:00:00.000Z")}
          isScreenFocused={true}
        />,
      );
    });

    expect(mockSetIsFioConfirmVisible).toHaveBeenCalledWith(true);
  });
});
