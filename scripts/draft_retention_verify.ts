import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

import type { Database, Json } from "../src/lib/database.types";
import { REQUEST_DRAFT_STATUS, REQUEST_PENDING_EN } from "../src/lib/api/requests.status";
import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) loadDotenv({ path: fullPath, override: false });
}

const admin = createVerifierAdmin("draft-retention-verify");

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const trim = (value: unknown) => String(value ?? "").trim();

type RequestsInsert = Database["public"]["Tables"]["requests"]["Insert"];
type RequestRow = Pick<
  Database["public"]["Tables"]["requests"]["Row"],
  "id" | "comment" | "created_at" | "updated_at" | "submitted_at" | "status"
>;
type ProposalRow = Pick<Database["public"]["Tables"]["proposals"]["Row"], "id" | "request_id">;
type WarehouseIssueRow = Pick<Database["public"]["Tables"]["warehouse_issues"]["Row"], "id" | "request_id">;

type DraftGcPayload = {
  candidate_count?: unknown;
  cutoff_before?: unknown;
  deleted_count?: unknown;
  deleted_ids?: unknown;
  inspected_draft_count?: unknown;
  limit?: unknown;
  linked_guardrails?: unknown;
  older_than_days?: unknown;
  skipped?: unknown;
  truly_empty_count?: unknown;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => trim(entry)).filter(Boolean);
};

const toInteger = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseJsonObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

const parseGcPayload = (value: Json | null): DraftGcPayload => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as DraftGcPayload;
};

async function insertDraftRequest(params: {
  userId: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
}): Promise<RequestRow> {
  const payload: RequestsInsert = {
    status: REQUEST_DRAFT_STATUS,
    created_by: params.userId,
    comment: params.comment,
    created_at: params.createdAt,
    updated_at: params.updatedAt,
    submitted_at: params.submittedAt ?? null,
  };
  const result = await admin
    .from("requests")
    .insert(payload)
    .select("id, comment, created_at, updated_at, submitted_at, status")
    .single<RequestRow>();
  if (result.error) throw result.error;
  return result.data;
}

async function insertDraftItem(requestId: string, marker: string) {
  const payload: Database["public"]["Tables"]["request_items"]["Insert"] = {
    request_id: requestId,
    rik_code: `TEST-DRAFT-RETENTION-${Date.now().toString(36)}`,
    name_human: `${marker} item`,
    qty: 1,
    uom: "pcs",
    status: REQUEST_DRAFT_STATUS,
  };
  const result = await admin.from("request_items").insert(payload).select("id").single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data?.id);
}

async function insertProposal(params: {
  requestId: string;
  requestItemId: string;
  marker: string;
}): Promise<ProposalRow> {
  const create = await admin.rpc("proposal_create");
  if (create.error) throw create.error;

  const proposalId = trim(create.data);
  if (!proposalId) throw new Error("proposal_create returned empty id");

  const addItems = await admin.rpc("proposal_add_items", {
    p_proposal_id_text: proposalId,
    p_request_item_ids: [params.requestItemId],
  });
  if (addItems.error) throw addItems.error;

  const result = await admin
    .from("proposals")
    .update({
      request_id: params.requestId,
      status: "submitted",
      supplier: `${params.marker} supplier`,
    })
    .eq("id", proposalId)
    .select("id, request_id")
    .single<ProposalRow>();
  if (result.error) throw result.error;
  return result.data;
}

async function insertProposalPayment(proposalId: string, marker: string) {
  const payload: Database["public"]["Tables"]["proposal_payments"]["Insert"] = {
    proposal_id: proposalId,
    amount: 1,
    currency: "KGS",
    note: `${marker}:payment`,
    paid_at: new Date().toISOString(),
  };
  const result = await admin.from("proposal_payments").insert(payload).select("id").single<{ id: number }>();
  if (result.error) throw result.error;
  return Number(result.data?.id ?? 0);
}

