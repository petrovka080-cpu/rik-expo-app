// src/lib/requests.ts
import { supabase } from "./supabaseClient";
import type { Database } from "./database.types";

type RequestItemDbRow = Pick<
  Database["public"]["Tables"]["request_items"]["Row"],
  "id" | "request_id" | "name_human" | "qty" | "uom" | "status"
>;

export type RequestItemRow = {
  id: string;
  request_id?: string | number;
  name_human: string;
  qty: number | null;
  uom: string | null;
  status?: string | null;
};

function normalizeRequestItemRow(row: RequestItemDbRow): RequestItemRow {
  return {
    id: String(row.id),
    request_id: row.request_id,
    name_human: String(row.name_human ?? ""),
    qty: row.qty ?? null,
    uom: row.uom ?? null,
    status: row.status ?? null,
  };
}

export async function createRequestRPC(): Promise<number> {
  const { data, error } = await supabase.rpc("create_request");
  if (error) throw new Error(error.message);
  const first = Array.isArray(data) ? data[0] : data;
  const id =
    typeof first === "object" && first !== null && "id" in first
      ? Number((first as { id: unknown }).id)
      : Number.NaN;
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
    p_uom: uom ?? "",
  });
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows.map((row) =>
    normalizeRequestItemRow({
      id: row.id,
      request_id: String(requestId),
      name_human: row.name_human,
      qty: row.qty,
      uom: row.uom,
      status: null,
    }),
  );
}

/** ВАЖНО: у всех чтений должен быть .select(...) — иначе 400 от PostgREST */
export async function getRequestItemsByRequestId(requestId: number | string): Promise<RequestItemRow[]> {
  const { data, error } = await supabase
    .from("request_items")
    .select("id, request_id, name_human, qty, uom, status") // ОБЯЗАТЕЛЬНО
    .eq("request_id", String(requestId))
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeRequestItemRow);
}

export async function getRequestItemById(id: string): Promise<RequestItemRow | null> {
  const { data, error } = await supabase
    .from("request_items")
    .select("id, request_id, name_human, qty, uom, status") // ОБЯЗАТЕЛЬНО
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data ? normalizeRequestItemRow(data) : null;
}
