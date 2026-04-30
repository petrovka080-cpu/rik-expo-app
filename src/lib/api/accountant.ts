import { client, rpcCompat } from "./_core";
import { ensureProposalExists, ensureProposalItemIdsBelongToProposal } from "./integrity.guards";
import { trackRpcLatency } from "../observability/rpcLatencyMetrics";
import { traceAsync } from "../observability/sentry";
import {
  isRpcIgnoredMutationResponse,
  isRpcBoolean,
  isAccountantFinancialStateResponse,
  isRpcNullableRecordArrayResponse,
  isRpcNonEmptyString,
  isRpcNumberLike,
  isRpcRecord,
  validateRpcResponse,
} from "./queryBoundary";
import type { AccountantInboxRow } from "./types";
import type { Database } from "../database.types";
import { applySupabaseAbortSignal, throwIfAborted } from "../requestCancellation";

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
type AccountantProposalFinancialStateArgs =
  Database["public"]["Functions"]["accountant_proposal_financial_state_v1"]["Args"];
type AccountingPayInvoiceArgs =
  Database["public"]["Functions"]["accounting_pay_invoice_v1"]["Args"] & {
    p_client_mutation_id: string;
  };
export type AccountantPaymentAllocationInput = {
  proposal_item_id: string;
  amount: number;
};

export type AccountantProposalFinancialLine = {
  proposalItemId: string;
  nameHuman: string | null;
  uom: string | null;
  qty: number;
  price: number;
  rikCode: string | null;
  lineTotal: number;
  paidTotal: number;
  outstanding: number;
};

export type AccountantProposalFinancialState = {
  proposalId: string;
  proposalStatus: string | null;
  sentToAccountantAt: string | null;
  supplier: string | null;
  invoice: {
    number: string | null;
    date: string | null;
    currency: string;
    payableSource: string | null;
  };
  totals: {
    payableAmount: number;
    totalPaid: number;
    outstandingAmount: number;
    paymentsCount: number;
    paymentStatus: string | null;
    lastPaidAt: string | null;
  };
  eligibility: {
    approved: boolean;
    sentToAccountant: boolean;
    paymentEligible: boolean;
    failureCode: string | null;
  };
  allocationSummary: {
    paidKnownSum: number;
    paidUnassigned: number;
    allocationCount: number;
  };
  items: AccountantProposalFinancialLine[];
  meta: {
    sourceKind: string;
    backendTruth: boolean;
    legacyTotalPaid: number;
    legacyPaymentStatus: string | null;
  };
};

export type AccountantPayInvoiceAtomicInput = {
  proposalId: string | number;
  amount: number;
  accountantFio: string;
  purpose: string;
  method: string;
  clientMutationId: string;
  note?: string | null;
  allocations?: AccountantPaymentAllocationInput[];
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  invoiceAmount?: number | null;
  invoiceCurrency?: string | null;
  expectedTotalPaid?: number | null;
  expectedOutstanding?: number | null;
};

export type AccountantPayInvoiceAtomicSuccess = {
  ok: true;
  proposalId: string;
  paymentId: number;
  clientMutationId: string | null;
  idempotentReplay: boolean;
  outcome: "success" | "idempotent_replay";
  originalOutcome: string | null;
  allocationSummary: {
    allocationCount: number;
    allocatedAmount: number;
    requestedAmount: number;
  };
  totalsBefore: {
    payableAmount: number;
    totalPaid: number;
    outstandingAmount: number;
    paymentStatus: string | null;
  };
  totalsAfter: {
    payableAmount: number;
    totalPaid: number;
    outstandingAmount: number;
    paymentStatus: string | null;
  };
  serverTruth: AccountantProposalFinancialState;
};

export type AccountantPayInvoiceAtomicFailure = {
  ok: false;
  proposalId: string;
  clientMutationId: string | null;
  idempotentReplay: boolean;
  outcome: "controlled_fail" | "idempotency_conflict" | "idempotent_replay";
  failureCode: string;
  failureMessage: string;
  totalsBefore: {
    payableAmount: number;
    totalPaid: number;
    outstandingAmount: number;
    paymentStatus: string | null;
  } | null;
  validation: {
    approved: boolean;
    sentToAccountant: boolean;
    paymentEligible: boolean;
    proposalStatus: string | null;
  } | null;
  allocationSummary: {
    allocationCount: number;
    allocatedAmount: number;
    requestedAmount: number;
  } | null;
};

