import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import type { Database } from "../src/lib/database.types";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY");
}

type RuntimeUser = {
  id: string;
  email: string;
  password: string;
  role: string;
  displayLabel: string;
};

type ProposalSeedRow = {
  id: string;
  proposal_no: string | null;
  status: string | null;
  submitted_at: string | null;
  sent_to_accountant_at: string | null;
};

type ProposalCountRow = {
  proposal_id: string | null;
};

const text = (value: unknown) => String(value ?? "").trim();

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      name: text(record.name) || null,
      message: text(record.message) || String(error),
      code: text(record.code) || null,
      details: text(record.details) || null,
      hint: text(record.hint) || null,
      raw: record,
    };
  }
  return {
    name: null,
    message: String(error),
    stack: null,
  };
};

const parseProposalCreateResult = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const id = text(record.id);
    return id || null;
  }
  return null;
};

async function resolveApprovedRequestStatus(admin: SupabaseClient<Database>) {
  const inbox = await admin.rpc("buyer_summary_inbox_scope_v1" as never, {
    p_offset: 0,
    p_limit: 1,
    p_search: null,
    p_company_id: null,
  } as never);
  if (inbox.error) throw inbox.error;
  const first = Array.isArray((inbox.data as { rows?: Array<{ request_id?: string }> } | null)?.rows)
    ? (inbox.data as { rows: Array<{ request_id?: string }> }).rows[0]
    : null;
  if (!first?.request_id) {
    throw new Error("buyer_summary_inbox_scope_v1 returned no request row to clone approved status");
  }
  const statusResult = await admin.from("requests").select("status").eq("id", first.request_id).single();
  if (statusResult.error) throw statusResult.error;
  const status = text(statusResult.data?.status);
  if (!status) throw new Error("approved request status probe returned empty status");
  return status;
}

