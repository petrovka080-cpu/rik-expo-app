import { useCallback } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";

import { loadDirectorReportUiScope } from "../../../lib/api/directorReportsScope.service";
import { adaptDirectorReportsScopeQueryData } from "./directorReports.query.adapter";
import {
  directorReportsKeys,
  normalizeDirectorReportsScopeQueryParams,
} from "./directorReports.query.key";
import type {
  DirectorReportScopeLoadResult,
  DirectorReportsScopeQueryData,
  DirectorReportsScopeQueryParams,
} from "./directorReports.query.types";

const DIRECTOR_REPORTS_SCOPE_STALE_TIME_MS = 0;

export async function fetchDirectorReportsQueryData(
  params: DirectorReportsScopeQueryParams,
): Promise<DirectorReportsScopeQueryData> {
  const normalized = normalizeDirectorReportsScopeQueryParams(params);
  const scopeLoad = await loadDirectorReportUiScope({
    from: normalized.from,
    to: normalized.to,
    objectName: normalized.objectName,
    optionsState: params.optionsState,
    includeDiscipline: normalized.includeDiscipline,
    skipDisciplinePrices: normalized.skipDisciplinePrices,
    bypassCache: normalized.bypassCache,
    signal: params.signal,
  });

  return adaptDirectorReportsScopeQueryData(scopeLoad);
}

export function useDirectorReportsQuery() {
  const queryClient = useQueryClient();
  const reportsScopeFetching =
    useIsFetching({
      queryKey: directorReportsKeys.all,
    }) > 0;

  const fetchReportsScopeData = useCallback(
    (params: DirectorReportsScopeQueryParams) => {
      const normalized = normalizeDirectorReportsScopeQueryParams(params);
      const queryKey = directorReportsKeys.scope(normalized);

      return queryClient.fetchQuery({
        queryKey,
        staleTime: DIRECTOR_REPORTS_SCOPE_STALE_TIME_MS,
        queryFn: ({ signal }) =>
          fetchDirectorReportsQueryData({
            ...params,
            from: normalized.from,
            to: normalized.to,
            objectName: normalized.objectName,
            objectIdByName: normalized.objectIdByName,
            includeDiscipline: normalized.includeDiscipline,
            skipDisciplinePrices: normalized.skipDisciplinePrices,
            bypassCache: normalized.bypassCache,
            signal: params.signal ?? signal,
          }),
      });
    },
    [queryClient],
  );

  const loadReportsScope = useCallback(
    async (params: DirectorReportsScopeQueryParams): Promise<DirectorReportScopeLoadResult> => {
      const data = await fetchReportsScopeData(params);
      return data.scopeLoad;
    },
    [fetchReportsScopeData],
  );

  const invalidateReportsScope = useCallback(
    (params?: DirectorReportsScopeQueryParams) => {
      if (!params) {
        return queryClient.invalidateQueries({
          queryKey: directorReportsKeys.all,
        });
      }

      return queryClient.invalidateQueries({
        queryKey: directorReportsKeys.scope(params),
      });
    },
    [queryClient],
  );

  const refreshReportsScope = useCallback(
    async (params: DirectorReportsScopeQueryParams): Promise<DirectorReportScopeLoadResult> => {
      const nextParams = {
        ...params,
        bypassCache: true,
      };
      await invalidateReportsScope(nextParams);
      return loadReportsScope(nextParams);
    },
    [invalidateReportsScope, loadReportsScope],
  );

  return {
    reportsScopeFetching,
    fetchReportsScopeData,
    loadReportsScope,
    refreshReportsScope,
    invalidateReportsScope,
  };
}
