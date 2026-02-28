import { supabase } from "../../lib/supabaseClient";

export const EPS = 0.01;

export type PaidAgg = {
  total_paid: number;
  payments_count: number;
  last_paid_at: number;
};

type PaymentRow = {
  amount?: number | string | null;
  paid_at?: string | null;
  created_at?: string | null;
};

type InvoicePatch = {
  invoice_number?: string;
  invoice_date?: string;
};

export async function persistInvoiceMetaIfNeeded(p: {
  proposalId: string;
  invoiceNo: string;
  invoiceDate: string;
  toRpcDateOrNull: (v: string) => string | null;
}): Promise<void> {
  const pid = String(p.proposalId || "").trim();
  if (!pid) return;

  const no = String(p.invoiceNo || "").trim();
  const dt = String(p.invoiceDate || "").trim();

  const patch: InvoicePatch = {};
  if (no) patch.invoice_number = no;

  const dtOk = p.toRpcDateOrNull(dt);
  if (dtOk) patch.invoice_date = dtOk;

  if (!Object.keys(patch).length) return;

  const { data: curRow, error: selErr } = await supabase
    .from("proposals")
    .select("invoice_number, invoice_date")
    .eq("id", pid)
    .maybeSingle();

  if (selErr) throw selErr;

  const alreadyNo = String(curRow?.invoice_number ?? "").trim();
  const alreadyDt = String(curRow?.invoice_date ?? "").trim();

  const upd: InvoicePatch = {};
  if (!alreadyNo && patch.invoice_number) upd.invoice_number = patch.invoice_number;
  if (!alreadyDt && patch.invoice_date) upd.invoice_date = patch.invoice_date;

  if (!Object.keys(upd).length) return;

  const { error } = await supabase.from("proposals").update(upd).eq("id", pid);
  if (error) throw error;
}

export async function fetchPaidAggByProposal(proposalId: string): Promise<PaidAgg> {
  const pid = String(proposalId || "").trim();
  if (!pid) return { total_paid: 0, payments_count: 0, last_paid_at: 0 };

  const { data, error } = await supabase
    .from("proposal_payments")
    .select("amount, paid_at, created_at")
    .eq("proposal_id", pid);
  if (error) throw error;

  let total = 0;
  let cnt = 0;
  let last = 0;
  for (const r of (Array.isArray(data) ? data : []) as PaymentRow[]) {
    total += Number(r.amount ?? 0);
    cnt += 1;
    const t = Date.parse(String(r.paid_at ?? r.created_at ?? "")) || 0;
    if (t > last) last = t;
  }
  return { total_paid: total, payments_count: cnt, last_paid_at: last };
}

export function computePayStatus(
  rawStatus: unknown,
  invoiceSum: number,
  paidSum: number,
  eps: number = EPS,
): string {
  const raw = String(rawStatus ?? "").trim().toLowerCase();
  if (raw.startsWith("на доработке") || raw.startsWith("возврат")) return "На доработке";

  const inv = Number(invoiceSum ?? 0);
  const paid = Number(paidSum ?? 0);

  if (paid <= eps) return "К оплате";
  if (inv > 0 && inv - paid > eps) return "Частично оплачено";
  return "Оплачено";
}

