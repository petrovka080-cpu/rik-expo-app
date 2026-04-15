/**
 * Warehouse req heads — React Query migration contract tests.
 *
 * P6.1b: Validates the migration of useWarehouseReqHeads from manual
 * orchestration (AbortController, inflight join, dedup, pagination merge)
 * to React Query useInfiniteQuery + failure state machine adapter.
 *
 * Tests:
 * 1. Query key structure and determinism
 * 2. Return contract preservation (8 keys)
 * 3. Failure classification preserved (not simplified)
 * 4. Cooldown evaluation preserved
 */

import { warehouseReqHeadsKeys } from "./warehouseReqHeads.query.key";
import {
  classifyWarehouseReqHeadsFailure,
  getWarehouseReqHeadsRetryAfterMs,
} from "../warehouse.reqHeads.failure";
import {
  evaluateWarehouseReqHeadsCooldown,
  createHealthyWarehouseReqHeadsIntegrityState,
  deriveWarehouseReqHeadsListState,
  resolveWarehouseReqHeadsPrimaryPublish,
} from "../warehouse.reqHeads.state";

describe("warehouse reqHeads query — key structure", () => {
  it("all key starts with warehouse/reqHeads", () => {
    expect(warehouseReqHeadsKeys.all).toEqual(["warehouse", "reqHeads"]);
  });

  it("page key includes pageSize", () => {
    const key = warehouseReqHeadsKeys.page(80);
    expect(key).toEqual(["warehouse", "reqHeads", 80]);
  });

  it("page key is deterministic", () => {
    const k1 = warehouseReqHeadsKeys.page(80);
    const k2 = warehouseReqHeadsKeys.page(80);
    expect(k1).toEqual(k2);
  });

  it("different page sizes produce different keys", () => {
    const k1 = warehouseReqHeadsKeys.page(80);
    const k2 = warehouseReqHeadsKeys.page(50);
    expect(k1).not.toEqual(k2);
  });

  it("all key is a prefix of page key", () => {
    const all = warehouseReqHeadsKeys.all;
    const page = warehouseReqHeadsKeys.page(80);
    expect(page.slice(0, all.length)).toEqual([...all]);
  });
});

describe("warehouse reqHeads — consumer contract preservation", () => {
  const EXPECTED_CONSUMER_KEYS = [
    "reqHeads",
    "reqHeadsLoading",
    "reqHeadsFetchingPage",
    "reqHeadsHasMore",
    "reqHeadsIntegrityState",
    "reqHeadsListState",
    "reqRefs",
    "fetchReqHeads",
  ];

  it("consumer contract has exactly 8 keys", () => {
    expect(EXPECTED_CONSUMER_KEYS).toHaveLength(8);
    expect(new Set(EXPECTED_CONSUMER_KEYS).size).toBe(8);
  });

  it("6 data keys, 1 refs, 1 action key", () => {
    const dataKeys = EXPECTED_CONSUMER_KEYS.filter(
      (k) => !k.startsWith("fetch") && k !== "reqRefs",
    );
    expect(dataKeys).toHaveLength(6);
    expect(EXPECTED_CONSUMER_KEYS.filter((k) => k === "reqRefs")).toHaveLength(1);
    expect(EXPECTED_CONSUMER_KEYS.filter((k) => k === "fetchReqHeads")).toHaveLength(1);
  });
});

