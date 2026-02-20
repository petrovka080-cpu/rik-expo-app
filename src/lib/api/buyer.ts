import { client, parseErr } from "./_core";
import type { BuyerInboxRow } from "./types";

export async function listBuyerInbox(): Promise<BuyerInboxRow[]> {
  // ✅ один источник истины: серверная функция
  try {
    const { data, error } = await client.rpc("list_buyer_inbox", {
      p_company_id: null, // важно: чтобы попасть в сигнатуру uuid
    } as any);

    if (error) throw error;
    return Array.isArray(data) ? (data as BuyerInboxRow[]) : [];
  } catch (e) {
    console.warn("[listBuyerInbox] rpc list_buyer_inbox:", parseErr(e));
  }

  // ✅ fallback оставляем на случай падения RPC
  const fb = await client
    .from("request_items")
    .select("id, request_id, name_human, qty, uom, app_code, status")
    .order("request_id", { ascending: true })
    .limit(1000);

  if (fb.error) {
    console.warn("[listBuyerInbox/fallback]", parseErr(fb.error));
    return [];
  }

  return (fb.data ?? []).map((r: any) => ({
    request_id: String(r.request_id),
    request_id_old: null,
    request_item_id: String(r.id),
    rik_code: null,
    name_human: String(r.name_human ?? "—"),
    qty: r.qty ?? 0,
    uom: r.uom ?? null,
    app_code: r.app_code ?? null,
    note: null,
    object_name: null,
    status: String(r.status ?? ""),
    created_at: undefined,

    // поля могут существовать в UI как optional — держим совместимость
    director_reject_note: null,
    director_reject_at: null,
    kind: null,
  })) as BuyerInboxRow[];
}

export async function listBuyerProposalsByStatus(
  status: "На утверждении" | "Утверждено" | "Отклонено"
) {
  const { data, error } = await client
    .from("proposals")
    .select("id, status, submitted_at")
    .eq("status", status)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
