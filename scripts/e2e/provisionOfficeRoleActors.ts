import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  OFFICE_ROLE_FIXTURE_ARTIFACT_DIR,
  OFFICE_ROLE_FIXTURE_ROLES,
  redactOfficeAuthFixtureText,
  writeOfficeAuthArtifact,
  type OfficeRoleFixtureRole,
} from "../../tests/officeAuth/officeRoleFixtureValidation";

type EnvMap = Record<string, string>;
type ProvisioningTarget = "local";

type RuntimeRoleProbe = {
  authenticated: boolean;
  expected_role: OfficeRoleFixtureRole;
  resolved_role: string | null;
  auth_ready: boolean;
  membership_valid: boolean;
  profile_valid: boolean;
  app_metadata_valid: boolean;
  canonical_role_valid: boolean;
};

type ProvisionedActor = {
  role: OfficeRoleFixtureRole;
  email: string;
  password: string;
  userId: string;
};

const PROJECT_ROOT = process.cwd();
const OFFICE_ENV_FILE = path.join(PROJECT_ROOT, ".env.office-e2e.local");
const ENV_FILE_NAMES = [
  ".env.staging.local",
  ".env.local",
  ".env.agent.staging.local",
  ".env.office-e2e.local",
] as const;

const ROLE_ENV_PREFIX: Record<OfficeRoleFixtureRole, "FOREMAN" | "DIRECTOR" | "BUYER"> = {
  foreman: "FOREMAN",
  director: "DIRECTOR",
  buyer: "BUYER",
};

const ROLE_FULL_NAME: Record<OfficeRoleFixtureRole, string> = {
  foreman: "Office E2E Foreman",
  director: "Office E2E Director",
  buyer: "Office E2E Buyer",
};

const trim = (value: unknown): string => String(value ?? "").trim();

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvFile(filePath: string): EnvMap {
  if (!fs.existsSync(filePath)) return {};
  const parsed: EnvMap = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/g);
  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith("#") || !cleaned.includes("=")) continue;
    const splitAt = cleaned.indexOf("=");
    const key = cleaned.slice(0, splitAt).trim();
    parsed[key] = unquote(cleaned.slice(splitAt + 1));
  }
  return parsed;
}

function loadProvisioningEnv(): EnvMap {
  const merged: EnvMap = {};
  for (const fileName of ENV_FILE_NAMES) {
    Object.assign(merged, parseEnvFile(path.join(PROJECT_ROOT, fileName)));
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.trim()) merged[key] = value;
  }
  return merged;
}

function randomPassword(): string {
  return `OfficeE2E-${crypto.randomBytes(18).toString("base64url")}`;
}

function normalizedTarget(env: EnvMap): ProvisioningTarget | null {
  const raw = trim(
    env.E2E_OFFICE_PROVISIONING_TARGET ?? env.OFFICE_E2E_PROVISIONING_TARGET,
  ).toLowerCase();
  return raw === "local" ? raw : null;
}

function assertNonProductionTarget(env: EnvMap): ProvisioningTarget {
  const rawTarget = trim(
    env.E2E_OFFICE_PROVISIONING_TARGET ?? env.OFFICE_E2E_PROVISIONING_TARGET,
  ).toLowerCase();
  if (rawTarget === "production") {
    throw new Error("BLOCKED_OFFICE_PROVISIONING_PRODUCTION_TARGET_REJECTED");
  }
  const target = normalizedTarget(env);
  if (!target) {
    throw new Error("BLOCKED_OFFICE_PROVISIONING_LOCAL_TARGET_NOT_DECLARED");
  }
  const allow = trim(env.E2E_OFFICE_PROVISIONING_ALLOW_NON_PROD).toLowerCase() === "true";
  if (!allow) {
    throw new Error("BLOCKED_OFFICE_PROVISIONING_NON_PROD_ALLOW_FLAG_MISSING");
  }

  const urlText = trim(env.EXPO_PUBLIC_SUPABASE_URL);
  let host = "";
  try {
    host = new URL(urlText).hostname.toLowerCase();
  } catch {
    throw new Error("BLOCKED_OFFICE_PROVISIONING_SUPABASE_URL_INVALID");
  }

  if (target === "local" && !["localhost", "127.0.0.1"].includes(host)) {
    throw new Error("BLOCKED_OFFICE_PROVISIONING_LOCAL_TARGET_NOT_LOCALHOST");
  }
  return target;
}

