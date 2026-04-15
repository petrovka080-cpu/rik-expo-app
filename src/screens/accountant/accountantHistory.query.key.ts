/**
 * accountantHistory.query.key — query key factory for accountant history.
 *
 * P6.2: Centralizes query key construction for accountant history.
 */

export const accountantHistoryKeys = {
  all: ["accountant", "history"] as const,
  filters: (dateFrom: string, dateTo: string, search: string) =>
    ["accountant", "history", dateFrom, dateTo, search] as const,
} as const;
