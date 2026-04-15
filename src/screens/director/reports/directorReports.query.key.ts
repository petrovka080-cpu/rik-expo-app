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

import type { DirectorReportsScopeKey } from "./directorReports.query.types";

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
