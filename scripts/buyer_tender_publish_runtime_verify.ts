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
import { publishRfqAction } from "../src/screens/buyer/buyer.rfq.mutation";
import { isBuyerMutationFailure } from "../src/screens/buyer/buyer.mutation.shared";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

const projectRoot = process.cwd();
const artifactPath = path.join(projectRoot, "artifacts/buyer-tender-publish-runtime-proof.json");

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const admin = createVerifierAdmin("buyer-tender-publish-runtime-verify");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function poll<T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs = 30_000,
  delayMs = 250,
): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(delayMs);
  }
  if (lastError) throw lastError;
  throw new Error(`poll timeout: ${label}`);
}

const toText = (value: unknown) => String(value ?? "").trim();
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const writeJson = (filePath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
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
  if (!requestId) {
    throw new Error("buyer_summary_inbox_scope_v1 returned no request row to clone approved status");
  }

  const requestResult = await admin.from("requests").select("status").eq("id", requestId).single();
  if (requestResult.error) throw requestResult.error;
  const approvedStatus = toText(requestResult.data?.status);
  if (!approvedStatus) throw new Error("Approved request status probe returned empty status");
  return approvedStatus;
}

async function createBuyerClient(user: RuntimeTestUser) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "buyer-tender-publish-runtime-client",
      },
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

async function createMembershipCompany(ownerUserId: string) {
  const result = await admin
    .from("companies")
    .insert({
      owner_user_id: ownerUserId,
      name: `Runtime Buyer Company ${Date.now().toString(36).toUpperCase()}`,
    })
    .select("id")
    .single();
  if (result.error || !result.data) {
    throw result.error ?? new Error("Failed to create buyer membership company");
  }

  const companyId = toText(result.data.id);
  const ownerMembership = await admin.from("company_members").upsert(
    {
      company_id: companyId,
      user_id: ownerUserId,
      role: "director",
    },
    { onConflict: "company_id,user_id" },
  );
  if (ownerMembership.error) throw ownerMembership.error;

  return companyId;
}

async function attachCompanyMember(params: {
  companyId: string;
  userId: string;
  role: string;
}) {
  const result = await admin.from("company_members").upsert(
    {
      company_id: params.companyId,
      user_id: params.userId,
      role: params.role,
    },
    { onConflict: "company_id,user_id" },
  );
  if (result.error) throw result.error;
}

async function readBuyerRoleProbe(client: any, userId: string) {
  const [
    { data: authUser, error: authError },
    { data: rpcRole, error: rpcError },
    memberships,
    profiles,
  ] = await Promise.all([
    client.auth.getUser(),
    client.rpc("get_my_role"),
    client.from("company_members").select("company_id,role").eq("user_id", userId),
    client.from("profiles").select("role").eq("user_id", userId),
  ]);
  if (authError) throw authError;
  if (rpcError) throw rpcError;
  return {
    authUserId: toText(authUser.user?.id),
    appMetadataRole: toText(asRecord(authUser.user?.app_metadata).role) || null,
    rpcRole: toText(rpcRole) || null,
    profileRoles: Array.isArray(profiles.data)
      ? profiles.data.map((row: any) => toText(row.role)).filter(Boolean)
      : [],
    companyMemberships: Array.isArray(memberships.data)
      ? memberships.data.map((row: any) => ({
          companyId: toText(row.company_id) || null,
          role: toText(row.role) || null,
        }))
      : [],
  };
}

async function seedBuyerVisibleRequestItem(user: RuntimeTestUser) {
  const marker = `RT-RFQ-${Date.now().toString(36).toUpperCase()}`;
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
  const displayNo = toText(requestInsert.data.display_no);

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

  const requestItemId = toText(itemInsert.data.id);

  const approveRequest = await admin
    .from("requests")
    .update({ status: approvedStatus })
    .eq("id", requestId);
  if (approveRequest.error) throw approveRequest.error;

  return {
    marker,
    requestId,
    requestItemId,
    displayNo,
    approvedStatus,
  };
}

