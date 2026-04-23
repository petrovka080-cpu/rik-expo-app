import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/database.types";

type Timed<T> = {
  result: T;
  durationMs: number;
};

type InboxRow = {
  proposal_id: string;
  proposal_no: string | null;
  id_short?: string | null;
  supplier: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_amount: number | null;
  invoice_currency: string | null;
  payment_status: string | null;
  total_paid: number;
  payments_count: number;
  has_invoice: boolean;
  sent_to_accountant_at: string | null;
  last_paid_at: number | null;
};

type InboxScopeMeta = {
  offsetRows: number;
  limitRows: number;
  returnedRowCount: number;
  totalRowCount: number;
  hasMore: boolean;
  tab: string | null;
};

type InboxScopeResult = {
  rows: InboxRow[];
  meta: InboxScopeMeta;
  sourceMeta: {
    primaryOwner: "rpc_scope_v1";
    fallbackUsed: boolean;
    sourceKind: string;
    backendFirstPrimary: boolean;
  };
};

type HistoryRow = {
  payment_id: number;
  paid_at: string;
  proposal_id: string;
  supplier: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_amount: number | null;
  invoice_currency: string | null;
  amount: number;
  method: string | null;
  note: string | null;
  has_invoice: boolean;
  accountant_fio: string | null;
  purpose: string | null;
};

type HistoryScopeMeta = {
  offsetRows: number;
  limitRows: number;
  returnedRowCount: number;
  totalRowCount: number;
  totalAmount: number;
  hasMore: boolean;
  dateFrom: string | null;
  dateTo: string | null;
  search: string | null;
};

type HistoryScopeResult = {
  rows: HistoryRow[];
  meta: HistoryScopeMeta;
  sourceMeta: {
    primaryOwner: "rpc_scope_v1";
    fallbackUsed: boolean;
    sourceKind: string;
    backendFirstPrimary: boolean;
  };
};

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "accountant-windowing-wave1" } },
});

const ACCOUNTANT_TABS = ["К оплате", "Частично", "Оплачено", "На доработке"] as const;

const measure = async <T>(fn: () => Promise<T>): Promise<Timed<T>> => {
  const startedAt = Date.now();
  const result = await fn();
  return {
    result,
    durationMs: Date.now() - startedAt,
  };
};

const writeArtifact = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
};

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const extractBlock = (source: string, marker: string) => {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return "";
  const bodyStart = source.indexOf("{", markerIndex);
  if (bodyStart < 0) return "";
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(markerIndex, index + 1);
      }
    }
  }
  return source.slice(markerIndex);
};

const toInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
};

const toNumberOrNull = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toMaybeText = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const toEpochMsOrNull = (value: unknown): number | null => {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;

  const text = String(value ?? "").trim();
  if (!text) return null;

  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return null;

  const fractionMatch = text.match(/\.(\d+)(?=(Z|[+-]\d{2}:\d{2})$)/);
  if (!fractionMatch) return parsed;

  const fraction = fractionMatch[1];
  if (fraction.length <= 3) return parsed;

  const truncatedMs = Number(fraction.slice(0, 3).padEnd(3, "0"));
  const roundedMs = Math.round(Number(`0.${fraction}`) * 1000);
  return parsed + (roundedMs - truncatedMs);
};

const normalizeAccountantInboxRpcTab = (tab?: string): string | null => {
  const text = String(tab ?? "").trim();
  if (!text) return null;
  if (text === "На доработке") return "На доработке";
  if (text === "Частично") return "Частично оплачено";
  if (text === "Оплачено") return "Оплачено";
  return "К оплате";
};

const toRpcDateOrNull = (value: string) => {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;

  const [, mm, dd] = text.split("-").map(Number);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const dt = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(dt.getTime()) ? null : text;
};

const inboxRowSignature = (row: InboxRow) =>
  [
    row.proposal_id,
    row.proposal_no ?? "",
    row.supplier ?? "",
    row.invoice_number ?? "",
    row.invoice_date ?? "",
    row.invoice_amount ?? "",
    row.invoice_currency ?? "",
    row.payment_status ?? "",
    row.total_paid,
    row.payments_count,
    row.has_invoice,
    row.sent_to_accountant_at ?? "",
    row.last_paid_at ?? "",
  ].join("|");