export type AccountantPayInvoiceAtomicResult =
  | AccountantPayInvoiceAtomicSuccess
  | AccountantPayInvoiceAtomicFailure;

export class AccountantPayInvoiceAtomicError extends Error {
  readonly code: string;
  readonly proposalId: string;
  readonly clientMutationId: string | null;
  readonly outcome: AccountantPayInvoiceAtomicFailure["outcome"];
  readonly idempotentReplay: boolean;
  readonly totalsBefore: AccountantPayInvoiceAtomicFailure["totalsBefore"];
  readonly validation: AccountantPayInvoiceAtomicFailure["validation"];
  readonly allocationSummary: AccountantPayInvoiceAtomicFailure["allocationSummary"];

  constructor(result: AccountantPayInvoiceAtomicFailure) {
    super(result.failureMessage || result.failureCode || "accounting_pay_invoice_v1 failed");
    this.name = "AccountantPayInvoiceAtomicError";
    this.code = result.failureCode;
    this.proposalId = result.proposalId;
    this.clientMutationId = result.clientMutationId;
    this.outcome = result.outcome;
    this.idempotentReplay = result.idempotentReplay;
    this.totalsBefore = result.totalsBefore;
    this.validation = result.validation;
    this.allocationSummary = result.allocationSummary;
  }
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asText = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asBoolean = (value: unknown) => value === true;

const parseFinancialStateLine = (value: unknown): AccountantProposalFinancialLine | null => {
  const row = asRecord(value);
  const proposalItemId = asText(row.proposal_item_id ?? row.proposalItemId);
  if (!proposalItemId) return null;
  return {
    proposalItemId,
    nameHuman: asText(row.name_human ?? row.nameHuman),
    uom: asText(row.uom),
    qty: asNumber(row.qty),
    price: asNumber(row.price),
    rikCode: asText(row.rik_code ?? row.rikCode),
    lineTotal: asNumber(row.line_total ?? row.lineTotal),
    paidTotal: asNumber(row.paid_total ?? row.paidTotal),
    outstanding: asNumber(row.outstanding),
  };
};

export const parseAccountantProposalFinancialState = (
  value: unknown,
): AccountantProposalFinancialState => {
  const payload = asRecord(value);
  const proposal = asRecord(payload.proposal);
  const invoice = asRecord(payload.invoice);
  const totals = asRecord(payload.totals);
  const eligibility = asRecord(payload.eligibility);
  const allocationSummary = asRecord(payload.allocation_summary ?? payload.allocationSummary);
  const meta = asRecord(payload.meta);
  const proposalId = asText(proposal.proposal_id ?? proposal.proposalId);

  if (!proposalId) {
    throw new Error("accountant_proposal_financial_state_v1 missing proposal.proposal_id");
  }

  return {
    proposalId,
    proposalStatus: asText(proposal.status),
    sentToAccountantAt: asText(proposal.sent_to_accountant_at ?? proposal.sentToAccountantAt),
    supplier: asText(proposal.supplier),
    invoice: {
      number: asText(invoice.invoice_number ?? invoice.invoiceNumber),
      date: asText(invoice.invoice_date ?? invoice.invoiceDate),
      currency: asText(invoice.invoice_currency ?? invoice.invoiceCurrency) ?? "KGS",
      payableSource: asText(invoice.payable_source ?? invoice.payableSource),
    },
    totals: {
      payableAmount: asNumber(totals.payable_amount ?? totals.payableAmount),
      totalPaid: asNumber(totals.total_paid ?? totals.totalPaid),
      outstandingAmount: asNumber(totals.outstanding_amount ?? totals.outstandingAmount),
      paymentsCount: Math.max(0, Math.trunc(asNumber(totals.payments_count ?? totals.paymentsCount))),
      paymentStatus: asText(totals.payment_status ?? totals.paymentStatus),
      lastPaidAt: asText(totals.last_paid_at ?? totals.lastPaidAt),
    },
    eligibility: {
      approved: asBoolean(eligibility.approved),
      sentToAccountant: asBoolean(
        eligibility.sent_to_accountant ?? eligibility.sentToAccountant,
      ),
      paymentEligible: asBoolean(
        eligibility.payment_eligible ?? eligibility.paymentEligible,
      ),
      failureCode: asText(eligibility.failure_code ?? eligibility.failureCode),
    },
    allocationSummary: {
      paidKnownSum: asNumber(
        allocationSummary.paid_known_sum ?? allocationSummary.paidKnownSum,
      ),
      paidUnassigned: asNumber(
        allocationSummary.paid_unassigned ?? allocationSummary.paidUnassigned,
      ),
      allocationCount: Math.max(
        0,
        Math.trunc(
          asNumber(
            allocationSummary.allocation_count ?? allocationSummary.allocationCount,
          ),
        ),
      ),
    },
    items: Array.isArray(payload.items)
      ? payload.items
          .map(parseFinancialStateLine)
          .filter((row): row is AccountantProposalFinancialLine => !!row)
      : [],
    meta: {
      sourceKind: asText(meta.source_kind ?? meta.sourceKind) ?? "rpc:accountant_proposal_financial_state_v1",
      backendTruth: asBoolean(meta.backend_truth ?? meta.backendTruth),
      legacyTotalPaid: asNumber(meta.legacy_total_paid ?? meta.legacyTotalPaid),
      legacyPaymentStatus: asText(
        meta.legacy_payment_status ?? meta.legacyPaymentStatus,
      ),
    },
  };
};

export const parseAccountantPayInvoiceAtomicResult = (
  value: unknown,
): AccountantPayInvoiceAtomicResult => {
  const payload = asRecord(value);
  const proposalId = asText(payload.proposal_id ?? payload.proposalId) ?? "";
  const ok = asBoolean(payload.ok);
  const outcome = asText(payload.outcome) ?? (ok ? "success" : "controlled_fail");
  const idempotentReplay = asBoolean(payload.idempotent_replay ?? payload.idempotentReplay);
  const clientMutationId = asText(payload.client_mutation_id ?? payload.clientMutationId);
  const allocationSummaryPayload = asRecord(
    payload.allocation_summary ?? payload.allocationSummary,
  );
  const totalsBeforePayload = asRecord(payload.totals_before ?? payload.totalsBefore);
  const validationPayload = asRecord(payload.validation);

  if (!ok) {
    return {
      ok: false,
      proposalId,
      clientMutationId,
      idempotentReplay,
      outcome:
        outcome === "idempotency_conflict"
          ? "idempotency_conflict"
          : outcome === "idempotent_replay" || idempotentReplay
            ? "idempotent_replay"
          : "controlled_fail",
      failureCode: asText(payload.failure_code ?? payload.failureCode) ?? "payment_failed",
      failureMessage:
        asText(payload.failure_message ?? payload.failureMessage) ??
        "Payment was rejected by server truth.",
      totalsBefore:
        Object.keys(totalsBeforePayload).length > 0
          ? {
              payableAmount: asNumber(
                totalsBeforePayload.payable_amount ?? totalsBeforePayload.payableAmount,
              ),
              totalPaid: asNumber(
                totalsBeforePayload.total_paid ?? totalsBeforePayload.totalPaid,
              ),
              outstandingAmount: asNumber(
                totalsBeforePayload.outstanding_amount ??
                  totalsBeforePayload.outstandingAmount,
              ),
              paymentStatus: asText(
                totalsBeforePayload.payment_status ?? totalsBeforePayload.paymentStatus,
              ),
            }
          : null,
      validation:
        Object.keys(validationPayload).length > 0
          ? {
              approved: asBoolean(validationPayload.approved),
              sentToAccountant: asBoolean(
                validationPayload.sent_to_accountant ??
                  validationPayload.sentToAccountant,
              ),
              paymentEligible: asBoolean(
                validationPayload.payment_eligible ??
                  validationPayload.paymentEligible,
              ),
              proposalStatus: asText(
                validationPayload.proposal_status ?? validationPayload.proposalStatus,
              ),
            }
          : null,
      allocationSummary:
        Object.keys(allocationSummaryPayload).length > 0
          ? {
              allocationCount: Math.max(
                0,
                Math.trunc(
                  asNumber(
                    allocationSummaryPayload.allocation_count ??
                      allocationSummaryPayload.allocationCount,
                  ),
                ),
              ),
              allocatedAmount: asNumber(
                allocationSummaryPayload.allocated_amount ??
                  allocationSummaryPayload.allocatedAmount,
              ),
              requestedAmount: asNumber(
                allocationSummaryPayload.requested_amount ??
                  allocationSummaryPayload.requestedAmount,
              ),
            }
          : null,
    };
  }

  const totalsAfterPayload = asRecord(payload.totals_after ?? payload.totalsAfter);
  const paymentId = Number(payload.payment_id ?? payload.paymentId);
  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    throw new Error("accounting_pay_invoice_v1 missing payment_id");
  }

