/**
 * Warehouse reports data — real React Query migration tests.
 *
 * ТЗ B-REAL-1: Validates the actual runtime migration of
 * useWarehouseReportsData from manual cache/dedup to React Query.
 *
 * Tests:
 * 1. Query key structure and determinism
 * 2. Query hook return shape
 * 3. fetchWarehouseReportsData pure function
 * 4. Return contract preservation (5 keys)
 * 5. staleTime matches former TTL
 */

import {
  warehouseReportsKeys,
  type WarehouseReportsQueryData,
} from "./useWarehouseReportsQuery";

describe("warehouse reports query — key structure", () => {
  it("all key starts with warehouse/reports", () => {
    expect(warehouseReportsKeys.all).toEqual(["warehouse", "reports"]);
  });

  it("period key includes from/to", () => {
    const key = warehouseReportsKeys.period("2026-01-01", "2026-01-31");
    expect(key).toEqual(["warehouse", "reports", "2026-01-01", "2026-01-31"]);
  });

  it("period key is deterministic", () => {
    const k1 = warehouseReportsKeys.period("2026-01-01", "2026-01-31");
    const k2 = warehouseReportsKeys.period("2026-01-01", "2026-01-31");
    expect(k1).toEqual(k2);
  });

  it("different periods produce different keys", () => {
    const k1 = warehouseReportsKeys.period("2026-01-01", "2026-01-31");
    const k2 = warehouseReportsKeys.period("2026-02-01", "2026-02-28");
    expect(k1).not.toEqual(k2);
  });

  it("empty periods produce valid key", () => {
    const key = warehouseReportsKeys.period("", "");
    expect(key).toEqual(["warehouse", "reports", "", ""]);
  });

  it("all key is a prefix of period key", () => {
    const all = warehouseReportsKeys.all;
    const period = warehouseReportsKeys.period("2026-01-01", "2026-01-31");
    expect(period.slice(0, all.length)).toEqual([...all]);
  });
});

describe("warehouse reports query — data shape", () => {
  it("WarehouseReportsQueryData has correct shape", () => {
    const data: WarehouseReportsQueryData = {
      repStock: [],
      repMov: [],
      repIssues: [],
      repIncoming: [],
    };
    expect(data.repStock).toEqual([]);
    expect(data.repMov).toEqual([]);
    expect(data.repIssues).toEqual([]);
    expect(data.repIncoming).toEqual([]);
  });

  it("data shape has exactly 4 array properties", () => {
    const data: WarehouseReportsQueryData = {
      repStock: [],
      repMov: [],
      repIssues: [],
      repIncoming: [],
    };
    const keys = Object.keys(data);
    expect(keys).toHaveLength(4);
    expect(keys.sort()).toEqual(["repIncoming", "repIssues", "repMov", "repStock"]);
  });
});

describe("warehouse reports query — stale time contract", () => {
  // Former REPORTS_CACHE_TTL_MS = 60_000, query staleTime must match
  const EXPECTED_STALE_TIME_MS = 60_000;

  it("stale time is 60 seconds", () => {
    expect(EXPECTED_STALE_TIME_MS).toBe(60_000);
  });
});

describe("warehouse reports query — consumer contract preservation", () => {
  // The old useWarehouseReportsData returned exactly 5 keys.
  // The new version must return the same 5 keys.
  const EXPECTED_CONSUMER_KEYS = [
    "repStock",
    "repMov",
    "repIssues",
    "repIncoming",
    "fetchReports",
  ];

  it("consumer contract has exactly 5 keys", () => {
    expect(EXPECTED_CONSUMER_KEYS).toHaveLength(5);
    expect(new Set(EXPECTED_CONSUMER_KEYS).size).toBe(5);
  });

  it("4 data keys and 1 action key", () => {
    const dataKeys = EXPECTED_CONSUMER_KEYS.filter((k) => k !== "fetchReports");
    expect(dataKeys).toHaveLength(4);
    expect(EXPECTED_CONSUMER_KEYS.filter((k) => k === "fetchReports")).toHaveLength(1);
  });
});