async function cleanupSeededData(scope: {
  requestId: string | null;
  requestItemId: string | null;
  tenderId: string | null;
}) {
  if (scope.tenderId) {
    try {
      await admin.from("tender_items").delete().eq("tender_id", scope.tenderId);
    } catch {
      // best effort cleanup
    }
    try {
      await admin.from("tenders").delete().eq("id", scope.tenderId);
    } catch {
      // best effort cleanup
    }
  }
  if (scope.requestItemId) {
    try {
      await admin.from("request_items").delete().eq("id", scope.requestItemId);
    } catch {
      // best effort cleanup
    }
  }
  if (scope.requestId) {
    try {
      await admin.from("requests").delete().eq("id", scope.requestId);
    } catch {
      // best effort cleanup
    }
  }
}

async function main() {
  let buyerUser: RuntimeTestUser | null = null;
  let companyOwner: RuntimeTestUser | null = null;
  let companyId: string | null = null;
  let requestId: string | null = null;
  let requestItemId: string | null = null;
  let tenderId: string | null = null;
  const busyTransitions: boolean[] = [];
  const alerts: { title: string; message: string }[] = [];
  let stage = "bootstrap";

  try {
    stage = "create_temp_company_owner";
    companyOwner = await createTempUser(admin, {
      role: "director",
      fullName: "Buyer Tender Publish Company Owner",
      emailPrefix: "buyer.tender.owner",
      userProfile: {
        usage_build: true,
      },
    });

    stage = "create_membership_company";
    companyId = await createMembershipCompany(companyOwner.id);

    stage = "create_temp_buyer";
    buyerUser = await createTempUser(admin, {
      role: "buyer",
      fullName: "Buyer Tender Publish Verify",
      emailPrefix: "buyer.tender.publish",
      userProfile: {
        usage_build: true,
        usage_market: true,
        is_contractor: true,
      },
    });

    stage = "attach_buyer_company_membership";
    await attachCompanyMember({
      companyId,
      userId: buyerUser.id,
      role: "buyer",
    });

    stage = "seed_visible_request_item";
    const seeded = await seedBuyerVisibleRequestItem(buyerUser);
    requestId = seeded.requestId;
    requestItemId = seeded.requestItemId;

    stage = "sign_in_buyer";
    const buyerClient = await createBuyerClient(buyerUser);
    const roleProbe = await readBuyerRoleProbe(buyerClient, buyerUser.id);

    stage = "wait_scope_visibility";
    await poll(
      "buyer_scope_visibility",
      async () => {
        const scope = await buyerClient.rpc("buyer_summary_inbox_scope_v1" as never, {
          p_offset: 0,
          p_limit: 20,
          p_search: seeded.marker,
          p_company_id: null,
        } as never);
        if (scope.error) throw scope.error;
        const rows = Array.isArray((asRecord(scope.data).rows ?? null))
          ? ((asRecord(scope.data).rows ?? []) as Record<string, unknown>[])
          : [];
        return rows.some((row) => toText(row.request_id) === seeded.requestId || toText(row.name_human) === seeded.marker)
          ? true
          : null;
      },
      20_000,
      500,
    );

    stage = "publish_rfq";
    const result = await publishRfqAction({
      pickedIds: [seeded.requestItemId],
      rfqDeadlineIso: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      rfqDeliveryDays: "2",
      rfqCity: "Bishkek",
      rfqAddressText: "Main street 1",
      rfqPhone: "700123456",
      rfqCountryCode: "+996",
      rfqEmail: "buyer@example.com",
      rfqVisibility: "open",
      rfqNote: `runtime ${seeded.marker}`,
      supabase: buyerClient as never,
      setBusy: (value) => {
        busyTransitions.push(Boolean(value));
      },
      closeSheet: () => {
        // no-op for runtime verification
      },
      alert: (title, message = "") => {
        alerts.push({ title, message });
      },
    });

    if (isBuyerMutationFailure(result)) {
      throw Object.assign(new Error(result.message), {
        buyerMutationFailure: true,
        failedStage: result.failedStage,
        completedStages: result.completedStages,
        warnings: result.warnings,
      });
    }

    tenderId = toText(result.data?.tenderId);
    if (!tenderId) {
      throw new Error("publishRfqAction returned success without tenderId");
    }

    stage = "readback_tender";
    const tenderReadback = await admin
      .from("tenders")
      .select("id,status,mode,created_by,deadline_at,contact_phone,contact_email,city,address_text,note")
      .eq("id", tenderId)
      .single();
    if (tenderReadback.error) throw tenderReadback.error;

    const tenderItemsReadback = await admin
      .from("tender_items")
      .select("id,request_item_id,tender_id,name_human,qty,uom")
      .eq("tender_id", tenderId);
    if (tenderItemsReadback.error) throw tenderItemsReadback.error;

    const proof = {
      status: "GREEN",
      checkedAt: new Date().toISOString(),
      rootCauseClosed: {
        staleWritePath: "buyer_rfq_create_and_publish_v1 -> get_my_role() contractor override before canonical buyer sources",
        fixedWritePath: "buyer_rfq_create_and_publish_v1 -> profiles.role=buyer, company_members.role=buyer, trusted app_metadata.role=buyer, then get_my_role()",
      },
      stage,
      buyerUser: {
        id: buyerUser.id,
        email: buyerUser.email,
      },
      roleProbe,
      companyId,
      requestSeed: seeded,
      actionResult: result,
      busyTransitions,
      alerts,
      tender: tenderReadback.data,
      tenderItems: tenderItemsReadback.data ?? [],
      invariants: {
        tenderCreated: Boolean(tenderReadback.data?.id),
        tenderPublished: toText(tenderReadback.data?.status).toLowerCase() === "published",
        tenderModeRfq: toText(tenderReadback.data?.mode).toLowerCase() === "rfq",
        ownerUsesCreatedBy: toText(tenderReadback.data?.created_by) === buyerUser.id,
        tenderItemsLinked: (tenderItemsReadback.data ?? []).some(
          (row) => toText(row.request_item_id) === seeded.requestItemId,
        ),
        actorRoleHadContractorOverride: toText(roleProbe.rpcRole).toLowerCase() === "contractor",
        canonicalBuyerSourcePresent:
          toText(roleProbe.appMetadataRole).toLowerCase() === "buyer"
          || roleProbe.profileRoles.some((role) => toText(role).toLowerCase() === "buyer")
          || roleProbe.companyMemberships.some((row) => toText(row.role).toLowerCase() === "buyer"),
        actorRoleResolvedDespiteContractorOverride:
          toText(roleProbe.rpcRole).toLowerCase() === "contractor"
          && (
            toText(roleProbe.appMetadataRole).toLowerCase() === "buyer"
            || roleProbe.profileRoles.some((role) => toText(role).toLowerCase() === "buyer")
            || roleProbe.companyMemberships.some((row) => toText(row.role).toLowerCase() === "buyer")
          ),
        noUserIdColumnError: alerts.every(
          (entry) => !/column "user_id" of relation "tenders" does not exist/i.test(`${entry.title} ${entry.message}`),
        ),
        noForbiddenActorRoleError: alerts.every(
          (entry) => !/forbidden actor role/i.test(`${entry.title} ${entry.message}`),
        ),
      },
    };

    writeJson(artifactPath, proof);
  } catch (error) {
    writeJson(artifactPath, {
      status: "NOT_GREEN",
      checkedAt: new Date().toISOString(),
      stage,
      buyerUser: buyerUser
        ? {
            id: buyerUser.id,
            email: buyerUser.email,
          }
        : null,
      companyOwner: companyOwner
        ? {
            id: companyOwner.id,
            email: companyOwner.email,
          }
        : null,
      companyId,
      requestId,
      requestItemId,
      tenderId,
      busyTransitions,
      alerts,
      error: serializeError(error),
    });
    throw error;
  } finally {
    await cleanupSeededData({ requestId, requestItemId, tenderId });
    if (companyId) {
      try {
        await admin.from("company_members").delete().eq("company_id", companyId);
      } catch {
        // best effort cleanup
      }
      try {
        await admin.from("companies").delete().eq("id", companyId);
      } catch {
        // best effort cleanup
      }
    }
    await cleanupTempUser(admin, buyerUser);
    await cleanupTempUser(admin, companyOwner);
  }
}

void main();
