import { supabase } from "../../lib/supabaseClient";
import { listAccountantInbox } from "../../lib/catalog_api";
import type { AccountantInboxUiRow, Tab } from "./types";
import { computePayStatus } from "./accountant.payment";

type ProposalLiteRaw = {
  id: string | number;
  proposal_no?: string | number | null;
  display_no?: string | number | null;
  id_short?: string | number | null;
  status?: string | null;
  payment_status?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  invoice_amount?: number | null;
  invoice_currency?: string | null;
  supplier?: string | null;
  sent_to_accountant_at?: string | null;
};

type ProposalPaymentAggRaw = {
  proposal_id: string | number;
  amount?: number | null;
  paid_at?: string | null;
  created_at?: string | null;
};

type ProposalItemRaw = {
  proposal_id: string | number;
  qty?: number | null;
  price?: number | null;
};

type ProposalAttachmentRaw = {
  proposal_id: string | number;
};

const shouldDisableInboxRpc = (msg: string) =>
  msg.includes("Could not find") || msg.includes("/rpc/list_accountant_inbox") || msg.includes("404");

const errorMessage = (e: unknown) => {
  const x = e as { message?: string };
  return x?.message ?? String(e);
};

export async function loadAccountantInboxViaRpc(params: {
  tab: Tab;
  triedRpcOk: boolean;
}): Promise<{ data: AccountantInboxUiRow[]; rpcFailed: boolean; nextTriedRpcOk: boolean }> {
  const { tab, triedRpcOk } = params;
  if (!triedRpcOk) {
    return { data: [], rpcFailed: false, nextTriedRpcOk: false };
  }

  try {
    const list = await listAccountantInbox(tab);
    return {
      data: Array.isArray(list) ? list : [],
      rpcFailed: false,
      nextTriedRpcOk: true,
    };
  } catch (e: unknown) {
    const msg = errorMessage(e);
    return {
      data: [],
      rpcFailed: true,
      nextTriedRpcOk: shouldDisableInboxRpc(msg) ? false : triedRpcOk,
    };
  }
}

export async function mapAccountantFallbackPropsToInboxRows(
  props: unknown[] | null | undefined,
): Promise<AccountantInboxUiRow[]> {
  if (!Array.isArray(props) || !props.length) return [];

  const rowsRaw = props as ProposalLiteRaw[];
  const ids = rowsRaw.map((p) => String(p.id));

  const paidMap = new Map<string, { total_paid: number; payments_count: number }>();
  const lastPaidAtMap = new Map<string, number>();
  const itemsSumMap = new Map<string, number>();

  if (ids.length) {
    const { data: pays, error: paysErr } = await supabase
      .from("proposal_payments")
      .select("proposal_id, amount, paid_at, created_at")
      .in("proposal_id", ids);
    if (!paysErr && Array.isArray(pays)) {
      for (const pay of pays as ProposalPaymentAggRaw[]) {
        const k = String(pay.proposal_id);
        const prev = paidMap.get(k) ?? { total_paid: 0, payments_count: 0 };
        prev.total_paid += Number(pay.amount ?? 0);
        prev.payments_count += 1;
        paidMap.set(k, prev);

        const tt = Date.parse(String(pay.paid_at ?? pay.created_at ?? "")) || 0;
        const old = lastPaidAtMap.get(k) ?? 0;
        if (tt > old) lastPaidAtMap.set(k, tt);
      }
    }

    const { data: items, error: itemsErr } = await supabase
      .from("proposal_items")
      .select("proposal_id, qty, price")
      .in("proposal_id", ids);
    if (!itemsErr && Array.isArray(items)) {
      for (const it of items as ProposalItemRaw[]) {
        const pid = String(it.proposal_id);
        const qty = Number(it.qty ?? 0);
        const price = Number(it.price ?? 0);
        itemsSumMap.set(pid, (itemsSumMap.get(pid) ?? 0) + qty * price);
      }
    }
  }

  let haveInvoice = new Set<string>();
  if (ids.length) {
    const q = await supabase
      .from("proposal_attachments")
      .select("proposal_id")
      .eq("group_key", "invoice")
      .in("proposal_id", ids);
    if (!q.error && Array.isArray(q.data)) {
      haveInvoice = new Set((q.data as ProposalAttachmentRaw[]).map((r) => String(r.proposal_id)));
    }
  }

  return rowsRaw.map((p) => {
    const pid = String(p.id);
    const agg = paidMap.get(pid);
    const calcSum = itemsSumMap.get(pid) ?? 0;
    const invoiceSum = Number(p.invoice_amount ?? 0) > 0 ? Number(p.invoice_amount) : calcSum;
    const paid = agg ? agg.total_paid : 0;
    const payStatus = computePayStatus(p.payment_status ?? p.status, invoiceSum, paid);

    return {
      proposal_id: pid,
      proposal_no: p.proposal_no == null ? null : String(p.proposal_no),
      id_short: p.id_short == null ? null : String(p.id_short),
      supplier: p.supplier ?? null,
      invoice_number: p.invoice_number ?? null,
      invoice_date: p.invoice_date ?? null,
      invoice_amount: p.invoice_amount ?? (calcSum > 0 ? calcSum : null),
      invoice_currency: p.invoice_currency ?? "KGS",
      payment_status: payStatus,
      total_paid: agg ? agg.total_paid : 0,
      payments_count: agg ? agg.payments_count : 0,
      has_invoice: haveInvoice.has(pid),
      sent_to_accountant_at: p.sent_to_accountant_at ?? null,
      last_paid_at: lastPaidAtMap.get(pid) ?? 0,
    };
  });
}
