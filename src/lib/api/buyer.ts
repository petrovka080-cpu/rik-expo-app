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
    console.warn("[listBuyerInbox] rpc list_buyer_inbox failed, hitting fallback:", parseErr(e));
  }

  // ✅ fallback с фильтрацией (чтобы не тянуть лишнее)
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
        requests(id_old)
      `)
      .not("status", "in", '("Утверждено","Отклонено","approved","rejected","Cancelled","cancelled","finished","issued")')
      .order("created_at", { ascending: false })
      .limit(500);

    if (fb.error) throw fb.error;

    return (fb.data ?? []).map((r: any) => ({
      request_id: String(r.request_id),
      request_id_old: r.requests?.id_old ?? null,
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

      director_reject_note: r.director_reject_note ?? null,
      director_reject_at: r.director_reject_at ?? null,
      kind: r.kind ?? null,
    })) as BuyerInboxRow[];
  } catch (err) {
    console.warn("[listBuyerInbox] fallback failed:", parseErr(err));
    return [];
  }
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
