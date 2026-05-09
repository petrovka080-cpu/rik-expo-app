import {
  client,
  loadPagedRowsWithCeiling,
  normalizePage,
  parseErr,
  type PageInput,
  type PagedQuery,
} from "./_core";
import {
  isRpcRowsEnvelope,
  isRpcNullableRecordArrayResponse,
  validateRpcResponse,
} from "./queryBoundary";
import type { BuyerInboxRow } from "./types";
import { isRequestApprovedForProcurement } from "../requestStatus";
import { normalizeRuText } from "../text/encoding";
import { beginPlatformObservability } from "../observability/platformObservability";
import { recordCatchDiscipline } from "../observability/catchDiscipline";

const logBuyerApiDebug = (...args: unknown[]) => {
  if (__DEV__) console.warn(...args);
};

const isApprovedForBuyer = (raw: unknown) =>
  isRequestApprovedForProcurement(raw);

type RequestStatusRow = {
  id?: string | null;
  status?: string | null;
};

type FallbackBuyerRow = {
  id?: string | null;
  request_id?: string | null;
  name_human?: string | null;
  qty?: number | null;
  uom?: string | null;
  app_code?: string | null;
  status?: string | null;
  director_reject_note?: string | null;
  director_reject_at?: string | null;
  kind?: string | null;
  requests?: {
    id_old?: string | null;
    status?: string | null;
  } | null;
  request_status?: string | null;
};

type BuyerRejectContextRow = {
  request_item_id?: string | null;
  proposal_id?: string | null;
  supplier?: string | null;
  price?: number | null;
  note?: string | null;
  director_comment?: string | null;
  director_decision?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type ProposalLifecycleRow = {
  proposal_id?: string | null;
  status?: string | null;
  sent_to_accountant_at?: string | null;
  submitted_at?: string | null;
};

type BuyerInboxScopeRpcTransport = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

const BUYER_API_SAFE_LIST_PAGE_DEFAULTS = {
  pageSize: 100,
  maxPageSize: 100,
  maxRows: 5000,
};
const BUYER_INBOX_LEGACY_SCOPE_RPC = "buyer_summary_inbox_scope_v1";
const BUYER_INBOX_LEGACY_SCOPE_PAGE_DEFAULTS = {
  pageSize: 100,
  maxPageSize: 100,
  maxRows: 5000,
};
const BUYER_INBOX_LEGACY_SCOPE_MAX_PAGES = Math.ceil(
  BUYER_INBOX_LEGACY_SCOPE_PAGE_DEFAULTS.maxRows /
    BUYER_INBOX_LEGACY_SCOPE_PAGE_DEFAULTS.pageSize,
);
const BUYER_INBOX_LEGACY_SCOPE_DOCUMENT_TYPES = new Set([
  "buyer_summary_inbox_scope",
  "buyer_summary_inbox_scope_v1",
]);

const recordBuyerInboxFallbackFailure = (params: {
  event: string;
  error: unknown;
  sourceKind: string;
  errorStage: string;
  extra?: Record<string, unknown>;
}) =>
  recordCatchDiscipline({
    screen: "buyer",
    surface: "inbox_window",
    event: params.event,
    kind: "degraded_fallback",
    error: params.error,
    sourceKind: params.sourceKind,
    errorStage: params.errorStage,
    extra: params.extra,
  });

export const isBuyerInboxRpcResponse = isRpcNullableRecordArrayResponse;
export const isBuyerInboxScopeRpcResponse = (
  value: unknown,
): value is {
  document_type?: unknown;
  version?: unknown;
  rows: unknown[];
  meta?: Record<string, unknown>;
} => {
  if (!isRpcRowsEnvelope(value)) return false;
  const root = value as { document_type?: unknown; version?: unknown };
  const documentType = String(root.document_type ?? "").trim();
  return (
    BUYER_INBOX_LEGACY_SCOPE_DOCUMENT_TYPES.has(documentType) &&
    String(root.version ?? "").trim().length > 0
  );
};

const loadPagedBuyerApiRows = async <T>(
  queryFactory: () => PagedQuery<T>,
): Promise<{ data: T[] | null; error: unknown | null }> =>
  loadPagedRowsWithCeiling(queryFactory, BUYER_API_SAFE_LIST_PAGE_DEFAULTS);

class BuyerInboxLegacyWindowCeilingError extends Error {
  constructor(reason: "groups" | "pages") {
    super(
      `${BUYER_INBOX_LEGACY_SCOPE_RPC} legacy compatibility read exceeded max ${reason} ceiling`,
    );
    this.name = "BuyerInboxLegacyWindowCeilingError";
  }
}

const isBuyerInboxLegacyCeilingError = (error: unknown): boolean =>
  error instanceof BuyerInboxLegacyWindowCeilingError ||
  parseErr(error).toLowerCase().includes("max row ceiling");

const toNonNegativeInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
};