const historyRowSignature = (row: HistoryRow) =>
  [
    row.payment_id,
    row.paid_at,
    row.proposal_id,
    row.supplier ?? "",
    row.invoice_number ?? "",
    row.invoice_date ?? "",
    row.invoice_amount ?? "",
    row.invoice_currency ?? "",
    row.amount,
    row.method ?? "",
    row.note ?? "",
    row.has_invoice,
    row.accountant_fio ?? "",
    row.purpose ?? "",
  ].join("|");

const compareRowPages = <T>(legacy: T[], primary: T[], toSignature: (row: T) => string) => {
  const legacySignatures = legacy.map(toSignature);
  const primarySignatures = primary.map(toSignature);
  return (
    legacySignatures.length === primarySignatures.length
    && legacySignatures.every((signature, index) => signature === primarySignatures[index])
  );
};

const compareRowPageSets = <T>(legacy: T[], primary: T[], toSignature: (row: T) => string) => {
  const legacySignatures = legacy.map(toSignature).sort();
  const primarySignatures = primary.map(toSignature).sort();
  return (
    legacySignatures.length === primarySignatures.length
    && legacySignatures.every((signature, index) => signature === primarySignatures[index])
  );
};

const pickHistorySearchSeed = (rows: HistoryRow[]): string | null => {
  const first = rows[0];
  if (!first) return null;
  const invoice = String(first.invoice_number ?? "").trim();
  if (invoice) return invoice;
  const supplier = String(first.supplier ?? "").trim();
  if (supplier) return supplier.split(/\s+/).find((part) => part.length >= 3) ?? supplier;
  return null;
};

const adaptLegacyInboxRows = (value: unknown): InboxRow[] => {
  const rows = Array.isArray(value) ? value : [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const proposalId = toMaybeText(item.proposal_id);
    if (!proposalId) return [];
    return [
      {
        proposal_id: proposalId,
        proposal_no: toMaybeText(item.proposal_no),
        supplier: toMaybeText(item.supplier),
        invoice_number: toMaybeText(item.invoice_number),
        invoice_date: toMaybeText(item.invoice_date),
        invoice_amount: toNumberOrNull(item.invoice_amount),
        invoice_currency: toMaybeText(item.invoice_currency) ?? "KGS",
        payment_status: toMaybeText(item.payment_status),
        total_paid: toNumberOrNull(item.total_paid) ?? 0,
        payments_count: toInt(item.payments_count, 0),
        has_invoice: Boolean(item.has_invoice),
        sent_to_accountant_at: toMaybeText(item.sent_to_accountant_at),
        last_paid_at: toEpochMsOrNull(item.paid_last_at),
      },
    ];
  });
};

const adaptInboxScopeResult = (value: unknown): InboxScopeResult => {
  const envelope = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const rowsRaw = Array.isArray(envelope.rows) ? envelope.rows : [];
  const meta = typeof envelope.meta === "object" && envelope.meta !== null
    ? (envelope.meta as Record<string, unknown>)
    : {};

  const rows = rowsRaw.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const proposalId = toMaybeText(item.proposal_id);
    if (!proposalId) return [];
    return [
      {
        proposal_id: proposalId,
        proposal_no: toMaybeText(item.proposal_no),
        id_short: toMaybeText(item.id_short),
        supplier: toMaybeText(item.supplier),
        invoice_number: toMaybeText(item.invoice_number),
        invoice_date: toMaybeText(item.invoice_date),
        invoice_amount: toNumberOrNull(item.invoice_amount),
        invoice_currency: toMaybeText(item.invoice_currency) ?? "KGS",
        payment_status: toMaybeText(item.payment_status),
        total_paid: toNumberOrNull(item.total_paid) ?? 0,
        payments_count: toInt(item.payments_count, 0),
        has_invoice: Boolean(item.has_invoice),
        sent_to_accountant_at: toMaybeText(item.sent_to_accountant_at),
        last_paid_at: toEpochMsOrNull(item.last_paid_at),
      },
    ];
  });

  return {
    rows,
    meta: {
      offsetRows: toInt(meta.offset_rows, 0),
      limitRows: toInt(meta.limit_rows, 40),
      returnedRowCount: toInt(meta.returned_row_count, rows.length),
      totalRowCount: toInt(meta.total_row_count, rows.length),
      hasMore: typeof meta.has_more === "boolean" ? Boolean(meta.has_more) : false,
      tab: toMaybeText(meta.tab),
    },
    sourceMeta: {
      primaryOwner: "rpc_scope_v1",
      fallbackUsed: false,
      sourceKind: "rpc:accountant_inbox_scope_v1",
      backendFirstPrimary: Boolean(meta.backend_first_primary ?? true),
    },
  };
};

