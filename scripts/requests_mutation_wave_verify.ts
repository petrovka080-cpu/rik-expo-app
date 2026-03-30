import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import {
  REQUEST_APPROVED_STATUS,
  REQUEST_DRAFT_STATUS,
} from "../src/lib/api/requests.status";

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

const admin = createVerifierAdmin("requests-mutation-wave");

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const trim = (value: unknown) => String(value ?? "").trim();

async function insertDraftRequest(params: {
  userId: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
}) {
  const result = await admin
    .from("requests")
    .insert({
      created_by: params.userId,
      status: REQUEST_DRAFT_STATUS,
      comment: params.comment,
      created_at: params.createdAt,
      updated_at: params.updatedAt,
    })
    .select("id, comment, status")
    .single<{ id: string; comment: string | null; status: string | null }>();
  if (result.error) throw result.error;
  return result.data;
}

async function cleanupSeedRows(userId: string) {
  const requestsResult = await admin.from("requests").select("id").eq("created_by", userId);
  if (requestsResult.error) throw requestsResult.error;
  const requestIds = (requestsResult.data ?? [])
    .map((row) => trim((row as { id?: unknown }).id))
    .filter(Boolean);
  if (!requestIds.length) return;

  const proposalsResult = await admin.from("proposals").select("id").in("request_id", requestIds);
  if (proposalsResult.error) throw proposalsResult.error;
  const proposalIds = (proposalsResult.data ?? [])
    .map((row) => trim((row as { id?: unknown }).id))
    .filter(Boolean);

  if (proposalIds.length) {
    await admin.from("proposal_payments").delete().in("proposal_id", proposalIds).throwOnError();
    await admin.from("proposal_items").delete().in("proposal_id", proposalIds).throwOnError();
    await admin.from("proposals").delete().in("id", proposalIds).throwOnError();
  }

  await admin.from("warehouse_issues").delete().in("request_id", requestIds).throwOnError();
  await admin.from("request_items").delete().in("request_id", requestIds).throwOnError();
  await admin.from("requests").delete().in("id", requestIds).throwOnError();
}

async function signInTempUser(user: RuntimeTestUser, supabaseClient: typeof import("../src/lib/supabaseClient").supabase) {
  await supabaseClient.auth.signOut().catch(() => {});
  const signIn = await supabaseClient.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (signIn.error || !signIn.data.session) {
    throw signIn.error ?? new Error(`Failed to sign in ${user.email}`);
  }
}