async function insertWarehouseIssue(requestId: string, marker: string): Promise<WarehouseIssueRow> {
  const created = await admin.rpc("issue_via_ui", {
    p_who: `${marker} warehouse`,
    p_note: `${marker}:warehouse-issue`,
    p_request_id: requestId,
    p_object_name: `${marker} object`,
    p_work_name: `${marker} work`,
  });
  if (created.error) throw created.error;

  const issueId = Number(created.data ?? 0);
  if (!Number.isFinite(issueId) || issueId <= 0) {
    throw new Error("issue_via_ui returned invalid issue id");
  }

  const result = await admin
    .from("warehouse_issues")
    .select("id, request_id")
    .eq("id", issueId)
    .single<WarehouseIssueRow>();
  if (result.error) throw result.error;
  return result.data;
}

async function countRequestsByUser(userId: string): Promise<number> {
  const result = await admin.from("requests").select("id", { head: true, count: "exact" }).eq("created_by", userId);
  if (result.error) throw result.error;
  return result.count ?? 0;
}

async function readRequestsByIds(ids: string[]): Promise<RequestRow[]> {
  const filtered = ids.map(trim).filter(Boolean);
  if (!filtered.length) return [];
  const result = await admin
    .from("requests")
    .select("id, comment, created_at, updated_at, submitted_at, status")
    .in("id", filtered);
  if (result.error) throw result.error;
  return (result.data ?? []) as RequestRow[];
}

async function cleanupSeedRows(userId: string) {
  const requestsResult = await admin.from("requests").select("id").eq("created_by", userId);
  if (requestsResult.error) throw requestsResult.error;

  const requestIds = (requestsResult.data ?? []).map((row) => trim((row as { id?: unknown }).id)).filter(Boolean);
  if (!requestIds.length) return;

  const proposalsResult = await admin.from("proposals").select("id").in("request_id", requestIds);
  if (proposalsResult.error) throw proposalsResult.error;
  const proposalIds = (proposalsResult.data ?? []).map((row) => trim((row as { id?: unknown }).id)).filter(Boolean);

  if (proposalIds.length) {
    const deletePayments = await admin.from("proposal_payments").delete().in("proposal_id", proposalIds);
    if (deletePayments.error) throw deletePayments.error;
  }

  const deleteProposals = await admin.from("proposals").delete().in("request_id", requestIds);
  if (deleteProposals.error) throw deleteProposals.error;

  const deleteIssues = await admin.from("warehouse_issues").delete().in("request_id", requestIds);
  if (deleteIssues.error) throw deleteIssues.error;

  const deleteItems = await admin.from("request_items").delete().in("request_id", requestIds);
  if (deleteItems.error) throw deleteItems.error;

  const deleteRequests = await admin.from("requests").delete().in("id", requestIds);
  if (deleteRequests.error) throw deleteRequests.error;
}

async function signInTempUser(user: RuntimeTestUser, supabaseClient: typeof import("../src/lib/supabaseClient").supabase) {
  await supabaseClient.auth.signOut().catch(() => {});
  const signIn = await supabaseClient.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (signIn.error || !signIn.data.session) {
    throw signIn.error ?? new Error("Failed to sign in temp foreman user");
  }
}

