import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/database.types";
import { createVerifierAdmin } from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) {
    loadDotenv({ path: fullPath, override: false });
  }
}

const admin = createVerifierAdmin("financial-atomic-rpc-verify") as SupabaseClient<Database>;

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
const failureCodeOf = (result: ParsedPayResult) =>
  "failureCode" in result ? result.failureCode : null;

type SeedBundle = {
  requestId: string;
  proposalId: string;
  requestItemIds: string[];
  proposalItems: Array<{
    proposalItemId: string;
    requestItemId: string;
    lineTotal: number;
  }>;
  payableAmount: number;
};

type ParsedFinancialState = {
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
  items: Array<{
    proposalItemId: string;
    lineTotal: number;
    paidTotal: number;
    outstanding: number;
  }>;
  meta: {
    backendTruth: boolean;
    sourceKind: string | null;
    legacyTotalPaid: number;
    legacyPaymentStatus: string | null;
  };
};

type ParsedPayResult =
  | {
      ok: true;
      proposalId: string;
      paymentId: number;
      clientMutationId: string | null;
      outcome: string | null;
      idempotentReplay: boolean;
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
      serverTruth: ParsedFinancialState;
    }
  | {
      ok: false;
      proposalId: string;
      clientMutationId: string | null;
      outcome: string | null;
      idempotentReplay: boolean;
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

const parseFinancialState = (value: unknown): ParsedFinancialState => {
  const payload = asRecord(value);
  const proposal = asRecord(payload.proposal);
  const totals = asRecord(payload.totals);
  const eligibility = asRecord(payload.eligibility);
  const allocationSummary = asRecord(payload.allocation_summary);
  const meta = asRecord(payload.meta);
  const items = Array.isArray(payload.items) ? payload.items : [];

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
    items: items
      .map((item) => asRecord(item))
      .map((item) => ({
        proposalItemId: trim(item.proposal_item_id),
        lineTotal: round2(item.line_total),
        paidTotal: round2(item.paid_total),
        outstanding: round2(item.outstanding),
      }))
      .filter((item) => item.proposalItemId),
    meta: {
      backendTruth: toBoolean(meta.backend_truth),
      sourceKind: trim(meta.source_kind) || null,
      legacyTotalPaid: round2(meta.legacy_total_paid),
      legacyPaymentStatus: trim(meta.legacy_payment_status) || null,
    },
  };
};

const parsePayResult = (value: unknown): ParsedPayResult => {
  const payload = asRecord(value);
  const ok = toBoolean(payload.ok);
  const totalsBefore = asRecord(payload.totals_before);

  if (!ok) {
    const validation = asRecord(payload.validation);
    return {
      ok: false,
      proposalId: trim(payload.proposal_id),
      clientMutationId: trim(payload.client_mutation_id) || null,
      outcome: trim(payload.outcome) || null,
      idempotentReplay: toBoolean(payload.idempotent_replay),
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
    clientMutationId: trim(payload.client_mutation_id) || null,
    outcome: trim(payload.outcome) || null,
    idempotentReplay: toBoolean(payload.idempotent_replay),
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
    serverTruth: parseFinancialState(payload.server_truth),
  };
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

async function insertRequestItem(params: {
  requestId: string;
  marker: string;
  index: number;
  qty: number;
  uom: string;
}) {
  const result = await admin
    .from("request_items")
    .insert({
      request_id: params.requestId,
      name_human: `${params.marker}:item:${params.index}`,
      qty: params.qty,
      uom: params.uom,
      rik_code: `${params.marker}:rik:${params.index}`,
      status: "Утверждено",
      note: `${params.marker}:item:${params.index}`,
    })
    .select("id")
    .single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data.id);
}

async function insertProposal(params: {
  requestId: string;
  marker: string;
}) {
  const result = await admin
    .from("proposals")
    .insert({
      request_id: params.requestId,
      status: "Черновик",
      supplier: `${params.marker}:supplier`,
      invoice_number: `${params.marker}:INV`,
      invoice_date: new Date().toISOString().slice(0, 10),
      invoice_currency: "KGS",
    })
    .select("id")
    .single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data.id);
}

async function finalizeProposalState(params: {
  proposalId: string;
  status: string;
  sentToAccountant: boolean;
}) {
  const result = await admin
    .from("proposals")
    .update({
      status: params.status,
      sent_to_accountant_at: params.sentToAccountant ? new Date().toISOString() : null,
    })
    .eq("id", params.proposalId);
  if (result.error) throw result.error;
}

