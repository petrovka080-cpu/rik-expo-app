import { supabase } from "../supabaseClient";
import { client, toRpcId, parseErr } from "./_core";
import type { DirectorPendingRow, DirectorInboxRow } from "./types";

export async function listPending(): Promise<DirectorPendingRow[]> {
  const ridMap = new Map<string, number>();
  let ridSeq = 1;

  const normalize = (arr: any[]): DirectorPendingRow[] =>
    (arr ?? []).map((r: any, i: number) => {
      const raw =
        r.request_id ?? r.request_id_old ?? r.request ?? r.request_uuid ?? r.request_id_text ?? "";
      let ridNum = Number(raw);
      if (!Number.isFinite(ridNum) || ridNum <= 0) {
        const key = String(raw || "");
        if (!ridMap.has(key)) ridMap.set(key, ridSeq++);
        ridNum = ridMap.get(key)!;
      }
      return {
        id: Number(r.id ?? i + 1),
        request_id: ridNum,
        request_item_id: String(r.request_item_id ?? r.id ?? ""),
        name_human: String(r.name_human ?? ""),
        qty: Number(r.qty ?? 0),
        uom: r.uom ?? null,
      };
    });

  try {
    let rpc = await client.rpc("list_pending_foreman_items");
    if (!rpc.error && Array.isArray(rpc.data)) return normalize(rpc.data as any[]);

    rpc = await client.rpc("listPending");
    if (!rpc.error && Array.isArray(rpc.data)) return normalize(rpc.data as any[]);

    rpc = await client.rpc("list_pending");
    if (!rpc.error && Array.isArray(rpc.data)) return normalize(rpc.data as any[]);

    rpc = await client.rpc("listpending");
    if (!rpc.error && Array.isArray(rpc.data)) return normalize(rpc.data as any[]);
  } catch (e) {
    console.warn("[listPending] rpc failed → fallback", parseErr(e));
  }

  // fallback (как у тебя было)
  try {
    const reqs = await client.from("requests").select("id, id_old").eq("status", "На утверждении");
    const ids = (reqs.data || []).map((r: any) => String(r.id));
    if (!ids.length) return [];

    const idOldByUuid = new Map<string, number>();
    (reqs.data || []).forEach((r: any) => {
      if (Number.isFinite(r.id_old)) idOldByUuid.set(String(r.id), Number(r.id_old));
    });

    const ri = await client
      .from("request_items")
      .select("id,request_id,name_human,qty,uom,status")
      .in("request_id", ids)
      .neq("status", "Утверждено")
      .order("request_id", { ascending: true })
      .order("id", { ascending: true });

    if (ri.error) throw ri.error;

    const out: DirectorPendingRow[] = [];
    for (let i = 0; i < (ri.data || []).length; i++) {
      const r: any = (ri.data as any[])[i];
      const uuid = String(r.request_id);
      let ridNum = idOldByUuid.get(uuid);
      if (!Number.isFinite(ridNum)) {
        if (!ridMap.has(uuid)) ridMap.set(uuid, ridSeq++);
        ridNum = ridMap.get(uuid)!;
      }
      out.push({
        id: i + 1,
        request_id: ridNum!,
        request_item_id: String(r.id ?? ""),
        name_human: String(r.name_human ?? ""),
        qty: Number(r.qty ?? 0),
        uom: r.uom ?? null,
      });
    }
    return out;
  } catch (e) {
    console.warn("[listPending/fallback]", parseErr(e));
    return [];
  }
}

export async function approve(approvalId: number | string) {
  try {
    const rpc = await client.rpc("approve_one", { p_proposal_id: toRpcId(approvalId) } as any);
    if (!rpc.error) return true;
  } catch {}

  const upd = await client
    .from("proposals")
    .update({ status: "Утверждено" })
    .eq("id", approvalId)
    .eq("status", "На утверждении")
    .select("id")
    .maybeSingle();

  if (upd.error) throw upd.error;
  return !!upd.data;
}

export async function reject(approvalId: number | string, _reason = "Без причины") {
  try {
    const rpc = await client.rpc("reject_one", { p_proposal_id: toRpcId(approvalId) } as any);
    if (!rpc.error) return true;
  } catch {}

  const upd = await client
    .from("proposals")
    .update({ status: "Отклонено" })
    .eq("id", approvalId)
    .eq("status", "На утверждении")
    .select("id")
    .maybeSingle();

  if (upd.error) throw upd.error;
  return !!upd.data;
}

export async function directorReturnToBuyer(
  a: { proposalId: string | number; comment?: string } | string | number,
  b?: string | null
) {
  const pid = typeof a === "object" && a !== null ? String((a as any).proposalId) : String(a);
  const comment = typeof a === "object" && a !== null ? (a as any).comment : b;
  const c = (comment ?? "").trim() || null;

  const { error } = await supabase.rpc("director_return_min_auto", {
    p_proposal_id: pid,
    p_comment: c,
  } as any);

  if (error) throw error;
  return true;
}

export async function listDirectorInbox(
  status: "На утверждении" | "Утверждено" | "Отклонено" = "На утверждении"
) {
  const { data, error } = await client.rpc("list_director_inbox", { p_status: status } as any);
  if (error) {
    console.warn("[listDirectorInbox]", error.message);
    return [];
  }
  const rows = (data ?? []) as DirectorInboxRow[];
  return rows.filter((r) => (r?.kind ?? "") !== "request");
}