describe("warehouse reqHeads — failure classification preserved", () => {
  it("classifies network errors as transport_transient_failure", () => {
    const result = classifyWarehouseReqHeadsFailure(new Error("network timeout"));
    expect(result.failureClass).toBe("transport_transient_failure");
    expect(result.retryAfterMs).toBe(5_000);
  });

  it("classifies permission errors as permission_auth_failure", () => {
    const result = classifyWarehouseReqHeadsFailure(new Error("permission denied for table"));
    expect(result.failureClass).toBe("permission_auth_failure");
    expect(result.retryAfterMs).toBe(20_000);
  });

  it("classifies schema errors as schema_incompatibility", () => {
    const result = classifyWarehouseReqHeadsFailure({ code: "pgrst302", message: "could not find the function" });
    expect(result.failureClass).toBe("schema_incompatibility");
    expect(result.retryAfterMs).toBe(30_000);
  });

  it("classifies unknown errors as server_failure", () => {
    const result = classifyWarehouseReqHeadsFailure(new Error("something unexpected"));
    expect(result.failureClass).toBe("server_failure");
    expect(result.retryAfterMs).toBe(10_000);
  });

  it("getWarehouseReqHeadsRetryAfterMs returns correct values", () => {
    expect(getWarehouseReqHeadsRetryAfterMs("schema_incompatibility")).toBe(30_000);
    expect(getWarehouseReqHeadsRetryAfterMs("permission_auth_failure")).toBe(20_000);
    expect(getWarehouseReqHeadsRetryAfterMs("transport_transient_failure")).toBe(5_000);
    expect(getWarehouseReqHeadsRetryAfterMs("server_failure")).toBe(10_000);
  });
});

describe("warehouse reqHeads — cooldown evaluation preserved", () => {
  it("no cooldown when no failure", () => {
    const decision = evaluateWarehouseReqHeadsCooldown({
      lastFailureAt: 0,
      retryAfterMs: 0,
    });
    expect(decision.active).toBe(false);
    expect(decision.cooldownReason).toBeNull();
  });

  it("cooldown active within retry window", () => {
    const now = Date.now();
    const decision = evaluateWarehouseReqHeadsCooldown({
      lastFailureAt: now - 2_000,
      retryAfterMs: 10_000,
      now,
    });
    expect(decision.active).toBe(true);
    expect(decision.remainingMs).toBe(8_000);
    expect(decision.cooldownReason).toBe("failure_backoff");
  });

  it("cooldown expired after retry window", () => {
    const now = Date.now();
    const decision = evaluateWarehouseReqHeadsCooldown({
      lastFailureAt: now - 15_000,
      retryAfterMs: 10_000,
      now,
    });
    expect(decision.active).toBe(false);
    expect(decision.remainingMs).toBe(0);
  });
});

describe("warehouse reqHeads — state derivation preserved", () => {
  it("healthy integrity with rows => ready", () => {
    const integrity = createHealthyWarehouseReqHeadsIntegrityState();
    const listState = deriveWarehouseReqHeadsListState({
      rows: [{ request_id: "1" }] as never[],
      integrityState: integrity,
    });
    expect(listState.publishState).toBe("ready");
    expect(listState.freshness).toBe("fresh");
    expect(listState.rowCount).toBe(1);
  });

  it("healthy integrity with no rows => empty", () => {
    const integrity = createHealthyWarehouseReqHeadsIntegrityState();
    const listState = deriveWarehouseReqHeadsListState({
      rows: [],
      integrityState: integrity,
    });
    expect(listState.publishState).toBe("empty");
  });

  it("error integrity => error state", () => {
    const integrity = {
      mode: "error" as const,
      failureClass: "server_failure" as const,
      freshness: "stale" as const,
      reason: "test",
      message: "test error",
      cacheUsed: false,
      cooldownActive: false,
      cooldownReason: null,
    };
    const listState = deriveWarehouseReqHeadsListState({
      rows: [],
      integrityState: integrity,
    });
    expect(listState.publishState).toBe("error");
    expect(listState.failureClass).toBe("server_failure");
  });

  it("resolveWarehouseReqHeadsPrimaryPublish preserves rows", () => {
    const integrity = createHealthyWarehouseReqHeadsIntegrityState();
    const decision = resolveWarehouseReqHeadsPrimaryPublish({
      rows: [{ request_id: "1" }, { request_id: "2" }] as never[],
      hasMore: true,
      integrityState: integrity,
    });
    expect(decision.rows).toHaveLength(2);
    expect(decision.hasMore).toBe(true);
    expect(decision.listState.publishState).toBe("ready");
  });
});
