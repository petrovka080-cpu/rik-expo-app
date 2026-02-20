import { client, rpcCompat } from "./_core";

export async function proposalSendToAccountant(
  input:
    | { proposalId: string | number; invoiceNumber?: string; invoiceDate?: string; invoiceAmount?: number; invoiceCurrency?: string }
    | string
    | number
) {
  const isObj = typeof input === "object" && input !== null;
  const pid = String(isObj ? (input as any).proposalId : input);

  const invoiceNumber   = isObj ? (input as any).invoiceNumber   : undefined;
  const invoiceDateRaw  = isObj ? (input as any).invoiceDate     : undefined;
  const invoiceAmount   = isObj ? (input as any).invoiceAmount   : undefined;
  const invoiceCurrency = isObj ? (input as any).invoiceCurrency : undefined;

  const invoiceDate = (() => {
    const s = String(invoiceDateRaw ?? "").trim();
    if (!s) return undefined;
    return s.slice(0, 10); // YYYY-MM-DD
  })();

  const args: Record<string, any> = { p_proposal_id: pid };
  if (invoiceNumber   != null && String(invoiceNumber).trim())   args.p_invoice_number   = String(invoiceNumber);
  if (invoiceDate     != null && String(invoiceDate).trim())     args.p_invoice_date     = String(invoiceDate);
  if (typeof invoiceAmount === "number")                         args.p_invoice_amount   = Number(invoiceAmount);
  if (invoiceCurrency != null && String(invoiceCurrency).trim()) args.p_invoice_currency = String(invoiceCurrency);

  const { error } = await client.rpc("proposal_send_to_accountant_min", args as any);
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

  const argsP   = { p_proposal_id: pid, p_amount: amt, ...(m ? { p_method: m } : {}), ...(n ? { p_note: n } : {}) };
  const argsRaw = { proposal_id: pid,  amount: amt,    ...(m ? { method: m } : {}),   ...(n ? { note: n } : {}) };

  await rpcCompat<void>([
    { fn: "acc_add_payment_min",        args: argsP   },
    { fn: "acc_add_payment_min_compat", args: argsRaw },
    { fn: "acc_add_payment",            args: argsP   },
    { fn: "acc_add_payment",            args: argsRaw },
  ]);
  return true;
}

export async function accountantReturnToBuyer(
  a: { proposalId: string | number; comment?: string } | string | number,
  b?: string | null
) {
  const pid = typeof a === "object" && a !== null ? String((a as any).proposalId) : String(a);
  const comment = typeof a === "object" && a !== null ? (a as any).comment : b;
  const c = comment?.trim();

  await rpcCompat<void>([
    { fn: "acc_return_min_auto", args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } },
    { fn: "acc_return_min",      args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } },
    { fn: "acc_return",          args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } },
  ]);
  return true;
}

export async function listAccountantInbox(status?: string) {
  const s = (status || "").trim();

  const norm =
    !s ? null :
    /^на доработке/i.test(s) ? "На доработке" :
    /^частично/i.test(s)     ? "Частично оплачено" :
    /^оплачено/i.test(s)     ? "Оплачено" :
                               "К оплате";

  // 1) новый RPC с датами оплат
  const n = await client.rpc("list_accountant_inbox_fact", { p_tab: norm } as any);
  if (!n.error) return (n.data ?? []) as any[];

  // 2) fallback: старый RPC (тихо)
  const r = await client.rpc("list_accountant_inbox", { p_tab: norm } as any);
  if (r.error) return [];
  return (r.data ?? []) as any[];
}