const adaptLegacyHistoryRows = (value: unknown): HistoryRow[] => {
  const rows = Array.isArray(value) ? value : [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const paymentId = Number(item.payment_id);
    const proposalId = toMaybeText(item.proposal_id);
    const paidAt = toMaybeText(item.paid_at);
    if (!Number.isFinite(paymentId) || !proposalId || !paidAt) return [];
    return [
      {
        payment_id: paymentId,
        paid_at: paidAt,
        proposal_id: proposalId,
        supplier: toMaybeText(item.supplier),
        invoice_number: toMaybeText(item.invoice_number),
        invoice_date: toMaybeText(item.invoice_date),
        invoice_amount: toNumberOrNull(item.invoice_amount),
        invoice_currency: toMaybeText(item.invoice_currency) ?? "KGS",
        amount: toNumberOrNull(item.amount) ?? 0,
        method: toMaybeText(item.method),
        note: toMaybeText(item.note),
        has_invoice: Boolean(item.has_invoice),
        accountant_fio: toMaybeText(item.accountant_fio),
        purpose: toMaybeText(item.purpose),
      },
    ];
  });
};

const adaptHistoryScopeResult = (value: unknown): HistoryScopeResult => {
  const envelope = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const rowsRaw = Array.isArray(envelope.rows) ? envelope.rows : [];
  const meta = typeof envelope.meta === "object" && envelope.meta !== null
    ? (envelope.meta as Record<string, unknown>)
    : {};
  const rows = adaptLegacyHistoryRows(rowsRaw);

  return {
    rows,
    meta: {
      offsetRows: toInt(meta.offset_rows, 0),
      limitRows: toInt(meta.limit_rows, 50),
      returnedRowCount: toInt(meta.returned_row_count, rows.length),
      totalRowCount: toInt(meta.total_row_count, rows.length),
      totalAmount: toNumberOrNull(meta.total_amount) ?? 0,
      hasMore: typeof meta.has_more === "boolean" ? Boolean(meta.has_more) : false,
      dateFrom: toMaybeText(meta.date_from),
      dateTo: toMaybeText(meta.date_to),
      search: toMaybeText(meta.search),
    },
    sourceMeta: {
      primaryOwner: "rpc_scope_v1",
      fallbackUsed: false,
      sourceKind: "rpc:accountant_history_scope_v1",
      backendFirstPrimary: Boolean(meta.backend_first_primary ?? true),
    },
  };
};

const loadLegacyInboxRows = async (tab: typeof ACCOUNTANT_TABS[number]) => {
  const { data, error } = await supabase.rpc("list_accountant_inbox_fact", {
    p_tab: normalizeAccountantInboxRpcTab(tab),
  });
  if (error) throw error;
  return adaptLegacyInboxRows(data);
};

const loadInboxScope = async (tab: typeof ACCOUNTANT_TABS[number], offsetRows: number, limitRows: number) => {
  const { data, error } = await supabase.rpc("accountant_inbox_scope_v1", {
    p_tab: normalizeAccountantInboxRpcTab(tab),
    p_offset: Math.max(0, offsetRows),
    p_limit: Math.max(1, limitRows),
  });
  if (error) throw error;
  return adaptInboxScopeResult(data);
};

