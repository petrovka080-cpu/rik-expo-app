import { rowsShallowEqual } from "./helpers";
import type {
  AccountantHistoryWindowLoadResult,
  AccountantInboxWindowLoadResult,
} from "./accountant.repository";
import type { AccountantInboxUiRow, HistoryRow, Tab } from "./types";

export type InboxWindowSnapshot = {
  rows: AccountantInboxUiRow[];
  nextOffsetRows: number;
  hasMore: boolean;
  totalRowCount: number;
  limitRows: number;
};

export type HistoryWindowSnapshot = {
  key: string;
  rows: HistoryRow[];
  nextOffsetRows: number;
  hasMore: boolean;
  totalRowCount: number;
  totalAmount: number;
  limitRows: number;
  currency: string;
};

export const buildAccountantHistoryKey = (dateFrom: string, dateTo: string, histSearch: string) =>
  `from=${String(dateFrom || "")}|to=${String(dateTo || "")}|q=${String(histSearch || "")}`;

export const buildAccountantInboxCacheKey = (tab: Tab) => `tab:${tab}`;

export const appendAccountantInboxRows = (prev: AccountantInboxUiRow[], next: AccountantInboxUiRow[]) => {
  if (!next.length) return prev;
  const existing = new Set(prev.map((row) => String(row.proposal_id ?? "").trim()));
  const toAppend = next.filter((row) => !existing.has(String(row.proposal_id ?? "").trim()));
  return toAppend.length ? [...prev, ...toAppend] : prev;
};

export const appendAccountantHistoryRows = (prev: HistoryRow[], next: HistoryRow[]) => {
  if (!next.length) return prev;
  const existing = new Set(prev.map((row) => Number(row.payment_id)));
  const toAppend = next.filter((row) => !existing.has(Number(row.payment_id)));
  return toAppend.length ? [...prev, ...toAppend] : prev;
};

export const buildAccountantInboxSnapshot = (params: {
  previous?: InboxWindowSnapshot;
  result: AccountantInboxWindowLoadResult;
  append: boolean;
}): InboxWindowSnapshot => {
  const { previous, result, append } = params;
  const mergedRows = append && previous ? appendAccountantInboxRows(previous.rows, result.rows) : result.rows;
  return {
    rows: mergedRows,
    nextOffsetRows: result.meta.offsetRows + result.meta.returnedRowCount,
    hasMore: result.meta.hasMore,
    totalRowCount: result.meta.totalRowCount,
    limitRows: result.meta.limitRows,
  };
};

export const buildAccountantHistorySnapshot = (params: {
  key: string;
  previous?: HistoryWindowSnapshot | null;
  result: AccountantHistoryWindowLoadResult;
  append: boolean;
}): HistoryWindowSnapshot => {
  const { key, previous, result, append } = params;
  const mergedRows = append && previous ? appendAccountantHistoryRows(previous.rows, result.rows) : result.rows;
  const currency = mergedRows[0]?.invoice_currency ?? previous?.currency ?? "KGS";
  return {
    key,
    rows: mergedRows,
    nextOffsetRows: result.meta.offsetRows + result.meta.returnedRowCount,
    hasMore: result.meta.hasMore,
    totalRowCount: result.meta.totalRowCount,
    totalAmount: result.meta.totalAmount,
    limitRows: result.meta.limitRows,
    currency,
  };
};

export const selectAccountantInboxPreview = (
  cacheByTab: Partial<Record<Tab, InboxWindowSnapshot>>,
  tab: Tab,
): InboxWindowSnapshot | null => cacheByTab[tab] ?? null;

export const selectAccountantHistoryPreview = (
  snapshot: HistoryWindowSnapshot | null,
  key: string,
): HistoryWindowSnapshot | null => (snapshot?.key === key ? snapshot : null);

export const mergeAccountantInboxRowsIfChanged = (
  prev: AccountantInboxUiRow[],
  next: AccountantInboxUiRow[],
): AccountantInboxUiRow[] => (rowsShallowEqual(prev, next) ? prev : next);
