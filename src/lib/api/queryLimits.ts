export const DEFAULT_LIST_LIMIT = 100;
export const DEFAULT_DASHBOARD_LIMIT = 50;
export const DEFAULT_SEARCH_LIMIT = 25;
export const MAX_LIST_LIMIT = 250;

export function clampQueryLimit(value: number | undefined, fallback = DEFAULT_LIST_LIMIT): number {
  const candidate = value ?? fallback;
  if (!Number.isFinite(candidate)) return fallback;
  return Math.max(1, Math.min(Math.floor(candidate), MAX_LIST_LIMIT));
}
