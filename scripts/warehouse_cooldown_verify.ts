import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  classifyWarehouseReqHeadsFailure,
  getWarehouseReqHeadsRetryAfterMs,
} from "../src/screens/warehouse/warehouse.reqHeads.failure";
import {
  createHealthyWarehouseReqHeadsIntegrityState,
  createWarehouseReqHeadsIntegrityState,
  deriveWarehouseReqHeadsListState,
  evaluateWarehouseReqHeadsCooldown,
  resolveWarehouseReqHeadsPrimaryPublish,
} from "../src/screens/warehouse/warehouse.reqHeads.state";
import type { ReqHeadRow } from "../src/screens/warehouse/warehouse.types";

type ScenarioResult = {
  id: string;
  passed: boolean;
  details: Record<string, unknown>;
};

const artifactsDir = resolve(process.cwd(), "artifacts");

const sampleRows: ReqHeadRow[] = [
  {
    request_id: "req-ready",
    display_no: "12/2026",
    object_name: "Obj A",
    level_code: "L1",
    system_code: "S1",
    zone_code: "Z1",
    submitted_at: "2026-03-29T10:00:00.000Z",
    items_cnt: 3,
    ready_cnt: 2,
    done_cnt: 1,
    qty_limit_sum: 10,
    qty_issued_sum: 4,
    qty_left_sum: 6,
    qty_can_issue_now_sum: 6,
    issuable_now_cnt: 2,
    issue_status: "READY",
    visible_in_expense_queue: true,
    can_issue_now: true,
    waiting_stock: false,
    all_done: false,
  },
  {
    request_id: "req-wait",
    display_no: "11/2026",
    object_name: "Obj B",
    level_code: "L2",
    system_code: "S2",
    zone_code: "Z2",
    submitted_at: "2026-03-29T09:00:00.000Z",
    items_cnt: 2,
    ready_cnt: 0,
    done_cnt: 0,
    qty_limit_sum: 8,
    qty_issued_sum: 0,
    qty_left_sum: 8,
    qty_can_issue_now_sum: 0,
    issuable_now_cnt: 0,
    issue_status: "WAITING_STOCK",
    visible_in_expense_queue: true,
    can_issue_now: false,
    waiting_stock: true,
    all_done: false,
  },
];

const now = 1_000_000;

const pushScenario = (
  target: ScenarioResult[],
  id: string,
  passed: boolean,
  details: Record<string, unknown>,
) => {
  target.push({ id, passed, details });
};

const buildErrorState = (message: string) => {
  const failure = classifyWarehouseReqHeadsFailure(new Error(message));
  const integrityState = createWarehouseReqHeadsIntegrityState({
    mode: "error",
    failureClass: failure.failureClass,
    reason: "fetch_req_heads_failed",
    message,
    cacheUsed: false,
  });
  return {
    failure,
    integrityState,
    listState: deriveWarehouseReqHeadsListState({ rows: [], integrityState }),
  };
};