  return {
    ok: true,
    proposalId,
    paymentId,
    clientMutationId,
    idempotentReplay,
    outcome: idempotentReplay ? "idempotent_replay" : "success",
    originalOutcome: asText(payload.original_outcome ?? payload.originalOutcome),
    allocationSummary: {
      allocationCount: Math.max(
        0,
        Math.trunc(
          asNumber(
            allocationSummaryPayload.allocation_count ??
              allocationSummaryPayload.allocationCount,
          ),
        ),
      ),
      allocatedAmount: asNumber(
        allocationSummaryPayload.allocated_amount ??
          allocationSummaryPayload.allocatedAmount,
      ),
      requestedAmount: asNumber(
        allocationSummaryPayload.requested_amount ??
          allocationSummaryPayload.requestedAmount,
      ),
    },
    totalsBefore: {
      payableAmount: asNumber(
        totalsBeforePayload.payable_amount ?? totalsBeforePayload.payableAmount,
      ),
      totalPaid: asNumber(
        totalsBeforePayload.total_paid ?? totalsBeforePayload.totalPaid,
      ),
      outstandingAmount: asNumber(
        totalsBeforePayload.outstanding_amount ?? totalsBeforePayload.outstandingAmount,
      ),
      paymentStatus: asText(
        totalsBeforePayload.payment_status ?? totalsBeforePayload.paymentStatus,
      ),
    },
    totalsAfter: {
      payableAmount: asNumber(
        totalsAfterPayload.payable_amount ?? totalsAfterPayload.payableAmount,
      ),
      totalPaid: asNumber(
        totalsAfterPayload.total_paid ?? totalsAfterPayload.totalPaid,
      ),
      outstandingAmount: asNumber(
        totalsAfterPayload.outstanding_amount ?? totalsAfterPayload.outstandingAmount,
      ),
      paymentStatus: asText(
        totalsAfterPayload.payment_status ?? totalsAfterPayload.paymentStatus,
      ),
    },
    serverTruth: parseAccountantProposalFinancialState(
      payload.server_truth ?? payload.serverTruth,
    ),
  };
};

