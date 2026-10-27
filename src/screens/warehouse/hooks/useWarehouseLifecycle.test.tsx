import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useWarehouseLifecycle } from "./useWarehouseLifecycle";
import { WAREHOUSE_TABS } from "../warehouse.types";
import type { UseAppActiveRevalidationParams } from "../../../lib/lifecycle/useAppActiveRevalidation";

const mockGetPlatformNetworkSnapshot = jest.fn();
const mockIsPlatformGuardCoolingDown = jest.fn();
const mockRecordPlatformGuardSkip = jest.fn();
const mockUseAppActiveRevalidation = jest.fn();

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

jest.mock("../../../lib/offline/platformNetwork.service", () => ({
  getPlatformNetworkSnapshot: (...args: unknown[]) =>
    mockGetPlatformNetworkSnapshot(...args),
}));

jest.mock("../../../lib/observability/platformGuardDiscipline", () => ({
  isPlatformGuardCoolingDown: (...args: unknown[]) =>
    mockIsPlatformGuardCoolingDown(...args),
  recordPlatformGuardSkip: (...args: unknown[]) =>
    mockRecordPlatformGuardSkip(...args),
}));

jest.mock("../../../lib/lifecycle/useAppActiveRevalidation", () => ({
  useAppActiveRevalidation: (...args: unknown[]) =>
    mockUseAppActiveRevalidation(...args),
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
  tab: (typeof WAREHOUSE_TABS)[number];
  isScreenFocused: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  fetchToReceive: () => Promise<void>;
  fetchStock: () => Promise<void>;
  fetchReports: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  useWarehouseLifecycle(props);
  return null;
}

describe("useWarehouseLifecycle", () => {
  beforeEach(() => {
    mockGetPlatformNetworkSnapshot.mockReset().mockReturnValue({
      hydrated: false,
      networkKnownOffline: false,
    });
    mockIsPlatformGuardCoolingDown.mockReset().mockReturnValue(true);
    mockRecordPlatformGuardSkip.mockReset();
    mockUseAppActiveRevalidation.mockReset();
  });

  it("suppresses loading completion after unmount during initial bootstrap", async () => {
    const fetchToReceive = createDeferred<void>();
    const fetchStock = createDeferred<void>();
    const setLoading = jest.fn();
    const onError = jest.fn();

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          tab={WAREHOUSE_TABS[0]}
          isScreenFocused={true}
          setLoading={setLoading}
          fetchToReceive={() => fetchToReceive.promise}
          fetchStock={() => fetchStock.promise}
          fetchReports={jest.fn().mockResolvedValue(undefined)}
          onError={onError}
        />,
      );
    });

    expect(setLoading).toHaveBeenCalledWith(true);
    setLoading.mockClear();

    await act(async () => {
      renderer.unmount();
    });

    await act(async () => {
      fetchToReceive.resolve();
      fetchStock.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(setLoading).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("suppresses error reporting after unmount during initial bootstrap", async () => {
    const failure = new Error("bootstrap failed");
    const fetchToReceive = createDeferred<void>();
    const fetchStock = createDeferred<void>();
    const setLoading = jest.fn();
    const onError = jest.fn();

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          tab={WAREHOUSE_TABS[0]}
          isScreenFocused={true}
          setLoading={setLoading}
          fetchToReceive={() => fetchToReceive.promise}
          fetchStock={() => fetchStock.promise}
          fetchReports={jest.fn().mockResolvedValue(undefined)}
          onError={onError}
        />,
      );
    });

    setLoading.mockClear();

    await act(async () => {
      renderer.unmount();
    });

    await act(async () => {
      fetchToReceive.reject(failure);
      fetchStock.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(setLoading).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("suppresses completion after blur before unmount", async () => {
    const fetchToReceive = createDeferred<void>();
    const fetchStock = createDeferred<void>();
    const setLoading = jest.fn();
    const onError = jest.fn();

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          tab={WAREHOUSE_TABS[0]}
          isScreenFocused={true}
          setLoading={setLoading}
          fetchToReceive={() => fetchToReceive.promise}
          fetchStock={() => fetchStock.promise}
          fetchReports={jest.fn().mockResolvedValue(undefined)}
          onError={onError}
        />,
      );
    });

    expect(setLoading).toHaveBeenCalledWith(true);
    setLoading.mockClear();

    await act(async () => {
      renderer.update(
        <Harness
          tab={WAREHOUSE_TABS[0]}
          isScreenFocused={false}
          setLoading={setLoading}
          fetchToReceive={() => fetchToReceive.promise}
          fetchStock={() => fetchStock.promise}
          fetchReports={jest.fn().mockResolvedValue(undefined)}
          onError={onError}
        />,
      );
    });

    await act(async () => {
      fetchToReceive.resolve();
      fetchStock.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(setLoading).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("wires app-active revalidation for non-expense tabs and refreshes the current scope", async () => {
    const setLoading = jest.fn();
    const fetchToReceive = jest.fn().mockResolvedValue(undefined);
    const fetchStock = jest.fn().mockResolvedValue(undefined);
    const fetchReports = jest.fn().mockResolvedValue(undefined);
    const onError = jest.fn();

    await act(async () => {
      TestRenderer.create(
        <Harness
          tab={WAREHOUSE_TABS[0]}
          isScreenFocused={true}
          setLoading={setLoading}
          fetchToReceive={fetchToReceive}
          fetchStock={fetchStock}
          fetchReports={fetchReports}
          onError={onError}
        />,
      );
    });

    const appActiveCall = mockUseAppActiveRevalidation.mock.calls[
      mockUseAppActiveRevalidation.mock.calls.length - 1
    ]?.[0] as UseAppActiveRevalidationParams | undefined;
    expect(appActiveCall).toEqual(
      expect.objectContaining({
        screen: "warehouse",
        surface: "screen_root",
        enabled: true,
      }),
    );

    fetchToReceive.mockClear();
    fetchStock.mockClear();
    fetchReports.mockClear();

    await act(async () => {
      await appActiveCall?.onRevalidate("app_became_active");
    });

    expect(fetchToReceive).toHaveBeenCalledTimes(1);
    expect(fetchStock).not.toHaveBeenCalled();
    expect(fetchReports).not.toHaveBeenCalled();
  });

  it("disables app-active revalidation for the expense tab because it is owned by the expense lifecycle", async () => {
    const setLoading = jest.fn();

    await act(async () => {
      TestRenderer.create(
        <Harness
          tab={WAREHOUSE_TABS[2]}
          isScreenFocused={true}
          setLoading={setLoading}
          fetchToReceive={jest.fn().mockResolvedValue(undefined)}
          fetchStock={jest.fn().mockResolvedValue(undefined)}
          fetchReports={jest.fn().mockResolvedValue(undefined)}
          onError={jest.fn()}
        />,
      );
    });

    const appActiveCall = mockUseAppActiveRevalidation.mock.calls[
      mockUseAppActiveRevalidation.mock.calls.length - 1
    ]?.[0] as UseAppActiveRevalidationParams | undefined;
    expect(appActiveCall).toEqual(
      expect.objectContaining({
        screen: "warehouse",
        surface: "screen_root",
        enabled: false,
      }),
    );
  });
});
