/**
 * directorReports.observability.ts
 *
 * Single owner for all Director Reports lifecycle events.
 * Dual-channel: logger (dev DX) + recordPlatformObservability (prod structured).
 *
 * Rules:
 * - Lightweight metadata only — no payload data, no JSON.stringify of arrays
 * - No side effects beyond logging
 * - No UI state changes
 * - No error swallowing
 */

import { logger } from "../../../lib/logger";
import { recordPlatformObservability } from "../../../lib/observability/platformObservability";

const TAG = "director_reports";

type QueryMeta = {
  key?: string;
  objectName?: string | null;
  tab?: string;
};

type QueryResultMeta = QueryMeta & {
  durationMs?: number;
  resultSize?: number;
  fromCache?: boolean;
};

type QueryErrorMeta = QueryMeta & {
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
};

type AbortMeta = {
  key?: string;
  reason: string;
};

type FilterMeta = {
  prevObjectName?: string | null;
  nextObjectName?: string | null;
};

type CommitMeta = {
  key: string;
  itemCount?: number;
  fromCache?: boolean;
};

// ── QUERY ──────────────────────────────────────────

export function emitQueryStart(meta: QueryMeta): void {
  logger.info(TAG, "query_start", meta);
  recordPlatformObservability({
    screen: "director",
    surface: "reports_query",
    category: "fetch",
    event: "director_reports_query_start",
    result: "success",
    extra: { key: meta.key, objectName: meta.objectName ?? null, tab: meta.tab },
  });
}

export function emitQuerySuccess(meta: QueryResultMeta): void {
  logger.info(TAG, "query_success", meta);
  recordPlatformObservability({
    screen: "director",
    surface: "reports_query",
    category: "fetch",
    event: "director_reports_query_success",
    result: "success",
    durationMs: meta.durationMs,
    rowCount: meta.resultSize,
    extra: { key: meta.key, fromCache: meta.fromCache ?? false },
  });
}

export function emitQueryError(meta: QueryErrorMeta): void {
  logger.error(TAG, "query_error", meta);
  recordPlatformObservability({
    screen: "director",
    surface: "reports_query",
    category: "fetch",
    event: "director_reports_query_error",
    result: "error",
    durationMs: meta.durationMs,
    errorClass: meta.errorCode,
    errorMessage: meta.errorMessage,
    extra: { key: meta.key },
  });
}

// ── ABORT ──────────────────────────────────────────

export function emitQueryAbort(meta: AbortMeta): void {
  logger.warn(TAG, "query_abort", meta);
  recordPlatformObservability({
    screen: "director",
    surface: "reports_query",
    category: "fetch",
    event: "director_reports_query_abort",
    result: "skipped",
    extra: { key: meta.key, guardReason: meta.reason },
  });
}

// ── REFRESH ────────────────────────────────────────

export function emitRefreshStart(meta: QueryMeta): void {
  logger.info(TAG, "refresh_start", meta);
  recordPlatformObservability({
    screen: "director",
    surface: "reports_refresh",
    category: "fetch",
    event: "director_reports_refresh_start",
    result: "success",
    extra: { key: meta.key, objectName: meta.objectName ?? null },
  });
}

export function emitRefreshSuccess(meta: QueryResultMeta): void {
  logger.info(TAG, "refresh_success", meta);
  recordPlatformObservability({
    screen: "director",
    surface: "reports_refresh",
    category: "fetch",
    event: "director_reports_refresh_success",
    result: "success",
    durationMs: meta.durationMs,
    rowCount: meta.resultSize,
    extra: { key: meta.key },
  });
}

export function emitRefreshError(meta: QueryErrorMeta): void {
  logger.error(TAG, "refresh_error", meta);
  recordPlatformObservability({
    screen: "director",
    surface: "reports_refresh",
    category: "fetch",
    event: "director_reports_refresh_error",
    result: "error",
    durationMs: meta.durationMs,
    errorMessage: meta.errorMessage,
    extra: { key: meta.key },
  });
}

// ── FILTERS ────────────────────────────────────────

export function emitFiltersChanged(meta: FilterMeta): void {
  logger.info(TAG, "filters_changed", meta);
  recordPlatformObservability({
    screen: "director",
    surface: "reports_filters",
    category: "ui",
    event: "director_reports_filters_changed",
    result: "success",
    extra: {
      prevObjectName: meta.prevObjectName ?? null,
      nextObjectName: meta.nextObjectName ?? null,
    },
  });
}

// ── COMMIT ─────────────────────────────────────────

export function emitCommitOptions(meta: CommitMeta): void {
  logger.info(TAG, "commit_options", meta);
  recordPlatformObservability({
    screen: "director",
    surface: "reports_commit",
    category: "ui",
    event: "director_reports_commit_options",
    result: "success",
    rowCount: meta.itemCount,
    extra: { key: meta.key, fromCache: meta.fromCache ?? false },
  });
}

export function emitCommitReport(meta: CommitMeta): void {
  logger.info(TAG, "commit_report", meta);
  recordPlatformObservability({
    screen: "director",
    surface: "reports_commit",
    category: "ui",
    event: "director_reports_commit_report",
    result: "success",
    rowCount: meta.itemCount,
    extra: { key: meta.key, fromCache: meta.fromCache ?? false },
  });
}

export function emitCommitDiscipline(meta: CommitMeta): void {
  logger.info(TAG, "commit_discipline", meta);
  recordPlatformObservability({
    screen: "director",
    surface: "reports_commit",
    category: "ui",
    event: "director_reports_commit_discipline",
    result: "success",
    rowCount: meta.itemCount,
    extra: { key: meta.key, fromCache: meta.fromCache ?? false },
  });
}

// ── OPEN ───────────────────────────────────────────

export function emitOpenReports(meta: QueryMeta): void {
  logger.info(TAG, "open_reports", meta);
  recordPlatformObservability({
    screen: "director",
    surface: "reports_open",
    category: "ui",
    event: "director_reports_open",
    result: "success",
    extra: { key: meta.key, objectName: meta.objectName ?? null },
  });
}
