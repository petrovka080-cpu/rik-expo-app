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

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const artifactPath = path.join(projectRoot, "artifacts/pdf-permission-drift-proof.json");
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const admin = createVerifierAdmin("pdf-permission-drift-verify");

const writeJson = (payload: unknown) => {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const trimText = (value: unknown) => String(value ?? "").trim();
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

async function createMembershipCompany(ownerUserId: string) {
  const result = await admin
    .from("companies")
    .insert({
      owner_user_id: ownerUserId,
      name: `Runtime PDF Drift Company ${Date.now().toString(36).toUpperCase()}`,
    })
    .select("id")
    .single();
  if (result.error || !result.data) {
    throw result.error ?? new Error("Failed to create PDF drift company");
  }

  const companyId = trimText(result.data.id);
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

async function attachCompanyMember(companyId: string, userId: string, role: "foreman" | "warehouse") {
  const result = await admin.from("company_members").upsert(
    {
      company_id: companyId,
      user_id: userId,
      role,
    },
    { onConflict: "company_id,user_id" },
  );
  if (result.error) throw result.error;
}

async function signIn(user: RuntimeTestUser) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "pdf-permission-drift-client",
      },
    },
  });
  const signInResult = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (signInResult.error || !signInResult.data.session) {
    throw signInResult.error ?? new Error(`signInWithPassword returned no session for ${user.email}`);
  }
  return { client, session: signInResult.data.session };
}

async function readRoleProbe(client: any, userId: string) {
  const [{ data: authUser, error: authError }, { data: rpcRole, error: rpcError }, memberships] = await Promise.all([
    client.auth.getUser(),
    client.rpc("get_my_role"),
    client.from("company_members").select("company_id,role").eq("user_id", userId),
  ]);
  if (authError) throw authError;
  if (rpcError) throw rpcError;
  return {
    authUserId: trimText(authUser.user?.id),
    appMetadataRole: trimText(asRecord(authUser.user?.app_metadata).role) || null,
    rpcRole: trimText(rpcRole) || null,
    companyMemberships: Array.isArray(memberships.data)
      ? memberships.data.map((row: any) => ({
          companyId: trimText(row.company_id) || null,
          role: trimText(row.role) || null,
        }))
      : [],
  };
}

