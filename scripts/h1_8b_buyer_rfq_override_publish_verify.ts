import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "./_shared/testUserDiscipline";
import { REQUEST_DRAFT_STATUS } from "../src/lib/api/requests.status";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

const artifactPath = path.join(process.cwd(), "artifacts/H1_8b_buyer_rfq_publish_runtime_proof.json");
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const admin = createVerifierAdmin("h1-8b-buyer-rfq-override-publish");

const toText = (value: unknown) => String(value ?? "").trim();
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const writeJson = (payload: unknown) => {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function poll<T>(label: string, fn: () => Promise<T | null>, timeoutMs = 20_000): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }
  if (lastError) throw lastError;
  throw new Error(`poll timeout: ${label}`);
}

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack ?? null };
  }
  const record = asRecord(error);
  return {
    name: toText(record.name) || null,
    message: toText(record.message) || String(error),
    code: toText(record.code) || null,
    details: toText(record.details) || null,
    hint: toText(record.hint) || null,
    raw: record,
  };
};

async function createAuthedClient(user: RuntimeTestUser) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const signIn = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (signIn.error || !signIn.data.session) {
    throw signIn.error ?? new Error(`signInWithPassword returned no session for ${user.email}`);
  }
  return client;
}

async function resolveApprovedRequestStatus() {
  const inbox = await admin.rpc("buyer_summary_inbox_scope_v1" as never, {
    p_offset: 0,
    p_limit: 1,
    p_search: null,
    p_company_id: null,
  } as never);
  if (inbox.error) throw inbox.error;

  const root = asRecord(inbox.data);
  const firstRow = Array.isArray(root.rows) ? (root.rows[0] as Record<string, unknown> | undefined) : undefined;
  const requestId = toText(firstRow?.request_id);
  if (!requestId) throw new Error("buyer_summary_inbox_scope_v1 returned no request row");

  const requestResult = await admin.from("requests").select("status").eq("id", requestId).single();
  if (requestResult.error) throw requestResult.error;
  const status = toText(requestResult.data?.status);
  if (!status) throw new Error("Approved request status probe returned empty status");
  return status;
}

async function seedVisibleRequestItem(user: RuntimeTestUser) {
  const marker = `H18B-RFQ-${Date.now().toString(36).toUpperCase()}`;
  const approvedStatus = await resolveApprovedRequestStatus();

  const requestInsert = await admin
    .from("requests")
    .insert({
      status: REQUEST_DRAFT_STATUS,
      display_no: `REQ-${marker}/2026`,
      object_name: marker,
      note: marker,
      created_by: user.id,
      requested_by: user.displayLabel,
    })
    .select("id, display_no")
    .single();
  if (requestInsert.error) throw requestInsert.error;

  const requestId = toText(requestInsert.data.id);
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
      note: marker,
    })
    .select("id")
    .single();
  if (itemInsert.error) throw itemInsert.error;

  const approve = await admin.from("requests").update({ status: approvedStatus }).eq("id", requestId);
  if (approve.error) throw approve.error;

  return {
    marker,
    requestId,
    requestItemId: toText(itemInsert.data.id),
    displayNo: toText(requestInsert.data.display_no),
    approvedStatus,
  };
}

async function cleanup(scope: {
  user: RuntimeTestUser | null;
  requestId: string | null;
  requestItemId: string | null;
  tenderId: string | null;
}) {
  if (scope.tenderId) {
    await admin.from("tender_items").delete().eq("tender_id", scope.tenderId);
    await admin.from("tenders").delete().eq("id", scope.tenderId);
  }
  if (scope.requestItemId) {
    await admin.from("request_items").delete().eq("id", scope.requestItemId);
  }
  if (scope.requestId) {
    await admin.from("requests").delete().eq("id", scope.requestId);
  }
  if (scope.user) {
    await admin.from("developer_access_overrides").delete().eq("user_id", scope.user.id);
    await cleanupTempUser(admin, scope.user);
  }
}

