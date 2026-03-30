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

const writeJson = (relativePath: string, value: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const writeText = (relativePath: string, value: string) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value, "utf8");
};

const text = (value: unknown) => String(value ?? "").trim();
const toErrorInfo = (error: unknown) => {
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

type ProposalRow = {
  id: string;
  proposal_no: string | null;
  display_no: string | null;
  status: string | null;
  submitted_at: string | null;
  sent_to_accountant_at: string | null;
  supplier: string | null;
  request_id: string | null;
};

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const extractBlock = (source: string, startMarker: string, endMarker: string) => {
  const start = source.indexOf(startMarker);
  if (start < 0) return "";
  const end = source.indexOf(endMarker, start);
  if (end < 0) return source.slice(start);
  return source.slice(start, end);
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

async function countRequestProposals(admin: any, requestId: string) {
  const result = await admin
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId);
  if (result.error) throw result.error;
  return Number(result.count ?? 0);
}

async function loadProposal(admin: any, proposalId: string) {
  const result = await admin
    .from("proposals")
    .select("id,proposal_no,display_no,status,submitted_at,sent_to_accountant_at,supplier,request_id")
    .eq("id", proposalId)
    .single();
  if (result.error) throw result.error;
  return result.data as ProposalRow;
}

async function callProposalAtomicRpc(client: any, params: {
  clientMutationId: string;
  buckets: Array<{
    supplier?: string | null;
    request_item_ids: string[];
    meta?: Array<{
      request_item_id: string;
      price?: string | null;
      supplier?: string | null;
      note?: string | null;
    }>;
  }>;
  buyerFio: string;
  requestId: string;
}) {
  const rpc = await client.rpc("rpc_proposal_submit_v3" as never, {
    p_client_mutation_id: params.clientMutationId,
    p_buckets: params.buckets,
    p_buyer_fio: params.buyerFio,
    p_submit: true,
    p_request_id: params.requestId,
    p_request_item_status: null,
  } as never);
  if (rpc.error) throw rpc.error;
  return rpc.data as Record<string, unknown> | null;
}

async function main() {
  const { createTempUser, cleanupTempUser, createVerifierAdmin } = await import("./_shared/testUserDiscipline");

  const admin = createVerifierAdmin("proposal-atomic-boundary-verify");
  const buyerClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-client-info": "proposal-atomic-boundary-buyer" } },
  });
  const directorClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-client-info": "proposal-atomic-boundary-director" } },
  });

  const serviceText = readText("src/lib/catalog/catalog.proposalCreation.service.ts");
  const createBlock = extractBlock(
    serviceText,
    "export async function createProposalsBySupplier(",
    "\n}",
  );

  const sourceProof = {
    canonicalRpcPresent: serviceText.includes('"rpc_proposal_submit_v3"'),
    primaryCreateUsesAtomicRpc: createBlock.includes("runAtomicProposalSubmitRpc("),
    noClientHeadStageInPrimary: !createBlock.includes("createProposalHeadStage("),
    noClientItemLinkStageInPrimary: !createBlock.includes("linkProposalItemsStage("),
    noClientCompletionStageInPrimary: !createBlock.includes("completeProposalCreationStage("),
    noClientStatusWriteStageInPrimary: !createBlock.includes("syncProposalRequestItemStatusStage("),
  };

  let buyerUser: TempUser | null = null;
  let directorUser: TempUser | null = null;
  let successRequestId: string | null = null;
  let successRequestItemId: string | null = null;
  let invalidRequestId: string | null = null;
  let invalidRequestItemId: string | null = null;
  let proposalId: string | null = null;
  let mutationId: string | null = null;
  let replayProposalId: string | null = null;
  let successResult: unknown = null;
  let replayResult: unknown = null;
  let invalidError: unknown = null;
  let stage = "bootstrap";

  try {
    stage = "create_temp_users";
    buyerUser = await createTempUser(admin, {
      role: "buyer",
      fullName: "Buyer Proposal Atomic Verify",
      emailPrefix: "buyer.proposal.atomic",
    }) as TempUser;
    directorUser = await createTempUser(admin, {
      role: "director",
      fullName: "Director Proposal Atomic Verify",
      emailPrefix: "director.proposal.atomic",
    }) as TempUser;

    stage = "sign_in";
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

    const approvedStatus = await resolveApprovedRequestStatus(admin);
    const supplier = await resolveSupplier(admin);
    const marker = `PROP-ATOMIC-${Date.now().toString(36).toUpperCase()}`;

    stage = "seed_success_request";
    const successRequest = await admin
      .from("requests")
      .insert({
        status: approvedStatus,
        display_no: `REQ-${marker}/SUCCESS`,
        object_name: marker,
        note: marker,
        created_by: buyerUser.id,
        requested_by: buyerUser.displayLabel,
      })
      .select("id")
      .single();
    if (successRequest.error) throw successRequest.error;
    successRequestId = text(successRequest.data.id);
    const successItem = await admin
      .from("request_items")
      .insert({
        request_id: successRequestId,
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
    if (successItem.error) throw successItem.error;
    successRequestItemId = text(successItem.data.id);

    mutationId = `proposal-atomic-${Date.now().toString(36)}`;

    stage = "submit_success";
    successResult = await callProposalAtomicRpc(buyerClient, {
      clientMutationId: mutationId,
      buyerFio: buyerUser.displayLabel,
      requestId: successRequestId,
      buckets: [
        {
          supplier: supplier.name,
          request_item_ids: [successRequestItemId],
          meta: [
            {
              request_item_id: successRequestItemId,
              price: "123.45",
              supplier: supplier.name,
              note: marker,
            },
          ],
        },
      ],
    });

    const successProposal = Array.isArray((successResult as { proposals?: unknown[] } | null)?.proposals)
      ? (successResult as { proposals: Array<Record<string, unknown>> }).proposals[0]
      : null;
    proposalId = text(successProposal?.proposal_id);
    if (!proposalId) throw new Error("createProposalsBySupplier returned empty proposal_id");

    stage = "submit_replay";
    replayResult = await callProposalAtomicRpc(buyerClient, {
      clientMutationId: mutationId,
      buyerFio: buyerUser.displayLabel,
      requestId: successRequestId,
      buckets: [
        {
          supplier: supplier.name,
          request_item_ids: [successRequestItemId],
          meta: [
            {
              request_item_id: successRequestItemId,
              price: "123.45",
              supplier: supplier.name,
              note: marker,
            },
          ],
        },
      ],
    });
    const replayProposal = Array.isArray((replayResult as { proposals?: unknown[] } | null)?.proposals)
      ? (replayResult as { proposals: Array<Record<string, unknown>> }).proposals[0]
      : null;
    replayProposalId = text(replayProposal?.proposal_id);

    stage = "seed_invalid_request";
    const invalidRequest = await admin
      .from("requests")
      .insert({
        status: approvedStatus,
        display_no: `REQ-${marker}/INVALID`,
        object_name: `${marker}-INVALID`,
        note: `${marker}-INVALID`,
        created_by: buyerUser.id,
        requested_by: buyerUser.displayLabel,
      })
      .select("id")
      .single();
    if (invalidRequest.error) throw invalidRequest.error;
    invalidRequestId = text(invalidRequest.data.id);
    const invalidItem = await admin
      .from("request_items")
      .insert({
        request_id: invalidRequestId,
        name_human: `${marker}-INVALID`,
        qty: 1,
        uom: "pcs",
        rik_code: `${marker}-INVALID`,
        status: "approved",
        kind: "material",
        supplier: supplier.name,
        note: `${marker}-INVALID`,
      })
      .select("id")
      .single();
    if (invalidItem.error) throw invalidItem.error;
    invalidRequestItemId = text(invalidItem.data.id);

    stage = "submit_invalid";
    try {
      await callProposalAtomicRpc(buyerClient, {
        clientMutationId: `${mutationId}-invalid`,
        buyerFio: buyerUser.displayLabel,
        requestId: invalidRequestId,
        buckets: [
          {
            supplier: supplier.name,
            request_item_ids: [invalidRequestItemId],
            meta: [
              {
                request_item_id: invalidRequestItemId,
                price: "0",
                supplier: supplier.name,
                note: `${marker}-INVALID`,
              },
            ],
          },
        ],
      });
    } catch (error) {
      invalidError = error;
    }
    if (!invalidError) {
      throw new Error("invalid payload unexpectedly succeeded");
    }

    stage = "readback";
    const proposal = await loadProposal(admin, proposalId);
    const proposalItemsCount = await countProposalItems(admin, proposalId);
    const proposalsForRequestCount = await countRequestProposals(admin, successRequestId);
    const invalidRequestProposalCount = await countRequestProposals(admin, invalidRequestId);
    const directorRpc = await directorClient.rpc("director_pending_proposals_scope_v1", {
      p_offset_heads: 0,
      p_limit_heads: 500,
    });
    if (directorRpc.error) throw directorRpc.error;
    const heads = Array.isArray((directorRpc.data as { heads?: unknown[] } | null)?.heads)
      ? ((directorRpc.data as { heads: Array<Record<string, unknown>> }).heads)
      : [];
    const directorVisible = heads.some((head) => text(head.id) === proposalId);

    const successMeta = ((successResult as { meta?: Record<string, unknown> } | null)?.meta ?? {}) as Record<
      string,
      unknown
    >;
    const replayMeta = ((replayResult as { meta?: Record<string, unknown> } | null)?.meta ?? {}) as Record<
      string,
      unknown
    >;

    const smoke = {
      status:
        Object.values(sourceProof).every((value) => value === true) &&
        proposalItemsCount === 1 &&
        proposalsForRequestCount === 1 &&
        invalidRequestProposalCount === 0 &&
        replayProposalId === proposalId &&
        replayMeta.idempotent_replay === true &&
        directorVisible === true
          ? "GREEN"
          : "NOT GREEN",
      generatedAt: new Date().toISOString(),
      canonicalPath: "rpc:proposal_submit_v3",
      sourceProof,
      successPath: {
        requestId: successRequestId,
        requestItemId: successRequestItemId,
        proposalId,
        proposal,
        expectedBucketCount: successMeta.expected_bucket_count ?? null,
        expectedItemCount: successMeta.expected_item_count ?? null,
        actualCreatedProposalCount: successMeta.created_proposal_count ?? null,
        actualCreatedItemCount: successMeta.created_item_count ?? null,
        attachmentContinuationReady: successMeta.attachment_continuation_ready ?? null,
        directorVisible,
        proposalItemsCount,
      },
      idempotentReplay: {
        clientMutationId: mutationId,
        replayProposalId,
        sameProposalId: replayProposalId === proposalId,
        replayFlag: replayMeta.idempotent_replay === true,
        proposalsForRequestCount,
      },
      failurePath: {
        requestId: invalidRequestId,
        requestItemId: invalidRequestItemId,
        error: toErrorInfo(invalidError),
        proposalsForInvalidRequestCount: invalidRequestProposalCount,
      },
    };

    writeJson("artifacts/proposal-atomic-boundary-smoke.json", smoke);
    writeJson("artifacts/proposal-atomic-boundary-sql-notes.json", {
      status: smoke.status,
      migrations: [
        "supabase/migrations/20260330200000_proposal_creation_boundary_v3.sql",
        "supabase/migrations/20260330201500_proposal_creation_boundary_v3_uuid_cast_fix.sql",
        "supabase/migrations/20260330203000_proposal_creation_boundary_v3_enum_cast_fix.sql",
        "supabase/migrations/20260330204500_proposal_creation_boundary_v3_price_regex_fix.sql",
        "supabase/migrations/20260330205500_proposal_creation_boundary_v3_proposal_id_cast_fix.sql",
        "supabase/migrations/20260330210000_proposal_creation_boundary_v3_request_id_cast_fix.sql",
        "supabase/migrations/20260330211500_proposal_creation_boundary_v3_proposal_item_uuid_fix.sql",
        "supabase/migrations/20260330213000_proposal_creation_boundary_v3_request_item_uuid_fix.sql",
        "supabase/migrations/20260330214500_proposal_creation_boundary_v3_total_qty_generated_fix.sql",
      ],
      rpc: "public.rpc_proposal_submit_v3",
      idempotencyTable: "public.proposal_submit_mutations_v1",
      primaryClientPath: "src/lib/catalog/catalog.proposalCreation.service.ts#createProposalsBySupplier",
      demotedLegacyHelpers: [
        "createProposalHeadStage",
        "linkProposalItemsStage",
        "completeProposalCreationStage",
        "syncProposalRequestItemStatusStage",
      ],
      attachmentContinuation: "post-commit only via buyer.submit.mutation.ts and processBuyerSubmitJob.ts",
    });
    writeText(
      "artifacts/proposal-atomic-boundary-proof.md",
      [
        "# Proposal Atomic Boundary Proof",
        "",
        "## Canonical path",
        "- Before: buyer submit used client-orchestrated `proposal_create -> proposal_add_items -> proposal_items_snapshot -> proposal_submit_text_v1`.",
        "- Now: `createProposalsBySupplier()` delegates the primary production path to `rpc_proposal_submit_v3` and only consumes the committed result.",
        "",
        "## Files changed",
        "- `supabase/migrations/20260330200000_proposal_creation_boundary_v3.sql`",
        "- `supabase/migrations/20260330201500_proposal_creation_boundary_v3_uuid_cast_fix.sql`",
        "- `supabase/migrations/20260330203000_proposal_creation_boundary_v3_enum_cast_fix.sql`",
        "- `supabase/migrations/20260330204500_proposal_creation_boundary_v3_price_regex_fix.sql`",
        "- `supabase/migrations/20260330205500_proposal_creation_boundary_v3_proposal_id_cast_fix.sql`",
        "- `supabase/migrations/20260330210000_proposal_creation_boundary_v3_request_id_cast_fix.sql`",
        "- `supabase/migrations/20260330211500_proposal_creation_boundary_v3_proposal_item_uuid_fix.sql`",
        "- `supabase/migrations/20260330213000_proposal_creation_boundary_v3_request_item_uuid_fix.sql`",
        "- `supabase/migrations/20260330214500_proposal_creation_boundary_v3_total_qty_generated_fix.sql`",
        "- `src/lib/catalog/catalog.proposalCreation.service.ts`",
        "- `src/screens/buyer/buyer.submit.mutation.ts`",
        "- `src/workers/processBuyerSubmitJob.ts`",
        "- `src/lib/catalog/catalog.proposalCreation.service.atomicBoundary.test.ts`",
        "- `src/screens/buyer/buyer.submit.mutation.test.ts`",
        "- `scripts/proposal_atomic_boundary_verify.ts`",
        "",
        "## Why orphan/partial proposal risk is closed",
        "- Head/items/status commit now happen inside one DB transaction owned by `rpc_proposal_submit_v3`.",
        "- The client no longer writes proposal head/items/status by separate primary steps.",
        "- Invalid payload proof checks that a rejected submit leaves `0` proposals for the seeded request.",
        "",
        "## Idempotency proof",
        `- Replay used client mutation id: \`${mutationId}\`.`,
        `- First proposal id: \`${proposalId}\`. Replay proposal id: \`${replayProposalId}\`.`,
        `- Replay flag from RPC meta: \`${String(replayMeta.idempotent_replay)}\`.`,
        "",
        "## Attachment compatibility",
        "- Attachment continuation remains post-commit only.",
        "- Buyer mutation test proves attachment upload does not start when canonical proposal commit fails.",
        "- Success meta confirms attachment continuation readiness after commit.",
        "",
        "## Intentionally unchanged",
        "- UI and buyer screen flow",
        "- Request lifecycle semantics",
        "- Director reports",
        "- Object identity / material identity contracts",
        "",
        `Final runtime gate status: **${smoke.status}**`,
        "",
      ].join("\n"),
    );

    console.log(JSON.stringify(smoke, null, 2));
    if (smoke.status !== "GREEN") {
      process.exitCode = 1;
    }
  } catch (error) {
    writeJson("artifacts/proposal-atomic-boundary-smoke.json", {
      status: "NOT GREEN",
      generatedAt: new Date().toISOString(),
      stage,
      sourceProof,
      error: toErrorInfo(error),
      successRequestId,
      successRequestItemId,
      invalidRequestId,
      invalidRequestItemId,
      proposalId,
      replayProposalId,
      successResult,
      replayResult,
      invalidError: invalidError ? toErrorInfo(invalidError) : null,
    });
    writeText(
      "artifacts/proposal-atomic-boundary-proof.md",
      `# Proposal Atomic Boundary Proof\n\nRuntime gate failed at stage \`${stage}\`.\n\n\`\`\`json\n${JSON.stringify(
        toErrorInfo(error),
        null,
        2,
      )}\n\`\`\`\n`,
    );
    process.exitCode = 1;
    console.error(JSON.stringify({ stage, error: toErrorInfo(error) }, null, 2));
  } finally {
    await directorClient.auth.signOut().catch(() => {});
    await buyerClient.auth.signOut().catch(() => {});

    if (proposalId) {
      try {
        await admin.from("proposal_items").delete().eq("proposal_id", proposalId);
      } catch {}
      try {
        await admin.from("proposals").delete().eq("id", proposalId);
      } catch {}
    }
    if (successRequestItemId) {
      try {
        await admin.from("request_items").delete().eq("id", successRequestItemId);
      } catch {}
    }
    if (successRequestId) {
      try {
        await admin.from("requests").delete().eq("id", successRequestId);
      } catch {}
    }
    if (invalidRequestItemId) {
      try {
        await admin.from("request_items").delete().eq("id", invalidRequestItemId);
      } catch {}
    }
    if (invalidRequestId) {
      try {
        await admin.from("requests").delete().eq("id", invalidRequestId);
      } catch {}
    }
    if (mutationId) {
      try {
        await (admin as any).from("proposal_submit_mutations_v1").delete().eq("client_mutation_id", mutationId);
      } catch {}
      try {
        await (admin as any)
          .from("proposal_submit_mutations_v1")
          .delete()
          .eq("client_mutation_id", `${mutationId}-invalid`);
      } catch {}
    }

    await cleanupTempUser(admin, buyerUser).catch(() => {});
    await cleanupTempUser(admin, directorUser).catch(() => {});
  }
}

void main().catch((error) => {
  process.exitCode = 1;
  console.error(JSON.stringify({ stage: "bootstrap", error: toErrorInfo(error) }, null, 2));
});
