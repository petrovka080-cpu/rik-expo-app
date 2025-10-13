// src/lib/requests.ts
import { supabase } from "./supabaseClient";

export type RequestItemRow = {
  id: string;
  request_id?: number;
  name_human: string;
  qty: number | null;
  uom: string | null;
  status?: string | null;
};

export async function createRequestRPC(): Promise<number> {
  const { data, error } = await supabase.rpc("create_request");
  if (error) throw new Error(error.message);
  const id = Array.isArray(data) ? (data[0]?.id as number) : (data as any)?.id;
  if (!id) throw new Error("RPC create_request не вернул id");
  return id;
}

export async function addRequestItemRPC(
  requestId: number,
  name: string,
  qty: number,
  uom: string | null
): Promise<RequestItemRow[]> {
  const { data, error } = await supabase.rpc("add_request_item", {
    p_request_id: requestId,
    p_name: name,
    p_qty: qty,
    p_uom: uom,
  });
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data : [data]) as RequestItemRow[];
}

/** ВАЖНО: у всех чтений должен быть .select(...) — иначе 400 от PostgREST */
export async function getRequestItemsByRequestId(requestId: number): Promise<RequestItemRow[]> {
  const { data, error } = await supabase
    .from("request_items")
    .select("id, request_id, name_human, qty, uom, status") // ОБЯЗАТЕЛЬНО
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as RequestItemRow[];
}

export async function getRequestItemById(id: string): Promise<RequestItemRow | null> {
  const { data, error } = await supabase
    .from("request_items")
    .select("id, request_id, name_human, qty, uom, status") // ОБЯЗАТЕЛЬНО
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return (data as RequestItemRow) ?? null;
}