async function main() {
  let user: RuntimeTestUser | null = null;
  const marker = `[draft-retention:${Date.now().toString(36)}]`;

  const { supabase } = await import("../src/lib/supabaseClient");
  const requestsApi = await import("../src/lib/api/requests");
  const catalogApi = await import("../src/lib/catalog_api");

  try {
    user = await createTempUser(admin, {
      role: "foreman",
      fullName: "Draft Retention Verify",
      emailPrefix: "draft-retention",
      userProfile: {
        usage_build: true,
      },
    });

    const oldIso = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const recentIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const oldEmpty = await insertDraftRequest({
      userId: user.id,
      comment: `${marker}:old-empty`,
      createdAt: oldIso,
      updatedAt: oldIso,
    });
    const recentEmpty = await insertDraftRequest({
      userId: user.id,
      comment: `${marker}:recent-empty`,
      createdAt: recentIso,
      updatedAt: recentIso,
    });
    const oldWithItems = await insertDraftRequest({
      userId: user.id,
      comment: `${marker}:old-with-items`,
      createdAt: oldIso,
      updatedAt: oldIso,
    });
    const oldWithHistory = await insertDraftRequest({
      userId: user.id,
      comment: `${marker}:old-with-history`,
      createdAt: oldIso,
      updatedAt: oldIso,
      submittedAt: oldIso,
    });
    const oldWithProposal = await insertDraftRequest({
      userId: user.id,
      comment: `${marker}:old-with-proposal`,
      createdAt: oldIso,
      updatedAt: oldIso,
    });
    const oldWithWarehouseIssue = await insertDraftRequest({
      userId: user.id,
      comment: `${marker}:old-with-warehouse-issue`,
      createdAt: oldIso,
      updatedAt: oldIso,
    });
    const oldWithPaymentLinks = await insertDraftRequest({
      userId: user.id,
      comment: `${marker}:old-with-payment-links`,
      createdAt: oldIso,
      updatedAt: oldIso,
    });

    const oldWithItemsItemId = await insertDraftItem(trim(oldWithItems.id), marker);
    const oldProposalBootstrapItemId = await insertDraftItem(trim(oldWithProposal.id), `${marker}:proposal-link`);
    const oldProposalRow = await insertProposal({
      requestId: trim(oldWithProposal.id),
      requestItemId: oldProposalBootstrapItemId,
      marker,
    });
    const oldWarehouseIssueRow = await insertWarehouseIssue(trim(oldWithWarehouseIssue.id), marker);
    const oldPaymentBootstrapItemId = await insertDraftItem(trim(oldWithPaymentLinks.id), `${marker}:payment-link`);
    const oldPaymentProposal = await insertProposal({
      requestId: trim(oldWithPaymentLinks.id),
      requestItemId: oldPaymentBootstrapItemId,
      marker,
    });
    const oldPaymentId = await insertProposalPayment(trim(oldPaymentProposal.id), marker);

    const totalBeforeReuse = await countRequestsByUser(user.id);

    await signInTempUser(user, supabase);
    requestsApi.clearCachedDraftRequestId();
    catalogApi.clearLocalDraftId();

    const directCreateResult = await requestsApi.requestCreateDraft({
      comment: `${marker}:reused-by-requestCreateDraft`,
      foreman_name: "Draft Retention Verify",
    });
    const directCreateRequestId = trim(directCreateResult?.id);
    const directCreateAppliedMeta = trim(directCreateResult?.comment) === `${marker}:reused-by-requestCreateDraft`;

    requestsApi.clearCachedDraftRequestId();
    catalogApi.clearLocalDraftId();
    const lowLevelReuseId = trim(await requestsApi.getOrCreateDraftRequestId());

    catalogApi.clearLocalDraftId();
    requestsApi.clearCachedDraftRequestId();
    const compatReuseId = trim(await catalogApi.getOrCreateDraftRequestId());

    requestsApi.clearCachedDraftRequestId();
    const compatHotReloadId = trim(await catalogApi.getOrCreateDraftRequestId());

    await supabase.auth.signOut().catch(() => {});
    requestsApi.clearCachedDraftRequestId();
    await signInTempUser(user, supabase);
    const compatAfterSessionLossId = trim(await catalogApi.getOrCreateDraftRequestId());

    const totalAfterReuse = await countRequestsByUser(user.id);

    const firstGcResult = await admin.rpc("request_gc_empty_drafts_v1", {
      p_older_than_days: 7,
      p_limit: 50,
    });
    if (firstGcResult.error) throw firstGcResult.error;
    const firstGcPayload = parseGcPayload(firstGcResult.data ?? null);
    const firstDeletedIds = toStringArray(firstGcPayload.deleted_ids);

    const seededRequestIds = [
      trim(oldEmpty.id),
      trim(recentEmpty.id),
      trim(oldWithItems.id),
      trim(oldWithHistory.id),
      trim(oldWithProposal.id),
      trim(oldWithWarehouseIssue.id),
      trim(oldWithPaymentLinks.id),
    ];
    const requestsAfterFirstGc = await readRequestsByIds(seededRequestIds);
    const remainingAfterFirstGcIds = new Set(requestsAfterFirstGc.map((row) => trim(row.id)));
    const totalAfterFirstGc = await countRequestsByUser(user.id);

    const secondGcResult = await admin.rpc("request_gc_empty_drafts_v1", {
      p_older_than_days: 7,
      p_limit: 50,
    });
    if (secondGcResult.error) throw secondGcResult.error;
    const secondGcPayload = parseGcPayload(secondGcResult.data ?? null);

    const submitItemId = await insertDraftItem(trim(recentEmpty.id), `${marker}:submit`);
    const submitResult = await requestsApi.requestSubmitMutation(trim(recentEmpty.id));
    const submitStatus = trim(submitResult.record?.status ?? null).toLowerCase();

    requestsApi.clearCachedDraftRequestId();
    const createdAfterSubmitId = trim(await catalogApi.getOrCreateDraftRequestId());
    const totalAfterSubmitCreate = await countRequestsByUser(user.id);

    const reopenResult = await requestsApi.requestReopen(trim(recentEmpty.id));
    const reopenedId = trim(reopenResult?.id);
    const reopenedStatus = trim(reopenResult?.status ?? null);

    const thirdGcResult = await admin.rpc("request_gc_empty_drafts_v1", {
      p_older_than_days: 7,
      p_limit: 50,
    });
    if (thirdGcResult.error) throw thirdGcResult.error;
    const thirdGcPayload = parseGcPayload(thirdGcResult.data ?? null);

    const requestsAfterThirdGc = await readRequestsByIds([trim(recentEmpty.id), createdAfterSubmitId]);
    const remainingAfterThirdGcIds = new Set(requestsAfterThirdGc.map((row) => trim(row.id)));

    const structural = {
      retentionMigrationPresent: fs.existsSync(
        path.join(projectRoot, "supabase/migrations/20260329213000_request_empty_draft_retention_policy_v2.sql"),
      ),
      lowLevelRequestCreateUsesReuseProbe: fs
        .readFileSync(path.join(projectRoot, "src/lib/api/requests.ts"), "utf8")
        .includes("const reusableId = await findReusableEmptyDraftRequestId();"),
      lowLevelGetOrCreateValidatesCachedId: fs
        .readFileSync(path.join(projectRoot, "src/lib/api/requests.ts"), "utf8")
        .includes("const valid = await isCachedDraftRequestIdValid(_draftRequestIdAny);"),
      compatGetOrCreateDelegatesToLowLevel: fs
        .readFileSync(path.join(projectRoot, "src/lib/catalog/catalog.request.service.ts"), "utf8")
        .includes("const resolved = await getOrCreateLowLevelDraftRequestId();"),
    };

    const gcSkipped = parseJsonObject(firstGcPayload.skipped);
    const gcGuardrails = parseJsonObject(firstGcPayload.linked_guardrails);

    const safetyMatrix = {
      cases: [
        {
          case: "empty_old_draft",
          requestId: trim(oldEmpty.id),
          expected: "deleted",
          observed: firstDeletedIds.includes(trim(oldEmpty.id)) && !remainingAfterFirstGcIds.has(trim(oldEmpty.id)) ? "deleted" : "preserved",
        },
        {
          case: "empty_recent_draft",
          requestId: trim(recentEmpty.id),
          expected: "preserved",
          observed: remainingAfterFirstGcIds.has(trim(recentEmpty.id)) ? "preserved" : "deleted",
        },
        {
          case: "draft_with_items",
          requestId: trim(oldWithItems.id),
          expected: "preserved",
          observed: remainingAfterFirstGcIds.has(trim(oldWithItems.id)) ? "preserved" : "deleted",
          requestItemId: oldWithItemsItemId,
        },
        {
          case: "draft_with_history",
          requestId: trim(oldWithHistory.id),
          expected: "preserved",
          observed: remainingAfterFirstGcIds.has(trim(oldWithHistory.id)) ? "preserved" : "deleted",
        },
        {
          case: "draft_with_proposal",
          requestId: trim(oldWithProposal.id),
          expected: "preserved",
          observed: remainingAfterFirstGcIds.has(trim(oldWithProposal.id)) ? "preserved" : "deleted",
          proposalId: trim(oldProposalRow.id),
          bootstrapItemId: oldProposalBootstrapItemId,
        },
        {
          case: "draft_with_warehouse_issue",
          requestId: trim(oldWithWarehouseIssue.id),
          expected: "preserved",
          observed: remainingAfterFirstGcIds.has(trim(oldWithWarehouseIssue.id)) ? "preserved" : "deleted",
          warehouseIssueId: String(oldWarehouseIssueRow.id),
        },
        {
          case: "draft_with_payment_links",
          requestId: trim(oldWithPaymentLinks.id),
          expected: "preserved",
          observed: remainingAfterFirstGcIds.has(trim(oldWithPaymentLinks.id)) ? "preserved" : "deleted",
          proposalId: trim(oldPaymentProposal.id),
          paymentId: oldPaymentId,
          bootstrapItemId: oldPaymentBootstrapItemId,
        },
      ],
      cleanup: {
        olderThanDays: toInteger(firstGcPayload.older_than_days),
        limit: toInteger(firstGcPayload.limit),
        inspectedDraftCount: toInteger(firstGcPayload.inspected_draft_count),
        trulyEmptyCount: toInteger(firstGcPayload.truly_empty_count),
        candidateCount: toInteger(firstGcPayload.candidate_count),
        deletedCount: toInteger(firstGcPayload.deleted_count),
        skipped: gcSkipped,
        linkedGuardrails: gcGuardrails,
        secondCleanupDeletedCount: toInteger(secondGcPayload.deleted_count),
        thirdCleanupDeletedCount: toInteger(thirdGcPayload.deleted_count),
      },
    };

    const reuseVsCreateProof = {
      totalBeforeReuse,
      totalAfterReuse,
      totalAfterFirstGc,
      totalAfterSubmitCreate,
      requestCreateDraft: {
        requestId: directCreateRequestId,
        reusedExistingDraft: directCreateRequestId === trim(recentEmpty.id),
        appliedMeta: directCreateAppliedMeta,
        createdNoAdditionalDraft: totalBeforeReuse === totalAfterReuse,
      },
      getOrCreateDraftRequestId: {
        lowLevelReuseId,
        compatReuseId,
        compatHotReloadId,
        compatAfterSessionLossId,
        reusedExistingDraft:
          lowLevelReuseId === trim(recentEmpty.id)
          && compatReuseId === trim(recentEmpty.id)
          && compatHotReloadId === trim(recentEmpty.id)
          && compatAfterSessionLossId === trim(recentEmpty.id),
      },
      submitRollover: {
        submittedRequestId: trim(submitResult.request_id),
        submitStatus,
        submitTransitionedToPending:
          submitStatus === REQUEST_PENDING_EN || submitStatus.includes("утверж") || submitStatus.includes("на "),
        submitItemId,
        createdAfterSubmitId,
        createdAfterSubmitIsNew:
          Boolean(createdAfterSubmitId)
          && createdAfterSubmitId !== trim(recentEmpty.id)
          && !seededRequestIds.includes(createdAfterSubmitId),
        totalIncrementedByOne: totalAfterSubmitCreate === totalAfterFirstGc + 1,
      },
      reopen: {
        reopenedId,
        reopenedStatus,
        reopenedSameRequest: reopenedId === trim(recentEmpty.id),
        reopenedRequestStillPresent: remainingAfterThirdGcIds.has(trim(recentEmpty.id)),
      },
    };

    const inventory = {
      draftCreatePaths: [
        "src/lib/api/requests.ts:requestCreateDraft",
        "src/lib/api/requests.ts:getOrCreateDraftRequestId",
        "src/lib/catalog/catalog.request.service.ts:getOrCreateDraftRequestId",
        "src/screens/foreman/hooks/useForemanItemsState.ts:ensureAndGetId",
      ],
      draftReuseConsumers: [
        "src/features/market/market.repository.ts:addMarketplaceListingToRequest",
        "src/features/market/market.repository.ts:createMarketplaceProposal",
        "src/features/ai/assistantActions.ts:createOrAppendForemanDraft",
        "src/lib/api/request.repository.ts:appendMarketplaceItemsToDraft",
      ],
      activeDraftSignals: [
        "requests.status = draft",
        "requests.submitted_at is null",
        "request_items.request_id links active content",
        "proposals.request_id links proposal lineage",
        "warehouse_issues.request_id links warehouse lineage",
        "proposal_payments -> proposals -> requests links payment lineage",
      ],
      noServerOwnedSessionTableFound: true,
      ownerProtectionDiscipline: [
        "latest empty draft per creator is protected from cleanup",
        "recent truly empty drafts within retention window are protected",
      ],
    };

    const summary = {
      status:
        structural.retentionMigrationPresent
        && structural.lowLevelRequestCreateUsesReuseProbe
        && structural.lowLevelGetOrCreateValidatesCachedId
        && structural.compatGetOrCreateDelegatesToLowLevel
        && firstDeletedIds.includes(trim(oldEmpty.id))
        && remainingAfterFirstGcIds.has(trim(recentEmpty.id))
        && remainingAfterFirstGcIds.has(trim(oldWithItems.id))
        && remainingAfterFirstGcIds.has(trim(oldWithHistory.id))
        && remainingAfterFirstGcIds.has(trim(oldWithProposal.id))
        && remainingAfterFirstGcIds.has(trim(oldWithWarehouseIssue.id))
        && remainingAfterFirstGcIds.has(trim(oldWithPaymentLinks.id))
        && reuseVsCreateProof.requestCreateDraft.reusedExistingDraft
        && reuseVsCreateProof.requestCreateDraft.appliedMeta
        && reuseVsCreateProof.requestCreateDraft.createdNoAdditionalDraft
        && reuseVsCreateProof.getOrCreateDraftRequestId.reusedExistingDraft
        && toInteger(gcGuardrails.proposal_links) >= 2
        && toInteger(gcGuardrails.payment_links) >= 1
        && toInteger(gcGuardrails.warehouse_issue_links) >= 1
        && reuseVsCreateProof.submitRollover.submitTransitionedToPending
        && reuseVsCreateProof.submitRollover.createdAfterSubmitIsNew
        && reuseVsCreateProof.submitRollover.totalIncrementedByOne
        && reuseVsCreateProof.reopen.reopenedSameRequest
        && reuseVsCreateProof.reopen.reopenedRequestStillPresent
        && toInteger(secondGcPayload.deleted_count) === 0
        && toInteger(thirdGcPayload.deleted_count) === 0
          ? "GREEN"
          : "NOT GREEN",
      inventory,
      structural,
      safetyMatrix,
      reuseVsCreateProof,
    };

    writeJson("artifacts/draft-retention-summary.json", summary);
    writeJson("artifacts/draft-retention-safety-matrix.json", safetyMatrix);
    writeJson("artifacts/draft-reuse-vs-create-proof.json", reuseVsCreateProof);

    console.log(JSON.stringify(summary, null, 2));

    if (summary.status !== "GREEN") {
      process.exitCode = 1;
    }
  } finally {
    requestsApi.clearCachedDraftRequestId();
    catalogApi.clearLocalDraftId();
    await supabase.auth.signOut().catch(() => {});
    if (user) {
      await cleanupSeedRows(user.id).catch(() => {});
    }
    await cleanupTempUser(admin, user);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