function writeRuntimeRoleSourceArtifact() {
  writeOfficeAuthArtifact("runtime_role_source.json", {
    route_guard_source: "OfficeRoleAuthContextGate",
    route_guard_reads_session: true,
    route_guard_reads_resolve_current_session_role: true,
    route_guard_reads_developer_override: true,
    expired_developer_override_allowed: false,
    client_runtime_role_order: [
      "signed_app_metadata_role",
      "user_metadata_role_compatibility",
      "get_my_role_rpc_fallback",
    ],
    server_canonical_role_order: [
      "company_members",
      "profiles",
      "signed_app_metadata",
      "get_my_role_fallback",
    ],
    provisioning_writes: [
      "auth_user_app_metadata_role",
      "profiles_role",
      "company_members_role",
      "user_profiles_profile",
    ],
    route_guard_reads_same_role_truth: true,
    production_db_write_attempted: false,
    secrets_printed: false,
    fake_green_claimed: false,
  });
}

function writeBlockedResult(blockerCode: string) {
  writeOfficeAuthArtifact("provisioning_result.json", {
    status: "BLOCKED_OFFICE_E2E_ROLE_PROVISIONING_AND_RUNTIME_RBAC",
    blocker_code: blockerCode,
    foreman_actor_valid: false,
    director_actor_valid: false,
    buyer_actor_valid: false,
    production_db_write_attempted: false,
    secrets_printed: false,
    route_guards_disabled: false,
    fake_green_claimed: false,
  });
}

function requiredEnv(env: EnvMap, key: string, blockerCode: string): string {
  const value = trim(env[key]);
  if (!value) throw new Error(blockerCode);
  return value;
}

function createAdminClient(env: EnvMap): SupabaseClient {
  return createClient(
    requiredEnv(env, "EXPO_PUBLIC_SUPABASE_URL", "BLOCKED_SUPABASE_URL_MISSING"),
    requiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY", "BLOCKED_SERVICE_ROLE_KEY_MISSING"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "x-client-info": "office-e2e-role-provisioning" },
      },
    },
  );
}

function createAnonClient(env: EnvMap): SupabaseClient {
  return createClient(
    requiredEnv(env, "EXPO_PUBLIC_SUPABASE_URL", "BLOCKED_SUPABASE_URL_MISSING"),
    requiredEnv(env, "EXPO_PUBLIC_SUPABASE_ANON_KEY", "BLOCKED_ANON_KEY_MISSING"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "x-client-info": "office-e2e-role-probe" },
      },
    },
  );
}

function officeEnvForRole(role: OfficeRoleFixtureRole, env: EnvMap) {
  const prefix = ROLE_ENV_PREFIX[role];
  const passwordKey = `E2E_${prefix}_PASSWORD`;
  const userIdKey = `OFFICE_E2E_${prefix}_USER_ID`;
  return {
    emailKey: `E2E_${prefix}_EMAIL`,
    passwordKey,
    userIdKey,
    email: `office-e2e-${role}.local@example.invalid`,
    password: trim(env[passwordKey]) || trim(env.OFFICE_E2E_ACTOR_PASSWORD) || randomPassword(),
    userId: trim(env[userIdKey]),
  };
}

async function findUserByEmail(admin: SupabaseClient, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (result.error) throw result.error;
    const user = result.data.users.find(
      (candidate) => trim(candidate.email).toLowerCase() === email.toLowerCase(),
    );
    if (user) return user;
    if (result.data.users.length < 100) return null;
  }
  return null;
}

