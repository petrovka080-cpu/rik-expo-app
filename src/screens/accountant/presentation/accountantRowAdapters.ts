import { statusFromRaw } from "../helpers";
import { normalizeRuText } from "../../../lib/text/encoding";
import type { HistoryRow } from "../types";
import type { AccountantInboxRow } from "../../../lib/rik_api";

type ListRowItem = AccountantInboxRow & {
  total_paid?: number | null;
  invoice_amount?: number | null;
  outstanding_amount?: number | null;
  payment_status?: string | null;
  supplier?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  invoice_currency?: string | null;
};

export function mapAccountantListRowToProps(item: ListRowItem) {
  const sum = Number(item.invoice_amount ?? 0);
  const rest = Math.max(0, Number(item.outstanding_amount ?? 0));
  const status = statusFromRaw(item.payment_status, false);

  const toneByStatus = {
    PAID: "success",
    PART: "warning",
    REWORK: "danger",
    K_PAY: "info",
    HISTORY: "neutral",
  } as const;

  return {
    supplier: normalizeRuText(String(item.supplier || "—")),
    invoiceNo: normalizeRuText(String(item.invoice_number || "без №")),
    invoiceDate: normalizeRuText(String(item.invoice_date || "—")),
    sum,
    rest,
    currency: item.invoice_currency || "KGS",
    statusLabel: status.label,
    statusTone: toneByStatus[status.key] ?? "neutral",
  };
}

export function mapAccountantHistoryRowToProps(item: HistoryRow) {
  const date = item.paid_at ? new Date(item.paid_at).toLocaleDateString() : "";
  const purpose = normalizeRuText(String(item.purpose || item.note || "").trim());
  const fio = normalizeRuText(String(item.accountant_fio || "").trim());

  return {
    supplier: normalizeRuText(String(item.supplier || "—")),
    invoiceNo: normalizeRuText(String(item.invoice_number || "без №")),
    date,
    purpose,
    fio,
    amount: Number(item.amount || 0),
    currency: item.invoice_currency || "KGS",
  };
}