const loadLegacyHistoryRows = async (params: {
  dateFrom: string;
  dateTo: string;
  search: string;
}) => {
  const { dateFrom, dateTo, search } = params;
  const { data, error } = await supabase.rpc("list_accountant_payments_history_v2", {
    p_date_from: toRpcDateOrNull(dateFrom),
    p_date_to: toRpcDateOrNull(dateTo),
    p_search: search.trim() ? search.trim() : null,
    p_limit: 300,
  });
  if (error) throw error;
  return adaptLegacyHistoryRows(data);
};

const loadHistoryScope = async (params: {
  dateFrom: string;
  dateTo: string;
  search: string;
  offsetRows: number;
  limitRows: number;
}) => {
  const { dateFrom, dateTo, search, offsetRows, limitRows } = params;
  const { data, error } = await supabase.rpc("accountant_history_scope_v1", {
    p_date_from: toRpcDateOrNull(dateFrom),
    p_date_to: toRpcDateOrNull(dateTo),
    p_search: search.trim() ? search.trim() : null,
    p_offset: Math.max(0, offsetRows),
    p_limit: Math.max(1, limitRows),
  });
  if (error) throw error;
  return adaptHistoryScopeResult(data);
};

async function main() {
  const inboxChecks: Array<{
    tab: typeof ACCOUNTANT_TABS[number];
    legacyDurationMs: number;
    primaryDurationMs: number;
    primaryOwner: string;
    fallbackUsed: boolean;
    rowParityOk: boolean;
    rowSetParityOk: boolean;
    totalCountParityOk: boolean;
    hasMoreParityOk: boolean;
    backendFirstPrimary: boolean;
    returnedRowCount: number;
    totalRowCount: number;
  }> = [];

  for (const tab of ACCOUNTANT_TABS) {
    const legacy = await measure(async () => loadLegacyInboxRows(tab));
    const primary = await measure(async () => loadInboxScope(tab, 0, 40));

    inboxChecks.push({
      tab,
      legacyDurationMs: legacy.durationMs,
      primaryDurationMs: primary.durationMs,
      primaryOwner: primary.result.sourceMeta.primaryOwner,
      fallbackUsed: primary.result.sourceMeta.fallbackUsed,
      rowParityOk: compareRowPages(
        legacy.result.slice(0, 40),
        primary.result.rows,
        inboxRowSignature,
      ),
      rowSetParityOk: compareRowPageSets(
        legacy.result.slice(0, 40),
        primary.result.rows,
        inboxRowSignature,
      ),
      totalCountParityOk: legacy.result.length === primary.result.meta.totalRowCount,
      hasMoreParityOk:
        (legacy.result.length > 40 && primary.result.meta.hasMore)
        || (legacy.result.length <= 40 && primary.result.meta.hasMore === false),
      backendFirstPrimary: primary.result.sourceMeta.backendFirstPrimary,
      returnedRowCount: primary.result.meta.returnedRowCount,
      totalRowCount: primary.result.meta.totalRowCount,
    });
  }

  const legacyHistory = await measure(async () =>
    loadLegacyHistoryRows({
      dateFrom: "",
      dateTo: "",
      search: "",
    }),
  );
  const primaryHistory = await measure(async () =>
    loadHistoryScope({
      dateFrom: "",
      dateTo: "",
      search: "",
      offsetRows: 0,
      limitRows: 50,
    }),
  );

  const legacyHistoryTotalAmount = legacyHistory.result.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const historySearchSeed = pickHistorySearchSeed(legacyHistory.result);
  const historySearchScenario = historySearchSeed
    ? await (async () => {
        const legacySearch = await measure(async () =>
          loadLegacyHistoryRows({
            dateFrom: "",
            dateTo: "",
            search: historySearchSeed,
          }),
        );
        const primarySearch = await measure(async () =>
          loadHistoryScope({
            dateFrom: "",
            dateTo: "",
            search: historySearchSeed,
            offsetRows: 0,
            limitRows: 50,
          }),
        );
        const legacySlice = legacySearch.result.slice(0, 50);
        const legacyTotalAmount = legacySearch.result.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
        return {
          search: historySearchSeed,
          legacyDurationMs: legacySearch.durationMs,
          primaryDurationMs: primarySearch.durationMs,
          rowParityOk: compareRowPages(
            legacySlice,
            primarySearch.result.rows,
            historyRowSignature,
          ),
          rowSetParityOk: compareRowPageSets(
            legacySlice,
            primarySearch.result.rows,
            historyRowSignature,
          ),
          totalCountParityOk: legacySearch.result.length === primarySearch.result.meta.totalRowCount,
          totalAmountParityOk: legacyTotalAmount === primarySearch.result.meta.totalAmount,
        };
      })()
    : null;

  const historyWindowScenario = legacyHistory.result.length > 1
    ? await measure(async () =>
        loadHistoryScope({
          dateFrom: "",
          dateTo: "",
          search: "",
          offsetRows: 1,
          limitRows: 1,
        }),
      )
    : null;

  const controllerSource = readSource("src/screens/accountant/useAccountantScreenController.ts");
  const listSource = readSource("src/screens/accountant/components/AccountantListSection.tsx");
  const screenSource = readSource("app/(tabs)/accountant.tsx");
  const inboxServiceSource = readSource("src/screens/accountant/accountant.inbox.service.ts");
  const historyServiceSource = readSource("src/screens/accountant/accountant.history.service.ts");
  const inboxWindowSource = extractBlock(
    inboxServiceSource,
    "export async function loadAccountantInboxWindowData",
  );
  const historyWindowSource = extractBlock(
    historyServiceSource,
    "export async function loadAccountantHistoryWindowData",
  );
  const sourceBoundary = {
    inboxServiceRpcOnly:
      !inboxServiceSource.includes('primaryOwner: "legacy_client_window"')
      && !inboxWindowSource.includes("loadAccountantInboxLegacyData")
      && !inboxWindowSource.includes("fallback:proposals"),
    historyServiceRpcOnly:
      !historyServiceSource.includes('primaryOwner: "legacy_client_window"')
      && !historyWindowSource.includes("loadAccountantHistoryRows(")
      && !historyWindowSource.includes("fallbackUsed: true"),
    controllerHasNoLegacyRetryFlag: !controllerSource.includes("triedRpcOkRef"),
  };

  const historyRowParityOk = compareRowPages(
    legacyHistory.result.slice(0, 50),
    primaryHistory.result.rows,
    historyRowSignature,
  );
  const historyRowSetParityOk = compareRowPageSets(
    legacyHistory.result.slice(0, 50),
    primaryHistory.result.rows,
    historyRowSignature,
  );
  const historyTotalCountParityOk = legacyHistory.result.length === primaryHistory.result.meta.totalRowCount;
  const historyTotalAmountParityOk = legacyHistoryTotalAmount === primaryHistory.result.meta.totalAmount;
  const historyHasMoreParityOk =
    (legacyHistory.result.length > 50 && primaryHistory.result.meta.hasMore)
    || (legacyHistory.result.length <= 50 && primaryHistory.result.meta.hasMore === false);

  const artifact = {
    status:
      inboxChecks.every((check) =>
        check.primaryOwner === "rpc_scope_v1"
        && check.fallbackUsed === false
        && check.backendFirstPrimary
        && (check.rowParityOk || check.rowSetParityOk)
        && check.totalCountParityOk
        && check.hasMoreParityOk,
      )
      && primaryHistory.result.sourceMeta.primaryOwner === "rpc_scope_v1"
      && primaryHistory.result.sourceMeta.fallbackUsed === false
      && primaryHistory.result.sourceMeta.backendFirstPrimary
      && (historyRowParityOk || historyRowSetParityOk)
      && historyTotalCountParityOk
      && historyTotalAmountParityOk
      && historyHasMoreParityOk
      && (!historySearchScenario || (
        (historySearchScenario.rowParityOk || historySearchScenario.rowSetParityOk)
        && historySearchScenario.totalCountParityOk
        && historySearchScenario.totalAmountParityOk
      ))
      && (
        !historyWindowScenario
        || (
          historyWindowScenario.result.rows.length === 1
          && historyWindowScenario.result.meta.returnedRowCount === 1
          && historyWindowScenario.result.meta.totalRowCount === legacyHistory.result.length
          && historyWindowScenario.result.meta.hasMore === (legacyHistory.result.length > 2)
        )
      )
      && controllerSource.includes("loadMoreInbox")
      && controllerSource.includes("loadMoreHistory")
      && listSource.includes("onEndReachedHistory")
      && listSource.includes("ListFooterComponent")
      && screenSource.includes("historyLoadingMore")
      && screenSource.includes("inboxLoadingMore")
      && sourceBoundary.inboxServiceRpcOnly
      && sourceBoundary.historyServiceRpcOnly
      && sourceBoundary.controllerHasNoLegacyRetryFlag
        ? "passed"
        : "failed",
    inboxChecks,
    history: {
      legacyDurationMs: legacyHistory.durationMs,
      primaryDurationMs: primaryHistory.durationMs,
      primaryOwner: primaryHistory.result.sourceMeta.primaryOwner,
      fallbackUsed: primaryHistory.result.sourceMeta.fallbackUsed,
      backendFirstPrimary: primaryHistory.result.sourceMeta.backendFirstPrimary,
      rowParityOk: historyRowParityOk,
      rowSetParityOk: historyRowSetParityOk,
      totalCountParityOk: historyTotalCountParityOk,
      totalAmountParityOk: historyTotalAmountParityOk,
      hasMoreParityOk: historyHasMoreParityOk,
      returnedRowCount: primaryHistory.result.meta.returnedRowCount,
      totalRowCount: primaryHistory.result.meta.totalRowCount,
      totalAmount: primaryHistory.result.meta.totalAmount,
      hasMore: primaryHistory.result.meta.hasMore,
      searchScenario: historySearchScenario,
      windowScenario: historyWindowScenario
        ? {
            durationMs: historyWindowScenario.durationMs,
            returnedRowCount: historyWindowScenario.result.meta.returnedRowCount,
            totalRowCount: historyWindowScenario.result.meta.totalRowCount,
            hasMore: historyWindowScenario.result.meta.hasMore,
            rowSignature: historyWindowScenario.result.rows[0]
              ? historyRowSignature(historyWindowScenario.result.rows[0])
              : null,
          }
        : null,
    },
    wiring: {
      controllerHasLoadMoreInbox: controllerSource.includes("loadMoreInbox"),
      controllerHasLoadMoreHistory: controllerSource.includes("loadMoreHistory"),
      listHasOnEndReachedHistory: listSource.includes("onEndReachedHistory"),
      listHasFooter: listSource.includes("ListFooterComponent"),
      screenWiresHistoryLoadingMore: screenSource.includes("historyLoadingMore"),
      screenWiresInboxLoadingMore: screenSource.includes("inboxLoadingMore"),
    },
    sourceBoundary,
  };

  writeArtifact("artifacts/accountant-windowing-wave1.json", artifact);
  writeArtifact("artifacts/accountant-windowing-wave1.summary.json", {
    status: artifact.status,
    inboxChecks: artifact.inboxChecks,
    history: artifact.history,
    wiring: artifact.wiring,
    sourceBoundary: artifact.sourceBoundary,
  });

  console.log(
    JSON.stringify(
      {
        status: artifact.status,
        inboxTabs: artifact.inboxChecks.length,
        historyPrimaryOwner: artifact.history.primaryOwner,
        historyFallbackUsed: artifact.history.fallbackUsed,
        historyRowParityOk: artifact.history.rowParityOk,
        historyTotalCountParityOk: artifact.history.totalCountParityOk,
        historyWindowReturnedRowCount: artifact.history.windowScenario?.returnedRowCount ?? null,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
