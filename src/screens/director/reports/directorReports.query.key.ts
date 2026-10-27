/**
 * directorReports.query.key.ts
 *
 * Single source of truth for Director Reports cache/dependency key generation.
 *
 * Extracted from useDirectorReportsController (lines 325-331) to eliminate
 * scattered inline key-building and ensure deterministic key contracts.
 *
 * Rules:
 * - Pure functions, no side effects
 * - Deterministic: same params → same key
 * - null/undefined normalized to empty string
 */

import type {
  DirectorReportsScopeKey,
  DirectorReportsScopeQueryParams,
} from "./directorReports.query.types";

const normalizeDateKeyPart = (value: string | null | undefined): string => {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, 10) : "";
};

const normalizeObjectNameKeyPart = (value: string | null | undefined): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

export type NormalizedDirectorReportsScopeQueryParams = {
  readonly from: string;
  readonly to: string;
  readonly objectName: string | null;
  readonly objectIdByName: Record<string, string | null>;
  readonly includeDiscipline: boolean;
  readonly skipDisciplinePrices: boolean;
  readonly bypassCache: boolean;
};

export const normalizeDirectorReportsScopeQueryParams = (
  params: DirectorReportsScopeQueryParams,
): NormalizedDirectorReportsScopeQueryParams => ({
  from: normalizeDateKeyPart(params.from),
  to: normalizeDateKeyPart(params.to),
  objectName: normalizeObjectNameKeyPart(params.objectName),
  objectIdByName: params.objectIdByName ?? params.optionsState?.objectIdByName ?? {},
  includeDiscipline: params.includeDiscipline === true,
  skipDisciplinePrices: params.skipDisciplinePrices,
  bypassCache: params.bypassCache === true,
});

/**
 * Build the options-level cache key for a given period.
 * Options are period-scoped: same period → same options set.
 */
export const buildDirectorReportsOptionsKey = (
  from: string,
  to: string,
): DirectorReportsScopeKey => `${from}|${to}`;

/**
 * Build the scope-level cache key for a report + object combination.
 * Includes the resolved objectId from the objectIdByName map for stability.
 */
export const buildDirectorReportsScopeKey = (
  from: string,
  to: string,
  objectName: string | null,
  objectIdByName: Record<string, string | null>,
): DirectorReportsScopeKey =>
  `${from}|${to}|${String(objectName ?? "")}|${String(objectName == null ? "" : (objectIdByName?.[objectName] ?? ""))}`;

/**
 * Discipline key is identical to scope key — same cache boundary.
 * Separated as an alias for semantic clarity at call sites.
 */
export const buildDirectorDisciplineKey = buildDirectorReportsScopeKey;

export const directorReportsKeys = {
  all: ["director", "reports"] as const,
  scope: (params: DirectorReportsScopeQueryParams) => {
    const normalized = normalizeDirectorReportsScopeQueryParams(params);
    const scopeKey = buildDirectorReportsScopeKey(
      normalized.from,
      normalized.to,
      normalized.objectName,
      normalized.objectIdByName,
    );
    return [
      "director",
      "reports",
      "scope",
      scopeKey,
      normalized.includeDiscipline ? "discipline" : "materials",
      normalized.skipDisciplinePrices ? "base" : "priced",
      normalized.bypassCache ? "bypass" : "cache",
    ] as const;
  },
} as const;
