// src/lib/store_supabase.ts
import { supabase } from './supabaseClient';

export type ReqItem = {
  id: string;
  request_id: number;
  name_human: string;
  uom: string | null;
  qty: number | null;
  status: string;
  created_at: string;
};

export type PendingRequestItem = {
  pending_id: string;
  request_id: number;
  request_item_id: string;
  created_at: string;
  name_human: string;
  uom: string | null;
  qty: number | null;
  status: string | null;
};

export async function listRequestItems(requestId: number, status?: string): Promise<ReqItem[]> {
  let q = supabase
  .from('request_items')
  .select('id, request_id, name_human, qty, uom, status')
  .eq('request_id', requestId)
  .order('created_at', { ascending: true });


  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ReqItem[];
}

export async function sendRequestToDirector(requestId: number): Promise<number> {
  const { data, error } = await supabase
    .rpc('send_request_to_director', { p_request_id: requestId });

  if (error) throw error;
  const inserted = Array.isArray(data) && data.length > 0 ? (data[0] as any).inserted_count as number : 0;
  return inserted ?? 0;
}

export async function listDirectorInbox(): Promise<PendingRequestItem[]> {
  const { data, error } = await supabase
    .from('request_items_pending_view')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PendingRequestItem[];
}

export async function approvePending(pendingId: string, verdict: 'Утверждено' | 'Отклонено') {
  const { data, error } = await supabase
    .rpc('approve_or_decline_request_pending', {
      p_pending_id: pendingId,
      p_verdict: verdict,
    });

  if (error) throw error;
  return data;
}

/** Снабженец: утв. позиции по заявке (для предварительного PO) */
export async function listApprovedByRequest(requestId: number): Promise<ReqItem[]> {
  const { data, error } = await supabase
    .from('request_items_view') // только 'Утверждено'
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ReqItem[];
}

/** Создать черновик PO из утверждённых позиций */
export async function createPoFromRequest(requestId: number, poNo: string) {
  // создаём сам PO
  let { data: poRow, error: poErr } = await supabase
    .from('purchases')
    .insert([{ po_no: poNo, request_id: requestId, status: 'На утверждении', currency: 'KGS' }])
    .select('*')
    .single();

  if (poErr && !poRow) throw poErr;

  // подтянем approved позиции
  const items = await listApprovedByRequest(requestId);

  if (items.length > 0 && poRow) {
    const toInsert = items.map(it => ({
      purchase_id: poRow.id,
      request_item_id: it.id,
      name_human: it.name_human,
      uom: it.uom,
      qty: it.qty,
      price: null
    }));
    const { error: piErr } = await supabase.from('purchase_items').insert(toInsert);
    if (piErr) throw piErr;
  }

  // отправим директору на утверждение PO
  if (poRow) {
    const { error: pendErr } = await supabase.from('purchases_pending').insert([{ purchase_id: poRow.id }]);
    if (pendErr && pendErr.code !== '23505') throw pendErr; // ignore duplicate
  }

  return poRow;
}


