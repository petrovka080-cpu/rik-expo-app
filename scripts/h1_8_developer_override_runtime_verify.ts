import fs from "fs";
import path from "path";
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_USER_ID = "9adc5ab1-31fa-41be-8a00-17eadbb37c39";
const TARGET_EMAIL = "petrovka080@gmail.com";
const ALL_ROLES = ["buyer", "director", "warehouse", "accountant", "foreman", "contractor"];

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env for H1.8 runtime verifier.");
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const artifactDir = path.join(process.cwd(), "artifacts");
const proofPath = path.join(artifactDir, "H1_8_runtime_proof.json");

const nowToken = () => Date.now().toString(36);

async function createSignedClient(email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error("sign in did not return user");
  return { client, user: data.user };
}

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });

  const tempEmail = `h1-8-dev-override.${nowToken()}@e.com`;
  const password = `H1_8_${nowToken()}_Aa1!`;
  const created = await admin.auth.admin.createUser({
    email: tempEmail,
    password,
    email_confirm: true,
    app_metadata: { role: "contractor" },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("user create failed");
  const tempUserId = created.data.user.id;

  const results: Record<string, unknown> = {};

  try {
    const targetOverride = await admin
      .from("developer_access_overrides")
      .select("user_id,is_enabled,allowed_roles,active_effective_role,can_access_all_office_routes,can_impersonate_for_mutations,expires_at,reason")
      .eq("user_id", TARGET_USER_ID)
      .maybeSingle();
    if (targetOverride.error) throw targetOverride.error;

    results.targetOverride = targetOverride.data;

    const targetRoles = Array.isArray(targetOverride.data?.allowed_roles)
      ? targetOverride.data.allowed_roles
      : [];
    const targetReady =
      targetOverride.data?.user_id === TARGET_USER_ID &&
      targetOverride.data?.is_enabled === true &&
      ALL_ROLES.every((role) => targetRoles.includes(role)) &&
      targetOverride.data?.can_access_all_office_routes === true &&
      targetOverride.data?.can_impersonate_for_mutations === true;

    const upsertTemp = await admin.from("developer_access_overrides").upsert({
      user_id: tempUserId,
      is_enabled: true,
      allowed_roles: ["buyer", "accountant"],
      active_effective_role: null,
      can_access_all_office_routes: true,
      can_impersonate_for_mutations: true,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      reason: "H1.8 runtime verifier temporary account",
    });
    if (upsertTemp.error) throw upsertTemp.error;

    const { client } = await createSignedClient(tempEmail, password);

    const initialContext = await (client as any).rpc("developer_override_context_v1");
    if (initialContext.error) throw initialContext.error;
    results.initialContext = initialContext.data;

    const setBuyer = await (client as any).rpc("developer_set_effective_role_v1", {
      p_effective_role: "buyer",
    });
    if (setBuyer.error) throw setBuyer.error;
    results.setBuyer = setBuyer.data;

    const buyerContext = await (client as any).rpc("app_actor_role_context_v1", {
      p_allowed_roles: ["buyer"],
    });
    if (buyerContext.error) throw buyerContext.error;
    results.buyerContext = buyerContext.data;

    const accountantDeniedWhileBuyer = await (client as any).rpc("app_actor_role_context_v1", {
      p_allowed_roles: ["accountant"],
    });
    if (accountantDeniedWhileBuyer.error) throw accountantDeniedWhileBuyer.error;
    results.accountantDeniedWhileBuyer = accountantDeniedWhileBuyer.data;

    const nonAllowedRole = await (client as any).rpc("developer_set_effective_role_v1", {
      p_effective_role: "warehouse",
    });
    results.nonAllowedRoleError = nonAllowedRole.error
      ? {
          code: nonAllowedRole.error.code,
          message: nonAllowedRole.error.message,
        }
      : null;

    const setAccountant = await (client as any).rpc("developer_set_effective_role_v1", {
      p_effective_role: "accountant",
    });
    if (setAccountant.error) throw setAccountant.error;
    results.setAccountant = setAccountant.data;

    const accountantContext = await (client as any).rpc("app_actor_role_context_v1", {
      p_allowed_roles: ["accountant"],
    });
    if (accountantContext.error) throw accountantContext.error;
    results.accountantContext = accountantContext.data;

    const clearContext = await (client as any).rpc("developer_clear_effective_role_v1");
    if (clearContext.error) throw clearContext.error;
    results.clearContext = clearContext.data;

    const inactiveBuyerContext = await (client as any).rpc("app_actor_role_context_v1", {
      p_allowed_roles: ["buyer"],
    });
    if (inactiveBuyerContext.error) throw inactiveBuyerContext.error;
    results.inactiveBuyerContext = inactiveBuyerContext.data;

    const auditRows = await admin
      .from("developer_override_audit_log")
      .select("actor_user_id,effective_role,override_enabled,action_name,created_at")
      .eq("actor_user_id", tempUserId)
      .order("created_at", { ascending: true });
    if (auditRows.error) throw auditRows.error;
    results.auditRows = auditRows.data;

    await admin.from("developer_access_overrides").update({
      expires_at: new Date(Date.now() - 60_000).toISOString(),
      active_effective_role: "buyer",
    }).eq("user_id", tempUserId);

    const expiredContext = await (client as any).rpc("developer_override_context_v1");
    if (expiredContext.error) throw expiredContext.error;
    results.expiredContext = expiredContext.data;

    const invariants = {
      targetOverrideReady: targetReady,
      onlyTempRowCanUseTempOverride: initialContext.data?.actorUserId === tempUserId,
      buyerRoleAllowed: buyerContext.data?.source === "developer_override" && buyerContext.data?.allowed === true,
      accountantDeniedWhileBuyer:
        accountantDeniedWhileBuyer.data?.source === "developer_override" &&
        accountantDeniedWhileBuyer.data?.allowed === false,
      nonAllowedRoleDenied: nonAllowedRole.error?.code === "42501",
      accountantRoleAllowed:
        accountantContext.data?.source === "developer_override" &&
        accountantContext.data?.allowed === true,
      disableReturnsToNormal:
        clearContext.data?.isActive === false &&
        inactiveBuyerContext.data?.source !== "developer_override",
      expiredOverrideDenied: expiredContext.data?.isActive === false,
      auditLogged: Array.isArray(auditRows.data) && auditRows.data.length >= 4,
    };

    const status = Object.values(invariants).every(Boolean) ? "GREEN" : "NOT_GREEN";
    const proof = {
      status,
      checkedAt: new Date().toISOString(),
      targetUser: {
        id: TARGET_USER_ID,
        email: TARGET_EMAIL,
      },
      testedRoles: ["buyer", "accountant"],
      availableRoles: ALL_ROLES,
      tempVerifierUserId: tempUserId,
      invariants,
      results,
    };

    fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
    if (status !== "GREEN") {
      throw new Error(`H1.8 runtime proof failed: ${JSON.stringify(invariants, null, 2)}`);
    }
    console.log(JSON.stringify({ status, proofPath, invariants }, null, 2));
  } finally {
    await admin.from("developer_access_overrides").delete().eq("user_id", tempUserId);
    await admin.auth.admin.deleteUser(tempUserId).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
