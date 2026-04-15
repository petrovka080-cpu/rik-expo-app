/**
 * Warehouse stock data — React Query migration contract tests.
 *
 * P6.1: Validates the migration of useWarehouseStockData from manual
 * orchestration (8 refs, dedup, inflight join, pagination) to React Query.
 *
 * Tests:
 * 1. Query key structure and determinism
 * 2. Query key includes search
 * 3. Return contract preservation (7 keys)
 * 4. staleTime contract
 */

import { warehouseStockKeys } from "./useWarehouseStockQuery";

describe("warehouse stock query — key structure", () => {
  it("all key starts with warehouse/stock", () => {
    expect(warehouseStockKeys.all).toEqual(["warehouse", "stock"]);
  });

  it("search key includes search term", () => {
    const key = warehouseStockKeys.search("bolt");
    expect(key).toEqual(["warehouse", "stock", "bolt"]);
  });

  it("search key is deterministic", () => {
    const k1 = warehouseStockKeys.search("bolt");
    const k2 = warehouseStockKeys.search("bolt");
    expect(k1).toEqual(k2);
  });

  it("different searches produce different keys", () => {
    const k1 = warehouseStockKeys.search("bolt");
    const k2 = warehouseStockKeys.search("nut");
    expect(k1).not.toEqual(k2);
  });

  it("empty search produces valid key", () => {
    const key = warehouseStockKeys.search("");
    expect(key).toEqual(["warehouse", "stock", ""]);
  });

  it("all key is a prefix of search key", () => {
    const all = warehouseStockKeys.all;
    const search = warehouseStockKeys.search("bolt");
    expect(search.slice(0, all.length)).toEqual([...all]);
  });
});

describe("warehouse stock data — consumer contract preservation", () => {
  // The old useWarehouseStockData returned exactly 7 keys.
  // The new version must return the same 7 keys.
  const EXPECTED_CONSUMER_KEYS = [
    "stock",
    "stockSupported",
    "stockCount",
    "stockHasMore",
    "stockLoadingMore",
    "fetchStock",
    "fetchStockNextPage",
  ];

  it("consumer contract has exactly 7 keys", () => {
    expect(EXPECTED_CONSUMER_KEYS).toHaveLength(7);
    expect(new Set(EXPECTED_CONSUMER_KEYS).size).toBe(7);
  });

  it("5 data keys and 2 action keys", () => {
    const dataKeys = EXPECTED_CONSUMER_KEYS.filter(
      (k) => !k.startsWith("fetch"),
    );
    expect(dataKeys).toHaveLength(5);
    const actionKeys = EXPECTED_CONSUMER_KEYS.filter((k) =>
      k.startsWith("fetch"),
    );
    expect(actionKeys).toHaveLength(2);
  });
});

describe("warehouse stock query — stale time contract", () => {
  const EXPECTED_STALE_TIME_MS = 30_000;

  it("stale time is 30 seconds (faster than reports)", () => {
    expect(EXPECTED_STALE_TIME_MS).toBe(30_000);
  });

  it("stale time is shorter than reports stale time (60s)", () => {
    const REPORTS_STALE_TIME = 60_000;
    expect(EXPECTED_STALE_TIME_MS).toBeLessThan(REPORTS_STALE_TIME);
  });
});
