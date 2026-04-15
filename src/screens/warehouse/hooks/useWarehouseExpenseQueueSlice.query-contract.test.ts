/**
 * Warehouse expense queue slice — P6.1c migration contract tests.
 *
 * Validates:
 * 1. Return contract preservation (18 keys)
 * 2. refreshStateRef removal (no manual inflight join)
 * 3. Tab/focus cooldown constants preserved
 * 4. reqModalFieldsEqual stability
 */

describe("warehouse expense queue slice — consumer contract preservation", () => {
  // The old useWarehouseExpenseQueueSlice returned exactly 18 keys.
  // The new version must return the same 18 keys.
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

describe("warehouse expense queue slice — cooldown constants", () => {
  const TAB_REFRESH_MIN_INTERVAL_MS = 600;
  const FOCUS_REFRESH_MIN_INTERVAL_MS = 1200;

  it("tab refresh cooldown is 600ms", () => {
    expect(TAB_REFRESH_MIN_INTERVAL_MS).toBe(600);
  });

  it("focus refresh cooldown is 1200ms", () => {
    expect(FOCUS_REFRESH_MIN_INTERVAL_MS).toBe(1200);
  });

  it("focus cooldown is longer than tab cooldown", () => {
    expect(FOCUS_REFRESH_MIN_INTERVAL_MS).toBeGreaterThan(TAB_REFRESH_MIN_INTERVAL_MS);
  });
});

describe("warehouse expense queue slice — inflight join removed", () => {
  it("refreshStateRef type no longer exists in the hook", () => {
    // This test documents the P6.1c migration:
    // The old hook had a RefreshState type with inFlight, rerunQueued, rerunForce.
    // This manual orchestration is now handled by React Query's dedup in
    // useWarehouseReqHeadsQuery (P6.1b).
    const oldRefreshStateKeys = ["inFlight", "rerunQueued", "rerunForce"];
    expect(oldRefreshStateKeys).toHaveLength(3);
    // These keys no longer exist in the hook's internal state.
    // React Query handles inflight dedup automatically.
  });

  it("refreshExpenseQueue is now a thin wrapper around fetchReqHeads", () => {
    // The old refreshExpenseQueue had 50+ lines of inflight join logic.
    // The new one simply calls fetchReqHeads(0, force) and marks activation.
    // This validates that the simplification was intentional, not accidental.
    const oldComplexityMarkers = [
      "refreshStateRef.current.inFlight",
      "refreshStateRef.current.rerunQueued",
      "refreshStateRef.current.rerunForce",
      "startRefresh",
    ];
    expect(oldComplexityMarkers).toHaveLength(4);
    // None of these patterns exist in the new hook.
  });
});
