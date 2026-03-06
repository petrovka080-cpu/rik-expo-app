import { supabase } from "../../lib/supabaseClient";
import type { AccountantInboxUiRow, HistoryRow } from "./types";

export async function loadAccountantHistoryRows(params: {
  dateFrom: string;
  dateTo: string;
  histSearch: string;
  toRpcDateOrNull: (v: string) => string | null;
}): Promise<HistoryRow[]> {
  const { dateFrom, dateTo, histSearch, toRpcDateOrNull } = params;
  const { data, error } = await supabase.rpc("list_accountant_payments_history_v2", {
    p_date_from: toRpcDateOrNull(dateFrom),
    p_date_to: toRpcDateOrNull(dateTo),
    p_search: histSearch?.trim() ? histSearch.trim() : null,
    p_limit: 300,
  });
  if (error) throw error;

  const arr = Array.isArray(data) ? (data as HistoryRow[]) : [];
  arr.sort((a, b) => {
    const ta = Date.parse(String((a as { paid_at?: string; created_at?: string }).paid_at ?? (a as { created_at?: string }).created_at ?? 0)) || 0;
    const tb = Date.parse(String((b as { paid_at?: string; created_at?: string }).paid_at ?? (b as { created_at?: string }).created_at ?? 0)) || 0;
    return tb - ta;
  });
  return arr;
}

export function mapHistoryRowToCurrentRow(params: {
  item: HistoryRow;
  totalPaid: number;
  paymentsCount: number;
  paymentStatus: string;
}): AccountantInboxUiRow {
  const { item, totalPaid, paymentsCount, paymentStatus } = params;
  return {
    proposal_id: String(item.proposal_id),
    supplier: item.supplier,
    invoice_number: item.invoice_number,
    invoice_date: item.invoice_date,
    invoice_amount: item.invoice_amount,
    invoice_currency: item.invoice_currency,
    payment_status: paymentStatus,
    total_paid: Number(totalPaid ?? 0),
    payments_count: Number(paymentsCount ?? 0),
    has_invoice: !!item.has_invoice,
    sent_to_accountant_at: null,
  };
}