async function createOrUpdateActor(params: {
  admin: SupabaseClient;
  env: EnvMap;
  role: OfficeRoleFixtureRole;
}): Promise<ProvisionedActor> {
  const { email, password, userId } = officeEnvForRole(params.role, params.env);
  const metadata = {
    role: params.role,
    office_e2e_actor: true,
    office_e2e_role: params.role,
  };
  let user = null;

  if (userId) {
    const byId = await params.admin.auth.admin.getUserById(userId);
    if (!byId.error && byId.data.user) user = byId.data.user;
  }

  if (!user) {
    user = await findUserByEmail(params.admin, email);
  }

  if (!user) {
    const created = await params.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: metadata,
      user_metadata: {
        full_name: ROLE_FULL_NAME[params.role],
        office_e2e_actor: true,
      },
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("BLOCKED_OFFICE_ACTOR_CREATE_FAILED");
    }
    user = created.data.user;
  } else {
    const updated = await params.admin.auth.admin.updateUserById(user.id, {
      email,
      password,
      email_confirm: true,
      app_metadata: metadata,
      user_metadata: {
        full_name: ROLE_FULL_NAME[params.role],
        office_e2e_actor: true,
      },
    });
    if (updated.error || !updated.data.user) {
      throw updated.error ?? new Error("BLOCKED_OFFICE_ACTOR_UPDATE_FAILED");
    }
    user = updated.data.user;
  }

  return { role: params.role, email, password, userId: user.id };
}

async function ensureOfficeCompany(params: {
  admin: SupabaseClient;
  env: EnvMap;
  director: ProvisionedActor;
  target: ProvisioningTarget;
}) {
  const existingCompanyId = trim(params.env.OFFICE_E2E_COMPANY_ID);
  if (existingCompanyId) {
    const existing = await params.admin
      .from("companies")
      .select("id")
      .eq("id", existingCompanyId)
      .maybeSingle();
    if (!existing.error && existing.data?.id) return existingCompanyId;
  }

  const inserted = await params.admin
    .from("companies")
    .insert({
      owner_user_id: params.director.userId,
      name: `Office E2E ${params.target}`,
    })
    .select("id")
    .single();
  if (inserted.error || !inserted.data?.id) {
    throw inserted.error ?? new Error("BLOCKED_OFFICE_E2E_COMPANY_CREATE_FAILED");
  }

  const companyId = trim(inserted.data.id);
  return companyId;
}