async function main() {
  let user: RuntimeTestUser | null = null;
  let requestId: string | null = null;
  let requestItemId: string | null = null;
  let tenderId: string | null = null;
  let stage = "bootstrap";

  try {
    stage = "create_base_contractor_user";
    user = await createTempUser(admin, {
      role: "foreman",
      fullName: "H1.8b RFQ Override Verify",
      emailPrefix: "h18b.rfq.override",
      userProfile: {
        usage_build: true,
        usage_market: true,
        is_contractor: true,
      },
    });

    stage = "insert_override";
    const overrideInsert = await admin.from("developer_access_overrides").insert({
      user_id: user.id,
      is_enabled: true,
      allowed_roles: ["buyer"],
      active_effective_role: "buyer",
      can_access_all_office_routes: true,
      can_impersonate_for_mutations: true,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      reason: "H1.8b RFQ override runtime verifier",
    });
    if (overrideInsert.error) throw overrideInsert.error;

    stage = "sign_in";
    const client = await createAuthedClient(user);

    const baseRole = await (client as any).rpc("get_my_role");
    if (baseRole.error) throw baseRole.error;

    const actorContext = await (client as any).rpc("buyer_rfq_actor_context_v1");
    if (actorContext.error) throw actorContext.error;

    stage = "seed_request_item";
    const seeded = await seedVisibleRequestItem(user);
    requestId = seeded.requestId;
    requestItemId = seeded.requestItemId;

    stage = "wait_scope_visibility";
    await poll("buyer scope visibility under override", async () => {
      const scope = await (client as any).rpc("buyer_summary_inbox_scope_v1", {
        p_offset: 0,
        p_limit: 20,
        p_search: seeded.marker,
        p_company_id: null,
      });
      if (scope.error) throw scope.error;
      const rows = Array.isArray(asRecord(scope.data).rows)
        ? (asRecord(scope.data).rows as Record<string, unknown>[])
        : [];
      return rows.some((row) => toText(row.request_id) === seeded.requestId || toText(row.name_human) === seeded.marker)
        ? true
        : null;
    });

    stage = "publish_rfq";
    const publish = await (client as any).rpc("buyer_rfq_create_and_publish_v1", {
      p_request_item_ids: [seeded.requestItemId],
      p_deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      p_contact_phone: "700123456",
      p_contact_email: "buyer@example.com",
      p_contact_whatsapp: null,
      p_delivery_days: 2,
      p_radius_km: null,
      p_visibility: "open",
      p_city: "Bishkek",
      p_lat: null,
      p_lng: null,
      p_address_text: "Main street 1",
      p_address_place_id: null,
      p_note: `runtime ${seeded.marker}`,
    });
    if (publish.error) throw publish.error;

    tenderId = toText(publish.data);
    if (!tenderId) throw new Error("buyer_rfq_create_and_publish_v1 returned empty tender id");

    stage = "readback";
    const tender = await admin
      .from("tenders")
      .select("id,status,mode,created_by,note")
      .eq("id", tenderId)
      .single();
    if (tender.error) throw tender.error;

    const tenderItems = await admin
      .from("tender_items")
      .select("id,tender_id,request_item_id")
      .eq("tender_id", tenderId);
    if (tenderItems.error) throw tenderItems.error;

    const proof = {
      status: "GREEN",
      checkedAt: new Date().toISOString(),
      stage,
      user: { id: user.id, email: user.email },
      baseRole: baseRole.data,
      overrideSetup: "active_effective_role=buyer inserted server-side by verifier",
      actorContext: actorContext.data,
      seeded,
      tender: tender.data,
      tenderItems: tenderItems.data ?? [],
      invariants: {
        baseRoleIsNotBuyer: toText(baseRole.data).toLowerCase() !== "buyer",
        actorContextUsesDeveloperOverride: toText(asRecord(actorContext.data).source) === "developer_override",
        actorContextRoleBuyer: toText(asRecord(actorContext.data).role) === "buyer",
        actorContextAllowed: asRecord(actorContext.data).allowed === true,
        tenderCreated: Boolean(tender.data?.id),
        tenderPublished: toText(tender.data?.status).toLowerCase() === "published",
        tenderModeRfq: toText(tender.data?.mode).toLowerCase() === "rfq",
        tenderCreatedByOverrideActor: toText(tender.data?.created_by) === user.id,
        tenderItemLinked: (tenderItems.data ?? []).some(
          (row) => toText(row.request_item_id) === seeded.requestItemId,
        ),
      },
    };

    writeJson(proof);
    console.log(JSON.stringify({
      status: proof.status,
      proofPath: artifactPath,
      invariants: proof.invariants,
    }, null, 2));
  } catch (error) {
    writeJson({
      status: "NOT_GREEN",
      checkedAt: new Date().toISOString(),
      stage,
      user: user ? { id: user.id, email: user.email } : null,
      requestId,
      requestItemId,
      tenderId,
      error: serializeError(error),
    });
    throw error;
  } finally {
    await cleanup({ user, requestId, requestItemId, tenderId });
  }
}

void main();