async function insertProposalItem(params: {
  proposalId: string;
  requestItemId: string;
  marker: string;
  index: number;
  qty: number;
  uom: string;
  price: number;
}) {
  const result = await admin
    .from("proposal_items")
    .insert({
      proposal_id: params.proposalId,
      proposal_id_text: params.proposalId,
      request_item_id: params.requestItemId,
      name_human: `${params.marker}:item:${params.index}`,
      qty: params.qty,
      uom: params.uom,
      price: params.price,
      rik_code: `${params.marker}:rik:${params.index}`,
      supplier: `${params.marker}:supplier`,
      note: `${params.marker}:proposal-item:${params.index}`,
      status: "Утверждено",
    })
    .select("id")
    .single<{ id: number }>();
  if (result.error) throw result.error;
  return String(result.data.id);
}

async function seedFinancialProposal(params: {
  marker: string;
  status: string;
  sentToAccountant: boolean;
  lines: Array<{ qty: number; price: number; uom?: string }>;
}) {
  const requestId = await insertRequest(params.marker);
  const proposalId = await insertProposal({
    requestId,
    marker: params.marker,
  });

  const proposalItems: SeedBundle["proposalItems"] = [];
  const requestItemIds: string[] = [];
  let payableAmount = 0;

  for (let index = 0; index < params.lines.length; index += 1) {
    const line = params.lines[index];
    const requestItemId = await insertRequestItem({
      requestId,
      marker: params.marker,
      index,
      qty: line.qty,
      uom: line.uom ?? "pcs",
    });
    const proposalItemId = await insertProposalItem({
      proposalId,
      requestItemId,
      marker: params.marker,
      index,
      qty: line.qty,
      uom: line.uom ?? "pcs",
      price: line.price,
    });
    requestItemIds.push(requestItemId);
    payableAmount += line.qty * line.price;
    proposalItems.push({
      proposalItemId,
      requestItemId,
      lineTotal: round2(line.qty * line.price),
    });
  }

  await finalizeProposalState({
    proposalId,
    status: params.status,
    sentToAccountant: params.sentToAccountant,
  });

  return {
    requestId,
    proposalId,
    requestItemIds,
    proposalItems,
    payableAmount: round2(payableAmount),
  } satisfies SeedBundle;
}

async function loadFinancialState(proposalId: string) {
  const rpc = await admin.rpc("accountant_proposal_financial_state_v1", {
    p_proposal_id: proposalId,
  });
  if (rpc.error) throw rpc.error;
  return parseFinancialState(rpc.data);
}

