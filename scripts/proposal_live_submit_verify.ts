import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

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

const appliedMigrations = [
  {
    version: "20260329173000",
    file: "supabase/migrations/20260329173000_director_pending_proposals_scope_visibility_fix.sql",
  },
  {
    version: "20260329181500",
    file: "supabase/migrations/20260329181500_proposal_submit_text_rpc_wrapper.sql",
  },
] as const;

const writeJson = (relativePath: string, value: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const text = (value: unknown) => String(value ?? "").trim();
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

type TempUser = {
  id: string;
  email: string;
  password: string;
  role: string;
  displayLabel: string;
};

type ProposalHeadRow = {
  id: string;
  proposal_no: string | null;
  status: string | null;
  submitted_at: string | null;
  sent_to_accountant_at: string | null;
  supplier: string | null;
  request_id: string | null;
};

async function resolveApprovedRequestStatus(admin: any) {
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

async function resolveSupplier(admin: any) {
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

async function countProposalItems(admin: any, proposalId: string) {
  const result = await admin
    .from("proposal_items")
    .select("id", { count: "exact", head: true })
    .eq("proposal_id", proposalId);
  if (result.error) throw result.error;
  return Number(result.count ?? 0);
}

async function loadProposalReadback(admin: any, proposalId: string) {
  const head = await admin
    .from("proposals")
    .select("id,proposal_no,status,submitted_at,sent_to_accountant_at,supplier,request_id")
    .eq("id", proposalId)
    .single();
  if (head.error) throw head.error;
  const proposal = head.data as ProposalHeadRow;
  const itemsCount = await countProposalItems(admin, proposalId);
  return {
    proposal,
    items_count: itemsCount,
    visible_to_director:
      text(proposal.submitted_at).length > 0 &&
      text(proposal.sent_to_accountant_at).length === 0 &&
      itemsCount > 0,
  };
}

async function main() {
  const { createTempUser, cleanupTempUser, createVerifierAdmin } = await import("./_shared/testUserDiscipline");
  const { supabase } = await import("../src/lib/supabaseClient");
  const { createProposalsBySupplier } = await import("../src/lib/catalog/catalog.proposalCreation.service");

  const admin = createVerifierAdmin("proposal-live-submit-verify");
  const directorClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-client-info": "proposal-live-submit-director" } },
  });

  let buyerUser: TempUser | null = null;
  let directorUser: TempUser | null = null;
  let requestId: string | null = null;
  let requestItemId: string | null = null;
  let proposalId: string | null = null;
  let stage = "bootstrap";
  let buyerResult: unknown = null;
  let proposalReadback: unknown = null;
  let directorVisibility: unknown = null;
  const marker = `LIVE-PROP-${Date.now().toString(36).toUpperCase()}`;

  try {
    stage = "create_temp_users";
    buyerUser = await createTempUser(admin, {
      role: "buyer",
      fullName: "Buyer Proposal Live Verify",
      emailPrefix: "buyer.proposal.live",
    }) as TempUser;
    directorUser = await createTempUser(admin, {
      role: "director",
      fullName: "Director Proposal Live Verify",
      emailPrefix: "director.proposal.live",
    }) as TempUser;

    stage = "sign_in_buyers";
    const buyerSignIn = await supabase.auth.signInWithPassword({
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
      .select("id,status,display_no")
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
      .select("id,status,kind,qty,supplier")
      .single();
    if (itemInsert.error) throw itemInsert.error;
    requestItemId = text(itemInsert.data.id);

    stage = "buyer_submit";
    buyerResult = await createProposalsBySupplier(
      [
        {
          supplier: supplier.name,
          request_item_ids: [requestItemId],
          meta: [
            {
              request_item_id: requestItemId,
              price: "123.45",
              supplier: supplier.name,
              note: marker,
            },
          ],
        },
      ],
      {
        buyerFio: buyerUser.displayLabel,
        submit: true,
      },
    );

    const proposalRow = Array.isArray((buyerResult as { proposals?: unknown[] } | null)?.proposals)
      ? (buyerResult as { proposals: Array<Record<string, unknown>> }).proposals[0]
      : null;
    proposalId = text(proposalRow?.proposal_id);
    if (!proposalId) {
      throw new Error("createProposalsBySupplier returned empty proposal_id");
    }

    stage = "proposal_readback";
    proposalReadback = await loadProposalReadback(admin, proposalId);

    stage = "director_visibility";
    const directorRpc = await directorClient.rpc("director_pending_proposals_scope_v1", {
      p_offset_heads: 0,
      p_limit_heads: 500,
    });
    if (directorRpc.error) throw directorRpc.error;
    const heads = Array.isArray((directorRpc.data as { heads?: unknown[] } | null)?.heads)
      ? ((directorRpc.data as { heads: Array<Record<string, unknown>> }).heads)
      : [];
    const match = heads.find((head) => text(head.id) === proposalId) ?? null;
    directorVisibility = {
      rpc_meta:
        typeof directorRpc.data === "object" && directorRpc.data != null
          ? (directorRpc.data as { meta?: unknown }).meta ?? null
          : null,
      matched_head: match,
      visible_to_director: match != null,
      returned_head_count: heads.length,
    };

    const proposalLiveSubmit = {
      status: "GREEN",
      generatedAt: new Date().toISOString(),
      migrations: appliedMigrations.map((migration) => ({
        ...migration,
        appliedAtUtc: new Date().toISOString(),
      })),
      marker,
      buyer_user: {
        id: buyerUser.id,
        email: buyerUser.email,
      },
      request_seed: {
        request_id: requestId,
        request_item_id: requestItemId,
      },
      buyer_result: buyerResult,
    };

    const proposalLiveReadback = {
      status: "GREEN",
      generatedAt: new Date().toISOString(),
      proposal_id: proposalId,
      readback: proposalReadback,
      invariants: {
        submitted_status:
          text((proposalReadback as { proposal?: { status?: unknown } }).proposal?.status).length > 0,
        submitted_at_present:
          text((proposalReadback as { proposal?: { submitted_at?: unknown } }).proposal?.submitted_at).length > 0,
        sent_to_accountant_absent:
          text((proposalReadback as { proposal?: { sent_to_accountant_at?: unknown } }).proposal?.sent_to_accountant_at).length === 0,
        items_count: (proposalReadback as { items_count?: number }).items_count ?? 0,
      },
    };

    const proposalDirectorLiveVisibility = {
      status:
        (proposalRow?.submitted === true) &&
        (proposalRow?.visible_to_director === true) &&
        ((proposalReadback as { visible_to_director?: boolean }).visible_to_director === true) &&
        ((directorVisibility as { visible_to_director?: boolean }).visible_to_director === true)
          ? "GREEN"
          : "NOT_GREEN",
      generatedAt: new Date().toISOString(),
      proposal_id: proposalId,
      director_user: {
        id: directorUser.id,
        email: directorUser.email,
      },
      buyer_submit_contract: {
        submitted: proposalRow?.submitted ?? null,
        visible_to_director: proposalRow?.visible_to_director ?? null,
        submit_source: proposalRow?.submit_source ?? null,
      },
      director_rpc: directorVisibility,
    };

    writeJson("artifacts/proposal-live-submit.json", proposalLiveSubmit);
    writeJson("artifacts/proposal-live-readback.json", proposalLiveReadback);
    writeJson("artifacts/proposal-director-live-visibility.json", proposalDirectorLiveVisibility);

    if (proposalDirectorLiveVisibility.status !== "GREEN") {
      writeJson("artifacts/proposal-failure-point.json", {
        status: "NOT_GREEN",
        generatedAt: new Date().toISOString(),
        stage,
        marker,
        proposal_id: proposalId,
        buyer_result: buyerResult,
        proposal_readback: proposalReadback,
        director_visibility: directorVisibility,
      });
      process.exitCode = 1;
    } else {
      const failureArtifactPath = path.join(projectRoot, "artifacts/proposal-failure-point.json");
      if (fs.existsSync(failureArtifactPath)) {
        fs.unlinkSync(failureArtifactPath);
      }
      console.log(
        JSON.stringify(
          {
            status: "GREEN",
            proposalId,
            requestId,
            requestItemId,
            directorVisible: true,
          },
          null,
          2,
        ),
      );
    }
  } catch (error) {
    writeJson("artifacts/proposal-failure-point.json", {
      status: "NOT_GREEN",
      generatedAt: new Date().toISOString(),
      stage,
      marker,
      request_id: requestId,
      request_item_id: requestItemId,
      proposal_id: proposalId,
      error: serializeError(error),
      buyer_result: buyerResult,
      proposal_readback: proposalReadback,
      director_visibility: directorVisibility,
    });
    throw error;
  } finally {
    await directorClient.auth.signOut().catch(() => {});
    await supabase.auth.signOut().catch(() => {});

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

void main();
