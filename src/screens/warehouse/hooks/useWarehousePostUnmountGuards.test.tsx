import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useWarehouseFetchRefs } from "./useWarehouseFetchRefs";
import { useWarehouseReportsData } from "./useWarehouseReportsData";
import { useWarehouseReqItemsData } from "./useWarehouseReqItemsData";
import { useWarehouseReqHeads } from "./useWarehouseReqHeads";
import type { WarehouseScreenActiveRef } from "./useWarehouseScreenActivity";
import { recordPlatformObservability } from "../../../lib/observability/platformObservability";
import {
  apiFetchIncomingReports,
  apiFetchReports,
} from "../warehouse.stock.read";
import {
  apiFetchReqHeadsWindow,
  apiFetchReqItems,
} from "../warehouse.requests.read";

jest.mock("../warehouse.stock.read", () => ({
  apiFetchIncomingReports: jest.fn(),
  apiFetchReports: jest.fn(),
}));

jest.mock("../warehouse.requests.read", () => ({
  apiFetchReqItems: jest.fn(),
  apiFetchReqHeadsWindow: jest.fn(),
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
const mockApiFetchReqHeadsWindow =
  apiFetchReqHeadsWindow as jest.MockedFunction<typeof apiFetchReqHeadsWindow>;
const mockRecordPlatformObservability =
  recordPlatformObservability as jest.MockedFunction<
    typeof recordPlatformObservability
  >;

const createActiveRef = (active = true): WarehouseScreenActiveRef => ({
  current: active,
});

const createStockRow = (code: string) => ({
  material_id: code,
  code,
  name: code,
  uom_id: "pcs",
  qty_on_hand: 1,
  qty_reserved: 0,
  qty_available: 1,
  updated_at: null,
});

const createReqHeadsResult = (requestId: string) => ({
  rows: [
    {
      request_id: requestId,
      display_no: requestId,
      object_name: "Object",
      level_code: null,
      system_code: null,
      zone_code: null,
      level_name: null,
      system_name: null,
      zone_name: null,
      contractor_name: null,
      contractor_phone: null,
      planned_volume: null,
      note: null,
      comment: null,
      submitted_at: null,
      items_cnt: 1,
      ready_cnt: 1,
      done_cnt: 0,
      qty_limit_sum: 1,
      qty_issued_sum: 0,
      qty_left_sum: 1,
      qty_can_issue_now_sum: 1,
      issuable_now_cnt: 1,
      issue_status: "READY",
      visible_in_expense_queue: true,
      can_issue_now: true,
      waiting_stock: false,
      all_done: false,
    },
  ],
  hasMore: false,
  meta: {
    page: 0,
    pageSize: 50,
    pageOffset: 0,
    returnedRowCount: 1,
    totalRowCount: 1,
    hasMore: false,
    scopeKey: "test:req-heads",
    contractVersion: "v4",
    generatedAt: "2026-04-13T00:00:00.000Z",
    repairedMissingIdsCount: 0,
  },
  sourceMeta: {
    primaryOwner: "canonical_issue_queue_rpc",
    sourcePath: "canonical",
    fallbackUsed: false,
    sourceKind: "rpc:warehouse_issue_queue_scope_v4",
    contractVersion: "v4",
    reason: null,
  },
  integrityState: {
    mode: "healthy",
    failureClass: null,
    freshness: "fresh",
    reason: null,
    message: null,
    cacheUsed: false,
    cooldownActive: false,
    cooldownReason: null,
  },
  metrics: {
    stage_a_ms: 0,
    stage_b_ms: 0,
    fallback_missing_ids_count: 0,
    enriched_rows_count: 0,
    page0_required_repair: false,
  },
}) as Awaited<ReturnType<typeof apiFetchReqHeadsWindow>>;

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
        supported: true,
        repStock: [createStockRow("MAT-1")],
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

  it("aborts pending warehouse reports when a newer report scope starts", async () => {
    const reportSignals: AbortSignal[] = [];
    const incomingSignals: AbortSignal[] = [];
    const reportResolvers: (() => void)[] = [];
    const incomingResolvers: (() => void)[] = [];
    mockApiFetchReports.mockImplementation(((_supabase, from, _to, options) => {
      reportSignals.push(options?.signal as AbortSignal);
      return new Promise((resolve) => {
        reportResolvers.push(() =>
          resolve({
            supported: true,
            repStock: [createStockRow(`STOCK-${from}`)],
            repMov: [],
            repIssues: [],
          }),
        );
      }) as ReturnType<typeof apiFetchReports>;
    }) as typeof apiFetchReports);
    mockApiFetchIncomingReports.mockImplementation(((_supabase, params, options) => {
      incomingSignals.push(options?.signal as AbortSignal);
      return new Promise((resolve) => {
        incomingResolvers.push(() =>
          resolve([{ incoming_id: `IN-${params.from}` }]),
        );
      }) as ReturnType<typeof apiFetchIncomingReports>;
    }) as typeof apiFetchIncomingReports);

    let api: ReturnType<typeof useWarehouseReportsData> | null = null;
    function Harness() {
      api = useWarehouseReportsData({
        supabase: {} as never,
        periodFrom: "",
        periodTo: "",
      });
      return null;
    }

    act(() => {
      TestRenderer.create(<Harness />);
    });

    const first = api?.fetchReports({ from: "old", to: "" }) ?? Promise.resolve();
    await act(async () => {
      await Promise.resolve();
    });
    const second = api?.fetchReports({ from: "new", to: "" }) ?? Promise.resolve();
    await act(async () => {
      await Promise.resolve();
    });

    expect(reportSignals[0]?.aborted).toBe(true);
    expect(incomingSignals[0]?.aborted).toBe(true);
    expect(reportSignals[1]?.aborted).toBe(false);

    await act(async () => {
      reportResolvers[1]?.();
      incomingResolvers[1]?.();
      await second;
      await Promise.resolve();
    });
    expect(api?.repStock).toEqual([expect.objectContaining({ code: "STOCK-new" })]);
    expect(api?.repIncoming).toEqual([expect.objectContaining({ incoming_id: "IN-new" })]);

    await act(async () => {
      reportResolvers[0]?.();
      incomingResolvers[0]?.();
      await first;
      await Promise.resolve();
    });
    expect(api?.repStock).toEqual([expect.objectContaining({ code: "STOCK-new" })]);
    expect(api?.repIncoming).toEqual([expect.objectContaining({ incoming_id: "IN-new" })]);
  });

  it("aborts warehouse reports on hook unmount", async () => {
    let reportSignal: AbortSignal | undefined;
    let incomingSignal: AbortSignal | undefined;
    let resolveReports!: (value: unknown) => void;
    let resolveIncoming!: (value: unknown) => void;
    mockApiFetchReports.mockImplementation(((_supabase, _from, _to, options) => {
      reportSignal = options?.signal ?? undefined;
      return new Promise((resolve) => {
        resolveReports = resolve;
      }) as ReturnType<typeof apiFetchReports>;
    }) as typeof apiFetchReports);
    mockApiFetchIncomingReports.mockImplementation(((_supabase, _params, options) => {
      incomingSignal = options?.signal ?? undefined;
      return new Promise((resolve) => {
        resolveIncoming = resolve;
      }) as ReturnType<typeof apiFetchIncomingReports>;
    }) as typeof apiFetchIncomingReports);

    let api: ReturnType<typeof useWarehouseReportsData> | null = null;
    function Harness() {
      api = useWarehouseReportsData({
        supabase: {} as never,
        periodFrom: "",
        periodTo: "",
      });
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<Harness />);
    });

    const task = api?.fetchReports() ?? Promise.resolve();
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      renderer.unmount();
    });

    expect(reportSignal?.aborted).toBe(true);
    expect(incomingSignal?.aborted).toBe(true);

    await act(async () => {
      resolveReports({
        supported: true,
        repStock: [createStockRow("LATE")],
        repMov: [],
        repIssues: [],
      });
      resolveIncoming([{ incoming_id: "LATE" }]);
      await task;
      await Promise.resolve();
    });
  });

  it("aborts request-head fetches on hook unmount", async () => {
    let reqHeadsSignal: AbortSignal | undefined;
    let resolveReqHeads!: (value: Awaited<ReturnType<typeof apiFetchReqHeadsWindow>>) => void;
    mockApiFetchReqHeadsWindow.mockImplementation(((_supabase, _page, _pageSize, options) => {
      reqHeadsSignal = options?.signal ?? undefined;
      return new Promise((resolve) => {
        resolveReqHeads = resolve;
      }) as ReturnType<typeof apiFetchReqHeadsWindow>;
    }) as typeof apiFetchReqHeadsWindow);

    let api: ReturnType<typeof useWarehouseReqHeads> | null = null;
    function Harness() {
      api = useWarehouseReqHeads({
        supabase: {} as never,
        pageSize: 50,
      });
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<Harness />);
    });

    let task: Promise<void> = Promise.resolve();
    await act(async () => {
      task = api?.fetchReqHeads() ?? Promise.resolve();
      await Promise.resolve();
    });
    act(() => {
      renderer.unmount();
    });

    expect(reqHeadsSignal?.aborted).toBe(true);

    await act(async () => {
      resolveReqHeads(createReqHeadsResult("REQ-LATE"));
      await task;
      await Promise.resolve();
    });
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
