import { client, rpcCompat } from "./_core";
import { ensureProposalExists } from "./integrity.guards";
import type { AccountantInboxRow } from "./types";
import type { Database } from "../database.types";

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

type SendToAccountantRpcArgs =
  Database["public"]["Functions"]["proposal_send_to_accountant_min"]["Args"];

const isSendToAccountantInput = (v: unknown): v is SendToAccountantInput =>
  typeof v === "object" && v !== null && "proposalId" in v;

const isReturnToBuyerInput = (v: unknown): v is ReturnToBuyerInput =>
  typeof v === "object" && v !== null && "proposalId" in v;

export async function proposalSendToAccountant(
  input: SendToAccountantInput | string | number,
) {
  const isObj = isSendToAccountantInput(input);
  const pid = String(isObj ? input.proposalId : input);
  await ensureProposalExists(client, pid, {
    screen: "accountant",
    surface: "proposal_send_to_accountant",
    sourceKind: "mutation:proposal_send_to_accountant",
  });

  const invoiceNumber = isObj ? input.invoiceNumber : undefined;
  const invoiceDateRaw = isObj ? input.invoiceDate : undefined;
  const invoiceAmount = isObj ? input.invoiceAmount : undefined;
  const invoiceCurrency = isObj ? input.invoiceCurrency : undefined;

  const invoiceDate = (() => {
    const s = String(invoiceDateRaw ?? "").trim();
    if (!s) return undefined;
    return s.slice(0, 10); // YYYY-MM-DD
  })();

  const args: SendToAccountantRpcArgs = {
    p_proposal_id: pid,
    p_invoice_number: String(invoiceNumber ?? "").trim(),
    p_invoice_date: String(invoiceDate ?? "").trim(),
    p_invoice_amount: typeof invoiceAmount === "number" ? Number(invoiceAmount) : 0,
    p_invoice_currency: String(invoiceCurrency ?? "").trim(),
  };

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
  await ensureProposalExists(client, pid, {
    screen: "accountant",
    surface: "add_payment",
    sourceKind: "mutation:accounting_payments",
  });
  const amt = Number(input.amount);
  const m = input.method?.trim();
  const n = input.note?.trim();

  const argsP = { p_proposal_id: pid, p_amount: amt, ...(m ? { p_method: m } : {}), ...(n ? { p_note: n } : {}) };
  const argsRaw = { proposal_id: pid, amount: amt, ...(m ? { method: m } : {}), ...(n ? { note: n } : {}) };

  await rpcCompat<void>([
    { fn: "acc_add_payment_min", args: argsP },
    { fn: "acc_add_payment_min_compat", args: argsRaw },
    { fn: "acc_add_payment_min_uuid", args: argsP },
  ]);
  return true;
}

export async function accountantReturnToBuyer(
  a: ReturnToBuyerInput | string | number,
  b?: string | null,
) {
  const pid = isReturnToBuyerInput(a) ? String(a.proposalId) : String(a);
  await ensureProposalExists(client, pid, {
    screen: "accountant",
    surface: "return_to_buyer",
    sourceKind: "mutation:proposal_status",
  });
  const comment = isReturnToBuyerInput(a) ? a.comment : b;
  const c = comment?.trim();

  await rpcCompat<void>([
    { fn: "acc_return_min_auto", args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } },
    { fn: "acc_return_min", args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } },
    { fn: "acc_return", args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } },
    { fn: "acc_return_min_compat", args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } },
    { fn: "acc_return_min_uuid", args: { p_proposal_id: pid, ...(c ? { p_comment: c } : {}) } },
  ]);
  return true;
}

export const normalizeAccountantInboxRpcTab = (status?: string): string | null => {
  const s = (status || "").trim();

  return (
    !s
      ? null
      : /^на доработке/i.test(s)
        ? "На доработке"
        : /^частично/i.test(s)
          ? "Частично оплачено"
          : /^оплачено/i.test(s)
            ? "Оплачено"
            : "К оплате"
  );
};

export async function listAccountantInbox(status?: string) {
  const norm = normalizeAccountantInboxRpcTab(status);

  // 1) новый RPC с датами оплаты
  const n = await client.rpc("list_accountant_inbox_fact", norm ? { p_tab: norm } : {});
  if (!n.error) return (n.data ?? []) as AccountantInboxRow[];

  // 2) fallback: старый RPC
  const r = await client.rpc("list_accountant_inbox", { p_tab: norm ?? "К оплате" });
  if (r.error) return [];
  return (r.data ?? []) as AccountantInboxRow[];
}
