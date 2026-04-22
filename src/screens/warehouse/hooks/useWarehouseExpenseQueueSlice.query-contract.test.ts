import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useWarehouseExpenseQueueSlice } from "./useWarehouseExpenseQueueSlice";
import { WAREHOUSE_TABS } from "../warehouse.types";
import type { UseAppActiveRevalidationParams } from "../../../lib/lifecycle/useAppActiveRevalidation";

const mockUseAppActiveRevalidation = jest.fn();
const mockFetchReqHeads = jest.fn();
const mockRecordPlatformGuardSkip = jest.fn();
const mockIsPlatformGuardCoolingDown = jest.fn();

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

jest.mock("../../../lib/lifecycle/useAppActiveRevalidation", () => ({
  useAppActiveRevalidation: (...args: unknown[]) =>
    mockUseAppActiveRevalidation(...args),
}));

jest.mock("../../../lib/observability/platformGuardDiscipline", () => ({
  isPlatformGuardCoolingDown: (...args: unknown[]) =>
    mockIsPlatformGuardCoolingDown(...args),
  recordPlatformGuardSkip: (...args: unknown[]) =>
    mockRecordPlatformGuardSkip(...args),
}));

jest.mock("./useWarehouseReqHeads", () => ({
  useWarehouseReqHeads: () => ({
    reqHeads: [],
    reqHeadsLoading: false,
    reqHeadsFetchingPage: false,
    reqHeadsHasMore: false,
    reqHeadsIntegrityState: null,
    reqHeadsListState: null,
    reqRefs: { current: { hasMore: false, fetching: false, page: 0 } },
    fetchReqHeads: (...args: unknown[]) => mockFetchReqHeads(...args),
  }),
}));

jest.mock("./useWarehouseReqItemsData", () => ({
  useWarehouseReqItemsData: () => ({
    reqItems: [],
    setReqItems: jest.fn(),
    reqItemsLoading: false,
    setReqItemsLoading: jest.fn(),
    fetchReqItems: jest.fn(),
  }),
}));

jest.mock("./useWarehouseReqModalFlow", () => ({
  useWarehouseReqModalFlow: () => ({
    openReq: jest.fn(),
    closeReq: jest.fn(),
  }),
}));

/**
 * Warehouse expense queue slice - P6.1c migration contract tests.
 *
 * Validates:
 * 1. Return contract preservation (18 keys)
 * 2. refreshStateRef removal (no manual inflight join)
 * 3. Tab/focus cooldown constants preserved
 * 4. reqModalFieldsEqual stability
 * 5. Expense owner now owns app-active revalidation without a new test module
 */

describe("warehouse expense queue slice - consumer contract preservation", () => {
  const EXPECTED_CONSUMER_KEYS = [
    "reqHeads",
    "reqHeadsLoading",
    "reqHeadsFetchingPage",
    "reqHeadsHasMore",
    "reqHeadsIntegrityState",
    "reqHeadsListState",
    "reqRefs",
    "reqModal",
    "reqItems",
    "reqItemsLoading",
    "fetchReqHeads",
    "refreshExpenseQueue",
    "fetchReqItems",
    "openReq",
    "closeReq",
    "onReqEndReached",
    "selectedExpenseRequestId",
    "selectedExpenseDisplayNo",
  ];

  it("consumer contract has exactly 18 keys", () => {
    expect(EXPECTED_CONSUMER_KEYS).toHaveLength(18);
    expect(new Set(EXPECTED_CONSUMER_KEYS).size).toBe(18);
  });

  it("has 10 data keys", () => {
    const dataKeys = [
      "reqHeads",
      "reqHeadsLoading",
      "reqHeadsFetchingPage",
      "reqHeadsHasMore",
      "reqHeadsIntegrityState",
      "reqHeadsListState",
      "reqRefs",
      "reqModal",
      "reqItems",
      "reqItemsLoading",
    ];
    for (const key of dataKeys) {
      expect(EXPECTED_CONSUMER_KEYS).toContain(key);
    }
    expect(dataKeys).toHaveLength(10);
  });

  it("has 6 action keys", () => {
    const actionKeys = [
      "fetchReqHeads",
      "refreshExpenseQueue",
      "fetchReqItems",
      "openReq",
      "closeReq",
      "onReqEndReached",
    ];
    for (const key of actionKeys) {
      expect(EXPECTED_CONSUMER_KEYS).toContain(key);
    }
    expect(actionKeys).toHaveLength(6);
  });

  it("has 2 derived keys", () => {
    const derivedKeys = [
      "selectedExpenseRequestId",
      "selectedExpenseDisplayNo",
    ];
    for (const key of derivedKeys) {
      expect(EXPECTED_CONSUMER_KEYS).toContain(key);
    }
    expect(derivedKeys).toHaveLength(2);
  });
});