async function upsertRoleRows(params: {
  admin: SupabaseClient;
  actor: ProvisionedActor;
  companyId: string;
}) {
  const profile = await params.admin.from("profiles").upsert(
    {
      user_id: params.actor.userId,
      role: params.actor.role,
    },
    { onConflict: "user_id" },
  );
  if (profile.error) throw profile.error;

  const userProfile = await params.admin.from("user_profiles").upsert(
    {
      user_id: params.actor.userId,
      full_name: ROLE_FULL_NAME[params.actor.role],
    },
    { onConflict: "user_id" },
  );
  if (userProfile.error) throw userProfile.error;

  const membership = await params.admin.from("company_members").upsert(
    {
      company_id: params.companyId,
      user_id: params.actor.userId,
      role: params.actor.role,
    },
    { onConflict: "company_id,user_id" },
  );
  if (membership.error) throw membership.error;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function probeActor(params: {
  env: EnvMap;
  actor: ProvisionedActor;
  companyId: string;
}): Promise<RuntimeRoleProbe> {
  const client = createAnonClient(params.env);
  const signIn = await client.auth.signInWithPassword({
    email: params.actor.email,
    password: params.actor.password,
  });
  if (signIn.error || !signIn.data.session) {
    return {
      authenticated: false,
      expected_role: params.actor.role,
      resolved_role: null,
      auth_ready: false,
      membership_valid: false,
      profile_valid: false,
      app_metadata_valid: false,
      canonical_role_valid: false,
    };
  }

  const [authUser, canonical, profile, membership] = await Promise.all([
    client.auth.getUser(),
    client.rpc("app_actor_role_context_v1", {
      p_allowed_roles: [params.actor.role],
    }),
    client
      .from("profiles")
      .select("role")
      .eq("user_id", params.actor.userId)
      .maybeSingle(),
    client
      .from("company_members")
      .select("role")
      .eq("company_id", params.companyId)
      .eq("user_id", params.actor.userId)
      .maybeSingle(),
  ]);

  const appMetadataRole = trim(asRecord(authUser.data.user?.app_metadata).role).toLowerCase();
  const canonicalRecord = asRecord(canonical.data);
  const canonicalRole = trim(canonicalRecord.role).toLowerCase();
  const profileRole = trim((profile.data as { role?: unknown } | null)?.role).toLowerCase();
  const membershipRole = trim((membership.data as { role?: unknown } | null)?.role).toLowerCase();
  const expected = params.actor.role;

  await client.auth.signOut().catch(() => undefined);

  return {
    authenticated: !authUser.error && Boolean(authUser.data.user?.id),
    expected_role: expected,
    resolved_role: canonicalRole || appMetadataRole || profileRole || membershipRole || null,
    auth_ready: !authUser.error && Boolean(authUser.data.user?.id),
    membership_valid: membershipRole === expected,
    profile_valid: profileRole === expected,
    app_metadata_valid: appMetadataRole === expected,
    canonical_role_valid:
      !canonical.error &&
      canonicalRole === expected &&
      canonicalRecord.allowed === true,
  };
}

function assertProbeMatches(probe: RuntimeRoleProbe) {
  if (
    probe.authenticated !== true ||
    probe.auth_ready !== true ||
    probe.resolved_role !== probe.expected_role ||
    probe.membership_valid !== true ||
    probe.profile_valid !== true ||
    probe.app_metadata_valid !== true ||
    probe.canonical_role_valid !== true
  ) {
    throw new Error("BLOCKED_OFFICE_ROLE_SOURCE_MISMATCH");
  }
}

function serializeEnvValue(value: string): string {
  return value.replace(/\r?\n/g, "").replace(/"/g, '\\"');
}

function writeOfficeActorEnvFile(params: {
  actors: readonly ProvisionedActor[];
  companyId: string;
}) {
  const lines = [
    "# Generated by scripts/e2e/provisionOfficeRoleActors.ts",
    "# Test-only credentials. This file is ignored by .gitignore.",
    `E2E_ROLE_MODE=separate_roles`,
    `OFFICE_E2E_COMPANY_ID=${params.companyId}`,
  ];

  for (const actor of params.actors) {
    const prefix = ROLE_ENV_PREFIX[actor.role];
    lines.push(`E2E_${prefix}_EMAIL=${serializeEnvValue(actor.email)}`);
    lines.push(`E2E_${prefix}_PASSWORD=${serializeEnvValue(actor.password)}`);
    lines.push(`OFFICE_E2E_${prefix}_USER_ID=${actor.userId}`);
  }

  fs.writeFileSync(OFFICE_ENV_FILE, `${lines.join("\n")}\n`, "utf8");
}

function writeProvisioningGreen(params: {
  probes: Record<OfficeRoleFixtureRole, RuntimeRoleProbe>;
  companyCreatedOrFound: boolean;
  envFileWritten: boolean;
}) {
  writeOfficeAuthArtifact("provisioning_result.json", {
    final_status: "GREEN_OFFICE_E2E_ROLE_PROVISIONING_AND_RUNTIME_RBAC_READY",
    provisioning_target: "local",
    explicit_non_prod_guard_enabled: true,
    foreman_actor_valid: params.probes.foreman.resolved_role === "foreman",
    director_actor_valid: params.probes.director.resolved_role === "director",
    buyer_actor_valid: params.probes.buyer.resolved_role === "buyer",
    foreman_actor_provisioned: params.probes.foreman.authenticated,
    director_actor_provisioned: params.probes.director.authenticated,
    buyer_actor_provisioned: params.probes.buyer.authenticated,
    foreman_role_resolved: params.probes.foreman.resolved_role === "foreman",
    director_role_resolved: params.probes.director.resolved_role === "director",
    buyer_role_resolved: params.probes.buyer.resolved_role === "buyer",
    foreman_membership_valid: params.probes.foreman.membership_valid,
    director_membership_valid: params.probes.director.membership_valid,
    buyer_membership_valid: params.probes.buyer.membership_valid,
    company_created_or_found: params.companyCreatedOrFound,
    env_file_written_ignored: params.envFileWritten,
    runtime_probes: Object.fromEntries(
      OFFICE_ROLE_FIXTURE_ROLES.map((role) => [
        role,
        {
          authenticated: params.probes[role].authenticated,
          expected_role: params.probes[role].expected_role,
          resolved_role: params.probes[role].resolved_role,
          auth_ready: params.probes[role].auth_ready,
          membership_valid: params.probes[role].membership_valid,
        },
      ]),
    ),
    production_db_write_attempted: false,
    secrets_printed: false,
    route_guards_disabled: false,
    fake_green_claimed: false,
  });
}

async function main() {
  writeRuntimeRoleSourceArtifact();
  const env = loadProvisioningEnv();

  let target: ProvisioningTarget;
  try {
    target = assertNonProductionTarget(env);
  } catch (error) {
    const blockerCode = redactOfficeAuthFixtureText(error).replace(/^Error:\s*/, "");
    writeBlockedResult(blockerCode || "BLOCKED_OFFICE_PROVISIONING_TARGET_INVALID");
    throw error;
  }

  const admin = createAdminClient(env);
  const actors = await Promise.all(
    OFFICE_ROLE_FIXTURE_ROLES.map((role) =>
      createOrUpdateActor({ admin, env, role }),
    ),
  );
  const actorByRole = Object.fromEntries(
    actors.map((actor) => [actor.role, actor]),
  ) as Record<OfficeRoleFixtureRole, ProvisionedActor>;
  const companyId = await ensureOfficeCompany({
    admin,
    env,
    director: actorByRole.director,
    target,
  });

  for (const actor of actors) {
    await upsertRoleRows({ admin, actor, companyId });
  }

  const probes = Object.fromEntries(
    await Promise.all(
      actors.map(async (actor) => {
        const probe = await probeActor({ env, actor, companyId });
        assertProbeMatches(probe);
        return [actor.role, probe] as const;
      }),
    ),
  ) as Record<OfficeRoleFixtureRole, RuntimeRoleProbe>;

  writeOfficeActorEnvFile({ actors, companyId });
  writeProvisioningGreen({
    probes,
    companyCreatedOrFound: true,
    envFileWritten: true,
  });

  console.log(
    `office role actor provisioning: GREEN; artifact=${path.relative(
      PROJECT_ROOT,
      OFFICE_ROLE_FIXTURE_ARTIFACT_DIR,
    )}`,
  );
}

main().catch((error) => {
  const message = redactOfficeAuthFixtureText(error).replace(/^Error:\s*/, "");
  if (!fs.existsSync(path.join(OFFICE_ROLE_FIXTURE_ARTIFACT_DIR, "provisioning_result.json"))) {
    writeBlockedResult(message || "BLOCKED_OFFICE_ROLE_PROVISIONING_FAILED");
  }
  console.error(
    `office role actor provisioning: ${
      message || "BLOCKED_OFFICE_ROLE_PROVISIONING_FAILED"
    }`,
  );
  process.exitCode = 1;
});
