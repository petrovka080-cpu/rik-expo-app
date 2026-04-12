import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/database.types";
import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

const admin = createVerifierAdmin("fk-guard-verify") as SupabaseClient<Database>;

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const trim = (value: unknown) => String(value ?? "").trim();
const nowIsoDate = () => new Date().toISOString().slice(0, 10);

async function loadRuntimeModules() {
  const [
    supabaseClientMod,
    integrityGuardsMod,
    requestCanonicalReadMod,
    requestsMod,
    proposalsMod,
    accountantMod,
    buyerRepoMod,
    warehouseIssueRepoMod,
    observabilityMod,
    requestStatusMod,
  ] = await Promise.all([
    import("../src/lib/supabaseClient"),
    import("../src/lib/api/integrity.guards"),
    import("../src/lib/api/requestCanonical.read"),
    import("../src/lib/api/requests"),
    import("../src/lib/api/proposals"),
    import("../src/lib/api/accountant"),
    import("../src/screens/buyer/buyer.repo"),
    import("../src/screens/warehouse/warehouse.issue.repo"),
    import("../src/lib/observability/platformObservability"),
    import("../src/lib/api/requests.status"),
  ]);

  return {
    supabase: supabaseClientMod.supabase,
    IntegrityGuardError: integrityGuardsMod.IntegrityGuardError,
    filterPaymentRowsByExistingPaymentProposalLinks:
      integrityGuardsMod.filterPaymentRowsByExistingPaymentProposalLinks,
    filterProposalItemsByExistingRequestLinks:
      integrityGuardsMod.filterProposalItemsByExistingRequestLinks,
    filterProposalLinkedRowsByExistingProposalLinks:
      integrityGuardsMod.filterProposalLinkedRowsByExistingProposalLinks,
    filterRequestLinkedRowsByExistingRequestLinks:
      integrityGuardsMod.filterRequestLinkedRowsByExistingRequestLinks,
    loadCanonicalRequestItemsByRequestId:
      requestCanonicalReadMod.loadCanonicalRequestItemsByRequestId,
    addRequestItemFromRikDetailed: requestsMod.addRequestItemFromRikDetailed,
    listRequestItems: requestsMod.listRequestItems,
    proposalAddItems: proposalsMod.proposalAddItems,
    proposalItems: proposalsMod.proposalItems,
    accountantAddPaymentWithAllocations:
      accountantMod.accountantAddPaymentWithAllocations,
    repoUpdateProposalItems: buyerRepoMod.repoUpdateProposalItems,
    createWarehouseIssue: async (..._args: unknown[]) => ({
      data: null,
      error: new Error("createWarehouseIssue legacy path removed; warehouse issues use atomic RPC boundaries"),
    }),
    getPlatformObservabilityEvents: observabilityMod.getPlatformObservabilityEvents,
    resetPlatformObservabilityEvents: observabilityMod.resetPlatformObservabilityEvents,
    REQUEST_DRAFT_STATUS: requestStatusMod.REQUEST_DRAFT_STATUS,
  };
}

type RuntimeModules = Awaited<ReturnType<typeof loadRuntimeModules>>;

const codeOf = (runtime: RuntimeModules, error: unknown) =>
  error instanceof runtime.IntegrityGuardError
    ? error.code
    : typeof (error as { code?: unknown } | null)?.code === "string"
      ? String((error as { code?: unknown }).code)
      : null;

const isIntegrityGuardError = (runtime: RuntimeModules, error: unknown) =>
  error instanceof runtime.IntegrityGuardError ||
  trim((error as { name?: unknown } | null)?.name) === "IntegrityGuardError" ||
  typeof (error as { code?: unknown } | null)?.code === "string";

