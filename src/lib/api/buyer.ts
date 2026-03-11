import { client, parseErr } from "./_core";
import type { BuyerInboxRow } from "./types";
import { isRequestApprovedForProcurement } from "../requestStatus";
import { normalizeRuText } from "../text/encoding";

const isApprovedForBuyer = (raw: unknown) => isRequestApprovedForProcurement(raw);

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
  supplier?: string | null;
  price?: number | null;
  note?: string | null;
  director_comment?: string | null;
  director_decision?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

// REQUEST_ITEMS_FALLBACK_SELECT_PLANS removed to avoid 400 Bad Request probes

const normalizeStatus = (value: unknown): string =>
  String(normalizeRuText(String(value ?? "")) ?? "")
    .trim()
    .toLowerCase();

const isRejectedStatus = (value: unknown): boolean => {
  const s = normalizeStatus(value);
  return s.includes("РѕС‚РєР»РѕРЅ") || s.includes("reject");
};

const isProcurementReadyItemStatus = (value: unknown): boolean => {
  return isApprovedForBuyer(value);
};

const isRejectedInboxRow = (row: Partial<BuyerInboxRow> | null | undefined): boolean =>
  !!row && (!!row.director_reject_at || !!row.director_reject_note || isRejectedStatus(row.status));

async function enrichRejectedRows(rows: BuyerInboxRow[]): Promise<BuyerInboxRow[]> {
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

  let ctxData: any[] = [];
  let ctxErr: any = null;
  // Keep query schema-safe: no order by potentially missing columns.
  const q = await client
    .from("proposal_items")
    .select("*")
    .in("request_item_id", rejectedIds);

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
    console.warn("[listBuyerInbox] reject context load failed:", parseErr(ctxErr));
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
        typeof ctx?.price === "number" && Number.isFinite(ctx.price) ? Number(ctx.price) : null,
      last_offer_note: String(ctx?.note ?? "").trim() || null,
    };
  });
}

async function filterInboxByRequestStatus(rows: BuyerInboxRow[]): Promise<BuyerInboxRow[]> {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return [];

  const reqIds = Array.from(new Set(list.map((r) => String(r?.request_id || "").trim()).filter(Boolean)));
  if (!reqIds.length) return [];

  try {
    const { data, error } = await client.from("requests").select("id, status").in("id", reqIds);
    if (error) throw error;

    const statusByReqId = new Map<string, string>();
    (data || []).forEach((row) => {
      const r = row as RequestStatusRow;
      statusByReqId.set(String(r.id || "").trim(), String(r.status || ""));
    });

    return list.filter((r) => {
      if (isRejectedInboxRow(r)) return true;
      if (isProcurementReadyItemStatus(r?.status)) return true;
      return isApprovedForBuyer(statusByReqId.get(String(r?.request_id || "").trim()) || "");
    });
  } catch (e) {
    console.warn("[listBuyerInbox] request-status gate failed:", parseErr(e));
    return list.filter((r) => isRejectedInboxRow(r) || isProcurementReadyItemStatus(r?.status));
  }
}

export async function listBuyerInbox(): Promise<BuyerInboxRow[]> {
  try {
    const { data, error } = await client.rpc("list_buyer_inbox", { p_company_id: null });
    if (error) throw error;

    const rows = Array.isArray(data) ? (data as BuyerInboxRow[]) : [];
    return await enrichRejectedRows(rows);
  } catch (e) {
    console.warn("[listBuyerInbox] rpc list_buyer_inbox failed, hitting fallback:", parseErr(e));
  }

  try {
    let fbData: any[] = [];
    let fbErr: any = null;

    const plans = [
      () =>
        client
          .from("request_items")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
      () =>
        client
          .from("request_items")
          .select("*")
          .order("id", { ascending: false })
          .limit(500),
      () => client.from("request_items").select("*").limit(500),
    ] as const;

    for (const run of plans) {
      const fb = await run();
      if (!fb.error) {
        fbData = Array.isArray(fb.data) ? fb.data : [];
        fbErr = null;
        break;
      }
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
        name_human: String(r.name_human ?? "вЂ”"),
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
    }) as Array<BuyerInboxRow & { request_status?: string }>;
    return await enrichRejectedRows(rows as BuyerInboxRow[]);
  } catch (err) {
    console.warn("[listBuyerInbox] fallback failed:", parseErr(err));
    return [];
  }
}

export async function listBuyerProposalsByStatus(status: string) {
  const { data, error } = await client
    .from("proposals")
    .select("id, status, submitted_at")
    .eq("status", status)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