async function invokeFunction(args: {
  session: { access_token: string };
  functionName: "foreman-request-pdf" | "warehouse-pdf";
  body: Record<string, unknown>;
}) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${args.functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.session.access_token}`,
      apikey: anonKey,
      "Content-Type": "application/json",
      "x-client-info": "pdf-permission-drift-fetch",
    },
    body: JSON.stringify(args.body),
  });
  const raw = await response.text();
  let payload: unknown = null;
  try {
    payload = raw.trim() ? JSON.parse(raw) : null;
  } catch {
    payload = raw;
  }
  return {
    status: response.status,
    payload,
    signedUrl:
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? trimText((payload as Record<string, unknown>).signedUrl) || null
        : null,
    sourceKind:
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? trimText((payload as Record<string, unknown>).sourceKind) || null
        : null,
  };
}

async function probeRequestOwnership(client: any, requestId: string) {
  const result = await client
    .from("requests")
    .select("id, created_by")
    .eq("id", requestId)
    .maybeSingle();

  return {
    error: result.error
      ? {
          message: trimText(result.error.message) || null,
          code: trimText((result.error as { code?: unknown }).code) || null,
          details: trimText((result.error as { details?: unknown }).details) || null,
          hint: trimText((result.error as { hint?: unknown }).hint) || null,
        }
      : null,
    row: result.data
      ? {
          id: trimText(result.data.id) || null,
          createdBy: trimText((result.data as { created_by?: unknown }).created_by) || null,
        }
      : null,
  };
}

async function main() {
  let companyOwner: RuntimeTestUser | null = null;
  let foremanUser: RuntimeTestUser | null = null;
  let warehouseUser: RuntimeTestUser | null = null;
  let companyId: string | null = null;
  let requestId: string | null = null;

  try {
    companyOwner = await createTempUser(admin, {
      role: "director",
      fullName: "PDF Drift Company Owner",
      emailPrefix: "pdf.drift.owner",
      userProfile: {
        usage_build: true,
      },
    });
    companyId = await createMembershipCompany(companyOwner.id);

    foremanUser = await createTempUser(admin, {
      role: "director",
      fullName: "PDF Drift Foreman",
      emailPrefix: "pdf.drift.foreman",
      userProfile: {
        usage_build: true,
      },
    });
    await attachCompanyMember(companyId, foremanUser.id, "foreman");

    warehouseUser = await createTempUser(admin, {
      role: "director",
      fullName: "PDF Drift Warehouse",
      emailPrefix: "pdf.drift.warehouse",
      userProfile: {
        usage_build: true,
      },
    });
    await attachCompanyMember(companyId, warehouseUser.id, "warehouse");

    const requestInsert = await admin
      .from("requests")
      .insert({
        created_by: foremanUser.id,
        foreman_name: foremanUser.displayLabel,
        display_no: `REQ-DRIFT-${Date.now().toString(36).toUpperCase()}`,
        status: "pending",
      })
      .select("id")
      .single();
    if (requestInsert.error || !requestInsert.data) {
      throw requestInsert.error ?? new Error("Unable to insert drift foreman request");
    }
    requestId = trimText(requestInsert.data.id);

    const foremanAuth = await signIn(foremanUser);
    const warehouseAuth = await signIn(warehouseUser);

    const [foremanRoleProbe, warehouseRoleProbe] = await Promise.all([
      readRoleProbe(foremanAuth.client, foremanUser.id),
      readRoleProbe(warehouseAuth.client, warehouseUser.id),
    ]);

    const foremanRequestProbe = await probeRequestOwnership(foremanAuth.client, requestId);

    const [foremanInvoke, warehouseInvoke] = await Promise.all([
      invokeFunction({
        session: foremanAuth.session,
        functionName: "foreman-request-pdf",
        body: {
          version: "v1",
          role: "foreman",
          documentType: "request",
          requestId,
          generatedBy: foremanUser.displayLabel,
        },
      }),
      invokeFunction({
        session: warehouseAuth.session,
        functionName: "warehouse-pdf",
        body: {
          version: "v1",
          role: "warehouse",
          documentType: "warehouse_register",
          documentKind: "issue_register",
          periodFrom: null,
          periodTo: null,
          generatedBy: warehouseUser.displayLabel,
          companyName: "Runtime PDF Drift Company",
          warehouseName: "Runtime Warehouse",
        },
      }),
    ]);

    writeJson({
      status:
        foremanInvoke.status === 200
        && warehouseInvoke.status === 200
        && Boolean(foremanInvoke.signedUrl)
        && Boolean(warehouseInvoke.signedUrl)
          ? "GREEN"
          : "NOT_GREEN",
      checkedAt: new Date().toISOString(),
      companyId,
      foreman: {
        userId: foremanUser.id,
        roleProbe: foremanRoleProbe,
        requestProbe: foremanRequestProbe,
        invoke: foremanInvoke,
      },
      warehouse: {
        userId: warehouseUser.id,
        roleProbe: warehouseRoleProbe,
        invoke: warehouseInvoke,
      },
    });
  } finally {
    if (requestId) {
      try {
        await admin.from("requests").delete().eq("id", requestId);
      } catch {
        // Cleanup failure should not hide the proof result.
      }
    }
    if (companyId) {
      try {
        await admin.from("company_members").delete().eq("company_id", companyId);
      } catch {
        // Cleanup failure should not hide the proof result.
      }
      try {
        await admin.from("companies").delete().eq("id", companyId);
      } catch {
        // Cleanup failure should not hide the proof result.
      }
    }
    try {
      await cleanupTempUser(admin, foremanUser);
    } catch {
      // Cleanup failure should not hide the proof result.
    }
    try {
      await cleanupTempUser(admin, warehouseUser);
    } catch {
      // Cleanup failure should not hide the proof result.
    }
    try {
      await cleanupTempUser(admin, companyOwner);
    } catch {
      // Cleanup failure should not hide the proof result.
    }
  }
}

void main();