type RequestSeedRow = Pick<Database["public"]["Tables"]["requests"]["Row"], "id">;
type ProposalSeedRow = Pick<Database["public"]["Tables"]["proposals"]["Row"], "id" | "request_id">;
type ProposalItemLookupRow = Pick<Database["public"]["Tables"]["proposal_items"]["Row"], "id" | "request_item_id">;
type WarehouseIssueLookupRow = Pick<Database["public"]["Tables"]["warehouse_issues"]["Row"], "id">;
type AllocationLookupRow = Pick<
  Database["public"]["Tables"]["proposal_payment_allocations"]["Row"],
  "payment_id" | "proposal_item_id" | "amount"
>;

const missingRequestId = "00000000-0000-0000-0000-000000000001";
const missingProposalId = "00000000-0000-0000-0000-000000000002";
const missingRequestItemId = "00000000-0000-0000-0000-000000000003";

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

async function signInAppUser(runtime: RuntimeModules, user: RuntimeTestUser) {
  await runtime.supabase.auth.signOut().catch(() => {});
  const result = await runtime.supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (result.error || !result.data.session) {
    throw result.error ?? new Error(`Failed to sign in runtime user ${user.email}`);
  }
}

async function signOutAppUser(runtime: RuntimeModules) {
  await runtime.supabase.auth.signOut().catch(() => {});
}

async function insertRequest(
  runtime: RuntimeModules,
  userId: string,
  comment: string,
): Promise<RequestSeedRow> {
  const payload: Database["public"]["Tables"]["requests"]["Insert"] = {
    created_by: userId,
    status: runtime.REQUEST_DRAFT_STATUS,
    comment,
  };
  const result = await admin.from("requests").insert(payload).select("id").single<RequestSeedRow>();
  if (result.error) throw result.error;
  return result.data;
}

async function insertProposal(requestId: string, userId: string, supplier: string): Promise<ProposalSeedRow> {
  const payload: Database["public"]["Tables"]["proposals"]["Insert"] = {
    request_id: requestId,
    created_by: userId,
    status: "Черновик",
    supplier,
  };
  const result = await admin
    .from("proposals")
    .insert(payload)
    .select("id, request_id")
    .single<ProposalSeedRow>();
  if (result.error) throw result.error;
  return result.data;
}

async function getProposalItemId(proposalId: string, requestItemId: string): Promise<string> {
  const result = await admin
    .from("proposal_items")
    .select("id, request_item_id")
    .eq("proposal_id", proposalId)
    .eq("request_item_id", requestItemId)
    .maybeSingle<ProposalItemLookupRow>();
  if (result.error) throw result.error;
  const id = trim(result.data?.id);
  if (!id) throw new Error(`Missing proposal_item for proposal ${proposalId} and request_item ${requestItemId}`);
  return id;
}

async function markProposalAccountantReady(proposalId: string, amount: number, marker: string) {
  const result = await admin
    .from("proposals")
    .update({
      sent_to_accountant_at: new Date().toISOString(),
      invoice_number: `${marker}-INV`,
      invoice_date: nowIsoDate(),
      invoice_amount: amount,
      invoice_currency: "KGS",
    })
    .eq("id", proposalId);
  if (result.error) throw result.error;
}

async function findWarehouseIssueId(requestId: string, note: string): Promise<number | null> {
  const result = await admin
    .from("warehouse_issues")
    .select("id")
    .eq("request_id", requestId)
    .eq("note", note)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle<WarehouseIssueLookupRow>();
  if (result.error) throw result.error;
  const issueId = Number(result.data?.id ?? Number.NaN);
  return Number.isFinite(issueId) ? issueId : null;
}

async function ensurePaymentAllocation(paymentId: number, proposalItemId: string, amount: number) {
  const result = await admin
    .from("proposal_payment_allocations")
    .select("payment_id, proposal_item_id, amount")
    .eq("payment_id", paymentId)
    .eq("proposal_item_id", Number(proposalItemId))
    .maybeSingle<AllocationLookupRow>();
  if (result.error) throw result.error;
  const row = result.data;
  return (
    Number(row?.payment_id ?? Number.NaN) === paymentId &&
    trim(row?.proposal_item_id) === trim(proposalItemId) &&
    Number(row?.amount ?? 0) === amount
  );
}

