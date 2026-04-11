import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useWarehouseFetchRefs } from "./useWarehouseFetchRefs";
import { useWarehouseReportsData } from "./useWarehouseReportsData";
import { useWarehouseReqItemsData } from "./useWarehouseReqItemsData";
import type { WarehouseScreenActiveRef } from "./useWarehouseScreenActivity";
import { recordPlatformObservability } from "../../../lib/observability/platformObservability";
import {
  apiFetchIncomingReports,
  apiFetchReports,
} from "../warehouse.stock.read";
import { apiFetchReqItems } from "../warehouse.requests.read";

jest.mock("../warehouse.stock.read", () => ({
  apiFetchIncomingReports: jest.fn(),
  apiFetchReports: jest.fn(),
}));

jest.mock("../warehouse.requests.read", () => ({
  apiFetchReqItems: jest.fn(),
}));

jest.mock("../../../lib/observability/platformObservability", () => ({
  recordPlatformObservability: jest.fn(),
}));

const mockApiFetchReports = apiFetchReports as jest.MockedFunction<
  typeof apiFetchReports
>;
const mockApiFetchIncomingReports =
  apiFetchIncomingReports as jest.MockedFunction<
    typeof apiFetchIncomingReports
  >;
const mockApiFetchReqItems = apiFetchReqItems as jest.MockedFunction<
  typeof apiFetchReqItems
>;
const mockRecordPlatformObservability =
  recordPlatformObservability as jest.MockedFunction<
    typeof recordPlatformObservability
  >;

const createActiveRef = (active = true): WarehouseScreenActiveRef => ({
  current: active,
});

describe("warehouse post-unmount guards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not run queued refresh reruns after the warehouse screen becomes inactive", async () => {
    const activeRef = createActiveRef(true);
    let releaseStock!: () => void;
    const fetchStock = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseStock = resolve;
        }),
    );
    let api: ReturnType<typeof useWarehouseFetchRefs> | null = null;

    function Harness() {
      api = useWarehouseFetchRefs({
        fetchToReceive: jest.fn(async () => undefined),
        fetchStock,
        fetchReqHeads: jest.fn(async () => undefined),
        fetchReports: jest.fn(async () => undefined),
        screenActiveRef: activeRef,
      });
      return null;
    }

    act(() => {
      TestRenderer.create(<Harness />);
    });

    const first = api?.callFetchStock();
    const second = api?.callFetchStock();
    expect(fetchStock).toHaveBeenCalledTimes(1);

    activeRef.current = false;
    await act(async () => {
      releaseStock();
      await first;
      await second;
      await Promise.resolve();
    });

    expect(fetchStock).toHaveBeenCalledTimes(1);
  });

  it("records queued refresh rerun failures instead of leaving them unhandled", async () => {
    const activeRef = createActiveRef(true);
    let releaseStock!: () => void;
    const fetchStock = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            releaseStock = resolve;
          }),
      )
      .mockRejectedValueOnce(new Error("queued stock refresh failed"));
    let api: ReturnType<typeof useWarehouseFetchRefs> | null = null;

    function Harness() {
      api = useWarehouseFetchRefs({
        fetchToReceive: jest.fn(async () => undefined),
        fetchStock,
        fetchReqHeads: jest.fn(async () => undefined),
        fetchReports: jest.fn(async () => undefined),
        screenActiveRef: activeRef,
      });
      return null;
    }

    act(() => {
      TestRenderer.create(<Harness />);
    });

    const first = api?.callFetchStock() ?? Promise.resolve();
    const joined = api?.callFetchStock() ?? Promise.resolve();
    expect(fetchStock).toHaveBeenCalledTimes(1);

    await act(async () => {
      releaseStock();
      await first;
      await joined;
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchStock).toHaveBeenCalledTimes(2);
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "warehouse",
        surface: "stock",
        category: "reload",
        event: "refresh_stock",
        result: "error",
        sourceKind: "fetchStock",
        errorStage: "queued_rerun",
        errorClass: "error",
        errorMessage: "queued stock refresh failed",
      }),
    );
  });

  it("does not commit warehouse reports after the screen becomes inactive", async () => {
    const activeRef = createActiveRef(true);
    let resolveReports!: (value: unknown) => void;
    let resolveIncoming!: (value: unknown) => void;
    mockApiFetchReports.mockReturnValue(
      new Promise((resolve) => {
        resolveReports = resolve;
      }) as ReturnType<typeof apiFetchReports>,
    );
    mockApiFetchIncomingReports.mockReturnValue(
      new Promise((resolve) => {
        resolveIncoming = resolve;
      }) as ReturnType<typeof apiFetchIncomingReports>,
    );

    let api: ReturnType<typeof useWarehouseReportsData> | null = null;
    function Harness() {
      api = useWarehouseReportsData({
        supabase: {} as never,
        periodFrom: "",
        periodTo: "",
        screenActiveRef: activeRef,
      });
      return null;
    }

    act(() => {
      TestRenderer.create(<Harness />);
    });

    const task = api?.fetchReports();
    activeRef.current = false;
    await act(async () => {
      resolveReports({
        repStock: [{ code: "MAT-1" }],
        repMov: [],
        repIssues: [],
      });
      resolveIncoming([{ incoming_id: "IN-1" }]);
      await task;
      await Promise.resolve();
    });

    expect(api?.repStock).toEqual([]);
    expect(api?.repIncoming).toEqual([]);
  });

  it("does not commit request items after the screen becomes inactive", async () => {
    const activeRef = createActiveRef(true);
    let resolveItems!: (value: unknown) => void;
    mockApiFetchReqItems.mockReturnValue(
      new Promise((resolve) => {
        resolveItems = resolve;
      }) as ReturnType<typeof apiFetchReqItems>,
    );

    let api: ReturnType<typeof useWarehouseReqItemsData> | null = null;
    function Harness() {
      api = useWarehouseReqItemsData({
        supabase: {} as never,
        screenActiveRef: activeRef,
      });
      return null;
    }

    act(() => {
      TestRenderer.create(<Harness />);
    });

    let task: Promise<void> | undefined;
    await act(async () => {
      task = api?.fetchReqItems("REQ-1");
      await Promise.resolve();
    });
    activeRef.current = false;
    await act(async () => {
      resolveItems([{ request_item_id: "ITEM-1" }]);
      await task;
      await Promise.resolve();
    });

    expect(api?.reqItems).toEqual([]);
    expect(api?.reqItemsLoading).toBe(true);
  });
});