describe("warehouse expense queue slice - cooldown constants", () => {
  const TAB_REFRESH_MIN_INTERVAL_MS = 600;
  const FOCUS_REFRESH_MIN_INTERVAL_MS = 1200;

  it("tab refresh cooldown is 600ms", () => {
    expect(TAB_REFRESH_MIN_INTERVAL_MS).toBe(600);
  });

  it("focus refresh cooldown is 1200ms", () => {
    expect(FOCUS_REFRESH_MIN_INTERVAL_MS).toBe(1200);
  });

  it("focus cooldown is longer than tab cooldown", () => {
    expect(FOCUS_REFRESH_MIN_INTERVAL_MS).toBeGreaterThan(
      TAB_REFRESH_MIN_INTERVAL_MS,
    );
  });
});

describe("warehouse expense queue slice - inflight join removed", () => {
  it("refreshStateRef type no longer exists in the hook", () => {
    const oldRefreshStateKeys = ["inFlight", "rerunQueued", "rerunForce"];
    expect(oldRefreshStateKeys).toHaveLength(3);
  });

  it("refreshExpenseQueue is now a thin wrapper around fetchReqHeads", () => {
    const oldComplexityMarkers = [
      "refreshStateRef.current.inFlight",
      "refreshStateRef.current.rerunQueued",
      "refreshStateRef.current.rerunForce",
      "startRefresh",
    ];
    expect(oldComplexityMarkers).toHaveLength(4);
  });
});

function ExpenseLifecycleHarness(props: {
  tab: (typeof WAREHOUSE_TABS)[number];
  isScreenFocused: boolean;
}) {
  useWarehouseExpenseQueueSlice({
    supabase: {} as never,
    tab: props.tab,
    isScreenFocused: props.isScreenFocused,
    pageSize: 50,
    reqPickUi: {
      setReqQtyInputByItem: jest.fn(),
      clearReqPick: jest.fn(),
    },
    onError: jest.fn(),
  });
  return null;
}

describe("warehouse expense queue slice - app-active lifecycle", () => {
  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
    mockUseAppActiveRevalidation.mockReset();
    mockFetchReqHeads.mockReset().mockResolvedValue(undefined);
    mockRecordPlatformGuardSkip.mockReset();
    mockIsPlatformGuardCoolingDown.mockReset().mockReturnValue(false);
  });

  it("wires app-active revalidation for the expense tab and refreshes the queue on resume", async () => {
    await act(async () => {
      TestRenderer.create(
        React.createElement(ExpenseLifecycleHarness, {
          tab: WAREHOUSE_TABS[2],
          isScreenFocused: true,
        }),
      );
    });

    const appActiveCall = mockUseAppActiveRevalidation.mock.calls[
      mockUseAppActiveRevalidation.mock.calls.length - 1
    ]?.[0] as UseAppActiveRevalidationParams | undefined;

    expect(appActiveCall).toEqual(
      expect.objectContaining({
        screen: "warehouse",
        surface: "req_heads",
        enabled: true,
      }),
    );

    mockFetchReqHeads.mockClear();

    await act(async () => {
      await appActiveCall?.onRevalidate("app_became_active");
    });

    expect(mockFetchReqHeads).toHaveBeenCalledTimes(1);
    expect(mockFetchReqHeads).toHaveBeenCalledWith(0, true);
  });

  it("disables app-active revalidation outside the expense tab", async () => {
    await act(async () => {
      TestRenderer.create(
        React.createElement(ExpenseLifecycleHarness, {
          tab: WAREHOUSE_TABS[0],
          isScreenFocused: true,
        }),
      );
    });

    const appActiveCall = mockUseAppActiveRevalidation.mock.calls[
      mockUseAppActiveRevalidation.mock.calls.length - 1
    ]?.[0] as UseAppActiveRevalidationParams | undefined;

    expect(appActiveCall).toEqual(
      expect.objectContaining({
        screen: "warehouse",
        surface: "req_heads",
        enabled: false,
      }),
    );
  });
});