const readScopeMetaInt = (
  meta: Record<string, unknown> | undefined,
  key: string,
  fallback: number,
): number => toNonNegativeInt(meta?.[key], fallback);

const readScopeHasMore = (
  meta: Record<string, unknown> | undefined,
  offsetGroups: number,
  returnedGroupCount: number,
  totalGroupCount: number,
): boolean =>
  typeof meta?.has_more === "boolean"
    ? Boolean(meta.has_more)
    : offsetGroups + returnedGroupCount < totalGroupCount;

const loadBuyerInboxRowsFromScopeRpc = async (): Promise<BuyerInboxRow[]> => {
  const rows: BuyerInboxRow[] = [];
  let offsetGroups = 0;
  const rpcClient = client as unknown as BuyerInboxScopeRpcTransport;

  for (
    let pageIndex = 0;
    pageIndex < BUYER_INBOX_LEGACY_SCOPE_MAX_PAGES;
    pageIndex += 1
  ) {
    const { data, error } = await rpcClient.rpc(BUYER_INBOX_LEGACY_SCOPE_RPC, {
      p_offset: offsetGroups,
      p_limit: BUYER_INBOX_LEGACY_SCOPE_PAGE_DEFAULTS.pageSize,
      p_search: null,
      p_company_id: null,
    });
    if (error) throw error;

    const validated = validateRpcResponse(data, isBuyerInboxScopeRpcResponse, {
      rpcName: BUYER_INBOX_LEGACY_SCOPE_RPC,
      caller: "src/lib/api/buyer.listBuyerInbox",
      domain: "buyer",
    });
    const meta = validated.meta;
    const pageRows = (
      Array.isArray(validated.rows) ? validated.rows : []
    ) as BuyerInboxRow[];
    const totalGroupCount = readScopeMetaInt(
      meta,
      "total_group_count",
      rows.length + pageRows.length,
    );
    const returnedGroupCount = readScopeMetaInt(
      meta,
      "returned_group_count",
      pageRows.length,
    );

    if (
      totalGroupCount > BUYER_INBOX_LEGACY_SCOPE_PAGE_DEFAULTS.maxRows ||
      rows.length + pageRows.length >
        BUYER_INBOX_LEGACY_SCOPE_PAGE_DEFAULTS.maxRows ||
      offsetGroups + returnedGroupCount >
        BUYER_INBOX_LEGACY_SCOPE_PAGE_DEFAULTS.maxRows
    ) {
      throw new BuyerInboxLegacyWindowCeilingError("groups");
    }

    rows.push(...pageRows);

    const hasMore = readScopeHasMore(
      meta,
      offsetGroups,
      returnedGroupCount,
      totalGroupCount,
    );
    if (!hasMore) return rows;

    if (returnedGroupCount <= 0) {
      throw new Error(
        `${BUYER_INBOX_LEGACY_SCOPE_RPC} reported hasMore with empty page`,
      );
    }
    offsetGroups += returnedGroupCount;
  }

  throw new BuyerInboxLegacyWindowCeilingError("pages");
};

// Unordered request_items compatibility fallback removed to avoid nondeterministic partial lists.

const normalizeStatus = (value: unknown): string =>
  String(normalizeRuText(String(value ?? "")) ?? "")
    .trim()
    .toLowerCase();

const isRejectedStatus = (value: unknown): boolean => {
  const s = normalizeStatus(value);
  return s.includes("отклон") || s.includes("reject");
};

const isReworkStatus = (value: unknown): boolean => {
  const s = normalizeStatus(value);
  return s.includes("доработ") || s.includes("rework");
};

const isProcurementReadyItemStatus = (value: unknown): boolean => {
  return isApprovedForBuyer(value);
};

const rowTimestampMs = (...values: (string | null | undefined)[]): number => {
  for (const value of values) {
    const raw = String(value ?? "").trim();
    if (!raw) continue;
    const ms = new Date(raw).getTime();
    if (Number.isFinite(ms) && ms > 0) return ms;
  }
  return 0;
};