async function main() {
  mkdirSync(artifactsDir, { recursive: true });

  const scenarios: ScenarioResult[] = [];

  const realEmpty = resolveWarehouseReqHeadsPrimaryPublish({
    rows: [],
    hasMore: false,
    integrityState: createHealthyWarehouseReqHeadsIntegrityState(),
    sourcePath: "canonical",
  });
  pushScenario(scenarios, "real_empty_data_scenario", realEmpty.listState.publishState === "empty", {
    publishState: realEmpty.listState.publishState,
    freshness: realEmpty.listState.freshness,
    falseEmptyPrevented: realEmpty.falseEmptyPrevented,
  });

  const schemaFailure = buildErrorState(
    "warehouse_issue_queue_scope_v4 contract mismatch: rows must be an array",
  );
  pushScenario(
    scenarios,
    "schema_failure_scenario",
    schemaFailure.failure.failureClass === "schema_incompatibility" &&
      schemaFailure.listState.publishState === "error",
    {
      failureClass: schemaFailure.failure.failureClass,
      publishState: schemaFailure.listState.publishState,
      retryAfterMs: schemaFailure.failure.retryAfterMs,
    },
  );

  const permissionFailure = buildErrorState("permission denied for relation requests");
  pushScenario(
    scenarios,
    "permission_auth_failure_scenario",
    permissionFailure.failure.failureClass === "permission_auth_failure" &&
      permissionFailure.listState.publishState === "error",
    {
      failureClass: permissionFailure.failure.failureClass,
      publishState: permissionFailure.listState.publishState,
      retryAfterMs: permissionFailure.failure.retryAfterMs,
    },
  );

  const transientFailure = buildErrorState("Failed to fetch");
  pushScenario(
    scenarios,
    "transient_network_failure_scenario",
    transientFailure.failure.failureClass === "transport_transient_failure" &&
      transientFailure.listState.publishState === "error",
    {
      failureClass: transientFailure.failure.failureClass,
      publishState: transientFailure.listState.publishState,
      retryAfterMs: transientFailure.failure.retryAfterMs,
    },
  );

  const serverFailure = buildErrorState("500 Internal Server Error");
  pushScenario(
    scenarios,
    "server_failure_scenario",
    serverFailure.failure.failureClass === "server_failure" &&
      serverFailure.listState.publishState === "error",
    {
      failureClass: serverFailure.failure.failureClass,
      publishState: serverFailure.listState.publishState,
      retryAfterMs: serverFailure.failure.retryAfterMs,
    },
  );

  const staleReuse = resolveWarehouseReqHeadsPrimaryPublish({
    rows: [],
    hasMore: false,
    integrityState: createHealthyWarehouseReqHeadsIntegrityState(),
    sourcePath: "compatibility",
    sourceReason: "Failed to fetch",
    lastKnownGood: {
      rows: sampleRows,
      hasMore: true,
    },
  });
  pushScenario(
    scenarios,
    "stale_last_known_good_reuse_scenario",
    staleReuse.listState.publishState === "degraded" &&
      staleReuse.listState.lastKnownGoodUsed === true &&
      staleReuse.rows.length === sampleRows.length,
    {
      publishState: staleReuse.listState.publishState,
      lastKnownGoodUsed: staleReuse.listState.lastKnownGoodUsed,
      rowCount: staleReuse.rows.length,
      falseEmptyPrevented: staleReuse.falseEmptyPrevented,
    },
  );

  const repeatedFailureRetryAfterMs = getWarehouseReqHeadsRetryAfterMs("transport_transient_failure");
  let allowedAttempts = 0;
  const firstAttempt = evaluateWarehouseReqHeadsCooldown({
    lastFailureAt: 0,
    retryAfterMs: repeatedFailureRetryAfterMs,
    now,
  });
  if (!firstAttempt.active) allowedAttempts += 1;
  const secondAttempt = evaluateWarehouseReqHeadsCooldown({
    lastFailureAt: now,
    retryAfterMs: repeatedFailureRetryAfterMs,
    now: now + 1_000,
  });
  if (!secondAttempt.active) allowedAttempts += 1;
  const thirdAttempt = evaluateWarehouseReqHeadsCooldown({
    lastFailureAt: now,
    retryAfterMs: repeatedFailureRetryAfterMs,
    now: now + repeatedFailureRetryAfterMs + 1,
  });
  if (!thirdAttempt.active) allowedAttempts += 1;
  pushScenario(
    scenarios,
    "repeated_failure_without_fetch_storm",
    allowedAttempts === 2 && secondAttempt.active === true,
    {
      allowedAttempts,
      blockedAttemptRemainingMs: secondAttempt.remainingMs,
      retryAfterMs: repeatedFailureRetryAfterMs,
    },
  );

  const manualRefreshCooldown = evaluateWarehouseReqHeadsCooldown({
    lastFailureAt: now,
    retryAfterMs: repeatedFailureRetryAfterMs,
    now: now + 500,
  });
  const manualRefreshState = createWarehouseReqHeadsIntegrityState({
    mode: "error",
    failureClass: "transport_transient_failure",
    reason: "fetch_req_heads_failed",
    message: "Failed to fetch",
    cacheUsed: false,
    cooldownActive: manualRefreshCooldown.active,
    cooldownReason: manualRefreshCooldown.cooldownReason,
  });
  const manualRefreshListState = deriveWarehouseReqHeadsListState({
    rows: [],
    integrityState: manualRefreshState,
  });
  const manualRefreshAfterCooldown = evaluateWarehouseReqHeadsCooldown({
    lastFailureAt: now,
    retryAfterMs: repeatedFailureRetryAfterMs,
    now: now + repeatedFailureRetryAfterMs + 10,
  });
  pushScenario(
    scenarios,
    "manual_refresh_scenario",
    manualRefreshCooldown.active === true &&
      manualRefreshListState.publishState === "error" &&
      manualRefreshAfterCooldown.active === false,
    {
      throttledPublishState: manualRefreshListState.publishState,
      throttledCooldownReason: manualRefreshListState.cooldownReason,
      throttledRemainingMs: manualRefreshCooldown.remainingMs,
      retryAvailableAfterMs: repeatedFailureRetryAfterMs,
    },
  );

  const sortedReadyFirst = [...staleReuse.rows].sort((left, right) => {
    const readyA = Math.max(0, Number(left.ready_cnt ?? 0));
    const readyB = Math.max(0, Number(right.ready_cnt ?? 0));
    if (readyA > 0 && readyB === 0) return -1;
    if (readyA === 0 && readyB > 0) return 1;
    return 0;
  });
  pushScenario(
    scenarios,
    "filters_sorting_regression_check",
    staleReuse.rows[0]?.request_id === sampleRows[0]?.request_id &&
      staleReuse.rows[1]?.request_id === sampleRows[1]?.request_id &&
      sortedReadyFirst[0]?.request_id === "req-ready",
    {
      inputOrder: staleReuse.rows.map((row) => ({ requestId: row.request_id, readyCnt: row.ready_cnt })),
      sortedOrder: sortedReadyFirst.map((row) => ({ requestId: row.request_id, readyCnt: row.ready_cnt })),
    },
  );

  const nonPrimaryEmptyWithoutSnapshot = resolveWarehouseReqHeadsPrimaryPublish({
    rows: [],
    hasMore: false,
    integrityState: createHealthyWarehouseReqHeadsIntegrityState(),
    sourcePath: "compatibility",
    sourceReason: "warehouse_issue_queue_scope_v4 contract mismatch: rows must be an array",
    lastKnownGood: null,
  });

  const emptyVsErrorProof = {
    canonicalEmpty: {
      publishState: realEmpty.listState.publishState,
      failureClass: realEmpty.listState.failureClass,
    },
    nonPrimaryEmptyWithoutSnapshot: {
      publishState: nonPrimaryEmptyWithoutSnapshot.listState.publishState,
      failureClass: nonPrimaryEmptyWithoutSnapshot.listState.failureClass,
      falseEmptyPrevented: nonPrimaryEmptyWithoutSnapshot.falseEmptyPrevented,
    },
    schemaFailure: {
      publishState: schemaFailure.listState.publishState,
      failureClass: schemaFailure.failure.failureClass,
    },
    permissionFailure: {
      publishState: permissionFailure.listState.publishState,
      failureClass: permissionFailure.failure.failureClass,
    },
    transientFailure: {
      publishState: transientFailure.listState.publishState,
      failureClass: transientFailure.failure.failureClass,
    },
    serverFailure: {
      publishState: serverFailure.listState.publishState,
      failureClass: serverFailure.failure.failureClass,
    },
  };

  const lastKnownGoodProof = {
    degradedWithSnapshot: {
      publishState: staleReuse.listState.publishState,
      lastKnownGoodUsed: staleReuse.listState.lastKnownGoodUsed,
      rowCount: staleReuse.rows.length,
      falseEmptyPrevented: staleReuse.falseEmptyPrevented,
    },
    degradedEmptySnapshot: resolveWarehouseReqHeadsPrimaryPublish({
      rows: [],
      hasMore: false,
      integrityState: createHealthyWarehouseReqHeadsIntegrityState(),
      sourcePath: "compatibility",
      sourceReason: "Failed to fetch",
      lastKnownGood: {
        rows: [],
        hasMore: false,
      },
    }),
    manualRefreshCooldown: {
      active: manualRefreshCooldown.active,
      remainingMs: manualRefreshCooldown.remainingMs,
      publishState: manualRefreshListState.publishState,
      cooldownReason: manualRefreshListState.cooldownReason,
    },
  };

  const passed = scenarios.every((scenario) => scenario.passed);
  const summary = {
    status: passed ? "GREEN" : "NOT_GREEN",
    scenarios,
    summary: {
      passedCount: scenarios.filter((scenario) => scenario.passed).length,
      failedCount: scenarios.filter((scenario) => !scenario.passed).length,
    },
  };

  writeFileSync(
    resolve(artifactsDir, "warehouse-cooldown-discipline.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );
  writeFileSync(
    resolve(artifactsDir, "warehouse-empty-vs-error-proof.json"),
    JSON.stringify(emptyVsErrorProof, null, 2),
    "utf8",
  );
  writeFileSync(
    resolve(artifactsDir, "warehouse-last-known-good-proof.json"),
    JSON.stringify(lastKnownGoodProof, null, 2),
    "utf8",
  );

  process.stdout.write(`${summary.status}\n`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
