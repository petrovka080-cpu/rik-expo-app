import { useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";
import { useWarehouseReportsQuery } from "./useWarehouseReportsQuery";

/**
 * useWarehouseReportsData — public API boundary for warehouse reports.
 *
 * Wave 2 real migration: fetch ownership is now delegated to
 * useWarehouseReportsQuery (React Query). This hook preserves
 * the exact same return contract for all consumers.
 *
 * Removed:
 * - Manual reportsCacheRef (Map) — replaced by query cache
 * - Manual reportsReqSeqRef (dedup counter) — replaced by query dedup
 * - Manual reportsRequestRef (AbortController slot) — replaced by query cancellation
 * - Manual TTL check — replaced by staleTime: 60s
 *
 * Preserved:
 * - Same return shape: { repStock, repMov, repIssues, repIncoming, fetchReports }
 * - Same consumer contract
 * - Screen activity check
 */
export function useWarehouseReportsData(params: {
  supabase: SupabaseClient;
  periodFrom: string;
  periodTo: string;
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const { supabase, periodFrom, periodTo } = params;
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);

  const query = useWarehouseReportsQuery({
    supabase,
    periodFrom,
    periodTo,
    enabled: isWarehouseScreenActive(screenActiveRef),
  });

  /**
   * fetchReports — imperative refetch for backward compatibility.
   *
   * Consumers call this for:
   * - manual refresh button
   * - realtime push reload
   * - period change reload
   *
   * Under the hood, this now delegates to React Query invalidation
   * which triggers a fresh fetch if the query is stale.
   */
  const fetchReports = useCallback(
    async (opts?: { from?: string; to?: string }) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;

      // If caller provides different from/to, the query key changes
      // automatically on next render when periodFrom/periodTo props change.
      // For same-period refetch (manual refresh), invalidate the current query.
      const reqFrom = String(opts?.from ?? periodFrom ?? "").trim();
      const reqTo = String(opts?.to ?? periodTo ?? "").trim();
      const currentFrom = String(periodFrom ?? "").trim();
      const currentTo = String(periodTo ?? "").trim();

      if (reqFrom === currentFrom && reqTo === currentTo) {
        // Same period — invalidate to force refetch
        query.invalidate();
      }
      // Different period — no-op here; the consumer (useWarehouseReportState)
      // will update periodFrom/periodTo causing the query key to change,
      // which automatically triggers a new fetch.
    },
    [periodFrom, periodTo, query, screenActiveRef],
  );

  return {
    repStock: query.repStock,
    repMov: query.repMov,
    repIssues: query.repIssues,
    repIncoming: query.repIncoming,
    fetchReports,
  };
}