const isAccountingPayInvoiceRpcResponse = (value: unknown): value is Record<string, unknown> => {
  if (!isRpcRecord(value) || !isRpcBoolean(value.ok)) return false;

  if (value.ok === false) {
    return (
      isRpcNonEmptyString(value.failure_code) ||
      isRpcNonEmptyString(value.failureCode) ||
      isRpcNonEmptyString(value.failure_message) ||
      isRpcNonEmptyString(value.failureMessage)
    );
  }

  return (
    isRpcNonEmptyString(value.proposal_id ?? value.proposalId) &&
    isRpcNumberLike(value.payment_id ?? value.paymentId) &&
    isRpcRecord(value.allocation_summary ?? value.allocationSummary) &&
    isRpcRecord(value.totals_before ?? value.totalsBefore) &&
    isRpcRecord(value.totals_after ?? value.totalsAfter) &&
    isRpcRecord(value.server_truth ?? value.serverTruth)
  );
};

export const isAccountantInboxLegacyRpcResponse = isRpcNullableRecordArrayResponse;

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

  const { data, error } = await client.rpc("proposal_send_to_accountant_min", args);
  if (error) throw error;
  validateRpcResponse(data, isRpcIgnoredMutationResponse, {
    rpcName: "proposal_send_to_accountant_min",
    caller: "src/lib/api/accountant.proposalSendToAccountant",
    domain: "accountant",
  });
  return true;
}