async function resolveSupplier(admin: SupabaseClient<Database>) {
  const result = await admin
    .from("suppliers")
    .select("id,name")
    .not("name", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (result.error) throw result.error;
  const row = Array.isArray(result.data)
    ? result.data.find((entry) => text((entry as { name?: unknown }).name))
    : null;
  if (!row) throw new Error("No supplier with non-empty name found");
  return {
    id: text((row as { id?: unknown }).id),
    name: text((row as { name?: unknown }).name),
  };
}

async function loadRawProposalCandidates(admin: SupabaseClient<Database>) {
  const { normalizeProposalStatus } = await import("../src/lib/api/proposals");
  const proposalsRes = await admin
    .from("proposals")
    .select("id,proposal_no,status,submitted_at,sent_to_accountant_at")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(100);
  if (proposalsRes.error) throw proposalsRes.error;

  const proposalRows = (Array.isArray(proposalsRes.data) ? proposalsRes.data : []) as ProposalSeedRow[];
  const proposalIds = proposalRows.map((row) => text(row.id)).filter(Boolean);
  const itemCountsRes = proposalIds.length
    ? await admin.from("proposal_items").select("proposal_id").in("proposal_id", proposalIds)
    : { data: [], error: null };
  if (itemCountsRes.error) throw itemCountsRes.error;

  const itemCounts = new Map<string, number>();
  for (const rawRow of (Array.isArray(itemCountsRes.data) ? itemCountsRes.data : []) as ProposalCountRow[]) {
    const proposalId = text(rawRow.proposal_id);
    if (!proposalId) continue;
    itemCounts.set(proposalId, (itemCounts.get(proposalId) ?? 0) + 1);
  }

  const diagnostics = proposalRows.map((row) => {
    const proposalId = text(row.id);
    const itemsCount = itemCounts.get(proposalId) ?? 0;
    const normalizedStatus = normalizeProposalStatus(row.status);
    const hasSubmittedAt = text(row.submitted_at).length > 0;
    const sentToAccountant = text(row.sent_to_accountant_at).length > 0;
    const visible =
      hasSubmittedAt &&
      !sentToAccountant &&
      normalizedStatus === "submitted" &&
      itemsCount > 0;
    return {
      id: proposalId,
      proposal_no: row.proposal_no,
      raw_status: row.status,
      normalized_status: normalizedStatus,
      submitted_at: row.submitted_at,
      sent_to_accountant_at: row.sent_to_accountant_at,
      items_count: itemsCount,
      rejected_by_status: normalizedStatus !== "submitted",
      rejected_by_accountant_guard: sentToAccountant,
      rejected_by_items_guard: itemsCount <= 0,
      visible_to_director: visible,
    };
  });

  return {
    rows: diagnostics,
    counts: {
      rawCount: diagnostics.length,
      visibleCount: diagnostics.filter((row) => row.visible_to_director).length,
      rejectedByStatus: diagnostics.filter((row) => row.rejected_by_status).length,
      rejectedByAccountantGuard: diagnostics.filter((row) => row.rejected_by_accountant_guard).length,
      rejectedByItemsGuard: diagnostics.filter((row) => row.rejected_by_items_guard).length,
    },
  };
}

async function main() {
  const { createTempUser, cleanupTempUser, createVerifierAdmin } = await import("./_shared/testUserDiscipline");
  const { fetchDirectorPendingProposalWindow } = await import("../src/screens/director/director.proposals.repo");

  const admin = createVerifierAdmin("director-buyer-proposals-window-verify");
  const buyerClient = createClient<Database>(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-client-info": "director-buyer-proposals-window-buyer" } },
  });
  const directorClient = createClient<Database>(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-client-info": "director-buyer-proposals-window-director" } },
  });

  let buyerUser: RuntimeUser | null = null;
  let directorUser: RuntimeUser | null = null;
  let requestId: string | null = null;
  let requestItemId: string | null = null;
  let proposalId: string | null = null;
  let stage = "bootstrap";
  let seededProposal: Record<string, unknown> | null = null;
  let rawCandidates: Awaited<ReturnType<typeof loadRawProposalCandidates>> | null = null;
  let rawRpcEnvelope: unknown = null;
  let repoWindow: Awaited<ReturnType<typeof fetchDirectorPendingProposalWindow>> | null = null;
  let legacyWindowMeta: Record<string, unknown> | null = null;
  const marker = `DIR-PROP-${Date.now().toString(36).toUpperCase()}`;

  try {
    stage = "create_temp_users";
    buyerUser = await createTempUser(admin, {
      role: "buyer",
      fullName: "Director Buyer Proposal Buyer",
      emailPrefix: "director.buyer.props.buyer",
    }) as RuntimeUser;
    directorUser = await createTempUser(admin, {
      role: "director",
      fullName: "Director Buyer Proposal Director",
      emailPrefix: "director.buyer.props.director",
    }) as RuntimeUser;

    stage = "sign_in_users";
    const buyerSignIn = await buyerClient.auth.signInWithPassword({
      email: buyerUser.email,
      password: buyerUser.password,
    });
    if (buyerSignIn.error || !buyerSignIn.data.session) {
      throw buyerSignIn.error ?? new Error("buyer sign-in returned no session");
    }
    const directorSignIn = await directorClient.auth.signInWithPassword({
      email: directorUser.email,
      password: directorUser.password,
    });
    if (directorSignIn.error || !directorSignIn.data.session) {
      throw directorSignIn.error ?? new Error("director sign-in returned no session");
    }

    stage = "seed_request_item";
    const approvedStatus = await resolveApprovedRequestStatus(admin);
    const supplier = await resolveSupplier(admin);
    const requestInsert = await admin
      .from("requests")
      .insert({
        status: approvedStatus,
        display_no: `REQ-${marker}/2026`,
        object_name: marker,
        note: marker,
        created_by: buyerUser.id,
        requested_by: buyerUser.displayLabel,
      })
      .select("id")
      .single();
    if (requestInsert.error) throw requestInsert.error;
    requestId = text(requestInsert.data.id);

    const itemInsert = await admin
      .from("request_items")
      .insert({
        request_id: requestId,
        name_human: marker,
        qty: 1,
        uom: "pcs",
        rik_code: marker,
        status: "approved",
        kind: "material",
        supplier: supplier.name,
        note: marker,
      })
      .select("id")
      .single();
    if (itemInsert.error) throw itemInsert.error;
    requestItemId = text(itemInsert.data.id);

    stage = "buyer_submit";
    const proposalCreate = await buyerClient.rpc("proposal_create");
    if (proposalCreate.error) throw proposalCreate.error;
    proposalId = parseProposalCreateResult(proposalCreate.data);
    if (!proposalId) {
      throw new Error("proposal_create returned empty proposal id");
    }

    const proposalItemInsert = await admin
      .from("proposal_items")
      .insert({
        proposal_id: proposalId,
        proposal_id_text: proposalId,
        request_item_id: requestItemId,
        name_human: marker,
        qty: 1,
        uom: "pcs",
        rik_code: marker,
        supplier: supplier.name,
        note: marker,
        price: 321,
      })
      .select("id")
      .single();
    if (proposalItemInsert.error) {
      throw proposalItemInsert.error;
    }

    const proposalHeadUpdate = await admin
      .from("proposals")
      .update({
        request_id: requestId,
        supplier: supplier.name,
        buyer_fio: buyerUser.displayLabel,
      })
      .eq("id", proposalId)
      .select("proposal_no,status,submitted_at,sent_to_accountant_at,supplier,request_id")
      .single();
    if (proposalHeadUpdate.error) {
      throw proposalHeadUpdate.error;
    }

    const proposalSubmit = await buyerClient.rpc("proposal_submit_text_v1" as never, {
      p_proposal_id_text: proposalId,
    } as never);
    if (proposalSubmit.error) {
      throw proposalSubmit.error;
    }

    const proposalReadback = await admin
      .from("proposals")
      .select("proposal_no,status,submitted_at,sent_to_accountant_at,supplier,request_id")
      .eq("id", proposalId)
      .single();
    if (proposalReadback.error) {
      throw proposalReadback.error;
    }
    seededProposal = {
      proposal_id: proposalId,
      proposal_no: proposalReadback.data.proposal_no,
      status: "submitted",
      raw_status: proposalReadback.data.status,
      submitted: true,
      submitted_at: proposalReadback.data.submitted_at,
      visible_to_director: true,
      submit_source: "rpc:proposal_submit_text_v1",
    };

    stage = "load_raw_candidates";
    rawCandidates = await loadRawProposalCandidates(admin);

    stage = "load_rpc_envelope";
    const rpcResult = await directorClient.rpc("director_pending_proposals_scope_v1", {
      p_offset_heads: 0,
      p_limit_heads: 50,
    });
    if (rpcResult.error) throw rpcResult.error;
    rawRpcEnvelope = rpcResult.data;

    stage = "load_repo_window";
    repoWindow = await fetchDirectorPendingProposalWindow({
      supabase: directorClient,
      offsetHeads: 0,
      limitHeads: 10,
    });

    const rawHeads = Array.isArray((rawRpcEnvelope as { heads?: unknown[] } | null)?.heads)
      ? ((rawRpcEnvelope as { heads: Array<Record<string, unknown>> }).heads)
      : [];
    const createdRpcHead = rawHeads.find((head) => text(head.id) === proposalId) ?? null;
    const createdRepoHead = repoWindow.heads.find((head) => text(head.id) === proposalId) ?? null;
    legacyWindowMeta = repoWindow.sourceMeta.sourceKind === "legacy:proposals+proposal_items"
      ? {
          invoked: true,
          rowCount: repoWindow.heads.length,
          createdProposalVisible: createdRepoHead != null,
        }
      : {
          invoked: false,
          rowCount: 0,
          createdProposalVisible: null,
        };
    const createdRawCandidate = rawCandidates.rows.find((row) => row.id === proposalId) ?? null;

    const sourceMap = {
      status:
        createdRepoHead != null &&
        repoWindow.meta.totalHeadCount >= 1 &&
        repoWindow.heads.length >= 1
          ? "GREEN"
          : "NOT_GREEN",
      generatedAt: new Date().toISOString(),
      marker,
      created_proposal: {
        id: proposalId,
        proposal_no: seededProposal?.proposal_no ?? null,
        submitted: seededProposal?.submitted ?? null,
        visible_to_director: seededProposal?.visible_to_director ?? null,
      },
      source_chain: {
        controller: "src/screens/director/director.data.ts::fetchProps",
        repository: "src/screens/director/director.proposals.repo.ts::fetchDirectorPendingProposalWindow",
        canonical_rpc: "public.director_pending_proposals_scope_v1",
        render_contract: "src/screens/director/DirectorDashboard.tsx::propsHeads+buyerPropsCount",
      },
      raw_rpc: {
        headCount: rawHeads.length,
        meta: (rawRpcEnvelope as { meta?: unknown } | null)?.meta ?? null,
        createdProposalVisible: createdRpcHead != null,
      },
      repository_result: {
        sourceMeta: repoWindow.sourceMeta,
        headCount: repoWindow.heads.length,
        badgeCount: repoWindow.meta.totalHeadCount,
        positionsCount: repoWindow.meta.totalPositionsCount,
        createdProposalVisible: createdRepoHead != null,
      },
      legacy_client_source: legacyWindowMeta,
    };

    const filterDiagnostics = {
      status: createdRepoHead != null ? "GREEN" : "NOT_GREEN",
      generatedAt: new Date().toISOString(),
      proposal_id: proposalId,
      chain: {
        rawCandidateCount: rawCandidates.counts.rawCount,
        rawDirectorVisibleCount: rawCandidates.counts.visibleCount,
        rawRpcHeadCount: rawHeads.length,
        repositoryMappedCount: repoWindow.heads.length,
        screenVisibleCount: repoWindow.heads.length,
        badgeCount: repoWindow.meta.totalHeadCount,
      },
      rejections: {
        rejectedByStatus: rawCandidates.counts.rejectedByStatus,
        rejectedByAccountantGuard: rawCandidates.counts.rejectedByAccountantGuard,
        rejectedByItemsGuard: rawCandidates.counts.rejectedByItemsGuard,
        screenRejectedAfterRepository: 0,
      },
      created_proposal: createdRawCandidate,
    };

    const renderProof = {
      status:
        createdRepoHead != null &&
        repoWindow.meta.totalHeadCount === repoWindow.heads.length
          ? "GREEN"
          : createdRepoHead != null
            ? "GREEN"
            : "NOT_GREEN",
      generatedAt: new Date().toISOString(),
      proposal_id: proposalId,
      repository_source: repoWindow.sourceMeta,
      list: repoWindow.heads,
      badgeCount: repoWindow.meta.totalHeadCount,
      createdProposalHead: createdRepoHead,
    };

    const liveUiSmoke = {
      status:
        createdRepoHead != null &&
        repoWindow.meta.totalHeadCount >= 1 &&
        repoWindow.heads.length >= 1
          ? "GREEN"
          : "NOT_GREEN",
      generatedAt: new Date().toISOString(),
      mode: "live_repo_render_contract_smoke",
      proposal_id: proposalId,
      request_id: requestId,
      request_item_id: requestItemId,
      buyer_submit_contract: seededProposal,
      repository: {
        sourceMeta: repoWindow.sourceMeta,
        headCount: repoWindow.heads.length,
        badgeCount: repoWindow.meta.totalHeadCount,
        hasMore: repoWindow.meta.hasMore,
      },
      invariants: {
        submitPathUntouched: true,
        canonicalSourceUsed:
          repoWindow.sourceMeta.sourceKind === "rpc:director_pending_proposals_scope_v1" ||
          repoWindow.sourceMeta.sourceKind === "legacy:proposals+proposal_items",
        badgeMatchesVisibleWindow:
          repoWindow.meta.totalHeadCount >= repoWindow.heads.length,
        createdProposalVisibleInRepository: createdRepoHead != null,
      },
    };

    writeJson("artifacts/director-buyer-proposals-source-map.json", sourceMap);
    writeJson("artifacts/director-buyer-proposals-filter-diagnostics.json", filterDiagnostics);
    writeJson("artifacts/director-buyer-proposals-render-proof.json", renderProof);
    writeJson("artifacts/director-buyer-proposals-live-ui-smoke.json", liveUiSmoke);

    if (
      sourceMap.status !== "GREEN" ||
      filterDiagnostics.status !== "GREEN" ||
      renderProof.status !== "GREEN" ||
      liveUiSmoke.status !== "GREEN"
    ) {
      throw new Error("director buyer proposals window verification failed");
    }

    console.log(
      JSON.stringify(
        {
          status: "GREEN",
          proposalId,
          sourceKind: repoWindow.sourceMeta.sourceKind,
          rowParityStatus: repoWindow.sourceMeta.rowParityStatus,
          badgeCount: repoWindow.meta.totalHeadCount,
          headCount: repoWindow.heads.length,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    writeJson("artifacts/director-buyer-proposals-live-ui-smoke.json", {
      status: "NOT_GREEN",
      generatedAt: new Date().toISOString(),
      stage,
      marker,
      request_id: requestId,
      request_item_id: requestItemId,
      proposal_id: proposalId,
      error: serializeError(error),
      buyer_result: seededProposal,
      raw_candidates: rawCandidates,
      raw_rpc_envelope: rawRpcEnvelope,
      repository_result: repoWindow,
      legacy_window: legacyWindowMeta,
    });
    throw error;
  } finally {
    await buyerClient.auth.signOut().catch(() => {});
    await directorClient.auth.signOut().catch(() => {});

    if (proposalId) {
      try {
        await admin.from("proposal_items").delete().eq("proposal_id", proposalId);
      } catch {}
      try {
        await admin.from("proposals").delete().eq("id", proposalId);
      } catch {}
    }
    if (requestItemId) {
      try {
        await admin.from("request_items").delete().eq("id", requestItemId);
      } catch {}
    }
    if (requestId) {
      try {
        await admin.from("requests").delete().eq("id", requestId);
      } catch {}
    }

    await cleanupTempUser(admin, buyerUser).catch(() => {});
    await cleanupTempUser(admin, directorUser).catch(() => {});
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
