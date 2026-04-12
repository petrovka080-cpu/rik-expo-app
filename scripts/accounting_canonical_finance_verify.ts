import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/database.types";
import { createVerifierAdmin } from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) loadDotenv({ path: fullPath, override: false });
}

const admin = createVerifierAdmin("accounting-canonical-finance-verify") as SupabaseClient<Database>;

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const trim = (value: unknown) => String(value ?? "").trim();
const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const toBoolean = (value: unknown) => value === true;
const round2 = (value: unknown) => Math.round(toNumber(value) * 100) / 100;
const approxEqual = (left: unknown, right: unknown, eps = 0.01) =>
  Math.abs(round2(left) - round2(right)) <= eps;
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

type FinancialState = {
  proposalId: string;
  proposalStatus: string | null;
  sentToAccountantAt: string | null;
  totals: {
    payableAmount: number;
    totalPaid: number;
    outstandingAmount: number;
    paymentsCount: number;
    paymentStatus: string | null;
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
};

type PayResult =
  | {
      ok: true;
      proposalId: string;
      paymentId: number;
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
    }
  | {
      ok: false;
      proposalId: string;
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
    };

type InboxRow = {
  proposal_id?: string | null;
  invoice_amount?: number | string | null;
  outstanding_amount?: number | string | null;
  total_paid?: number | string | null;
  payment_status?: string | null;
  payment_eligible?: boolean | null;
  failure_code?: string | null;
};

type SeedBundle = {
  requestId: string;
  proposalId: string;
  proposalItemIds: string[];
};

function assertPaySuccess(
  result: PayResult,
): asserts result is Extract<PayResult, { ok: true }> {
  if (!result.ok) {
    const failure = result as Extract<PayResult, { ok: false }>;
    throw new Error(failure.failureCode);
  }
}

function getFailureCode(result: PayResult) {
  if (result.ok) return null;
  const failure = result as Extract<PayResult, { ok: false }>;
  return failure.failureCode;
}

const parseFinancialState = (value: unknown): FinancialState => {
  const payload = asRecord(value);
  const proposal = asRecord(payload.proposal);
  const totals = asRecord(payload.totals);
  const eligibility = asRecord(payload.eligibility);
  const allocationSummary = asRecord(payload.allocation_summary);

  return {
    proposalId: trim(proposal.proposal_id),
    proposalStatus: trim(proposal.status) || null,
    sentToAccountantAt: trim(proposal.sent_to_accountant_at) || null,
    totals: {
      payableAmount: round2(totals.payable_amount),
      totalPaid: round2(totals.total_paid),
      outstandingAmount: round2(totals.outstanding_amount),
      paymentsCount: Math.max(0, Math.trunc(toNumber(totals.payments_count))),
      paymentStatus: trim(totals.payment_status) || null,
    },
    eligibility: {
      approved: toBoolean(eligibility.approved),
      sentToAccountant: toBoolean(eligibility.sent_to_accountant),
      paymentEligible: toBoolean(eligibility.payment_eligible),
      failureCode: trim(eligibility.failure_code) || null,
    },
    allocationSummary: {
      paidKnownSum: round2(allocationSummary.paid_known_sum),
      paidUnassigned: round2(allocationSummary.paid_unassigned),
      allocationCount: Math.max(0, Math.trunc(toNumber(allocationSummary.allocation_count))),
    },
  };
};

const parsePayResult = (value: unknown): PayResult => {
  const payload = asRecord(value);
  const ok = toBoolean(payload.ok);
  const totalsBefore = asRecord(payload.totals_before);
  if (!ok) {
    const validation = asRecord(payload.validation);
    return {
      ok: false,
      proposalId: trim(payload.proposal_id),
      failureCode: trim(payload.failure_code),
      failureMessage: trim(payload.failure_message),
      totalsBefore:
        Object.keys(totalsBefore).length > 0
          ? {
              payableAmount: round2(totalsBefore.payable_amount),
              totalPaid: round2(totalsBefore.total_paid),
              outstandingAmount: round2(totalsBefore.outstanding_amount),
              paymentStatus: trim(totalsBefore.payment_status) || null,
            }
          : null,
      validation:
        Object.keys(validation).length > 0
          ? {
              approved: toBoolean(validation.approved),
              sentToAccountant: toBoolean(validation.sent_to_accountant),
              paymentEligible: toBoolean(validation.payment_eligible),
              proposalStatus: trim(validation.proposal_status) || null,
            }
          : null,
    };
  }

  const totalsAfter = asRecord(payload.totals_after);
  return {
    ok: true,
    proposalId: trim(payload.proposal_id),
    paymentId: Math.trunc(toNumber(payload.payment_id)),
    totalsBefore: {
      payableAmount: round2(totalsBefore.payable_amount),
      totalPaid: round2(totalsBefore.total_paid),
      outstandingAmount: round2(totalsBefore.outstanding_amount),
      paymentStatus: trim(totalsBefore.payment_status) || null,
    },
    totalsAfter: {
      payableAmount: round2(totalsAfter.payable_amount),
      totalPaid: round2(totalsAfter.total_paid),
      outstandingAmount: round2(totalsAfter.outstanding_amount),
      paymentStatus: trim(totalsAfter.payment_status) || null,
    },
  };
};

const oldClientFormula = (state: FinancialState) => {
  const outstanding = round2(Math.max(0, state.totals.payableAmount - state.totals.totalPaid));
  const paymentEligible =
    state.eligibility.approved &&
    state.eligibility.sentToAccountant &&
    state.totals.payableAmount > 0 &&
    outstanding > 0.01;
  let failureCode: string | null = null;
  if (!state.eligibility.sentToAccountant) {
    failureCode = state.eligibility.approved ? "approval_revoked" : "proposal_not_approved";
  } else if (!state.eligibility.approved) {
    failureCode = "proposal_not_approved";
  } else if (state.totals.payableAmount <= 0) {
    failureCode = "invalid_payable_amount";
  } else if (outstanding <= 0.01) {
    failureCode = "already_paid";
  }
  return { outstanding, paymentEligible, failureCode };
};

async function insertRequest(marker: string) {
  const result = await admin
    .from("requests")
    .insert({
      status: "Черновик",
      comment: `${marker}:request`,
      object_name: marker,
      note: marker,
    })
    .select("id")
    .single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data.id);
}

