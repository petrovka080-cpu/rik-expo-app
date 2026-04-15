import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { loadDirectorFinanceScreenScope } from "../../../lib/api/directorFinanceScope.service";
import { adaptDirectorFinanceScopeResult } from "./directorFinance.query.adapter";
import {
  buildDirectorFinanceScopeKey,
  directorFinanceKeys,
  normalizeDirectorFinanceScopeParams,
} from "./directorFinance.query.key";
import type {
  DirectorFinanceQueryData,
  DirectorFinanceScopeParams,
  DirectorFinanceScreenScopeIssue,
} from "./directorFinance.query.types";

type UseDirectorFinanceQueryParams = DirectorFinanceScopeParams & {
  readonly enabled?: boolean;
  readonly onIssue?: (issue: DirectorFinanceScreenScopeIssue) => void;
  readonly onError?: (error: unknown) => void;
};

export async function fetchDirectorFinanceQueryData(
  params: DirectorFinanceScopeParams,
): Promise<DirectorFinanceQueryData> {
  const normalized = normalizeDirectorFinanceScopeParams(params);
  const result = await loadDirectorFinanceScreenScope({
    objectId: normalized.objectId || null,
    periodFromIso: normalized.periodFromIso || null,
    periodToIso: normalized.periodToIso || null,
    dueDaysDefault: normalized.dueDaysDefault,
    criticalDays: normalized.criticalDays,
  });

  return adaptDirectorFinanceScopeResult(result, buildDirectorFinanceScopeKey(normalized));
}

export function useDirectorFinanceQuery(params: UseDirectorFinanceQueryParams) {
  const {
    enabled = false,
    onIssue,
    onError,
    objectId,
    periodFromIso,
    periodToIso,
    dueDaysDefault,
    criticalDays,
  } = params;
  const normalized = useMemo(
    () =>
      normalizeDirectorFinanceScopeParams({
        objectId,
        periodFromIso,
        periodToIso,
        dueDaysDefault,
        criticalDays,
      }),
    [
      objectId,
      periodFromIso,
      periodToIso,
      dueDaysDefault,
      criticalDays,
    ],
  );
  const queryKey = useMemo(() => directorFinanceKeys.scope(normalized), [normalized]);
  const scopeKey = useMemo(() => buildDirectorFinanceScopeKey(normalized), [normalized]);
  const queryClient = useQueryClient();

  const query = useQuery<DirectorFinanceQueryData>({
    queryKey,
    queryFn: () => fetchDirectorFinanceQueryData(normalized),
    enabled,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!query.data || !onIssue) return;
    for (const issue of query.data.issues) {
      onIssue(issue);
    }
  }, [onIssue, query.data, query.dataUpdatedAt]);

  useEffect(() => {
    if (!query.error || !onError) return;
    onError(query.error);
  }, [onError, query.error, query.errorUpdatedAt]);

  const { refetch } = query;
  const refreshFinance = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const invalidateFinance = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey,
      }),
    [queryClient, queryKey],
  );

  return {
    financeData: query.data ?? null,
    finScope: query.data?.finScope ?? null,
    finLoading: query.isLoading || query.isFetching,
    financeQueryError: query.error ?? null,
    financeQueryKey: queryKey,
    financeScopeKey: scopeKey,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refreshFinance,
    invalidateFinance,
  };
}
