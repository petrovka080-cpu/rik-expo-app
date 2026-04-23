import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useWarehouseIncoming } from "../../src/screens/warehouse/warehouse.incoming";
import type { WarehouseScreenActiveRef } from "../../src/screens/warehouse/hooks/useWarehouseScreenActivity";
import {
  fetchWarehouseIncomingHeadsWindow,
  fetchWarehouseIncomingItemsWindow,
} from "../../src/screens/warehouse/warehouse.incoming.repo";

jest.mock("../../src/screens/warehouse/warehouse.incoming.repo", () => ({
  fetchWarehouseIncomingHeadsWindow: jest.fn(),
  fetchWarehouseIncomingItemsWindow: jest.fn(),
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
};

const flushAsync = async (times = 4) => {
  for (let index = 0; index < times; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const mockFetchWarehouseIncomingItemsWindow =
  fetchWarehouseIncomingItemsWindow as jest.MockedFunction<
    typeof fetchWarehouseIncomingItemsWindow
  >;

describe("warehouse incoming async ownership", () => {
  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
    jest.clearAllMocks();
    (fetchWarehouseIncomingHeadsWindow as jest.Mock).mockResolvedValue({
      rows: [],
      meta: { hasMore: false, pageOffset: 0, rawWindowRowCount: 0, totalVisibleCount: 0 },
      sourceMeta: {
        primaryOwner: "rpc_scope_v1",
        fallbackUsed: false,
        sourceKind: "rpc:warehouse_incoming_queue_scope_v1",
      },
    });
  });

  it("joins duplicate item loads for the same head", async () => {
    const deferred = createDeferred<Awaited<ReturnType<typeof fetchWarehouseIncomingItemsWindow>>>();
    mockFetchWarehouseIncomingItemsWindow.mockReturnValue(deferred.promise);

    const activeRef: WarehouseScreenActiveRef = { current: true };
    const apiRef: { current: ReturnType<typeof useWarehouseIncoming> | null } = { current: null };
    const getApi = () => {
      const current = apiRef.current;
      if (current == null) throw new Error("Warehouse incoming hook did not initialize");
      return current;
    };
    function Harness() {
      apiRef.current = useWarehouseIncoming({ screenActiveRef: activeRef });
      return null;
    }

    act(() => {
      TestRenderer.create(<Harness />);
    });

    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    await act(async () => {
      first = getApi().loadItemsForHead("incoming-1");
      second = getApi().loadItemsForHead("incoming-1");
      await Promise.resolve();
    });

    expect(mockFetchWarehouseIncomingItemsWindow).toHaveBeenCalledTimes(1);

    deferred.resolve({
      rows: [{ incoming_item_id: "row-1", code: "MAT-1" }] as never,
      meta: {
        incomingId: "incoming-1",
        rowCount: 1,
        scopeKey: "incoming-1",
        contractVersion: "v1",
        generatedAt: "2026-04-21T00:00:00.000Z",
      },
      sourceMeta: {
        primaryOwner: "rpc_scope_v1",
        fallbackUsed: false,
        sourceKind: "rpc:warehouse_incoming_items_scope_v1",
        contractVersion: "v1",
      },
    });

    await act(async () => {
      await Promise.all([first, second]);
    });

    expect(getApi().itemsByHead["incoming-1"]).toEqual([
      expect.objectContaining({ incoming_item_id: "row-1", code: "MAT-1" }),
    ]);
  });

  it("aborts a replaced force-refresh and keeps only the latest rows", async () => {
    const firstDeferred = createDeferred<Awaited<ReturnType<typeof fetchWarehouseIncomingItemsWindow>>>();
    const secondDeferred = createDeferred<Awaited<ReturnType<typeof fetchWarehouseIncomingItemsWindow>>>();
    const signals: AbortSignal[] = [];
    mockFetchWarehouseIncomingItemsWindow.mockImplementation(
      (_incomingId: string, options?: { signal?: AbortSignal | null }) => {
        const signal = options?.signal ?? new AbortController().signal;
        signals.push(signal);
        if (signals.length === 1) {
          signal.addEventListener(
            "abort",
            () => firstDeferred.reject(signal.reason ?? new Error("aborted")),
            { once: true },
          );
          return firstDeferred.promise;
        }
        return secondDeferred.promise;
      },
    );

    const activeRef: WarehouseScreenActiveRef = { current: true };
    const apiRef: { current: ReturnType<typeof useWarehouseIncoming> | null } = { current: null };
    const getApi = () => {
      const current = apiRef.current;
      if (current == null) throw new Error("Warehouse incoming hook did not initialize");
      return current;
    };
    function Harness() {
      apiRef.current = useWarehouseIncoming({ screenActiveRef: activeRef });
      return null;
    }

    act(() => {
      TestRenderer.create(<Harness />);
    });

    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    await act(async () => {
      first = getApi().loadItemsForHead("incoming-1", true);
      second = getApi().loadItemsForHead("incoming-1", true);
      await Promise.resolve();
    });

    expect(mockFetchWarehouseIncomingItemsWindow).toHaveBeenCalledTimes(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    secondDeferred.resolve({
      rows: [{ incoming_item_id: "row-2", code: "MAT-NEW" }] as never,
      meta: {
        incomingId: "incoming-1",
        rowCount: 1,
        scopeKey: "incoming-1",
        contractVersion: "v1",
        generatedAt: "2026-04-21T00:00:00.000Z",
      },
      sourceMeta: {
        primaryOwner: "rpc_scope_v1",
        fallbackUsed: false,
        sourceKind: "rpc:warehouse_incoming_items_scope_v1",
        contractVersion: "v1",
      },
    });

    await act(async () => {
      const [firstRows, secondRows] = await Promise.all([first, second]);
      expect(firstRows).toEqual(secondRows);
    });
    await flushAsync();

    expect(getApi().itemsByHead["incoming-1"]).toEqual([
      expect.objectContaining({ incoming_item_id: "row-2", code: "MAT-NEW" }),
    ]);
  });

  it("aborts in-flight item requests on unmount without surfacing a hard failure", async () => {
    const deferred = createDeferred<Awaited<ReturnType<typeof fetchWarehouseIncomingItemsWindow>>>();
    let signal: AbortSignal | null | undefined;
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockFetchWarehouseIncomingItemsWindow.mockImplementation(
      (_incomingId: string, options?: { signal?: AbortSignal | null }) => {
        signal = options?.signal ?? null;
        signal?.addEventListener(
          "abort",
          () => deferred.reject(signal?.reason ?? new Error("aborted")),
          { once: true },
        );
        return deferred.promise;
      },
    );

    const activeRef: WarehouseScreenActiveRef = { current: true };
    const apiRef: { current: ReturnType<typeof useWarehouseIncoming> | null } = { current: null };
    const getApi = () => {
      const current = apiRef.current;
      if (current == null) throw new Error("Warehouse incoming hook did not initialize");
      return current;
    };
    function Harness() {
      apiRef.current = useWarehouseIncoming({ screenActiveRef: activeRef });
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<Harness />);
    });

    let pending!: Promise<unknown>;
    await act(async () => {
      pending = getApi().loadItemsForHead("incoming-1", true);
      await Promise.resolve();
    });

    act(() => {
      renderer.unmount();
    });
    await act(async () => {
      await pending;
    });

    expect(signal?.aborted).toBe(true);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });
});
