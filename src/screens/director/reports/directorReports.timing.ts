/**
 * directorReports.timing.ts
 *
 * Timing and performance measurement utilities for Director Reports.
 *
 * Extracted from useDirectorReportsController to reduce controller size.
 * These are pure module-level utilities with no React dependency.
 */

import { recordDirectorReportsWarning } from "./directorReports.scopeLoader";

export const REPORTS_TIMING = typeof __DEV__ !== "undefined" ? __DEV__ : false;

type PerformanceLike = {
  now?: () => number;
};

const getPerformance = (): PerformanceLike | null => {
  if (typeof globalThis !== "undefined" && "performance" in globalThis) {
    return (globalThis as typeof globalThis & { performance?: PerformanceLike }).performance ?? null;
  }
  return null;
};

let directorReportsPerfFallbackWarned = false;

/**
 * Get current time in milliseconds, preferring performance.now() for precision.
 * Falls back to Date.now() with a one-time observability warning.
 */
export const nowMs = (): number => {
  try {
    const perf = getPerformance();
    return typeof perf?.now === "function" ? perf.now() : Date.now();
  } catch (error) {
    if (!directorReportsPerfFallbackWarned) {
      directorReportsPerfFallbackWarned = true;
      recordDirectorReportsWarning("reports_performance_clock_unavailable", error, {
        fallbackUsed: "date_now",
      });
    }
    return Date.now();
  }
};

/**
 * Log timing measurement in development mode.
 */
export const logTiming = (label: string, startedAt: number): void => {
  if (!REPORTS_TIMING) return;
  const ms = Math.round(nowMs() - startedAt);
  if (__DEV__) console.info(`[director_works] ${label}: ${ms}ms`);
};
