import { client, parseErr } from "./_core";
import type { BuyerInboxRow } from "./types";
import { isRequestApprovedForProcurement } from "../requestStatus";

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
};

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

    return list.filter((r) => isApprovedForBuyer(statusByReqId.get(String(r?.request_id || "").trim()) || ""));
  } catch (e) {
    console.warn("[listBuyerInbox] request-status gate failed:", parseErr(e));
    return [];
  }
}

export async function listBuyerInbox(): Promise<BuyerInboxRow[]> {
  try {
    const { data, error } = await client.rpc("list_buyer_inbox", { p_company_id: null });
    if (error) throw error;

    const rows = Array.isArray(data) ? (data as BuyerInboxRow[]) : [];
    return await filterInboxByRequestStatus(rows);
  } catch (e) {
    console.warn("[listBuyerInbox] rpc list_buyer_inbox failed, hitting fallback:", parseErr(e));
  }

  try {
    const fb = await client
      .from("request_items")
      .select(`
        id,
        request_id,
        name_human,
        qty,
        uom,
        app_code,
        status,
        director_reject_note,
        director_reject_at,
        kind,
        requests(id_old,status)
      `)
      .order("created_at", { ascending: false })
      .limit(500);

    if (fb.error) throw fb.error;

    const rows = (fb.data ?? []).map((row) => {
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
        request_status: String(r.requests?.status ?? ""),
      };
    }) as Array<BuyerInboxRow & { request_status?: string }>;

    return rows.filter((r) => isApprovedForBuyer(r.request_status));
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
