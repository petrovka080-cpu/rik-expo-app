// src/lib/store_supabase.ts
import { supabase } from './supabaseClient';
import type { Database } from './database.types';

type RequestItemRowDb = Pick<
  Database["public"]["Tables"]["request_items"]["Row"],
  "id" | "request_id" | "name_human" | "qty" | "uom" | "status" | "created_at"
>;
type PendingRequestItemDb = Database["public"]["Views"]["request_items_pending_view"]["Row"];
type ApprovedRequestItemDb = Database["public"]["Views"]["v_request_items_display"]["Row"];
type PurchaseInsert = Database["public"]["Tables"]["purchases"]["Insert"];
type PurchaseItemInsert = Database["public"]["Tables"]["purchase_items"]["Insert"];

export type ReqItem = {
  id: string;
  request_id: string | number;
  name_human: string;
  uom: string | null;
  qty: number | null;
  status: string;
  created_at: string;
};

export type PendingRequestItem = {
  pending_id: string;
  request_id: string | number;
  request_item_id: string;
  created_at: string;
  name_human: string;
  uom: string | null;
  qty: number | null;
  status: string | null;
};

function normalizeReqItem(row: RequestItemRowDb | ApprovedRequestItemDb): ReqItem {
  return {
    id: String(row.id ?? ''),
    request_id: row.request_id ?? '',
    name_human: String(row.name_human ?? ''),
    uom: row.uom ?? null,
    qty: row.qty ?? null,
    status: 'status' in row ? (row.status ?? '') : '',
    created_at: 'created_at' in row ? String(row.created_at ?? '') : '',
  };
}

function normalizePendingRequestItem(row: PendingRequestItemDb): PendingRequestItem {
  const requestItemId = String(row.request_item_id ?? row.id ?? '');
  return {
    pending_id: requestItemId,
    request_id: row.request_id ?? '',
    request_item_id: requestItemId,
    created_at: '',
    name_human: String(row.name_human ?? ''),
    uom: row.uom ?? null,
    qty: row.qty ?? null,
    status: null,
  };
}

export async function listRequestItems(requestId: number, status?: string): Promise<ReqItem[]> {
  let q = supabase
    .from('request_items')
    .select('id, request_id, name_human, qty, uom, status, created_at')
    .eq('request_id', String(requestId))
    .order('created_at', { ascending: true });

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(normalizeReqItem);
}

export async function sendRequestToDirector(requestId: number): Promise<number> {
  const { data, error } = await supabase.rpc('send_request_to_director', { p_request_id: requestId });

  if (error) throw error;
  const first = Array.isArray(data) ? data[0] : null;
  const inserted =
    first && typeof first === 'object' && 'inserted_count' in first
      ? Number((first as { inserted_count: unknown }).inserted_count)
      : 0;
  return inserted ?? 0;
}

export async function listDirectorInbox(): Promise<PendingRequestItem[]> {
  const { data, error } = await supabase
    .from('request_items_pending_view')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizePendingRequestItem);
}

export async function approvePending(pendingId: string, verdict: 'Утверждено' | 'Отклонено') {
  const { data, error } = await supabase.rpc('approve_or_decline_request_pending', {
    p_pending_id: pendingId,
    p_verdict: verdict,
  });

  if (error) throw error;
  return data;
}

export async function listApprovedByRequest(requestId: number): Promise<ReqItem[]> {
  const { data, error } = await supabase
    .from('v_request_items_display')
    .select('*')
    .eq('request_id', String(requestId));

  if (error) throw error;
  return (data ?? []).map(normalizeReqItem);
}

export async function createPoFromRequest(requestId: number, poNo: string) {
  const purchasePayload: PurchaseInsert = {
    po_no: poNo,
    request_id: String(requestId),
    request_id_old: requestId,
    status: 'На утверждении',
    currency: 'KGS',
  };

  let { data: poRow, error: poErr } = await supabase
    .from('purchases')
    .insert(purchasePayload)
    .select('*')
    .single();

  if (poErr && !poRow) throw poErr;

  const items = await listApprovedByRequest(requestId);

  if (items.length > 0 && poRow) {
    const toInsert: PurchaseItemInsert[] = items.map((it) => ({
      purchase_id: poRow.id,
      request_item_id: it.id,
      name_human: it.name_human,
      uom: it.uom,
      qty: Number(it.qty ?? 0),
      price: null,
    }));
    const { error: piErr } = await supabase.from('purchase_items').insert(toInsert);
    if (piErr) throw piErr;
  }

  if (poRow) {
    const { error: pendErr } = await supabase.from('purchases_pending').insert([{ purchase_id: poRow.id }]);
    if (pendErr && pendErr.code !== '23505') throw pendErr;
  }

  return poRow;
}
