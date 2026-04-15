/**
 * directorReports.query.adapter.ts
 *
 * Pure adapter functions that extract structured data from a
 * DirectorReportScopeLoadResult without any side effects.
 *
 * These replace the data-extraction portions of commitOptionsState,
 * commitReportState, and commitDisciplineState in the controller,
 * leaving only the setState + observability calls in the controller.
 *
 * Rules:
 * - Pure functions — no fetch, no logger, no setState, no React
 * - No silent fallback to empty data on error
 * - No mutation of input
 */

import type {
  DirectorReportScopeLoadResult,
  DirectorReportScopeOptionsState,
  DirectorReportScopePayload,
  DirectorReportScopeDisciplinePayload,
  DirectorReportFetchMeta,
} from "./directorReports.query.types";

/** Adapted options data from a scope load result. */
export type AdaptedOptionsData = {
  readonly key: string;
  readonly state: DirectorReportScopeOptionsState;
  readonly meta: DirectorReportFetchMeta | null;
  readonly fromCache: boolean;
};

/** Adapted report data from a scope load result. */
export type AdaptedReportData = {
  readonly key: string;
  readonly payload: DirectorReportScopePayload | null;
  readonly meta: DirectorReportFetchMeta | null;
  readonly fromCache: boolean;
};

/** Adapted discipline data from a scope load result. */
export type AdaptedDisciplineData = {
  readonly key: string;
  readonly payload: DirectorReportScopeDisciplinePayload;
  readonly meta: DirectorReportFetchMeta | null;
  readonly pricesReady: boolean;
  readonly fromCache: boolean;
};

/**
 * Extract options data from a scope load result.
 */
export const adaptOptionsFromScope = (
  scopeLoad: DirectorReportScopeLoadResult,
): AdaptedOptionsData => ({
  key: scopeLoad.optionsKey,
  state: scopeLoad.optionsState,
  meta: scopeLoad.optionsMeta,
  fromCache: scopeLoad.optionsFromCache,
});

/**
 * Extract report data from a scope load result.
 */
export const adaptReportFromScope = (
  scopeLoad: DirectorReportScopeLoadResult,
): AdaptedReportData => ({
  key: scopeLoad.key,
  payload: scopeLoad.report,
  meta: scopeLoad.reportMeta,
  fromCache: scopeLoad.reportFromCache,
});

/**
 * Extract discipline data from a scope load result.
 * Returns null if the scope load did not include discipline data.
 */
export const adaptDisciplineFromScope = (
  scopeLoad: DirectorReportScopeLoadResult,
): AdaptedDisciplineData | null => {
  if (!scopeLoad.discipline) return null;
  return {
    key: scopeLoad.key,
    payload: scopeLoad.discipline,
    meta: scopeLoad.disciplineMeta,
    pricesReady: scopeLoad.disciplinePricesReady,
    fromCache: scopeLoad.disciplineFromCache,
  };
};
