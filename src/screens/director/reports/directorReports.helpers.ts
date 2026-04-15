/**
 * directorReports.helpers.ts
 *
 * Pure helper functions for Director Reports data processing.
 *
 * Extracted from useDirectorReportsController to reduce controller size.
 * No React, no state, no side effects.
 */

import type { DirectorReportFetchMeta } from "../../../lib/api/director_reports";
import type {
  DirectorReportScopeDisciplinePayload,
  DirectorReportScopePayload,
} from "../../../lib/api/directorReportsScope.service";

/**
 * Extract discipline payload from a report scope payload.
 */
export const getDisciplineFromPayload = (
  payload: DirectorReportScopePayload | null,
): DirectorReportScopeDisciplinePayload | null =>
  payload?.discipline ?? null;

/**
 * Summarize discipline payload for observability recording.
 */
export const summarizeRepDiscipline = (
  payload: DirectorReportScopeDisciplinePayload | null,
): { works: number; levels: number; materials: number } => {
  const works = Array.isArray(payload?.works) ? payload.works : [];
  let levels = 0;
  let materials = 0;
  for (const work of works) {
    const workLevels = Array.isArray(work.levels) ? work.levels : [];
    levels += workLevels.length;
    for (const level of workLevels) {
      materials += Array.isArray(level.materials) ? level.materials.length : 0;
    }
  }
  return { works: works.length, levels, materials };
};

/**
 * Format a Date as ISO date string (YYYY-MM-DD).
 */
export const isoDate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Get a Date that is `days` days before today.
 */
export const minusDays = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

/**
 * Derive discipline-stage metadata from report metadata.
 */
export const deriveDisciplineMeta = (
  meta: DirectorReportFetchMeta | null,
): DirectorReportFetchMeta | null =>
  meta ? { ...meta, stage: "discipline", pricedStage: meta.pricedStage ?? "priced" } : null;
