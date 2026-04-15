/**
 * directorReports.query.types.ts
 *
 * Core types for the Director Reports query boundary layer.
 * These types define the parameters and key shapes used by the
 * scope-loading pipeline, without introducing any React or UI concerns.
 *
 * All RPC-level types are re-exported from the service layer — no duplication.
 */

export type {
  DirectorReportScopeLoadResult,
  DirectorReportScopeOptionsState,
  DirectorReportScopePayload,
  DirectorReportScopeDisciplinePayload,
} from "../../../lib/api/directorReportsScope.service";

export type { DirectorReportFetchMeta } from "../../../lib/api/director_reports";

/**
 * Parameters for any scope-level load.
 * This is the canonical shape consumed by key-builders and the loader.
 */
export type DirectorReportsScopeParams = {
  readonly from: string;
  readonly to: string;
  readonly objectName: string | null;
  readonly objectIdByName: Record<string, string | null>;
};

/**
 * Type alias for cache/dependency keys produced by key-builders.
 */
export type DirectorReportsScopeKey = string;
