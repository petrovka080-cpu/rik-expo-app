import { client, rpcCompat } from "./_core";
import type { AccountantInboxRow } from "./types";

type SendToAccountantInput = {
  proposalId: string | number;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  invoiceCurrency?: string;
};

type ReturnToBuyerInput = {
  proposalId: string | number;
  comment?: string;
};

type SendToAccountantRpcArgs = {
  p_proposal_id: string;
  p_invoice_number?: string;
  p_invoice_date?: string;
  p_invoice_amount?: number;
  p_invoice_currency?: string;
};

const isSendToAccountantInput = (v: unknown): v is SendToAccountantInput =>
  typeof v === "object" && v !== null && "proposalId" in v;

const isReturnToBuyerInput = (v: unknown): v is ReturnToBuyerInput =>
  typeof v === "object" && v !== null && "proposalId" in v;

export async function proposalSendToAccountant(
  input: SendToAccountantInput | string | number,
) {
  const isObj = isSendToAccountantInput(input);
  const pid = String(isObj ? input.proposalId : input);

  const invoiceNumber = isObj ? input.invoiceNumber : undefined;
  const invoiceDateRaw = isObj ? input.invoiceDate : undefined;
  const invoiceAmount = isObj ? input.invoiceAmount : undefined;
  const invoiceCurrency = isObj ? input.invoiceCurrency : undefined;

  const invoiceDate = (() => {
    const s = String(invoiceDateRaw ?? "").trim();
    if (!s) return undefined;
    return s.slice(0, 10); // YYYY-MM-DD
  })();

  const args: SendToAccountantRpcArgs = { p_proposal_id: pid };
  if (invoiceNumber != null && String(invoiceNumber).trim()) args.p_invoice_number = String(invoiceNumber);
  if (invoiceDate != null && String(invoiceDate).trim()) args.p_invoice_date = String(invoiceDate);
  if (typeof invoiceAmount === "number") args.p_invoice_amount = Number(invoiceAmount);
  if (invoiceCurrency != null && String(invoiceCurrency).trim()) args.p_invoice_currency = String(invoiceCurrency);

  const { error } = await client.rpc("proposal_send_to_accountant_min", args);
  if (error) throw error;
  return true;
}

export async function accountantAddPayment(input: {
  proposalId: string | number;
  amount: number;
  method?: string;
  note?: string;
}) {
  const pid = String(input.proposalId);
  const amt = Number(input.amount);
  const m = input.method?.trim();
  const n = input.note?.trim();

  const argsP = { p_proposal_id: pid, p_amount: amt, ...(m ? { p_method: m } : {}), ...(n ? { p_note: n } : {}) };
  const argsRaw = { proposal_id: pid, amount: amt, ...(m ? { method: m } : {}), ...(n ? { note: n } : {}) };

  await rpcCompat<void>([
    { fn: "acc_add_payment_min", args: argsP },
    { fn: "acc_add_payment_min_compat", args: argsRaw },
    { fn: "acc_add_payment", args: argsP },
    { fn: "acc_add_payment", args: argsRaw },
  ]);
  return true;
}

export async function accountantReturnToBuyer(
  a: ReturnToBuyerInput | string | number,
  b?: string | null,
) {
  const pid = isReturnToBuyerInput(a) ? String(a.proposalId) : String(a);
  const comment = isReturnToBuyerInput(a) ? a.comment : b;
  const c = comment?.trim();

  await rpcCompat<void>([
    { fn: "acc_return_min_auto", args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } },
    { fn: "acc_return_min", args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } },
    { fn: "acc_return", args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } },
  ]);
  return true;
}

export async function listAccountantInbox(status?: string) {
  const s = (status || "").trim();

  const norm =
    !s
      ? null
      : /^на доработке/i.test(s)
        ? "На доработке"
        : /^частично/i.test(s)
          ? "Частично оплачено"
          : /^оплачено/i.test(s)
            ? "Оплачено"
            : "К оплате";

  // 1) новый RPC с датами оплаты
  const n = await client.rpc("list_accountant_inbox_fact", { p_tab: norm });
  if (!n.error) return (n.data ?? []) as AccountantInboxRow[];

  // 2) fallback: старый RPC
  const r = await client.rpc("list_accountant_inbox", { p_tab: norm });
  if (r.error) return [];
  return (r.data ?? []) as AccountantInboxRow[];
}