async function expectIntegrityCode(
  runtime: RuntimeModules,
  label: string,
  fn: () => Promise<unknown>,
) {
  try {
    await fn();
    return {
      label,
      pass: false,
      code: null as string | null,
      message: "did_not_throw",
    };
  } catch (error) {
    return {
      label,
      pass: isIntegrityGuardError(runtime, error),
      code: codeOf(runtime, error),
      message: error instanceof Error ? error.message : String(error ?? ""),
    };
  }
}

async function cleanupCreatedEntities(params: {
  paymentIds: Set<number>;
  issueIds: Set<number>;
  proposalIds: Set<string>;
  requestIds: Set<string>;
}) {
  const paymentIds = [...params.paymentIds];
  if (paymentIds.length) {
    await admin.from("proposal_payment_allocations").delete().in("payment_id", paymentIds).throwOnError();
    await admin.from("proposal_payments").delete().in("id", paymentIds).throwOnError();
  }

  const issueIds = [...params.issueIds];
  if (issueIds.length) {
    await admin.from("warehouse_issue_items").delete().in("issue_id", issueIds).throwOnError();
    await admin.from("warehouse_issues").delete().in("id", issueIds).throwOnError();
  }

  const proposalIds = [...params.proposalIds];
  if (proposalIds.length) {
    await admin.from("proposal_items").delete().in("proposal_id", proposalIds).throwOnError();
    await admin.from("proposals").delete().in("id", proposalIds).throwOnError();
  }

  const requestIds = [...params.requestIds];
  if (requestIds.length) {
    await admin.from("request_items").delete().in("request_id", requestIds).throwOnError();
    await admin.from("requests").delete().in("id", requestIds).throwOnError();
  }
}

