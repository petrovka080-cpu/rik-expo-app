/**
 * useDirectorReportOptionsQuery — React Query owner for director report options.
 *
 * Wave 2 real migration (B-REAL-2): replaces the manual optionsReqSeqRef +
 * optionsRequestRef + manual abort/dedup in fetchReportOptions with
 * TanStack Query query ownership.
 *
 * This is the ONLY path migrated from the 1001-LOC controller.
 * fetchReport, fetchDiscipline, two-phase loading = NOT TOUCHED.
 *
 * Cache discipline:
 * - staleTime: 60s (matches app queryClient default)
 * - gcTime: 5min (matches app queryClient default)
 * - refetchOnWindowFocus: false (mobile-first)
 * - enabled: controlled by caller
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadDirectorReportUiScope,
  type DirectorReportScopeOptionsState,
  type DirectorReportScopeLoadResult,
} from "../../../lib/api/directorReportsScope.service";
import type { DirectorReportFetchMeta } from "../../../lib/api/director_reports";

/** Query key factory for director report options */
export const directorReportOptionsKeys = {
  all: ["director", "reportOptions"] as const,
  period: (from: string, to: string) =>
    ["director", "reportOptions", from, to] as const,
} as const;

/** Shape returned by the query — the options-only portion of scope load */
export type DirectorReportOptionsQueryData = {
  optionsKey: string;
  optionsState: DirectorReportScopeOptionsState;
  optionsMeta: DirectorReportFetchMeta | null;
  optionsFromCache: boolean;
};

/**
 * Fetch function — loads scope with includeDiscipline=false, skipDisciplinePrices=true,
 * then extracts only the options portion.
 *
 * This is exactly what fetchReportOptions did internally.
 */
async function fetchDirectorReportOptions(
  from: string,
  to: string,
  objectName: string | null,
  currentOptionsState: DirectorReportScopeOptionsState | null,
  signal?: AbortSignal,
): Promise<DirectorReportOptionsQueryData> {
  const scopeLoad: DirectorReportScopeLoadResult = await loadDirectorReportUiScope({
    from,
    to,
    objectName,
    optionsState: currentOptionsState,
    includeDiscipline: false,
    skipDisciplinePrices: true,
    signal,
  });

  return {
    optionsKey: scopeLoad.optionsKey,
    optionsState: scopeLoad.optionsState,
    optionsMeta: scopeLoad.optionsMeta,
    optionsFromCache: scopeLoad.optionsFromCache,
  };
}

/**
 * React Query hook for director report options.
 *
 * Replaces:
 * - optionsReqSeqRef (manual dedup counter)
 * - optionsRequestRef (manual AbortController slot)
 * - manual throwIfAborted / isAbortError handling
 * - manual request slot lifecycle (start/isActive/clear)
 *
 * Preserves:
 * - Same data shape (optionsState: {objects, objectIdByName})
 * - Same loadReportScope call with includeDiscipline=false
 * - commitOptionsState caller can use query data
 */
export function useDirectorReportOptionsQuery(params: {
  periodFrom: string;
  periodTo: string;
  objectName: string | null;
  currentOptionsState: DirectorReportScopeOptionsState | null;
  enabled: boolean;
}) {
  const { periodFrom, periodTo, objectName, currentOptionsState, enabled } = params;
  const from = periodFrom ? String(periodFrom).slice(0, 10) : "";
  const to = periodTo ? String(periodTo).slice(0, 10) : "";

  const queryClient = useQueryClient();

  const query = useQuery<DirectorReportOptionsQueryData>({
    queryKey: directorReportOptionsKeys.period(from, to),
    queryFn: ({ signal }) =>
      fetchDirectorReportOptions(from, to, objectName, currentOptionsState, signal),
    enabled,
    refetchOnWindowFocus: false,
  });

  return {
    /** The loaded options state */
    optionsData: query.data ?? null,

    /** Query metadata */
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,

    /** Refetch — replaces the old fetchReportOptions imperative call */
    refetch: query.refetch,

    /** Invalidate — forces fresh fetch */
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: directorReportOptionsKeys.period(from, to),
      }),
  };
}