export async function accountantAddPayment(input: {
  proposalId: string | number;
  amount: number;
  method?: string;
  note?: string;
}) {
  void input;
  throw new Error(
    "accountantAddPayment legacy payment path is disabled; use accountantPayInvoiceAtomic with clientMutationId.",
  );
}

export async function accountantAddPaymentWithAllocations(input: {
  proposalId: string | number;
  amount: number;
  accountantFio: string;
  purpose: string;
  method: string;
  clientMutationId: string;
  note?: string | null;
  allocations?: AccountantPaymentAllocationInput[];
}): Promise<number | null> {
  const result = await accountantPayInvoiceAtomic({
    proposalId: input.proposalId,
    amount: input.amount,
    accountantFio: input.accountantFio,
    purpose: input.purpose,
    method: input.method,
    clientMutationId: input.clientMutationId,
    note: input.note,
    allocations: input.allocations,
  });

  return result.paymentId;
}

export async function accountantLoadProposalFinancialState(
  proposalId: string | number,
  options?: { signal?: AbortSignal | null },
): Promise<AccountantProposalFinancialState> {
  const pid = String(proposalId);
  throwIfAborted(options?.signal);
  const proposal = await ensureProposalExists(client, pid, {
    screen: "accountant",
    surface: "proposal_financial_state",
    sourceKind: "rpc:accountant_proposal_financial_state_v1",
  }, options);
  throwIfAborted(options?.signal);

  const args: AccountantProposalFinancialStateArgs = {
    p_proposal_id: proposal.proposalId,
  };

  const startedAt = Date.now();
  const { data, error } = await applySupabaseAbortSignal(
    client.rpc("accountant_proposal_financial_state_v1", args),
    options?.signal,
  );
  throwIfAborted(options?.signal);
  if (error) {
    trackRpcLatency({
      name: "accountant_proposal_financial_state_v1",
      screen: "accountant",
      surface: "proposal_financial_state",
      durationMs: Date.now() - startedAt,
      status: "error",
      error,
      extra: { proposalId: proposal.proposalId },
    });
    throw error;
  }

  const validated = validateRpcResponse(data, isAccountantFinancialStateResponse, {
    rpcName: "accountant_proposal_financial_state_v1",
    caller: "src/lib/api/accountant.accountantLoadProposalFinancialState",
    domain: "accountant",
  });
  const result = parseAccountantProposalFinancialState(validated);
  trackRpcLatency({
    name: "accountant_proposal_financial_state_v1",
    screen: "accountant",
    surface: "proposal_financial_state",
    durationMs: Date.now() - startedAt,
    status: "success",
    rowCount: result.items.length,
    extra: { proposalId: proposal.proposalId },
  });
  return result;
}

