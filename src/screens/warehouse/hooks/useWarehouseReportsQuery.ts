/**
 * useWarehouseReportsQuery — React Query owner for warehouse reports.
 *
 * Wave 2 real migration: replaces the manual reportsCacheRef + dedup
 * in useWarehouseReportsData with TanStack Query query ownership.
 *
 * Cache discipline:
 * - staleTime: 60s (matches former REPORTS_CACHE_TTL_MS)
 * - gcTime: 5min (matches app queryClient default)
 * - refetchOnWindowFocus: false (mobile-first)
 * - enabled: controlled by caller (screen active check)
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  apiFetchIncomingReports,
  apiFetchReports,
} from "../warehouse.stock.read";
import type { StockRow, WarehouseReportRow } from "../warehouse.types";

/** Query key factory for warehouse reports */
export const warehouseReportsKeys = {
  all: ["warehouse", "reports"] as const,
  period: (from: string, to: string) =>
    ["warehouse", "reports", from, to] as const,
} as const;

/** Shape returned by the query */
export type WarehouseReportsQueryData = {
  repStock: StockRow[];
  repMov: WarehouseReportRow[];
  repIssues: WarehouseReportRow[];
  repIncoming: WarehouseReportRow[];
};

const REPORTS_STALE_TIME = 60_000; // 60s — same as former manual TTL

/**
 * Fetch function — fetches both reports + incoming in parallel.
 * This is the exact same logic that was inside fetchReports()
 * in useWarehouseReportsData, extracted as a pure async function.
 */
async function fetchWarehouseReportsData(
  supabase: SupabaseClient,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<WarehouseReportsQueryData> {
  const [r, inc] = await Promise.all([
    apiFetchReports(supabase, from, to, { signal }),
    apiFetchIncomingReports(supabase, { from, to }, { signal }),
  ]);

  return {
    repStock: r.repStock || [],
    repMov: (r.repMov || []) as WarehouseReportRow[],
    repIssues: (r.repIssues || []) as WarehouseReportRow[],
    repIncoming: (inc as WarehouseReportRow[]) || [],
  };
}

/**
 * React Query hook for warehouse reports.
 *
 * Replaces:
 * - manual reportsCacheRef (Map)
 * - manual reportsReqSeqRef (dedup counter)
 * - manual reportsRequestRef (AbortController slot)
 * - manual TTL check
 *
 * Preserves:
 * - same staleTime as former REPORTS_CACHE_TTL_MS (60s)
 * - automatic cancellation on unmount (query layer)
 * - automatic dedup (query layer)
 * - same data shape
 */
export function useWarehouseReportsQuery(params: {
  supabase: SupabaseClient;
  periodFrom: string;
  periodTo: string;
  enabled: boolean;
}) {
  const { supabase, periodFrom, periodTo, enabled } = params;
  const from = String(periodFrom ?? "").trim();
  const to = String(periodTo ?? "").trim();

  const queryClient = useQueryClient();

  const query = useQuery<WarehouseReportsQueryData>({
    queryKey: warehouseReportsKeys.period(from, to),
    queryFn: ({ signal }) => fetchWarehouseReportsData(supabase, from, to, signal),
    staleTime: REPORTS_STALE_TIME,
    enabled,
    refetchOnWindowFocus: false,
  });

  return {
    /** Same shape as former useWarehouseReportsData return */
    repStock: query.data?.repStock ?? [],
    repMov: query.data?.repMov ?? [],
    repIssues: query.data?.repIssues ?? [],
    repIncoming: query.data?.repIncoming ?? [],

    /** Query metadata for consumers */
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,

    /** Refetch — replaces the old fetchReports imperative call */
    refetch: query.refetch,

    /**
     * Imperative invalidation — forces fresh fetch on next render.
     * Use for realtime pushes or manual refresh buttons.
     */
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: warehouseReportsKeys.period(from, to),
      }),
  };
}