async function insertRequestItem(requestId: string, marker: string, index: number) {
  const result = await admin
    .from("request_items")
    .insert({
      request_id: requestId,
      name_human: `${marker}:item:${index}`,
      qty: 1,
      uom: "pcs",
      rik_code: `${marker}:rik:${index}`,
      status: "Черновик",
    })
    .select("id")
    .single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data.id);
}

async function insertProposal(
  requestId: string,
  marker: string,
  status: string,
  sentToAccountant: boolean,
) {
  const result = await admin
    .from("proposals")
    .insert({
      request_id: requestId,
      status,
      supplier: `${marker}:supplier`,
      invoice_number: `${marker}:INV`,
      invoice_date: new Date().toISOString().slice(0, 10),
      invoice_currency: "KGS",
      sent_to_accountant_at: sentToAccountant ? new Date().toISOString() : null,
    })
    .select("id")
    .single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data.id);
}

async function promoteProposalToPayableState(
  proposalId: string,
  proposalStatus: string,
  sentToAccountant: boolean,
) {
  const result = await admin
    .from("proposals")
    .update({
      status: proposalStatus,
      sent_to_accountant_at: sentToAccountant ? new Date().toISOString() : null,
    })
    .eq("id", proposalId);
  if (result.error) throw result.error;
}

async function insertProposalItem(proposalId: string, requestItemId: string, marker: string, index: number, price: number) {
  const result = await admin
    .from("proposal_items")
    .insert({
      proposal_id: proposalId,
      proposal_id_text: proposalId,
      request_item_id: requestItemId,
      name_human: `${marker}:item:${index}`,
      qty: 1,
      uom: "pcs",
      price,
      rik_code: `${marker}:rik:${index}`,
      supplier: `${marker}:supplier`,
      status: "Утверждено",
    })
    .select("id")
    .single<{ id: number }>();
  if (result.error) throw result.error;
  return String(result.data.id);
}

async function seedProposal(params: {
  marker: string;
  proposalStatus: string;
  sentToAccountant: boolean;
  prices: number[];
}) {
  const requestId = await insertRequest(params.marker);
  const proposalId = await insertProposal(
    requestId,
    params.marker,
    "Черновик",
    false,
  );
  const proposalItemIds: string[] = [];
  for (let index = 0; index < params.prices.length; index += 1) {
    const requestItemId = await insertRequestItem(requestId, params.marker, index);
    const proposalItemId = await insertProposalItem(
      proposalId,
      requestItemId,
      params.marker,
      index,
      params.prices[index],
    );
    proposalItemIds.push(proposalItemId);
  }
  await promoteProposalToPayableState(
    proposalId,
    params.proposalStatus,
    params.sentToAccountant,
  );
  return { requestId, proposalId, proposalItemIds } satisfies SeedBundle;
}