export async function accountantPayInvoiceAtomic(
  input: AccountantPayInvoiceAtomicInput,
): Promise<AccountantPayInvoiceAtomicSuccess> {
  return await traceAsync(
    "accountant.payment.apply",
    {
      flow: "accountant_payment_apply",
      role: "accountant",
    },
    async () => {
  const pid = String(input.proposalId);
  const proposal = await ensureProposalExists(client, pid, {
    screen: "accountant",
    surface: "accounting_pay_invoice_v1",
    sourceKind: "rpc:accounting_pay_invoice_v1",
  });

  const allocations = (Array.isArray(input.allocations) ? input.allocations : [])
    .map((row) => ({
      proposal_item_id: String(row?.proposal_item_id ?? "").trim(),
      amount: Number(row?.amount ?? 0),
    }))
    .filter((row) => row.proposal_item_id && Number.isFinite(row.amount) && row.amount > 0);

  if (allocations.length) {
    await ensureProposalItemIdsBelongToProposal(
      client,
      proposal.proposalId,
      allocations.map((row) => row.proposal_item_id),
      {
        screen: "accountant",
        surface: "accounting_pay_invoice_v1",
        sourceKind: "rpc:accounting_pay_invoice_v1",
      },
    );
  }

  const args: AccountingPayInvoiceArgs = {
    p_proposal_id: proposal.proposalId,
    p_amount: Number(input.amount),
    p_accountant_fio: String(input.accountantFio ?? "").trim(),
    p_purpose: String(input.purpose ?? "").trim(),
    p_method: String(input.method ?? "").trim(),
    p_client_mutation_id: String(input.clientMutationId ?? "").trim(),
    p_note: String(input.note ?? "").trim() || undefined,
    p_allocations: allocations,
    p_invoice_number: String(input.invoiceNumber ?? "").trim() || undefined,
    p_invoice_date: String(input.invoiceDate ?? "").trim() || undefined,
    p_invoice_amount:
      typeof input.invoiceAmount === "number" && Number.isFinite(input.invoiceAmount)
        ? Number(input.invoiceAmount)
        : undefined,
    p_invoice_currency: String(input.invoiceCurrency ?? "").trim() || undefined,
    p_expected_total_paid:
      typeof input.expectedTotalPaid === "number" && Number.isFinite(input.expectedTotalPaid)
        ? Number(input.expectedTotalPaid)
        : undefined,
    p_expected_outstanding:
      typeof input.expectedOutstanding === "number" && Number.isFinite(input.expectedOutstanding)
        ? Number(input.expectedOutstanding)
        : undefined,
  };

  const startedAt = Date.now();
  const { data, error } = await client.rpc("accounting_pay_invoice_v1", args);
  if (error) {
    trackRpcLatency({
      name: "accounting_pay_invoice_v1",
      screen: "accountant",
      surface: "accounting_pay_invoice_v1",
      durationMs: Date.now() - startedAt,
      status: "error",
      error,
      extra: {
        proposalId: proposal.proposalId,
        allocationCount: allocations.length,
      },
    });
    throw error;
  }

  const validated = validateRpcResponse(data, isAccountingPayInvoiceRpcResponse, {
    rpcName: "accounting_pay_invoice_v1",
    caller: "src/lib/api/accountant.accountantPayInvoiceAtomic",
    domain: "accountant",
  });
  const result = parseAccountantPayInvoiceAtomicResult(validated);
  trackRpcLatency({
    name: "accounting_pay_invoice_v1",
    screen: "accountant",
    surface: "accounting_pay_invoice_v1",
    durationMs: Date.now() - startedAt,
    status: result.ok ? "success" : "error",
    error: result.ok ? undefined : new AccountantPayInvoiceAtomicError(result as AccountantPayInvoiceAtomicFailure),
    rowCount: allocations.length,
    extra: {
      proposalId: proposal.proposalId,
      allocationCount: allocations.length,
      outcome: result.outcome,
      idempotentReplay: result.idempotentReplay,
    },
  });
  if (!result.ok) {
    throw new AccountantPayInvoiceAtomicError(result as AccountantPayInvoiceAtomicFailure);
  }

  return result;
    },
  );
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
  if (!n.error) {
    const rows = validateRpcResponse(n.data, isAccountantInboxLegacyRpcResponse, {
      rpcName: "list_accountant_inbox_fact",
      caller: "src/lib/api/accountant.listAccountantInbox",
      domain: "accountant",
    });
    return (rows ?? []) as AccountantInboxRow[];
  }

  // 2) fallback: старый RPC
  const r = await client.rpc("list_accountant_inbox", { p_tab: norm ?? "К оплате" });
  if (r.error) return [];
  const rows = validateRpcResponse(r.data, isAccountantInboxLegacyRpcResponse, {
    rpcName: "list_accountant_inbox",
    caller: "src/lib/api/accountant.listAccountantInbox",
    domain: "accountant",
  });
  return (rows ?? []) as AccountantInboxRow[];
}