async function loadLatestProposalLifecycleByRequestItem(
  requestItemIds: string[],
): Promise<Map<string, ProposalLifecycleRow>> {
  const ids = Array.from(
    new Set(
      (requestItemIds || [])
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  );
  if (!ids.length) return new Map();

  const piQ = await loadPagedBuyerApiRows<BuyerRejectContextRow>(
    () =>
      client
        .from("proposal_items_view")
        .select("proposal_id, request_item_id")
        .in("request_item_id", ids)
        .order("request_item_id", { ascending: true })
        .order("proposal_id", {
          ascending: true,
        }) as unknown as PagedQuery<BuyerRejectContextRow>,
  );
  if (piQ.error) throw piQ.error;

  const proposalItems = Array.isArray(piQ.data)
    ? (piQ.data as BuyerRejectContextRow[])
    : [];
  const proposalIds = Array.from(
    new Set(
      proposalItems
        .map((row) => String(row?.proposal_id || "").trim())
        .filter(Boolean),
    ),
  );
  if (!proposalIds.length) return new Map();

  const propQ = await loadPagedBuyerApiRows<ProposalLifecycleRow>(
    () =>
      client
        .from("v_proposals_summary")
        .select("proposal_id, status, sent_to_accountant_at, submitted_at")
        .in("proposal_id", proposalIds)
        .order("proposal_id", {
          ascending: true,
        }) as unknown as PagedQuery<ProposalLifecycleRow>,
  );
  if (propQ.error) throw propQ.error;

  const proposalById = new Map<string, ProposalLifecycleRow>();
  (propQ.data || []).forEach((raw) => {
    const row = raw as ProposalLifecycleRow;
    const id = String(row?.proposal_id || "").trim();
    if (!id) return;
    proposalById.set(id, row);
  });

  const bestByRequestItem = new Map<
    string,
    { row: ProposalLifecycleRow; ts: number }
  >();
  for (const raw of proposalItems) {
    const requestItemId = String(raw?.request_item_id || "").trim();
    const proposalId = String(raw?.proposal_id || "").trim();
    const proposal = proposalById.get(proposalId);
    if (!requestItemId || !proposal) continue;

    const ts = rowTimestampMs(
      proposal.sent_to_accountant_at,
      proposal.submitted_at,
    );

    const prev = bestByRequestItem.get(requestItemId);
    if (!prev || ts >= prev.ts) {
      bestByRequestItem.set(requestItemId, { row: proposal, ts });
    }
  }

  return new Map(
    Array.from(bestByRequestItem.entries()).map(([key, value]) => [
      key,
      value.row,
    ]),
  );
}

const isRejectedInboxRow = (
  row: Partial<BuyerInboxRow> | null | undefined,
): boolean =>
  !!row &&
  (!!row.director_reject_at ||
    !!row.director_reject_note ||
    isRejectedStatus(row.status));

async function enrichRejectedRows(
  rows: BuyerInboxRow[],
): Promise<BuyerInboxRow[]> {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return [];

  const rejectedIds = Array.from(
    new Set(
      list
        .filter((row) => isRejectedInboxRow(row))
        .map((row) => String(row?.request_item_id || "").trim())
        .filter(Boolean),
    ),
  );
  if (!rejectedIds.length) return list;

  let ctxData: BuyerRejectContextRow[] = [];
  let ctxErr: unknown = null;
  // Keep query schema-safe: no order by potentially missing columns.
  const q = await loadPagedBuyerApiRows<BuyerRejectContextRow>(
    () =>
      client
        .from("proposal_items")
        .select("*")
        .in("request_item_id", rejectedIds)
        .order("id", {
          ascending: true,
        }) as unknown as PagedQuery<BuyerRejectContextRow>,
  );

  if (!q.error) {
    ctxData = Array.isArray(q.data) ? q.data : [];
    // Sort in JS instead of DB to avoid 400 on drifted column sets.
    ctxData.sort((a, b) => {
      const da = new Date(a.updated_at || a.created_at || "").getTime();
      const db = new Date(b.updated_at || b.created_at || "").getTime();
      return db - da;
    });
  } else {
    ctxErr = q.error;
  }
  if (ctxErr) {
    logBuyerApiDebug(
      "[listBuyerInbox] reject context load failed:",
      parseErr(ctxErr),
    );
    return list;
  }

  const byRequestItemId = new Map<string, BuyerRejectContextRow>();
  for (const raw of ctxData) {
    const row = raw as BuyerRejectContextRow;
    const requestItemId = String(row?.request_item_id || "").trim();
    if (!requestItemId || byRequestItemId.has(requestItemId)) continue;
    byRequestItemId.set(requestItemId, row);
  }

  return list.map((row) => {
    const requestItemId = String(row?.request_item_id || "").trim();
    if (!requestItemId || !isRejectedInboxRow(row)) return row;
    const ctx = byRequestItemId.get(requestItemId);
    if (!ctx) return row;

    const reason = String(
      normalizeRuText(
        String(row.director_reject_note ?? ctx.director_comment ?? "").trim(),
      ) ?? "",
    ).trim();

    return {
      ...row,
      director_reject_reason: reason || null,
      last_offer_supplier: String(ctx?.supplier ?? "").trim() || null,
      last_offer_price:
        typeof ctx?.price === "number" && Number.isFinite(ctx.price)
          ? Number(ctx.price)
          : null,
      last_offer_note: String(ctx?.note ?? "").trim() || null,
    };
  });
}

async function filterInboxByRequestStatus(
  rows: BuyerInboxRow[],
): Promise<BuyerInboxRow[]> {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return [];

  const reqIds = Array.from(
    new Set(
      list.map((r) => String(r?.request_id || "").trim()).filter(Boolean),
    ),
  );
  if (!reqIds.length) return [];

  try {
    const { data, error } = await loadPagedBuyerApiRows<RequestStatusRow>(
      () =>
        client
          .from("requests")
          .select("id, status")
          .in("id", reqIds)
          .order("id", {
            ascending: true,
          }) as unknown as PagedQuery<RequestStatusRow>,
    );
    if (error) throw error;

    const statusByReqId = new Map<string, string>();
    (data || []).forEach((row) => {
      const r = row as RequestStatusRow;
      statusByReqId.set(String(r.id || "").trim(), String(r.status || ""));
    });

    const rejectedItemIds = list
      .filter((row) => isRejectedInboxRow(row))
      .map((row) => String(row?.request_item_id || "").trim())
      .filter(Boolean);

    let latestProposalByRequestItem = new Map<string, ProposalLifecycleRow>();
    if (rejectedItemIds.length) {
      try {
        latestProposalByRequestItem =
          await loadLatestProposalLifecycleByRequestItem(rejectedItemIds);
      } catch (proposalErr) {
        logBuyerApiDebug(
          "[listBuyerInbox] latest proposal gate failed:",
          parseErr(proposalErr),
        );
      }
    }

    return list.filter((r) => {
      const requestStatus =
        statusByReqId.get(String(r?.request_id || "").trim()) || "";
      const requestReady = isApprovedForBuyer(requestStatus);
      const itemReady = isProcurementReadyItemStatus(r?.status);

      if (isRejectedInboxRow(r)) {
        const latestProposal = latestProposalByRequestItem.get(
          String(r?.request_item_id || "").trim(),
        );
        if (latestProposal) return isReworkStatus(latestProposal.status);
        // Old reject residue must not keep item in inbox after a new approved/pending cycle.
        return !requestReady && !itemReady;
      }

      if (itemReady) return true;
      return requestReady;
    });
  } catch (e) {
    logBuyerApiDebug(
      "[listBuyerInbox] request-status gate failed:",
      parseErr(e),
    );
    return list.filter((r) => {
      if (isRejectedInboxRow(r))
        return !isProcurementReadyItemStatus(r?.status);
      return isProcurementReadyItemStatus(r?.status);
    });
  }
}

export async function listBuyerInbox(): Promise<BuyerInboxRow[]> {
  const observation = beginPlatformObservability({
    screen: "buyer",
    surface: "inbox_window",
    category: "fetch",
    event: "load_buyer_inbox",
    sourceKind: `rpc:${BUYER_INBOX_LEGACY_SCOPE_RPC}`,
  });

  try {
    const rows = await loadBuyerInboxRowsFromScopeRpc();
    const gatedRows = await filterInboxByRequestStatus(rows);
    const enrichedRows = await enrichRejectedRows(gatedRows);
    observation.success({
      sourceKind: `rpc:${BUYER_INBOX_LEGACY_SCOPE_RPC}`,
      rowCount: enrichedRows.length,
      extra: {
        publishState: enrichedRows.length ? "ready" : "empty",
      },
    });
    return enrichedRows;
  } catch (e) {
    if (isBuyerInboxLegacyCeilingError(e)) throw e;
    recordBuyerInboxFallbackFailure({
      event: "buyer_inbox_scope_rpc_failed",
      error: e,
      sourceKind: `rpc:${BUYER_INBOX_LEGACY_SCOPE_RPC}`,
      errorStage: "scope_rpc",
      extra: {
        fallbackReason: "request_items_compatibility_fallback",
      },
    });
    logBuyerApiDebug(
      "[listBuyerInbox] rpc buyer_summary_inbox_scope_v1 failed, hitting fallback:",
      parseErr(e),
    );
  }

  try {
    let fbData: FallbackBuyerRow[] = [];
    let fbErr: unknown = null;

    const plans = [
      () =>
        loadPagedBuyerApiRows<FallbackBuyerRow>(
          () =>
            client
              .from("request_items")
              .select("*")
              .order("created_at", { ascending: false })
              .order("id", {
                ascending: false,
              }) as unknown as PagedQuery<FallbackBuyerRow>,
        ),
      () =>
        loadPagedBuyerApiRows<FallbackBuyerRow>(
          () =>
            client.from("request_items").select("*").order("id", {
              ascending: false,
            }) as unknown as PagedQuery<FallbackBuyerRow>,
        ),
    ] as const;

    for (const run of plans) {
      const fb = await run();
      if (!fb.error) {
        fbData = Array.isArray(fb.data) ? fb.data : [];
        fbErr = null;
        break;
      }
      if (isBuyerInboxLegacyCeilingError(fb.error)) throw fb.error;
      fbErr = fb.error;
    }

    if (fbErr) throw fbErr;

    const rows = (fbData ?? []).map((row) => {
      const r = row as FallbackBuyerRow;
      const reqIdOldRaw = r.requests?.id_old;
      const reqIdOld = reqIdOldRaw == null ? null : Number(reqIdOldRaw);
      return {
        request_id: String(r.request_id || ""),
        request_id_old: Number.isFinite(reqIdOld) ? reqIdOld : null,
        request_item_id: String(r.id || ""),
        rik_code: null,
        name_human: String(r.name_human ?? "—"),
        qty: r.qty ?? 0,
        uom: r.uom ?? null,
        app_code: r.app_code ?? null,
        note: null,
        object_name: null,
        status: String(r.status ?? ""),
        created_at: undefined,
        director_reject_note: r.director_reject_note ?? null,
        director_reject_at: r.director_reject_at ?? null,
        kind: r.kind ?? null,
        request_status: String(r.requests?.status ?? r.request_status ?? ""),
      };
    }) as (BuyerInboxRow & { request_status?: string })[];
    const gatedRows = await filterInboxByRequestStatus(rows as BuyerInboxRow[]);
    const enrichedRows = await enrichRejectedRows(gatedRows);
    observation.success({
      sourceKind: "table:request_items",
      fallbackUsed: true,
      rowCount: enrichedRows.length,
      extra: {
        publishState: enrichedRows.length ? "degraded" : "empty",
      },
    });
    return enrichedRows;
  } catch (err) {
    if (isBuyerInboxLegacyCeilingError(err)) throw err;
    recordBuyerInboxFallbackFailure({
      event: "buyer_inbox_compatibility_fallback_failed",
      error: err,
      sourceKind: "table:request_items",
      errorStage: "compatibility_fallback",
      extra: {
        fallbackReason: "empty_list_legacy_contract",
      },
    });
    observation.error(err, {
      sourceKind: "table:request_items",
      errorStage: "fallback_exhausted",
      fallbackUsed: true,
      rowCount: 0,
      extra: {
        publishState: "empty_after_fallback_error",
      },
    });
    logBuyerApiDebug("[listBuyerInbox] fallback failed:", parseErr(err));
    return [];
  }
}

export async function listBuyerProposalsByStatus(
  status: string,
  pageInput?: PageInput,
) {
  const page = normalizePage(pageInput, { pageSize: 50, maxPageSize: 100 });
  const { data, error } = await client
    .from("proposals")
    .select("id, status, submitted_at")
    .eq("status", status)
    .order("submitted_at", { ascending: false })
    .order("id", { ascending: false })
    .range(page.from, page.to);

  if (error) throw error;
  return data || [];
}
