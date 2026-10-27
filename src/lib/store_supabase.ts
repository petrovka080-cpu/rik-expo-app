// src/lib/store_supabase.ts
import type { Database } from './database.types';
import {
  isRpcNonEmptyString,
  isRpcNumberLike,
  isRpcRecord,
  validateRpcResponse,
} from './api/queryBoundary';
import {
  loadApprovedRequestItemRows,
  loadDirectorInboxRows,
  loadRequestItemRows,
  type ApprovedRequestItemDb,
  type PendingRequestItemDb,
  type RequestItemRowDb,
} from './store_supabase.read.transport';
import {
  approveOrDeclineRequestPendingRpc,
  insertStorePurchase,
  insertStorePurchaseItems,
  insertStorePurchasePending,
  sendStoreRequestToDirectorRpc,
} from './store_supabase.write.transport';

type PurchaseInsert = Database["public"]["Tables"]["purchases"]["Insert"];
type PurchaseItemInsert = Database["public"]["Tables"]["purchase_items"]["Insert"];

type SendRequestToDirectorRpcRow = {
  inserted_count: number | string;
};

type ApproveOrDeclinePendingRpcRow = {
  new_status: string;
  pending_id: string;
  request_id: number | string;
  request_item_id: string;
};

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

const isSendRequestToDirectorRpcResponse = (
  value: unknown,
): value is SendRequestToDirectorRpcRow[] =>
  Array.isArray(value) &&
  value.every((row) => isRpcRecord(row) && isRpcNumberLike(row.inserted_count));

const isApproveOrDeclinePendingRpcResponse = (
  value: unknown,
): value is ApproveOrDeclinePendingRpcRow[] =>
  Array.isArray(value) &&
  value.every((row) =>
    isRpcRecord(row) &&
    isRpcNonEmptyString(row.pending_id) &&
    isRpcNonEmptyString(row.request_item_id) &&
    isRpcNonEmptyString(row.new_status) &&
    isRpcNumberLike(row.request_id),
  );

export async function listRequestItems(requestId: number, status?: string): Promise<ReqItem[]> {
  const { data, error } = await loadRequestItemRows(requestId, status);
  if (error) throw error;
  return (data ?? []).map(normalizeReqItem);
}

export async function sendRequestToDirector(requestId: number): Promise<number> {
  const { data, error } = await sendStoreRequestToDirectorRpc(requestId);

  if (error) throw error;
  const validated = validateRpcResponse(data, isSendRequestToDirectorRpcResponse, {
    rpcName: 'send_request_to_director',
    caller: 'sendRequestToDirector',
    domain: 'director',
  });
  const first = validated[0] ?? null;
  const inserted =
    first && typeof first === 'object' && 'inserted_count' in first
      ? Number((first as { inserted_count: unknown }).inserted_count)
      : 0;
  return inserted ?? 0;
}

export async function listDirectorInbox(): Promise<PendingRequestItem[]> {
  const { data, error } = await loadDirectorInboxRows();
  if (error) throw error;
  return (data ?? []).map(normalizePendingRequestItem);
}

export async function approvePending(pendingId: string, verdict: 'Утверждено' | 'Отклонено') {
  const { data, error } = await approveOrDeclineRequestPendingRpc(pendingId, verdict);

  if (error) throw error;
  return validateRpcResponse(data, isApproveOrDeclinePendingRpcResponse, {
    rpcName: 'approve_or_decline_request_pending',
    caller: 'approvePending',
    domain: 'director',
  });
}

export async function listApprovedByRequest(requestId: number): Promise<ReqItem[]> {
  const { data, error } = await loadApprovedRequestItemRows(requestId);
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

  const { data: poRow, error: poErr } = await insertStorePurchase(purchasePayload);

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
    const { error: piErr } = await insertStorePurchaseItems(toInsert);
    if (piErr) throw piErr;
  }

  if (poRow) {
    const { error: pendErr } = await insertStorePurchasePending([{ purchase_id: poRow.id }]);
    if (pendErr && pendErr.code !== '23505') throw pendErr;
  }

  return poRow;
}