async function payInvoice(params: {
  proposalId: string;
  amount: number;
  allocations?: Array<{ proposal_item_id: string; amount: number }>;
  expectedTotalPaid?: number | null;
  expectedOutstanding?: number | null;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceCurrency?: string;
  clientMutationId?: string;
}) {
  const clientMutationId =
    params.clientMutationId ||
    `financial-verify:${params.proposalId}:${Date.now().toString(36)}:${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  const rpc = await admin.rpc("accounting_pay_invoice_v1", {
    p_proposal_id: params.proposalId,
    p_amount: params.amount,
    p_accountant_fio: "Financial RPC Verify",
    p_purpose: "Financial atomic RPC verify",
    p_method: "Банк",
    p_note: "financial_atomic_rpc_verify",
    p_allocations: params.allocations ?? [],
    p_invoice_number: params.invoiceNumber ?? "VERIFY-INV",
    p_invoice_date: params.invoiceDate ?? new Date().toISOString().slice(0, 10),
    p_invoice_amount: undefined,
    p_invoice_currency: params.invoiceCurrency ?? "KGS",
    p_expected_total_paid: params.expectedTotalPaid ?? undefined,
    p_expected_outstanding: params.expectedOutstanding ?? undefined,
    p_client_mutation_id: clientMutationId,
  });
  if (rpc.error) throw rpc.error;
  return parsePayResult(rpc.data);
}

async function readCanonicalParity(proposalId: string) {
  const [proposalResult, paymentsResult, itemsResult] = await Promise.all([
    admin
      .from("proposals")
      .select("id, status, sent_to_accountant_at, total_paid, payment_status")
      .eq("id", proposalId)
      .single(),
    admin
      .from("proposal_payments")
      .select("id, amount, proposal_id")
      .eq("proposal_id", proposalId),
    admin
      .from("proposal_items")
      .select("id, qty, price")
      .eq("proposal_id", proposalId),
  ]);
  if (proposalResult.error) throw proposalResult.error;
  if (paymentsResult.error) throw paymentsResult.error;
  if (itemsResult.error) throw itemsResult.error;

  const paymentIds = (paymentsResult.data ?? [])
    .map((row) => Number((row as { id?: unknown }).id))
    .filter(Number.isFinite);
  const allocationsResult = paymentIds.length
    ? await admin
        .from("proposal_payment_allocations")
        .select("payment_id, proposal_item_id, amount")
        .in("payment_id", paymentIds)
    : { data: [], error: null };
  if (allocationsResult.error) throw allocationsResult.error;

  const totalPaid = round2(
    (paymentsResult.data ?? []).reduce(
      (sum, row) => sum + toNumber((row as { amount?: unknown }).amount),
      0,
    ),
  );
  const payableAmount = round2(
    (itemsResult.data ?? []).reduce((sum, row) => {
      const qty = toNumber((row as { qty?: unknown }).qty);
      const price = toNumber((row as { price?: unknown }).price);
      return sum + qty * price;
    }, 0),
  );
  const allocationsByItem = new Map<string, number>();
  for (const row of allocationsResult.data ?? []) {
    const itemId = trim((row as { proposal_item_id?: unknown }).proposal_item_id);
    allocationsByItem.set(
      itemId,
      round2((allocationsByItem.get(itemId) ?? 0) + toNumber((row as { amount?: unknown }).amount)),
    );
  }

  const itemParity = (itemsResult.data ?? []).map((row) => {
    const itemId = trim((row as { id?: unknown }).id);
    const lineTotal = round2(
      toNumber((row as { qty?: unknown }).qty) * toNumber((row as { price?: unknown }).price),
    );
    const paidTotal = round2(allocationsByItem.get(itemId) ?? 0);
    return {
      proposalItemId: itemId,
      lineTotal,
      paidTotal,
      outstanding: round2(Math.max(lineTotal - paidTotal, 0)),
    };
  });

  return {
    proposal: {
      id: trim((proposalResult.data as { id?: unknown }).id),
      status: trim((proposalResult.data as { status?: unknown }).status) || null,
      sentToAccountantAt:
        trim((proposalResult.data as { sent_to_accountant_at?: unknown }).sent_to_accountant_at) || null,
      mirrorTotalPaid: round2((proposalResult.data as { total_paid?: unknown }).total_paid),
      mirrorPaymentStatus:
        trim((proposalResult.data as { payment_status?: unknown }).payment_status) || null,
    },
    totals: {
      payableAmount,
      totalPaid,
      outstandingAmount: round2(Math.max(payableAmount - totalPaid, 0)),
      paymentsCount: paymentIds.length,
      allocationsCount: (allocationsResult.data ?? []).length,
    },
    items: itemParity,
  };
}

function compareParity(state: ParsedFinancialState, canonical: Awaited<ReturnType<typeof readCanonicalParity>>) {
  const stateItems = new Map(state.items.map((item) => [item.proposalItemId, item]));
  const itemParity = canonical.items.map((item) => {
    const stateItem = stateItems.get(item.proposalItemId);
    return {
      proposalItemId: item.proposalItemId,
      lineTotalMatch: approxEqual(stateItem?.lineTotal, item.lineTotal),
      paidTotalMatch: approxEqual(stateItem?.paidTotal, item.paidTotal),
      outstandingMatch: approxEqual(stateItem?.outstanding, item.outstanding),
    };
  });

  return {
    payableMatch: approxEqual(state.totals.payableAmount, canonical.totals.payableAmount),
    totalPaidMatch: approxEqual(state.totals.totalPaid, canonical.totals.totalPaid),
    outstandingMatch: approxEqual(state.totals.outstandingAmount, canonical.totals.outstandingAmount),
    paymentsCountMatch: state.totals.paymentsCount === canonical.totals.paymentsCount,
    mirrorTotalPaidMatch: approxEqual(state.totals.totalPaid, canonical.proposal.mirrorTotalPaid),
    mirrorPaymentStatusMatch:
      trim(state.totals.paymentStatus) === trim(canonical.proposal.mirrorPaymentStatus),
    itemParity,
    allItemParity: itemParity.every(
      (row) => row.lineTotalMatch && row.paidTotalMatch && row.outstandingMatch,
    ),
  };
}

function readSourceScan() {
  const paymentFormSource = fs.readFileSync(
    path.join(projectRoot, "src/screens/accountant/useAccountantPaymentForm.ts"),
    "utf8",
  );
  const payActionsSource = fs.readFileSync(
    path.join(projectRoot, "src/screens/accountant/useAccountantPayActions.ts"),
    "utf8",
  );
  const accountantApiSource = fs.readFileSync(
    path.join(projectRoot, "src/lib/api/accountant.ts"),
    "utf8",
  );
  const postSyncSource = fs.readFileSync(
    path.join(projectRoot, "src/screens/accountant/useAccountantPostPaymentSync.ts"),
    "utf8",
  );
  const historyFlowSource = fs.readFileSync(
    path.join(projectRoot, "src/screens/accountant/useAccountantHistoryFlow.ts"),
    "utf8",
  );

  return {
    paymentFormUsesServerTruthRpc: paymentFormSource.includes("accountantLoadProposalFinancialState"),
    paymentFormNoDirectProposalItemsFetch:
      !paymentFormSource.includes('.from("proposal_items")') &&
      !paymentFormSource.includes('.from("proposal_payment_allocations")'),
    payActionsUsesAtomicRpc: payActionsSource.includes("accountantPayInvoiceAtomic"),
    payActionsPassesClientMutationId: payActionsSource.includes("clientMutationId: pendingIntent.clientMutationId"),
    payActionsNoLegacyPaidAgg: !payActionsSource.includes("fetchPaidAggByProposal"),
    payActionsNoClientDebtFormula: !/invoice_amount\s*-\s*total_paid/.test(payActionsSource),
    legacyAddPaymentPathDisabled: accountantApiSource.includes("accountantAddPayment legacy payment path is disabled"),
    postSyncUsesServerTruthRpc: postSyncSource.includes("accountantLoadProposalFinancialState"),
    historyFlowUsesServerTruthRpc: historyFlowSource.includes("accountantLoadProposalFinancialState"),
    noSilentCatchOnPayActions: !payActionsSource.includes("catch {}"),
  };
}

async function countProposalPayments(proposalId: string) {
  const result = await admin
    .from("proposal_payments")
    .select("id", { head: true, count: "exact" })
    .eq("proposal_id", proposalId);
  if (result.error) throw result.error;
  return Number(result.count ?? 0);
}

async function cleanupSeedRows(requestIds: string[], proposalIds: string[]) {
  const filteredProposalIds = proposalIds.map(trim).filter(Boolean);
  const filteredRequestIds = requestIds.map(trim).filter(Boolean);
  if (filteredProposalIds.length) {
    await (admin as any)
      .from("accounting_pay_invoice_mutations_v1")
      .delete()
      .in("proposal_id", filteredProposalIds);

    const paymentIdsResult = await admin
      .from("proposal_payments")
      .select("id")
      .in("proposal_id", filteredProposalIds);
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

    const deletePayments = await admin
      .from("proposal_payments")
      .delete()
      .in("proposal_id", filteredProposalIds);
    if (deletePayments.error) throw deletePayments.error;

    const deleteProposalItems = await admin
      .from("proposal_items")
      .delete()
      .in("proposal_id", filteredProposalIds);
    if (deleteProposalItems.error) throw deleteProposalItems.error;

    const deleteProposals = await admin
      .from("proposals")
      .delete()
      .in("id", filteredProposalIds);
    if (deleteProposals.error) throw deleteProposals.error;
  }

  if (filteredRequestIds.length) {
    const deleteRequestItems = await admin
      .from("request_items")
      .delete()
      .in("request_id", filteredRequestIds);
    if (deleteRequestItems.error) throw deleteRequestItems.error;

    const deleteRequests = await admin
      .from("requests")
      .delete()
      .in("id", filteredRequestIds);
    if (deleteRequests.error) throw deleteRequests.error;
  }
}

async function main() {
  const requestIds: string[] = [];
  const proposalIds: string[] = [];
  const markerBase = `financial-atomic-rpc:${Date.now().toString(36)}`;

  try {
    const partialSeed = await seedFinancialProposal({
      marker: `${markerBase}:partial`,
      status: "Утверждено",
      sentToAccountant: true,
      lines: [
        { qty: 1, price: 70 },
        { qty: 1, price: 30 },
      ],
    });
    requestIds.push(partialSeed.requestId);
    proposalIds.push(partialSeed.proposalId);

    const partialBefore = await loadFinancialState(partialSeed.proposalId);
    const partialAllocations = [
      { proposal_item_id: partialSeed.proposalItems[0].proposalItemId, amount: 25 },
      { proposal_item_id: partialSeed.proposalItems[1].proposalItemId, amount: 15 },
    ];
    const partialPayment = await payInvoice({
      proposalId: partialSeed.proposalId,
      amount: 40,
      allocations: partialAllocations,
      expectedTotalPaid: partialBefore.totals.totalPaid,
      expectedOutstanding: partialBefore.totals.outstandingAmount,
    });
    if (!partialPayment.ok) {
      throw new Error(`Partial payment unexpectedly failed: ${failureCodeOf(partialPayment)}`);
    }
    const partialAfter = await loadFinancialState(partialSeed.proposalId);
    const partialCanonical = await readCanonicalParity(partialSeed.proposalId);
    const partialParity = compareParity(partialAfter, partialCanonical);

    const fullSeed = await seedFinancialProposal({
      marker: `${markerBase}:full`,
      status: "Утверждено",
      sentToAccountant: true,
      lines: [
        { qty: 1, price: 70 },
        { qty: 1, price: 30 },
      ],
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
    if (!fullPayment.ok) {
      throw new Error(`Full payment unexpectedly failed: ${failureCodeOf(fullPayment)}`);
    }
    const fullAfter = await loadFinancialState(fullSeed.proposalId);
    const fullCanonical = await readCanonicalParity(fullSeed.proposalId);
    const fullParity = compareParity(fullAfter, fullCanonical);

    const notApprovedSeed = await seedFinancialProposal({
      marker: `${markerBase}:not-approved`,
      status: "Черновик",
      sentToAccountant: false,
      lines: [{ qty: 1, price: 100 }],
    });
    requestIds.push(notApprovedSeed.requestId);
    proposalIds.push(notApprovedSeed.proposalId);
    const notApprovedResult = await payInvoice({
      proposalId: notApprovedSeed.proposalId,
      amount: 10,
    });

    const revokedSeed = await seedFinancialProposal({
      marker: `${markerBase}:revoked-before-pay`,
      status: "Утверждено",
      sentToAccountant: true,
      lines: [{ qty: 1, price: 100 }],
    });
    requestIds.push(revokedSeed.requestId);
    proposalIds.push(revokedSeed.proposalId);
    const revokedBeforeState = await loadFinancialState(revokedSeed.proposalId);
    const revokeBeforeResult = await admin
      .from("proposals")
      .update({ sent_to_accountant_at: null })
      .eq("id", revokedSeed.proposalId);
    if (revokeBeforeResult.error) throw revokeBeforeResult.error;
    const revokedPayResult = await payInvoice({
      proposalId: revokedSeed.proposalId,
      amount: 10,
      expectedTotalPaid: revokedBeforeState.totals.totalPaid,
      expectedOutstanding: revokedBeforeState.totals.outstandingAmount,
    });
    const revokedPaymentsCount = await countProposalPayments(revokedSeed.proposalId);

    const concurrentSeed = await seedFinancialProposal({
      marker: `${markerBase}:concurrent`,
      status: "Утверждено",
      sentToAccountant: true,
      lines: [{ qty: 1, price: 100 }],
    });
    requestIds.push(concurrentSeed.requestId);
    proposalIds.push(concurrentSeed.proposalId);
    const concurrentBefore = await loadFinancialState(concurrentSeed.proposalId);
    const concurrentPayload = {
      proposalId: concurrentSeed.proposalId,
      amount: 30,
      allocations: [
        {
          proposal_item_id: concurrentSeed.proposalItems[0].proposalItemId,
          amount: 30,
        },
      ],
      expectedTotalPaid: concurrentBefore.totals.totalPaid,
      expectedOutstanding: concurrentBefore.totals.outstandingAmount,
    };
    const [concurrentLeft, concurrentRight] = await Promise.all([
      payInvoice(concurrentPayload),
      payInvoice(concurrentPayload),
    ]);
    const concurrentResults = [concurrentLeft, concurrentRight];
    const concurrentSuccesses = concurrentResults.filter(
      (result): result is Extract<ParsedPayResult, { ok: true }> => result.ok,
    );
    const concurrentFailures = concurrentResults.filter(
      (result): result is Extract<ParsedPayResult, { ok: false }> => !result.ok,
    );
    const concurrentAfter = await loadFinancialState(concurrentSeed.proposalId);
    const concurrentCanonical = await readCanonicalParity(concurrentSeed.proposalId);
    const concurrentParity = compareParity(concurrentAfter, concurrentCanonical);

    const idempotentSeed = await seedFinancialProposal({
      marker: `${markerBase}:idempotent`,
      status: "Утверждено",
      sentToAccountant: true,
      lines: [{ qty: 1, price: 100 }],
    });
    requestIds.push(idempotentSeed.requestId);
    proposalIds.push(idempotentSeed.proposalId);
    const idempotentBefore = await loadFinancialState(idempotentSeed.proposalId);
    const idempotentMutationId = `${markerBase}:idempotent-payment`;
    const idempotentPayload = {
      proposalId: idempotentSeed.proposalId,
      amount: 30,
      allocations: [
        {
          proposal_item_id: idempotentSeed.proposalItems[0].proposalItemId,
          amount: 30,
        },
      ],
      expectedTotalPaid: idempotentBefore.totals.totalPaid,
      expectedOutstanding: idempotentBefore.totals.outstandingAmount,
      clientMutationId: idempotentMutationId,
    };
    const idempotentFirst = await payInvoice(idempotentPayload);
    const idempotentReplay = await payInvoice(idempotentPayload);
    const idempotentConflict = await payInvoice({
      ...idempotentPayload,
      amount: 31,
      allocations: [
        {
          proposal_item_id: idempotentSeed.proposalItems[0].proposalItemId,
          amount: 31,
        },
      ],
    });
    const idempotentAfter = await loadFinancialState(idempotentSeed.proposalId);
    const idempotentPaymentsCount = await countProposalPayments(idempotentSeed.proposalId);

    const exceedSeed = await seedFinancialProposal({
      marker: `${markerBase}:exceeds`,
      status: "Утверждено",
      sentToAccountant: true,
      lines: [{ qty: 1, price: 100 }],
    });
    requestIds.push(exceedSeed.requestId);
    proposalIds.push(exceedSeed.proposalId);
    const exceedState = await loadFinancialState(exceedSeed.proposalId);
    const exceedsResult = await payInvoice({
      proposalId: exceedSeed.proposalId,
      amount: 120,
      expectedTotalPaid: exceedState.totals.totalPaid,
      expectedOutstanding: exceedState.totals.outstandingAmount,
    });

    let revokeAfterPayError: { message: string | null; code: string | null } | null = null;
    try {
      const revokeAfterResult = await admin
        .from("proposals")
        .update({ sent_to_accountant_at: null, payment_status: null })
        .eq("id", partialSeed.proposalId);
      if (revokeAfterResult.error) throw revokeAfterResult.error;
    } catch (error) {
      const payload = asRecord(error);
      revokeAfterPayError = {
        message: trim(payload.message) || (error instanceof Error ? error.message : String(error)),
        code: trim(payload.code) || null,
      };
    }
    const partialAfterBlockedRevoke = await loadFinancialState(partialSeed.proposalId);
    const partialCanonicalAfterBlockedRevoke = await readCanonicalParity(partialSeed.proposalId);

    const sourceScan = readSourceScan();

    const raceProof = {
      revokeBeforePay: {
        proposalId: revokedSeed.proposalId,
        rejected: !revokedPayResult.ok,
        failureCode: failureCodeOf(revokedPayResult),
        paymentsCountAfterRejectedPay: revokedPaymentsCount,
        noHalfSuccess: revokedPaymentsCount === 0,
      },
      concurrentPayment: {
        proposalId: concurrentSeed.proposalId,
        successCount: concurrentSuccesses.length,
        failureCount: concurrentFailures.length,
        failureCodes: concurrentFailures.map((result) => result.failureCode),
        controlledNoCorruption:
          concurrentSuccesses.length === 1 &&
          concurrentFailures.length === 1 &&
          concurrentFailures[0].failureCode === "stale_financial_state" &&
          approxEqual(concurrentAfter.totals.totalPaid, 30) &&
          approxEqual(concurrentAfter.totals.outstandingAmount, 70) &&
          concurrentParity.totalPaidMatch &&
          concurrentParity.outstandingMatch,
      },
      idempotentReplay: {
        proposalId: idempotentSeed.proposalId,
        clientMutationId: idempotentMutationId,
        firstOk: idempotentFirst.ok,
        replayOk: idempotentReplay.ok,
        samePaymentId:
          idempotentFirst.ok &&
          idempotentReplay.ok &&
          idempotentReplay.paymentId === idempotentFirst.paymentId,
        replayFlag: idempotentReplay.ok ? idempotentReplay.idempotentReplay : false,
        replayOutcome: idempotentReplay.outcome,
        conflictRejected: !idempotentConflict.ok,
        conflictCode: failureCodeOf(idempotentConflict),
        conflictOutcome: idempotentConflict.outcome,
        paymentsCount: idempotentPaymentsCount,
        totalPaidAfter: idempotentAfter.totals.totalPaid,
        noDuplicateEffect:
          idempotentFirst.ok &&
          idempotentReplay.ok &&
          idempotentReplay.paymentId === idempotentFirst.paymentId &&
          idempotentReplay.idempotentReplay === true &&
          !idempotentConflict.ok &&
          failureCodeOf(idempotentConflict) === "accounting_pay_invoice_v1_idempotency_conflict" &&
          idempotentPaymentsCount === 1 &&
          approxEqual(idempotentAfter.totals.totalPaid, 30),
      },
      revokeAfterCommittedPayment: {
        proposalId: partialSeed.proposalId,
        blocked: Boolean(revokeAfterPayError?.message),
        errorMessage: revokeAfterPayError?.message ?? null,
        errorCode: revokeAfterPayError?.code ?? null,
        stateStillApproved: trim(partialAfterBlockedRevoke.proposalStatus) === "Утверждено",
        stateStillSentToAccountant: Boolean(partialAfterBlockedRevoke.sentToAccountantAt),
        mirrorsStillCanonical:
          approxEqual(
            partialAfterBlockedRevoke.totals.totalPaid,
            partialCanonicalAfterBlockedRevoke.proposal.mirrorTotalPaid,
          ) &&
          trim(partialAfterBlockedRevoke.totals.paymentStatus) ===
            trim(partialCanonicalAfterBlockedRevoke.proposal.mirrorPaymentStatus),
      },
    };

    const dbTruthParity = {
      canonicalReadModel: {
        sourceKind: partialAfter.meta.sourceKind,
        backendTruth: partialAfter.meta.backendTruth,
      },
      partialAllocation: {
        proposalId: partialSeed.proposalId,
        totals: {
          server: partialAfter.totals,
          canonical: partialCanonical.totals,
          mirrors: partialCanonical.proposal,
        },
        parity: partialParity,
      },
      fullAllocation: {
        proposalId: fullSeed.proposalId,
        totals: {
          server: fullAfter.totals,
          canonical: fullCanonical.totals,
          mirrors: fullCanonical.proposal,
        },
        parity: fullParity,
      },
      sourceScan,
    };

    const summary = {
      status:
        partialPayment.ok &&
        fullPayment.ok &&
        !notApprovedResult.ok &&
        failureCodeOf(notApprovedResult) === "proposal_not_approved" &&
        !revokedPayResult.ok &&
        failureCodeOf(revokedPayResult) === "approval_revoked" &&
        !exceedsResult.ok &&
        failureCodeOf(exceedsResult) === "amount_exceeds_outstanding" &&
        raceProof.concurrentPayment.controlledNoCorruption &&
        raceProof.idempotentReplay.noDuplicateEffect &&
        raceProof.revokeAfterCommittedPayment.blocked &&
        raceProof.revokeAfterCommittedPayment.stateStillApproved &&
        raceProof.revokeAfterCommittedPayment.stateStillSentToAccountant &&
        partialParity.payableMatch &&
        partialParity.totalPaidMatch &&
        partialParity.outstandingMatch &&
        partialParity.paymentsCountMatch &&
        partialParity.mirrorTotalPaidMatch &&
        partialParity.mirrorPaymentStatusMatch &&
        partialParity.allItemParity &&
        fullParity.payableMatch &&
        fullParity.totalPaidMatch &&
        fullParity.outstandingMatch &&
        fullParity.paymentsCountMatch &&
        fullParity.mirrorTotalPaidMatch &&
        fullParity.mirrorPaymentStatusMatch &&
        fullParity.allItemParity &&
        sourceScan.paymentFormUsesServerTruthRpc &&
        sourceScan.paymentFormNoDirectProposalItemsFetch &&
        sourceScan.payActionsUsesAtomicRpc &&
        sourceScan.payActionsPassesClientMutationId &&
        sourceScan.payActionsNoLegacyPaidAgg &&
        sourceScan.payActionsNoClientDebtFormula &&
        sourceScan.legacyAddPaymentPathDisabled &&
        sourceScan.postSyncUsesServerTruthRpc &&
        sourceScan.historyFlowUsesServerTruthRpc &&
        sourceScan.noSilentCatchOnPayActions
          ? "GREEN"
          : "NOT GREEN",
      inventory: {
        paymentMutationOwner: "rpc:accounting_pay_invoice_v1",
        financialReadOwner: "rpc:accountant_proposal_financial_state_v1",
        dbGuard: "trigger:trg_guard_paid_proposal_financial_revocation_v1",
        clientPrimaryMathRemoved: sourceScan.payActionsNoClientDebtFormula,
      },
      scenarios: {
        happyPathApprovedProposal: {
          pass:
            partialPayment.ok &&
            partialParity.totalPaidMatch &&
            partialParity.outstandingMatch,
          proposalId: partialSeed.proposalId,
          paymentId: partialPayment.ok ? partialPayment.paymentId : null,
        },
        proposalNotApprovedRejected: {
          pass: !notApprovedResult.ok && failureCodeOf(notApprovedResult) === "proposal_not_approved",
          proposalId: notApprovedSeed.proposalId,
          failureCode: failureCodeOf(notApprovedResult),
        },
        approvalRevokedRejected: {
          pass: raceProof.revokeBeforePay.rejected && raceProof.revokeBeforePay.noHalfSuccess,
          proposalId: revokedSeed.proposalId,
          failureCode: failureCodeOf(revokedPayResult),
        },
        concurrentPaymentControlled: {
          pass: raceProof.concurrentPayment.controlledNoCorruption,
          proposalId: concurrentSeed.proposalId,
          failureCodes: raceProof.concurrentPayment.failureCodes,
        },
        idempotentReplayControlled: {
          pass: raceProof.idempotentReplay.noDuplicateEffect,
          proposalId: idempotentSeed.proposalId,
          clientMutationId: idempotentMutationId,
          replayOutcome: raceProof.idempotentReplay.replayOutcome,
          conflictCode: raceProof.idempotentReplay.conflictCode,
        },
        amountExceedsOutstandingRejected: {
          pass: !exceedsResult.ok && failureCodeOf(exceedsResult) === "amount_exceeds_outstanding",
          proposalId: exceedSeed.proposalId,
          failureCode: failureCodeOf(exceedsResult),
        },
        partialAllocationServerConsistent: {
          pass:
            partialParity.totalPaidMatch &&
            partialParity.outstandingMatch &&
            partialParity.allItemParity,
          proposalId: partialSeed.proposalId,
        },
        fullAllocationServerConsistent: {
          pass:
            fullParity.totalPaidMatch &&
            fullParity.outstandingMatch &&
            fullParity.allItemParity,
          proposalId: fullSeed.proposalId,
        },
        activePaymentFormServerOwned: {
          pass:
            sourceScan.paymentFormUsesServerTruthRpc &&
            sourceScan.paymentFormNoDirectProposalItemsFetch &&
            sourceScan.payActionsUsesAtomicRpc &&
            sourceScan.payActionsPassesClientMutationId &&
            sourceScan.payActionsNoClientDebtFormula,
        },
      },
      noSilentFail: {
        pass: sourceScan.noSilentCatchOnPayActions,
      },
    };

    writeJson("artifacts/financial-atomic-rpc-summary.json", summary);
    writeJson("artifacts/financial-race-proof.json", raceProof);
    writeJson("artifacts/financial-db-truth-parity.json", dbTruthParity);

    console.log(JSON.stringify(summary, null, 2));
    if (summary.status !== "GREEN") {
      process.exitCode = 1;
    }
  } finally {
    await cleanupSeedRows(requestIds, proposalIds).catch((error) => {
      console.error("[financial_atomic_rpc_verify][cleanup]", error);
      process.exitCode = 1;
    });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
