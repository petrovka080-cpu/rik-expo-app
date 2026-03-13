import { supabase } from "../supabaseClient";
import type { Database } from "../database.types";
import { client, toRpcId, parseErr } from "./_core";
import type { DirectorPendingRow, DirectorInboxRow } from "./types";

type RequestStatus = Database["public"]["Enums"]["request_status_enum"];
type DirectorInboxStatusArg =
  Database["public"]["Functions"]["list_director_inbox"]["Args"]["p_status"];
type DirectorReturnArgs =
  Database["public"]["Functions"]["director_return_min_auto"]["Args"];
type PendingRpcName =
  | "list_pending_foreman_items"
  | "listPending"
  | "list_pending"
  | "listpending";

const asRequestStatus = (value: string): RequestStatus => value as RequestStatus;

function asDirectorPendingRows(value: unknown): DirectorPendingRow[] {
  return Array.isArray(value) ? (value as DirectorPendingRow[]) : [];
}

async function callPendingRpc(name: PendingRpcName): Promise<DirectorPendingRow[]> {
  const rpc = await client.rpc(name);
  if (rpc.error) return [];
  return asDirectorPendingRows(rpc.data);
}

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
    const rpcRows = await callPendingRpc("list_pending_foreman_items");
    if (rpcRows.length) return normalize(rpcRows);

    const rpcRowsCompat = await callPendingRpc("listPending");
    if (rpcRowsCompat.length) return normalize(rpcRowsCompat);

    const rpcRowsLegacy = await callPendingRpc("list_pending");
    if (rpcRowsLegacy.length) return normalize(rpcRowsLegacy);

    const rpcRowsAlt = await callPendingRpc("listpending");
    if (rpcRowsAlt.length) return normalize(rpcRowsAlt);
  } catch (e) {
    console.warn("[listPending] rpc failed → fallback", parseErr(e));
  }

  // fallback (как у тебя было)
  try {
    const reqs = await client
      .from("requests")
      .select("id, id_old")
      .eq("status", asRequestStatus("На утверждении"));
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
      .neq("status", asRequestStatus("Утверждено"))
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
    const rpc = await client.rpc("approve_one", { p_proposal_id: toRpcId(approvalId) });
    if (!rpc.error) return true;
  } catch {}

  const upd = await client
    .from("proposals")
    .update({ status: "Утверждено" })
    .eq("id", String(approvalId))
    .eq("status", "На утверждении")
    .select("id")
    .maybeSingle();

  if (upd.error) throw upd.error;
  return !!upd.data;
}

export async function reject(approvalId: number | string, _reason = "Без причины") {
  try {
    const rpc = await client.rpc("reject_one", { p_proposal_id: toRpcId(approvalId) });
    if (!rpc.error) return true;
  } catch {}

  const upd = await client
    .from("proposals")
    .update({ status: "Отклонено" })
    .eq("id", String(approvalId))
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
  const payload = typeof a === "object" && a !== null ? a : null;
  const pid = payload ? String(payload.proposalId) : String(a);
  const comment = payload?.comment ?? b;
  const c = (comment ?? "").trim() || null;

  const args: DirectorReturnArgs = {
    p_proposal_id: pid,
    p_comment: c,
  };
  const { error } = await supabase.rpc("director_return_min_auto", args);

  if (error) throw error;
  return true;
}

export async function listDirectorInbox(
  status: "На утверждении" | "Утверждено" | "Отклонено" = "На утверждении"
) {
  const args: { p_status?: DirectorInboxStatusArg } = { p_status: status };
  const { data, error } = await client.rpc("list_director_inbox", args);
  if (error) {
    console.warn("[listDirectorInbox]", parseErr(error));
    return [];
  }
  const rows = Array.isArray(data) ? (data as DirectorInboxRow[]) : [];
  return rows.filter((r) => (r?.kind ?? "") !== "request");
}