async function main() {
  let user: RuntimeTestUser | null = null;

  const { supabase } = await import("../src/lib/supabaseClient");
  const requestsApi = await import("../src/lib/api/requests");
  const requestCompat = await import("../src/lib/catalog/catalog.request.service");

  try {
    user = await createTempUser(admin, {
      role: "foreman",
      fullName: "Requests Mutation Wave",
      emailPrefix: "requests-mutation-wave",
      userProfile: {
        usage_build: true,
      },
    });

    const oldIso = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const recentIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const marker = `[requests-mutation-wave:${Date.now().toString(36)}]`;

    const oldEmpty = await insertDraftRequest({
      userId: user.id,
      comment: `${marker}:old-empty`,
      createdAt: oldIso,
      updatedAt: oldIso,
    });
    const reusableDraft = await insertDraftRequest({
      userId: user.id,
      comment: `${marker}:reusable`,
      createdAt: recentIso,
      updatedAt: recentIso,
    });
    const reconcileDraft = await insertDraftRequest({
      userId: user.id,
      comment: `${marker}:reconcile`,
      createdAt: recentIso,
      updatedAt: recentIso,
    });

    await signInTempUser(user, supabase);
    requestsApi.clearCachedDraftRequestId();
    requestCompat.clearLocalDraftId();

    const created = await requestsApi.requestCreateDraft({
      comment: `${marker}:meta-applied`,
      foreman_name: "Requests Mutation Wave",
    });
    const createdId = trim(created?.id);

    requestsApi.clearCachedDraftRequestId();
    requestCompat.clearLocalDraftId();
    const lowLevelDraftId = trim(await requestsApi.getOrCreateDraftRequestId());
    requestCompat.clearLocalDraftId();
    requestsApi.clearCachedDraftRequestId();
    const compatDraftId = trim(await requestCompat.getOrCreateDraftRequestId());

    const addedItem = await requestsApi.addRequestItemFromRikDetailed(
      trim(reusableDraft.id),
      `REQ-MW-${Date.now().toString(36).toUpperCase()}`,
      2,
      {
        name_human: `${marker}:item`,
        uom: "pcs",
        note: `${marker}:item`,
      },
    );

    const submitResult = await requestsApi.requestSubmitMutation(trim(reusableDraft.id));
    const submittedStatus = trim(submitResult.record?.status);

    const reconcileItem = await requestsApi.addRequestItemFromRikDetailed(
      trim(reconcileDraft.id),
      `REQ-MW-RC-${Date.now().toString(36).toUpperCase()}`,
      1,
      {
        name_human: `${marker}:reconcile-item`,
        uom: "pcs",
        note: `${marker}:reconcile-item`,
      },
    );
    await admin
      .from("request_items")
      .update({ status: REQUEST_APPROVED_STATUS })
      .eq("id", trim(reconcileItem.item_id))
      .throwOnError();
    const reconcileResult = await requestsApi.requestSubmitMutation(trim(reconcileDraft.id));
    const reconciledStatus = trim(reconcileResult.record?.status);

    let controlledFailureMessage = "";
    try {
      await requestsApi.requestSubmitMutation("00000000-0000-0000-0000-000000000404");
    } catch (error) {
      controlledFailureMessage = trim(error instanceof Error ? error.message : error);
    }

    requestsApi.clearCachedDraftRequestId();
    requestCompat.clearLocalDraftId();
    const postSubmitDraftId = trim(await requestsApi.getOrCreateDraftRequestId());

    const reopenResult = await requestsApi.requestReopen(trim(reusableDraft.id));
    const reopenedStatus = trim(reopenResult?.status);

    const reusedExistingDraftOk =
      Boolean(createdId) &&
      createdId !== trim(oldEmpty.id) &&
      lowLevelDraftId === createdId &&
      compatDraftId === createdId;

    const summary = {
      status:
        reusedExistingDraftOk &&
        trim(created?.comment) === `${marker}:meta-applied` &&
        Boolean(trim(addedItem.item_id)) &&
        trim(submitResult.request_id) === trim(reusableDraft.id) &&
        submitResult.path === "rpc_submit" &&
        submittedStatus.toLowerCase().includes("pending") &&
        trim(reconcileResult.request_id) === trim(reconcileDraft.id) &&
        reconcileResult.path === "server_reconcile_existing" &&
        reconcileResult.has_post_draft_items === true &&
        reconciledStatus.length > 0 &&
        controlledFailureMessage.includes("Request not found.") &&
        Boolean(postSubmitDraftId) &&
        postSubmitDraftId !== trim(reusableDraft.id) &&
        trim(reopenResult?.id) === trim(reusableDraft.id) &&
        reopenedStatus.length > 0
          ? "GREEN"
          : "NOT GREEN",
      inventory: {
        reusedDraftId: trim(reusableDraft.id),
        reconcileDraftId: trim(reconcileDraft.id),
        protectedOldDraftId: trim(oldEmpty.id),
      },
      flow: {
        requestCreateDraft: {
          requestId: createdId,
          reusedExistingDraft: reusedExistingDraftOk,
          appliedMeta: trim(created?.comment) === `${marker}:meta-applied`,
        },
        getOrCreateDraftRequestId: {
          lowLevelDraftId,
          compatDraftId,
          reusedExistingDraft: reusedExistingDraftOk,
        },
        submit: {
          requestId: trim(submitResult.request_id),
          path: submitResult.path,
          status: submittedStatus,
          itemId: trim(addedItem.item_id),
        },
        reconcileExisting: {
          requestId: trim(reconcileResult.request_id),
          path: reconcileResult.path,
          status: reconciledStatus,
          itemId: trim(reconcileItem.item_id),
        },
        controlledFailure: {
          requestId: "00000000-0000-0000-0000-000000000404",
          message: controlledFailureMessage,
          requestNotFound: controlledFailureMessage.includes("Request not found."),
        },
        postSubmitCreate: {
          postSubmitDraftId,
          createdFreshDraft: postSubmitDraftId !== trim(reusableDraft.id),
        },
        reopen: {
          requestId: trim(reopenResult?.id),
          status: reopenedStatus,
          reopenedSameRequest: trim(reopenResult?.id) === trim(reusableDraft.id),
        },
      },
    };

    writeJson("artifacts/requests-mutation-wave-summary.json", summary);
    console.log(JSON.stringify(summary, null, 2));

    if (summary.status !== "GREEN") {
      process.exitCode = 1;
    }
  } finally {
    requestsApi.clearCachedDraftRequestId();
    requestCompat.clearLocalDraftId();
    await supabase.auth.signOut().catch(() => {});
    if (user) {
      await cleanupSeedRows(user.id).catch(() => {});
    }
    await cleanupTempUser(admin, user).catch(() => {});
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