async function loadFinancialState(proposalId: string) {
  const rpc = await admin.rpc("accountant_proposal_financial_state_v1", {
    p_proposal_id: proposalId,
  });
  if (rpc.error) throw rpc.error;
  return parseFinancialState(rpc.data);
}

async function loadInboxRow(proposalId: string) {
  const rpc = await admin.rpc("accountant_inbox_scope_v1", {
    p_tab: null,
    p_offset: 0,
    p_limit: 200,
  });
  if (rpc.error) throw rpc.error;
  const payload = asRecord(rpc.data);
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  return rows
    .map((row) => asRecord(row))
    .find((row) => trim(row.proposal_id) === proposalId) as InboxRow | undefined;
}

async function payInvoice(params: {
  proposalId: string;
  amount: number;
  allocations?: Array<{ proposal_item_id: string; amount: number }>;
  expectedTotalPaid?: number | null;
  expectedOutstanding?: number | null;
  clientMutationId?: string;
}) {
  const clientMutationId =
    params.clientMutationId ||
    `accounting-finance-verify:${params.proposalId}:${Date.now().toString(36)}:${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  const rpc = await admin.rpc("accounting_pay_invoice_v1", {
    p_proposal_id: params.proposalId,
    p_amount: params.amount,
    p_accountant_fio: "Accounting Finance Verify",
    p_purpose: "Accounting canonical finance verify",
    p_method: "Банк",
    p_note: "accounting_canonical_finance_verify",
    p_allocations: params.allocations ?? [],
    p_invoice_number: "VERIFY-INV",
    p_invoice_date: new Date().toISOString().slice(0, 10),
    p_invoice_currency: "KGS",
    p_expected_total_paid: params.expectedTotalPaid ?? undefined,
    p_expected_outstanding: params.expectedOutstanding ?? undefined,
    p_client_mutation_id: clientMutationId,
  });
  if (rpc.error) throw rpc.error;
  return parsePayResult(rpc.data);
}

async function countProposalPayments(proposalId: string) {
  const result = await admin
    .from("proposal_payments")
    .select("id", { head: true, count: "exact" })
    .eq("proposal_id", proposalId);
  if (result.error) throw result.error;
  return Number(result.count ?? 0);
}

function readSourceScan() {
  const payActionsSource = fs.readFileSync(
    path.join(projectRoot, "src/screens/accountant/useAccountantPayActions.ts"),
    "utf8",
  );
  const paymentHelpersSource = fs.readFileSync(
    path.join(projectRoot, "src/screens/accountant/accountant.paymentForm.helpers.ts"),
    "utf8",
  );
  const inboxServiceSource = fs.readFileSync(
    path.join(projectRoot, "src/screens/accountant/accountant.inbox.service.ts"),
    "utf8",
  );
  const rowAdaptersSource = fs.readFileSync(
    path.join(projectRoot, "src/screens/accountant/presentation/accountantRowAdapters.ts"),
    "utf8",
  );
  const appSource = fs.readFileSync(
    path.join(projectRoot, "app/(tabs)/accountant.tsx"),
    "utf8",
  );
  return {
    payActionsUsesCanonicalReadback: payActionsSource.includes("accountantLoadProposalFinancialState"),
    payActionsUsesAtomicPaymentRpc: payActionsSource.includes("accountantPayInvoiceAtomic"),
    payActionsNoClientOutstandingMath: !/invoice_amount\s*-\s*total_paid/.test(payActionsSource),
    paymentFormUsesCanonicalOutstanding:
      paymentHelpersSource.includes("current?.outstanding_amount") &&
      paymentHelpersSource.includes("current?.paid_unassigned"),
    inboxServiceCarriesCanonicalFields:
      inboxServiceSource.includes("outstanding_amount") &&
      inboxServiceSource.includes("payment_eligible") &&
      inboxServiceSource.includes("failure_code"),
    listAdapterUsesCanonicalOutstanding:
      rowAdaptersSource.includes("outstanding_amount") &&
      !/sum\s*>\s*0\s*\?\s*Math\.max\(0,\s*sum\s*-\s*total\)/.test(rowAdaptersSource),
    screenDoesNotComputeOutstandingPrimary:
      !/invoice_amount\s*-\s*total_paid/.test(appSource),
    noSilentCatchOnPayActions: !payActionsSource.includes("catch {}"),
  };
}

async function cleanupSeedRows(requestIds: string[], proposalIds: string[]) {
  if (proposalIds.length) {
    await (admin as any)
      .from("accounting_pay_invoice_mutations_v1")
      .delete()
      .in("proposal_id", proposalIds);

    const paymentIdsResult = await admin
      .from("proposal_payments")
      .select("id")
      .in("proposal_id", proposalIds);
    if (paymentIdsResult.error) throw paymentIdsResult.error;
    const paymentIds = (paymentIdsResult.data ?? [])
      .map((row) => Number((row as { id?: unknown }).id))
      .filter(Number.isFinite);
    if (paymentIds.length) {
      const deleteAllocations = await admin
        .from("proposal_payment_allocations")
        .delete()
        .in("payment_id", paymentIds);
      if (deleteAllocations.error) throw deleteAllocations.error;
    }
    const deletePayments = await admin.from("proposal_payments").delete().in("proposal_id", proposalIds);
    if (deletePayments.error) throw deletePayments.error;
    const deleteProposalItems = await admin.from("proposal_items").delete().in("proposal_id", proposalIds);
    if (deleteProposalItems.error) throw deleteProposalItems.error;
    const deleteProposals = await admin.from("proposals").delete().in("id", proposalIds);
    if (deleteProposals.error) throw deleteProposals.error;
  }
  if (requestIds.length) {
    const deleteRequestItems = await admin.from("request_items").delete().in("request_id", requestIds);
    if (deleteRequestItems.error) throw deleteRequestItems.error;
    const deleteRequests = await admin.from("requests").delete().in("id", requestIds);
    if (deleteRequests.error) throw deleteRequests.error;
  }
}

async function main() {
  const requestIds: string[] = [];
  const proposalIds: string[] = [];
  const markerBase = `accounting-chain:${Date.now().toString(36)}`;

  try {
    const sourceScan = readSourceScan();

    const partialSeed = await seedProposal({
      marker: `${markerBase}:partial`,
      proposalStatus: "Утверждено",
      sentToAccountant: true,
      prices: [70, 30],
    });
    requestIds.push(partialSeed.requestId);
    proposalIds.push(partialSeed.proposalId);
    const initialState = await loadFinancialState(partialSeed.proposalId);
    const partialPayment = await payInvoice({
      proposalId: partialSeed.proposalId,
      amount: 40,
      allocations: [
        { proposal_item_id: partialSeed.proposalItemIds[0], amount: 25 },
        { proposal_item_id: partialSeed.proposalItemIds[1], amount: 15 },
      ],
      expectedTotalPaid: initialState.totals.totalPaid,
      expectedOutstanding: initialState.totals.outstandingAmount,
    });
    assertPaySuccess(partialPayment);
    const afterPartialState = await loadFinancialState(partialSeed.proposalId);

    const fullSeed = await seedProposal({
      marker: `${markerBase}:full`,
      proposalStatus: "Утверждено",
      sentToAccountant: true,
      prices: [50, 20],
    });
    requestIds.push(fullSeed.requestId);
    proposalIds.push(fullSeed.proposalId);
    const fullBefore = await loadFinancialState(fullSeed.proposalId);
    const fullPayment = await payInvoice({
      proposalId: fullSeed.proposalId,
      amount: fullBefore.totals.outstandingAmount,
      expectedTotalPaid: fullBefore.totals.totalPaid,
      expectedOutstanding: fullBefore.totals.outstandingAmount,
    });
    assertPaySuccess(fullPayment);
    const fullAfter = await loadFinancialState(fullSeed.proposalId);

    const notApprovedSeed = await seedProposal({
      marker: `${markerBase}:not-approved`,
      proposalStatus: "Черновик",
      sentToAccountant: false,
      prices: [100],
    });
    requestIds.push(notApprovedSeed.requestId);
    proposalIds.push(notApprovedSeed.proposalId);
    const notApprovedPay = await payInvoice({
      proposalId: notApprovedSeed.proposalId,
      amount: 10,
    });

    const revokedSeed = await seedProposal({
      marker: `${markerBase}:revoked`,
      proposalStatus: "Утверждено",
      sentToAccountant: true,
      prices: [100],
    });
    requestIds.push(revokedSeed.requestId);
    proposalIds.push(revokedSeed.proposalId);
    const revokedBefore = await loadFinancialState(revokedSeed.proposalId);
    const revokeBeforeMutation = await admin
      .from("proposals")
      .update({ sent_to_accountant_at: null })
      .eq("id", revokedSeed.proposalId);
    if (revokeBeforeMutation.error) throw revokeBeforeMutation.error;
    const revokedPay = await payInvoice({
      proposalId: revokedSeed.proposalId,
      amount: 10,
      expectedTotalPaid: revokedBefore.totals.totalPaid,
      expectedOutstanding: revokedBefore.totals.outstandingAmount,
    });
    const revokedPaymentsCount = await countProposalPayments(revokedSeed.proposalId);

    const concurrentSeed = await seedProposal({
      marker: `${markerBase}:concurrent`,
      proposalStatus: "Утверждено",
      sentToAccountant: true,
      prices: [100],
    });
    requestIds.push(concurrentSeed.requestId);
    proposalIds.push(concurrentSeed.proposalId);
    const concurrentBefore = await loadFinancialState(concurrentSeed.proposalId);
    const [concurrentLeft, concurrentRight] = await Promise.all([
      payInvoice({
        proposalId: concurrentSeed.proposalId,
        amount: 30,
        allocations: [{ proposal_item_id: concurrentSeed.proposalItemIds[0], amount: 30 }],
        expectedTotalPaid: concurrentBefore.totals.totalPaid,
        expectedOutstanding: concurrentBefore.totals.outstandingAmount,
      }),
      payInvoice({
        proposalId: concurrentSeed.proposalId,
        amount: 30,
        allocations: [{ proposal_item_id: concurrentSeed.proposalItemIds[0], amount: 30 }],
        expectedTotalPaid: concurrentBefore.totals.totalPaid,
        expectedOutstanding: concurrentBefore.totals.outstandingAmount,
      }),
    ]);
    const concurrentSuccesses = [concurrentLeft, concurrentRight].filter(
      (result): result is Extract<PayResult, { ok: true }> => result.ok,
    );
    const concurrentFailures = [concurrentLeft, concurrentRight].filter(
      (result): result is Extract<PayResult, { ok: false }> => !result.ok,
    );
    const concurrentAfter = await loadFinancialState(concurrentSeed.proposalId);

    let revokeAfterPayError: { message: string | null; code: string | null } | null = null;
    try {
      const revokeAfter = await admin
        .from("proposals")
        .update({ sent_to_accountant_at: null, payment_status: null })
        .eq("id", partialSeed.proposalId);
      if (revokeAfter.error) throw revokeAfter.error;
    } catch (error) {
      const payload = asRecord(error);
      revokeAfterPayError = {
        message: trim(payload.message) || (error instanceof Error ? error.message : String(error)),
        code: trim(payload.code) || null,
      };
    }

    const finalState = await loadFinancialState(partialSeed.proposalId);
    const finalInboxRow = await loadInboxRow(partialSeed.proposalId);
    const oldMath = oldClientFormula(finalState);
    const notApprovedFailureCode = getFailureCode(notApprovedPay);
    const revokedFailureCode = getFailureCode(revokedPay);
    const inboxParity = {
      rowFound: Boolean(finalInboxRow),
      payableMatch: approxEqual(finalInboxRow?.invoice_amount, finalState.totals.payableAmount),
      outstandingMatch: approxEqual(finalInboxRow?.outstanding_amount, finalState.totals.outstandingAmount),
      totalPaidMatch: approxEqual(finalInboxRow?.total_paid, finalState.totals.totalPaid),
      paymentStatusMatch: trim(finalInboxRow?.payment_status) === trim(finalState.totals.paymentStatus),
      paymentEligibleMatch:
        Boolean(finalInboxRow?.payment_eligible) === finalState.eligibility.paymentEligible,
      failureCodeMatch: trim(finalInboxRow?.failure_code) === trim(finalState.eligibility.failureCode),
    };

    const parity = {
      oldSourceSummary: "client formulas: outstanding=invoice_amount-total_paid, eligibility from approved+sent_to_accountant+outstanding",
      newSourceSummary: "server canonical: accountant_proposal_financial_state_v1 + accountant_inbox_scope_v1",
      oldPaidOutstanding: {
        paid: finalState.totals.totalPaid,
        outstanding: oldMath.outstanding,
        paymentEligible: oldMath.paymentEligible,
        failureCode: oldMath.failureCode,
      },
      newPaidOutstanding: {
        paid: finalState.totals.totalPaid,
        outstanding: finalState.totals.outstandingAmount,
        paymentEligible: finalState.eligibility.paymentEligible,
        failureCode: finalState.eligibility.failureCode,
      },
      mismatchCategories: [],
      mismatchExplanations: [],
      inboxScopeParity: inboxParity,
      safeSwitchVerdict:
        approxEqual(oldMath.outstanding, finalState.totals.outstandingAmount) &&
        oldMath.paymentEligible === finalState.eligibility.paymentEligible &&
        trim(oldMath.failureCode) === trim(finalState.eligibility.failureCode) &&
        inboxParity.rowFound &&
        inboxParity.payableMatch &&
        inboxParity.outstandingMatch &&
        inboxParity.totalPaidMatch &&
        inboxParity.paymentStatusMatch &&
        inboxParity.paymentEligibleMatch &&
        inboxParity.failureCodeMatch,
    };

    const status =
      partialPayment.ok &&
      fullPayment.ok &&
      !notApprovedPay.ok &&
      notApprovedFailureCode === "proposal_not_approved" &&
      !revokedPay.ok &&
      revokedFailureCode === "approval_revoked" &&
      revokedPaymentsCount === 0 &&
      concurrentSuccesses.length === 1 &&
      concurrentFailures.length === 1 &&
      concurrentFailures[0].failureCode === "stale_financial_state" &&
      approxEqual(concurrentAfter.totals.totalPaid, 30) &&
      approxEqual(concurrentAfter.totals.outstandingAmount, 70) &&
      Boolean(revokeAfterPayError?.message) &&
      sourceScan.payActionsUsesCanonicalReadback &&
      sourceScan.payActionsUsesAtomicPaymentRpc &&
      sourceScan.payActionsNoClientOutstandingMath &&
      sourceScan.paymentFormUsesCanonicalOutstanding &&
      sourceScan.inboxServiceCarriesCanonicalFields &&
      sourceScan.listAdapterUsesCanonicalOutstanding &&
      sourceScan.screenDoesNotComputeOutstandingPrimary &&
      sourceScan.noSilentCatchOnPayActions &&
      parity.safeSwitchVerdict
        ? "GREEN"
        : "NOT GREEN";

    writeJson("artifacts/accounting-canonical-finance-smoke.json", {
      initialFinanceState: initialState,
      approvalActionResult: {
        proposalId: partialSeed.proposalId,
        approved: initialState.eligibility.approved,
        sentToAccountant: initialState.eligibility.sentToAccountant,
        paymentEligible: initialState.eligibility.paymentEligible,
      },
      revokeActionResult: {
        beforePayRejected: {
          proposalId: revokedSeed.proposalId,
          failureCode: revokedFailureCode,
          paymentsCountAfterRejectedPay: revokedPaymentsCount,
        },
        afterCommittedPayBlocked: revokeAfterPayError,
      },
      paymentActionResult: {
        partialPayment,
        fullPayment,
      },
      paidOutstandingBeforeAfter: {
        partial: { before: initialState.totals, after: afterPartialState.totals },
        full: { before: fullBefore.totals, after: fullAfter.totals },
      },
      duplicateStaleActionResult: {
        successCount: concurrentSuccesses.length,
        failureCount: concurrentFailures.length,
        failureCodes: concurrentFailures.map((result) => result.failureCode),
        finalState: concurrentAfter.totals,
      },
      invalidTransitionResult: {
        proposalNotApproved: notApprovedFailureCode,
        approvalRevoked: revokedFailureCode,
      },
      finalCanonicalState: finalState,
      sourceScan,
      finalStatus: status,
    });

    writeJson("artifacts/accounting-canonical-finance-parity.json", {
      ...parity,
      status,
    });

    console.log(JSON.stringify({ status, parity }, null, 2));
    if (status !== "GREEN") process.exitCode = 1;
  } finally {
    await cleanupSeedRows(requestIds, proposalIds).catch((error) => {
      console.error("[accounting_canonical_finance_verify][cleanup]", error);
      process.exitCode = 1;
    });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
