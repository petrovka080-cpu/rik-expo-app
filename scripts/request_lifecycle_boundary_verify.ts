import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

type JsonRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const artifactPath = path.join(projectRoot, "artifacts", "request-lifecycle-boundary-smoke.json");

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const createAdminClient = (clientInfo: string): SupabaseClient =>
  createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-client-info": clientInfo } },
  });

const admin = createAdminClient("request-lifecycle-boundary-verify");
const secondDevice = createAdminClient("request-lifecycle-boundary-verify-second-device");

const trim = (value: unknown) => String(value ?? "").trim();
const toStatusNorm = (value: unknown) => trim(value).toLowerCase().replace(/\s+/g, " ");
const nowTag = Date.now().toString(36);
const knownRikCode = "WRK-MASONRY-BRICK";

const writeJson = (filePath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
};

const includesMessage = (value: unknown, needle: string) =>
  String(value ?? "").toLowerCase().includes(needle.toLowerCase());

const asRecord = (value: unknown): JsonRecord => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as JsonRecord;
  return {};
};

const collectRequestState = async (requestId: string) => {
  const requestResult = await admin
    .from("requests")
    .select("id,status,submitted_at,comment,display_no")
    .eq("id", requestId)
    .maybeSingle();
  if (requestResult.error) throw requestResult.error;

  const itemsResult = await admin
    .from("request_items")
    .select("id,request_id,status,qty,note,app_code,kind,name_human,uom,cancelled_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (itemsResult.error) throw itemsResult.error;

  const requestRow = asRecord(requestResult.data);
  const itemRows = Array.isArray(itemsResult.data) ? (itemsResult.data as JsonRecord[]) : [];
  return {
    request: requestRow,
    items: itemRows,
  };
};

const callDraftSync = async (
  client: SupabaseClient,
  params: {
    requestId?: string | null;
    submit?: boolean;
    qty: number;
    requestItemId?: string | null;
    comment?: string | null;
  },
) => {
  const { data, error } = await client.rpc("request_sync_draft_v2", {
    p_request_id: params.requestId ?? null,
    p_submit: params.submit === true,
    p_foreman_name: `Wave1C Verify ${nowTag}`,
    p_comment: params.comment ?? `wave1c-${nowTag}`,
    p_items: [
      {
        request_item_id: params.requestItemId ?? null,
        rik_code: knownRikCode,
        qty: params.qty,
        note: `wave1c-note-${nowTag}`,
        app_code: null,
        kind: "material",
        name_human: "Wave 1C Verify Item",
        uom: "pcs",
      },
    ],
    p_pending_delete_ids: [],
  });

  return { data, error };
};

const callRequestReopen = async (client: SupabaseClient, requestId: string) => {
  const { data, error } = await client.rpc("request_reopen_atomic_v1", {
    p_request_id_text: requestId,
  });
  return { data, error };
};

async function main() {
  const createResult = await callDraftSync(admin, {
    requestId: null,
    submit: false,
    qty: 2,
    comment: `wave1c-create-${nowTag}`,
  });
  if (createResult.error) {
    throw new Error(`request_sync_draft_v2 draft create failed: ${createResult.error.message}`);
  }

  const createPayload = asRecord(createResult.data);
  const createRequest = asRecord(createPayload.request_payload);
  const createMeta = asRecord(createPayload.meta);
  const createItems = Array.isArray(createPayload.items_payload)
    ? (createPayload.items_payload as JsonRecord[])
    : [];

  const requestId = trim(createRequest.id);
  const requestItemId = trim(createItems[0]?.id);
  if (!requestId || !requestItemId) {
    throw new Error("request_sync_draft_v2 draft create returned incomplete request/item identity");
  }

  const submitResult = await callDraftSync(admin, {
    requestId,
    requestItemId,
    submit: true,
    qty: 2,
    comment: `wave1c-submit-${nowTag}`,
  });
  if (submitResult.error) {
    throw new Error(`request_sync_draft_v2 submit failed: ${submitResult.error.message}`);
  }

  const submitPayload = asRecord(submitResult.data);
  const submitRequest = asRecord(submitPayload.request_payload);
  const submitMeta = asRecord(submitPayload.meta);

  const directEdit = await admin
    .from("requests")
    .update({ comment: `illegal-edit-${nowTag}` })
    .eq("id", requestId)
    .select("id")
    .maybeSingle();

  const directDelete = await admin.from("request_items").delete().eq("id", requestItemId);

  const staleSyncAttempt = await callDraftSync(admin, {
    requestId,
    requestItemId,
    submit: false,
    qty: 9,
    comment: `wave1c-stale-${nowTag}`,
  });

  const secondDeviceAttempt = await callDraftSync(secondDevice, {
    requestId,
    requestItemId,
    submit: false,
    qty: 11,
    comment: `wave1c-second-device-${nowTag}`,
  });

  const secondDeviceDirectItemUpdate = await secondDevice
    .from("request_items")
    .update({ qty: 13 })
    .eq("id", requestItemId)
    .select("id")
    .maybeSingle();

  const lockedState = await collectRequestState(requestId);
  const lockedStatusNorm = toStatusNorm(lockedState.request.status);
  const lockedItemStatusNorms = lockedState.items.map((row) => toStatusNorm(row.status));

  const lockedConsistency = {
    headIsNonDraft:
      lockedStatusNorm !== "" &&
      lockedStatusNorm !== "draft" &&
      !lockedStatusNorm.includes("черновик"),
    headHasSubmittedAt: trim(lockedState.request.submitted_at).length > 0,
    itemCountStable: lockedState.items.length === 1,
    itemStatusesNotDraftOrCancelled: lockedItemStatusNorms.every(
      (status) =>
        status !== "" &&
        status !== "draft" &&
        !status.includes("черновик") &&
        status !== "cancelled" &&
        status !== "canceled" &&
        !status.includes("отмен"),
    ),
  };

  const reopenAttempt = await callRequestReopen(admin, requestId);
  const reopenPayload = asRecord(reopenAttempt.data);
  const reopenedState = await collectRequestState(requestId);
  const reopenedStatusNorm = toStatusNorm(reopenedState.request.status);
  const reopenedItemStatusNorms = reopenedState.items.map((row) => toStatusNorm(row.status));
  const reopenConsistency = {
    headReturnedToDraft:
      reopenedStatusNorm === "draft" || reopenedStatusNorm.includes("черновик"),
    submittedAtCleared: trim(reopenedState.request.submitted_at).length === 0,
    itemStatusesReturnedToDraft: reopenedItemStatusNorms.every(
      (status) => status === "draft" || status.includes("черновик"),
    ),
  };

  const smoke = {
    gate: "request_lifecycle_boundary_verify",
    batch: "wave1c_request_lifecycle_boundary",
    canonicalSubmitBoundary: "request_sync_draft_v2 -> request_submit_atomic_v1",
    canonicalReopenBoundary: "request_reopen_atomic_v1",
    draftCreateSummary: {
      requestId,
      requestItemId,
      requestCreated: createPayload.request_created === true,
      submitted: createPayload.submitted === true,
      lineCount: Number(createMeta.line_count ?? 0),
      pendingDeleteCount: Number(createMeta.pending_delete_count ?? 0),
      status: trim(createRequest.status) || null,
    },
    submitResult: {
      submitted: submitPayload.submitted === true,
      status: trim(submitRequest.status) || null,
      submitOwner: trim(submitMeta.submit_owner) || null,
      submitPath: trim(submitMeta.submit_path) || null,
      submitVerification: asRecord(submitMeta.submit_verification),
    },
    postSubmitEditAttemptResult: {
      blocked: Boolean(directEdit.error),
      errorMessage: directEdit.error?.message ?? null,
    },
    postSubmitDeleteAttemptResult: {
      blocked: Boolean(directDelete.error),
      errorMessage: directDelete.error?.message ?? null,
    },
    staleSyncAttemptResult: {
      blocked: Boolean(staleSyncAttempt.error),
      errorMessage: staleSyncAttempt.error?.message ?? null,
    },
    secondDeviceMutationAttemptResult: {
      syncBlocked: Boolean(secondDeviceAttempt.error),
      syncErrorMessage: secondDeviceAttempt.error?.message ?? null,
      directItemUpdateBlocked: Boolean(secondDeviceDirectItemUpdate.error),
      directItemUpdateErrorMessage: secondDeviceDirectItemUpdate.error?.message ?? null,
    },
    headItemStatusConsistencyResult: lockedConsistency,
    explicitReopenResult: {
      succeeded: !reopenAttempt.error && reopenPayload.ok === true,
      transitionPath: trim(reopenPayload.transition_path) || null,
      restoredItemCount: Number(reopenPayload.restored_item_count ?? 0),
      errorMessage: reopenAttempt.error?.message ?? null,
      consistency: reopenConsistency,
    },
    finalLifecycleStatus: {
      requestStatus: trim(reopenedState.request.status) || null,
      submittedAt: trim(reopenedState.request.submitted_at) || null,
      itemStatuses: reopenedState.items.map((row) => ({
        id: trim(row.id),
        status: trim(row.status) || null,
        qty: Number(row.qty ?? 0),
      })),
    },
    green: false,
    status: "NOT GREEN",
  };

  smoke.green =
    smoke.submitResult.submitOwner === "request_submit_atomic_v1" &&
    smoke.submitResult.submitPath === "rpc_submit" &&
    smoke.postSubmitEditAttemptResult.blocked === true &&
    includesMessage(
      smoke.postSubmitEditAttemptResult.errorMessage,
      "request_lifecycle_guard: submitted_request_content_immutable",
    ) &&
    smoke.postSubmitDeleteAttemptResult.blocked === true &&
    includesMessage(
      smoke.postSubmitDeleteAttemptResult.errorMessage,
      "request_lifecycle_guard: submitted_request_item_delete_blocked",
    ) &&
    smoke.staleSyncAttemptResult.blocked === true &&
    includesMessage(
      smoke.staleSyncAttemptResult.errorMessage,
      "request_sync_draft_v2: stale_draft_against_submitted_request",
    ) &&
    smoke.secondDeviceMutationAttemptResult.syncBlocked === true &&
    includesMessage(
      smoke.secondDeviceMutationAttemptResult.syncErrorMessage,
      "request_sync_draft_v2: stale_draft_against_submitted_request",
    ) &&
    smoke.secondDeviceMutationAttemptResult.directItemUpdateBlocked === true &&
    includesMessage(
      smoke.secondDeviceMutationAttemptResult.directItemUpdateErrorMessage,
      "request_lifecycle_guard: submitted_request_item_content_immutable",
    ) &&
    smoke.explicitReopenResult.succeeded === true &&
    smoke.explicitReopenResult.transitionPath === "rpc_reopen" &&
    Object.values(lockedConsistency).every((value) => value === true) &&
    Object.values(reopenConsistency).every((value) => value === true);
  smoke.status = smoke.green ? "GREEN" : "NOT GREEN";

  writeJson(artifactPath, smoke);
  console.log(JSON.stringify(smoke, null, 2));

  if (!smoke.green) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  const payload = {
    gate: "request_lifecycle_boundary_verify",
    batch: "wave1c_request_lifecycle_boundary",
    status: "NOT GREEN",
    error: error instanceof Error ? error.message : String(error),
  };
  writeJson(artifactPath, payload);
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 1;
});