async function main() {
  const runtime = await loadRuntimeModules();
  const {
    supabase,
    addRequestItemFromRikDetailed,
    listRequestItems,
    loadCanonicalRequestItemsByRequestId,
    proposalAddItems,
    proposalItems,
    accountantAddPaymentWithAllocations,
    repoUpdateProposalItems,
    createWarehouseIssue,
    filterPaymentRowsByExistingPaymentProposalLinks,
    filterProposalItemsByExistingRequestLinks,
    filterProposalLinkedRowsByExistingProposalLinks,
    filterRequestLinkedRowsByExistingRequestLinks,
    getPlatformObservabilityEvents,
    resetPlatformObservabilityEvents,
  } = runtime;

  const marker = `fk-guard-${Date.now().toString(36)}`;
  const requestIds = new Set<string>();
  const proposalIds = new Set<string>();
  const issueIds = new Set<number>();
  const paymentIds = new Set<number>();
  const users: RuntimeTestUser[] = [];

  try {
    const foremanUser = await createTempUser(admin, {
      role: "foreman",
      fullName: "FK Guard Foreman",
      emailPrefix: "fk-guard-foreman",
      profile: { role: "foreman" },
      userProfile: {
        usage_build: true,
        usage_market: false,
        is_contractor: false,
      },
    });
    const buyerUser = await createTempUser(admin, {
      role: "buyer",
      fullName: "FK Guard Buyer",
      emailPrefix: "fk-guard-buyer",
      userProfile: {
        usage_market: true,
      },
    });
    const warehouseUser = await createTempUser(admin, {
      role: "warehouse",
      fullName: "FK Guard Warehouse",
      emailPrefix: "fk-guard-warehouse",
    });
    const accountantUser = await createTempUser(admin, {
      role: "accountant",
      fullName: "FK Guard Accountant",
      emailPrefix: "fk-guard-accountant",
    });
    users.push(foremanUser, buyerUser, warehouseUser, accountantUser);

    const requestA = await insertRequest(runtime, foremanUser.id, `${marker}:request-a`);
    const requestB = await insertRequest(runtime, foremanUser.id, `${marker}:request-b`);
    requestIds.add(trim(requestA.id));
    requestIds.add(trim(requestB.id));

    await signInAppUser(runtime, foremanUser);
    const requestItemA = await addRequestItemFromRikDetailed(trim(requestA.id), `MAT-${marker.toUpperCase()}-A`, 2, {
      name_human: `${marker}:item-a`,
      uom: "pcs",
      note: `${marker}:item-a`,
    });
    const requestItemB = await addRequestItemFromRikDetailed(trim(requestB.id), `MAT-${marker.toUpperCase()}-B`, 1, {
      name_human: `${marker}:item-b`,
      uom: "pcs",
      note: `${marker}:item-b`,
    });
    const invalidRequestWrite = await expectIntegrityCode(
      runtime,
      "invalid_request_item_request_link",
      () => addRequestItemFromRikDetailed(missingRequestId, `MAT-${marker.toUpperCase()}-MISS`, 1, {
        name_human: `${marker}:item-missing`,
        uom: "pcs",
      }),
    );
    const requestItemsForRequestA = await listRequestItems(trim(requestA.id));
    const canonicalRequestItems = await loadCanonicalRequestItemsByRequestId(admin, trim(requestA.id));

    await signInAppUser(runtime, buyerUser);
    const proposalA = await insertProposal(trim(requestA.id), buyerUser.id, `${marker}:proposal-a`);
    const proposalB = await insertProposal(trim(requestB.id), buyerUser.id, `${marker}:proposal-b`);
    proposalIds.add(trim(proposalA.id));
    proposalIds.add(trim(proposalB.id));

    const proposalAddCountA = await proposalAddItems(trim(proposalA.id), [requestItemA.item_id]);
    const proposalAddCountB = await proposalAddItems(trim(proposalB.id), [requestItemB.item_id]);
    const invalidProposalRequestItem = await expectIntegrityCode(
      runtime,
      "invalid_proposal_item_request_item_link",
      () => proposalAddItems(trim(proposalA.id), [missingRequestItemId]),
    );

    await repoUpdateProposalItems(supabase, trim(proposalA.id), [
      {
        request_item_id: requestItemA.item_id,
        price: 10,
        supplier: `${marker}:supplier`,
        note: `${marker}:proposal-item`,
      },
    ]);
    const invalidProposalLink = await expectIntegrityCode(
      runtime,
      "invalid_proposal_item_proposal_link",
      () =>
        repoUpdateProposalItems(supabase, missingProposalId, [
          {
            request_item_id: requestItemA.item_id,
            price: 11,
          },
        ]),
    );
    const proposalItemReadRows = await proposalItems(trim(proposalA.id));
    const proposalItemAId = await getProposalItemId(trim(proposalA.id), requestItemA.item_id);
    const proposalItemBId = await getProposalItemId(trim(proposalB.id), requestItemB.item_id);
    await markProposalAccountantReady(trim(proposalA.id), 10, marker);

    await signInAppUser(runtime, warehouseUser);
    const warehouseNote = `${marker}:issue`;
    const validWarehouseIssue = await createWarehouseIssue(supabase, {
      p_who: `${marker}:warehouse-user`,
      p_note: warehouseNote,
      p_request_id: trim(requestA.id),
      p_object_name: null,
      p_work_name: null,
    });
    if (validWarehouseIssue.error) throw validWarehouseIssue.error;
    const createdIssueId =
      Number(validWarehouseIssue.data ?? Number.NaN) ||
      Number(await findWarehouseIssueId(trim(requestA.id), warehouseNote) ?? Number.NaN);
    if (Number.isFinite(createdIssueId)) issueIds.add(createdIssueId);
    const invalidWarehouseIssue = await expectIntegrityCode(
      runtime,
      "invalid_warehouse_issue_request_link",
      () =>
        createWarehouseIssue(supabase, {
          p_who: `${marker}:warehouse-user`,
          p_note: `${marker}:issue-missing`,
          p_request_id: missingRequestId,
          p_object_name: null,
          p_work_name: null,
        }).then((result) => {
          if (result.error) throw result.error;
          return result;
        }),
    );

    await signInAppUser(runtime, accountantUser);
    const validPaymentId = await accountantAddPaymentWithAllocations({
      proposalId: trim(proposalA.id),
      amount: 10,
      accountantFio: "FK Guard Accountant",
      purpose: `${marker}:payment`,
      method: "bank",
      clientMutationId: `${marker}:payment-valid`,
      note: `${marker}:payment`,
      allocations: [{ proposal_item_id: proposalItemAId, amount: 10 }],
    });
    if (validPaymentId != null) paymentIds.add(validPaymentId);
    const invalidPaymentLink = await expectIntegrityCode(
      runtime,
      "invalid_payment_proposal_link",
      () =>
        accountantAddPaymentWithAllocations({
          proposalId: trim(proposalA.id),
          amount: 1,
          accountantFio: "FK Guard Accountant",
          purpose: `${marker}:payment-invalid`,
          method: "bank",
          clientMutationId: `${marker}:payment-invalid`,
          note: `${marker}:payment-invalid`,
          allocations: [{ proposal_item_id: proposalItemBId, amount: 1 }],
        }),
    );
    const paymentAllocationPass =
      validPaymentId != null
        ? await ensurePaymentAllocation(validPaymentId, proposalItemAId, 10)
        : false;

    resetPlatformObservabilityEvents();
    const requestReadFilter = await filterRequestLinkedRowsByExistingRequestLinks(
      admin,
      [
        { id: "request-valid-row", request_id: trim(requestA.id) },
        { id: "request-orphan-row", request_id: missingRequestId },
      ],
      {
        screen: "request",
        surface: "fk_guard_verify_request_read",
        sourceKind: "verify:request_read",
        relation: "request_items.request_id->requests.id",
      },
    );
    const proposalReadFilter = await filterProposalLinkedRowsByExistingProposalLinks(
      admin,
      [
        { id: "proposal-valid-row", proposal_id: trim(proposalA.id) },
        { id: "proposal-orphan-row", proposal_id: missingProposalId },
      ],
      {
        screen: "accountant",
        surface: "fk_guard_verify_proposal_read",
        sourceKind: "verify:proposal_read",
        relation: "accountant_inbox.proposal_id->proposals.id",
      },
    );
    const paymentReadFilter = await filterPaymentRowsByExistingPaymentProposalLinks(
      admin,
      [
        { id: "payment-valid-row", payment_id: String(validPaymentId ?? ""), proposal_id: trim(proposalA.id) },
        { id: "payment-phantom-row", payment_id: String(validPaymentId ?? ""), proposal_id: trim(proposalB.id) },
      ],
      {
        screen: "accountant",
        surface: "fk_guard_verify_payment_read",
        sourceKind: "verify:payment_read",
        relation: "proposal_payments.id+proposal_id",
      },
    );
    const proposalItemReadFilter = await filterProposalItemsByExistingRequestLinks(
      admin,
      [
        {
          id: 1,
          request_item_id: requestItemA.item_id,
          rik_code: `MAT-${marker.toUpperCase()}-READ`,
          name_human: "valid",
          uom: "pcs",
          app_code: null,
          total_qty: 1,
          price: 10,
          note: null,
          supplier: null,
        },
        {
          id: 2,
          request_item_id: missingRequestItemId,
          rik_code: `MAT-${marker.toUpperCase()}-READ-MISS`,
          name_human: "missing",
          uom: "pcs",
          app_code: null,
          total_qty: 1,
          price: 10,
          note: null,
          supplier: null,
        },
      ],
      {
        screen: "buyer",
        surface: "fk_guard_verify_proposal_items_read",
        sourceKind: "verify:proposal_items_read",
        proposalId: trim(proposalA.id),
      },
    );
    const orphanEvents = getPlatformObservabilityEvents().filter(
      (event) => event.event === "fk_guard_orphan_rows_dropped",
    );

    const requestsText = readText("src/lib/api/requests.ts");
    const foremanHelpersText = readText("src/screens/foreman/foreman.helpers.ts");
    const buyerRepoText = readText("src/screens/buyer/buyer.repo.ts");
    const warehouseRepoText = readText("src/screens/warehouse/warehouse.issue.repo.ts");
    const accountantText = readText("src/lib/api/accountant.ts");
    const accountantPayActionsText = readText("src/screens/accountant/useAccountantPayActions.ts");
    const canonicalReadText = readText("src/lib/api/requestCanonical.read.ts");
    const catalogRequestText = readText("src/lib/catalog/catalog.request.service.ts");
    const accountantInboxText = readText("src/screens/accountant/accountant.inbox.service.ts");
    const accountantHistoryText = readText("src/screens/accountant/accountant.history.service.ts");

    const structural = {
      requestItemWriteGuardPresent:
        requestsText.includes("surface: \"add_request_item\"") &&
        requestsText.includes("ensureRequestExists(client, rid"),
      foremanDelegatesToLowLevelBoundary:
        foremanHelpersText.includes("addRequestItemFromRikDetailed(rid, rik_code, qtyAdd"),
      buyerRepoProposalGuardPresent:
        buyerRepoText.includes("surface: \"repo_update_proposal_items\"") &&
        buyerRepoText.includes("ensureProposalRequestItemsIntegrity"),
      warehouseIssueRepoGuardPresent:
        warehouseRepoText.includes("surface: \"create_warehouse_issue\"") &&
        warehouseRepoText.includes("ensureRequestExists"),
      accountantAllocationGuardPresent:
        accountantText.includes("ensureProposalItemIdsBelongToProposal") &&
        accountantText.includes("surface: \"add_payment_allocated\"") &&
        accountantPayActionsText.includes("accountantAddPaymentWithAllocations"),
      canonicalRequestReadFilterPresent:
        canonicalReadText.includes("filterRequestLinkedRowsByExistingRequestLinks"),
      catalogRequestReadFilterPresent:
        catalogRequestText.includes("surface: \"catalog_list_request_items\"") &&
        catalogRequestText.includes("filterRequestLinkedRowsByExistingRequestLinks"),
      accountantInboxReadFilterPresent:
        accountantInboxText.includes("filterProposalLinkedRowsByExistingProposalLinks"),
      accountantHistoryReadFilterPresent:
        accountantHistoryText.includes("filterPaymentRowsByExistingPaymentProposalLinks"),
    };

    const runtimeChecks = {
      validRequestItemRequestLinkPass:
        !!trim(requestItemA.item_id) &&
        requestItemsForRequestA.some((row) => trim(row.id) === trim(requestItemA.item_id)) &&
        canonicalRequestItems.some((row) => trim(row.id) === trim(requestItemA.item_id)),
      invalidRequestItemRequestLinkRejected: invalidRequestWrite.code === "missing_request",
      validProposalItemRequestItemLinkPass:
        Number(proposalAddCountA) > 0 &&
        proposalItemReadRows.some((row) => trim(row.request_item_id) === trim(requestItemA.item_id)),
      invalidProposalItemRequestItemLinkRejected:
        invalidProposalRequestItem.code === "missing_request_items",
      validProposalItemProposalLinkPass:
        Number(proposalAddCountB) > 0 &&
        !!trim(proposalItemAId),
      invalidProposalItemProposalLinkRejected:
        invalidProposalLink.code === "missing_proposal",
      validWarehouseIssueRequestLinkPass: Number.isFinite(createdIssueId),
      invalidWarehouseIssueRequestLinkRejected:
        invalidWarehouseIssue.code === "missing_request",
      validPaymentProposalLinkPass:
        Number.isFinite(validPaymentId ?? Number.NaN) && paymentAllocationPass,
      invalidPaymentProposalLinkRejected:
        invalidPaymentLink.code === "mismatched_proposal_items",
      corruptedReadRowFiltered:
        requestReadFilter.rows.length === 1 &&
        proposalReadFilter.rows.length === 1 &&
        paymentReadFilter.rows.length === 1 &&
        proposalItemReadFilter.rows.length === 1 &&
        proposalItemReadFilter.droppedRequestItemIds.length === 1,
      orphanObservabilityCaptured:
        orphanEvents.length >= 4 &&
        orphanEvents.some((event) => trim(event.extra?.relation) === "request_items.request_id->requests.id") &&
        orphanEvents.some((event) => trim(event.extra?.relation) === "accountant_inbox.proposal_id->proposals.id") &&
        orphanEvents.some((event) => trim(event.extra?.relation) === "proposal_payments.id+proposal_id"),
      validBusinessFlowsPass:
        requestItemsForRequestA.length > 0 &&
        canonicalRequestItems.length > 0 &&
        proposalItemReadRows.length > 0,
    };

    const matrix = [
      {
        link: "request_items.request_id -> requests.id",
        parent: "requests",
        child: "request_items",
        writeOwners: [
          "src/lib/api/requests.ts:addRequestItemFromRikDetailed",
          "src/screens/foreman/foreman.helpers.ts:requestItemAddOrIncAndPatchMeta",
        ],
        readOwners: [
          "src/lib/api/requestCanonical.read.ts:loadCanonicalRequestItemsByRequestId",
          "src/lib/catalog/catalog.request.service.ts:listRequestItems",
        ],
        guardBoundary: {
          write: "ensureRequestExists",
          read: "filterRequestLinkedRowsByExistingRequestLinks",
        },
        validPass: runtimeChecks.validRequestItemRequestLinkPass,
        invalidRejectCode: invalidRequestWrite.code,
      },
      {
        link: "proposal_items.request_item_id -> request_items.id",
        parent: "request_items",
        child: "proposal_items",
        writeOwners: [
          "src/lib/api/proposals.ts:proposalAddItems",
          "src/lib/api/proposals.ts:proposalSetItemsMeta",
          "src/lib/catalog/catalog.proposalCreation.service.ts:linkProposalItemsStage",
          "src/screens/buyer/buyer.repo.ts:repoUpdateProposalItems",
        ],
        readOwners: [
          "src/lib/api/proposals.ts:proposalItems",
        ],
        guardBoundary: {
          write: "ensureProposalRequestItemsIntegrity",
          read: "filterProposalItemsByExistingRequestLinks",
        },
        validPass: runtimeChecks.validProposalItemRequestItemLinkPass,
        invalidRejectCode: invalidProposalRequestItem.code,
      },
      {
        link: "proposal_items.proposal_id -> proposals.id",
        parent: "proposals",
        child: "proposal_items",
        writeOwners: [
          "src/lib/api/proposals.ts:proposalSetItemsMeta",
          "src/lib/catalog/catalog.proposalCreation.service.ts:completeProposalCreationStage",
          "src/screens/buyer/buyer.repo.ts:repoUpdateProposalItems",
        ],
        readOwners: [
          "src/screens/accountant/accountant.inbox.service.ts:loadAccountantInboxWindowData",
        ],
        guardBoundary: {
          write: "ensureProposalExists / ensureProposalRequestItemsIntegrity",
          read: "filterProposalLinkedRowsByExistingProposalLinks",
        },
        validPass: runtimeChecks.validProposalItemProposalLinkPass,
        invalidRejectCode: invalidProposalLink.code,
      },
      {
        link: "warehouse_issues.request_id -> requests.id",
        parent: "requests",
        child: "warehouse_issues",
        writeOwners: [
          "src/screens/warehouse/warehouse.issue.repo.ts:createWarehouseIssue",
          "src/screens/warehouse/warehouse.issue.ts:submitReqPick",
          "src/screens/warehouse/warehouse.issue.ts:issueByRequestItem",
        ],
        readOwners: [
          "src/screens/warehouse/warehouse.requests.read.ts",
        ],
        guardBoundary: {
          write: "ensureRequestExists / ensureRequestItemsBelongToRequest",
          read: "warehouse canonical read path",
        },
        validPass: runtimeChecks.validWarehouseIssueRequestLinkPass,
        invalidRejectCode: invalidWarehouseIssue.code,
      },
      {
        link: "proposal_payment_allocations.proposal_item_id -> proposal_items.id / proposal_payments.proposal_id -> proposals.id",
        parent: "proposal_items + proposals",
        child: "proposal_payment_allocations + proposal_payments",
        writeOwners: [
          "src/lib/api/accountant.ts:accountantAddPaymentWithAllocations",
          "src/screens/accountant/useAccountantPayActions.ts",
        ],
        readOwners: [
          "src/screens/accountant/accountant.history.service.ts:loadAccountantHistoryWindowData",
        ],
        guardBoundary: {
          write: "ensureProposalExists / ensureProposalItemIdsBelongToProposal",
          read: "filterPaymentRowsByExistingPaymentProposalLinks",
        },
        validPass: runtimeChecks.validPaymentProposalLinkPass,
        invalidRejectCode: invalidPaymentLink.code,
      },
    ];

    const orphanProof = {
      requestReadFilter,
      proposalReadFilter,
      paymentReadFilter,
      proposalItemReadFilter,
      observabilityEvents: orphanEvents.map((event) => ({
        screen: event.screen,
        surface: event.surface,
        sourceKind: event.sourceKind ?? null,
        relation: trim(event.extra?.relation) || null,
        linkType: trim(event.extra?.linkType) || null,
        droppedRowIds: Array.isArray(event.extra?.droppedRowIds) ? event.extra?.droppedRowIds : [],
        droppedRequestIds: Array.isArray(event.extra?.droppedRequestIds) ? event.extra?.droppedRequestIds : [],
        droppedProposalIds: Array.isArray(event.extra?.droppedProposalIds) ? event.extra?.droppedProposalIds : [],
        droppedPaymentIds: Array.isArray(event.extra?.droppedPaymentIds) ? event.extra?.droppedPaymentIds : [],
      })),
    };

    const summary = {
      status:
        Object.values(structural).every(Boolean) &&
        Object.values(runtimeChecks).every(Boolean)
          ? "GREEN"
          : "NOT GREEN",
      structural,
      runtime: runtimeChecks,
      details: {
        invalidRequestWrite,
        invalidProposalRequestItem,
        invalidProposalLink,
        invalidWarehouseIssue,
        invalidPaymentLink,
        validPaymentId: validPaymentId ?? null,
        createdIssueId: Number.isFinite(createdIssueId) ? createdIssueId : null,
      },
    };

    writeJson("artifacts/fk-guard-summary.json", summary);
    writeJson("artifacts/integrity-link-validation-matrix.json", {
      status: summary.status,
      matrix,
    });
    writeJson("artifacts/orphan-detection-proof.json", {
      status:
        runtimeChecks.corruptedReadRowFiltered && runtimeChecks.orphanObservabilityCaptured
          ? "GREEN"
          : "NOT GREEN",
      proof: orphanProof,
    });

    console.log(JSON.stringify(summary, null, 2));
    if (summary.status !== "GREEN") process.exitCode = 1;
  } finally {
    await signOutAppUser(runtime).catch(() => {});
    await cleanupCreatedEntities({ paymentIds, issueIds, proposalIds, requestIds }).catch(() => {});
    for (const user of users.reverse()) {
      await cleanupTempUser(admin, user).catch(() => {});
    }
  }
}

void main();
