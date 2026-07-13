import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import {
  buildClassifiedOfficeAiMarketLiveGateFailure,
  buildOfficeAiMarketLiveGateFailure,
  type OfficeAiMarketLiveGateFailure,
} from "./officeAiMarketLiveGateFailureTaxonomy";

const PROJECT_ROOT = process.cwd();
const STAGING_PROJECT_REF = "nxrnjywzxxfdpqmzjorh";
const GREEN_STATUS = "GREEN_OFFICE_AI_MARKET_LIVE_ROLE_DRIFT_SAFE";
const STOP_DRIFT_STATUS = "STOP_LIVE_ROLE_FIXTURE_DRIFT_DETECTED";
const STOP_NOT_CONFIGURED_STATUS = "STOP_LIVE_GATE_NOT_CONFIGURED";

const REQUIRED_ROLES = [
  { key: "FOREMAN", expected: "foreman" },
  { key: "DIRECTOR", expected: "director" },
  { key: "BUYER", expected: "buyer" },
  { key: "WAREHOUSE", expected: "warehouse" },
  { key: "CONTRACTOR", expected: "contractor" },
  { key: "ACCOUNTANT", expected: "accountant" },
] as const;

type RequiredRole = (typeof REQUIRED_ROLES)[number];
type ExpectedRole = RequiredRole["expected"];

type RoleCredentials = {
  email: string;
  password: string;
};

export type OfficeAiMarketLiveRoleDriftRow = {
  role: ExpectedRole;
  email_present: boolean;
  auth_login_success: boolean;
  profile_exists: boolean;
  membership_exists: boolean;
  resolved_role: string | null;
  company_id_hash: string | null;
  user_id_hash: string | null;
  role_unique: boolean;
};

export type OfficeAiMarketLiveInternalRoleDriftRow = OfficeAiMarketLiveRoleDriftRow & {
  expected_role: ExpectedRole;
  expected_role_matched: boolean;
  expected_company_matched: boolean;
  company_ids: string[];
  user_id: string | null;
  role_drift: boolean;
};

export type OfficeAiMarketLiveRoleDriftEvaluation = {
  role_isolation: boolean;
  same_company_for_all_roles: boolean;
  developer_control_used_as_proof: false;
  developer_full_access_used_as_proof: false;
  role_drift_detected: boolean;
  foreman_role_drift: boolean;
  director_role_drift: boolean;
  buyer_role_drift: boolean;
  warehouse_role_drift: boolean;
  contractor_role_drift: boolean;
  accountant_role_drift: boolean;
};

type RoleDriftSummary = OfficeAiMarketLiveRoleDriftEvaluation & {
  final_status: string;
  artifact_dir: string;
  run_started_at: string;
  branch: string | null;
  source_sha: string | null;
  target_environment: string;
  project_ref: string;
  expected_company_id_present: boolean;
  auth_reachable: boolean;
  role_drift_guard: boolean;
  all_required_credentials_present: boolean;
  sanitized_matrix: OfficeAiMarketLiveRoleDriftRow[];
  failure?: OfficeAiMarketLiveGateFailure;
};

type RuntimeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  expectedProjectRef: string;
  expectedCompanyId: string;
  targetEnvironment: string;
};

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function loadLocalEnv(): void {
  dotenv.config({ path: path.join(PROJECT_ROOT, ".env.staging.local"), override: false });
  dotenv.config({ path: path.join(PROJECT_ROOT, ".env.office-e2e.local"), override: false });
}

function readRuntimeConfig(): RuntimeConfig {
  return {
    supabaseUrl: clean(process.env.STAGING_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: clean(process.env.STAGING_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
    expectedProjectRef: clean(process.env.STAGING_SUPABASE_PROJECT_REF || STAGING_PROJECT_REF),
    expectedCompanyId: clean(process.env.OFFICE_E2E_COMPANY_ID),
    targetEnvironment: clean(process.env.OFFICE_E2E_TARGET_ENV || process.env.APP_ENV || "staging").toLowerCase(),
  };
}

function roleCredentials(roleKey: RequiredRole["key"]): RoleCredentials {
  return {
    email: clean(process.env[`E2E_${roleKey}_EMAIL`]),
    password: clean(process.env[`E2E_${roleKey}_PASSWORD`]),
  };
}

function hashValue(value: unknown): string | null {
  const normalized = clean(value);
  return normalized ? crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 12) : null;
}

function gitValue(args: string[]): string | null {
  try {
    return clean(execFileSync("git", args, { cwd: PROJECT_ROOT, encoding: "utf8" }));
  } catch {
    return null;
  }
}

function relativeArtifactDir(artifactDir: string): string {
  return path.relative(PROJECT_ROOT, artifactDir).replace(/\\/g, "/");
}

function writeJson(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function createAnonClient(config: RuntimeConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createSessionClient(config: RuntimeConfig, session: Session): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
}

async function ensureAuthReachable(config: RuntimeConfig): Promise<boolean> {
  const response = await fetch(`${config.supabaseUrl}/auth/v1/health`, {
    method: "GET",
    headers: { apikey: config.supabaseAnonKey },
  });
  return response.ok || response.status < 500;
}

function validateRuntimeConfig(config: RuntimeConfig): void {
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.expectedCompanyId) {
    throw new Error(STOP_NOT_CONFIGURED_STATUS);
  }
  if (config.targetEnvironment === "production" || clean(process.env.APP_ENV).toLowerCase() === "production") {
    throw new Error("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED");
  }
  if (/^(1|true|yes)$/i.test(clean(process.env.ALLOW_PRODUCTION))) {
    throw new Error("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED");
  }
  if (config.expectedProjectRef !== STAGING_PROJECT_REF || !config.supabaseUrl.includes(config.expectedProjectRef)) {
    throw new Error("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED");
  }
}

function emptyRoleRow(role: RequiredRole, credentials: RoleCredentials): OfficeAiMarketLiveInternalRoleDriftRow {
  return {
    role: role.expected,
    expected_role: role.expected,
    email_present: Boolean(credentials.email),
    auth_login_success: false,
    profile_exists: false,
    membership_exists: false,
    resolved_role: null,
    company_id_hash: null,
    user_id_hash: null,
    user_id: null,
    role_unique: false,
    expected_role_matched: false,
    expected_company_matched: false,
    company_ids: [],
    role_drift: true,
  };
}

async function auditRole(config: RuntimeConfig, role: RequiredRole): Promise<OfficeAiMarketLiveInternalRoleDriftRow> {
  const credentials = roleCredentials(role.key);
  const row = emptyRoleRow(role, credentials);
  if (!credentials.email || !credentials.password) return row;

  const signIn = await createAnonClient(config).auth.signInWithPassword(credentials);
  if (signIn.error || !signIn.data.session?.user) return row;

  row.auth_login_success = true;
  row.user_id = signIn.data.session.user.id;
  row.user_id_hash = hashValue(signIn.data.session.user.id);

  const client = createSessionClient(config, signIn.data.session);
  const rpc = await client.rpc("get_my_role");
  const profile = await client
    .from("profiles")
    .select("user_id,role")
    .eq("user_id", row.user_id)
    .limit(1)
    .maybeSingle();
  const memberships = await client
    .from("company_members")
    .select("company_id,role")
    .eq("user_id", row.user_id);

  const membershipRows = Array.isArray(memberships.data) ? memberships.data : [];
  const membershipRoles = membershipRows.map((entry) => clean(entry.role).toLowerCase()).filter(Boolean);
  const companyIds = membershipRows.map((entry) => clean(entry.company_id)).filter(Boolean);
  const profileRole = clean(profile.data?.role).toLowerCase();
  const resolvedRole = clean(rpc.data).toLowerCase() || profileRole || membershipRoles[0] || null;

  row.profile_exists = !profile.error && Boolean(profile.data?.user_id);
  row.membership_exists = !memberships.error && companyIds.length > 0;
  row.resolved_role = resolvedRole;
  row.company_ids = companyIds;
  row.company_id_hash = hashValue(companyIds.includes(config.expectedCompanyId) ? config.expectedCompanyId : companyIds[0]);
  row.expected_role_matched = resolvedRole === role.expected || membershipRoles.includes(role.expected);
  row.expected_company_matched = companyIds.includes(config.expectedCompanyId);
  row.role_drift = !(
    row.auth_login_success &&
    row.profile_exists &&
    row.membership_exists &&
    row.expected_role_matched &&
    row.expected_company_matched
  );

  return row;
}

export function evaluateOfficeAiMarketLiveRoleDrift(
  rows: OfficeAiMarketLiveInternalRoleDriftRow[],
): OfficeAiMarketLiveRoleDriftEvaluation {
  const userCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.user_id) userCounts.set(row.user_id, (userCounts.get(row.user_id) ?? 0) + 1);
  }
  for (const row of rows) {
    row.role_unique = Boolean(row.user_id && userCounts.get(row.user_id) === 1);
    row.role_drift = row.role_drift || !row.role_unique;
  }

  const roleByName = new Map<ExpectedRole, OfficeAiMarketLiveInternalRoleDriftRow>();
  for (const row of rows) roleByName.set(row.role, row);

  const roleDrift = (role: ExpectedRole): boolean => roleByName.get(role)?.role_drift !== false;
  const roleIsolation = rows.length === REQUIRED_ROLES.length && rows.every((row) => row.auth_login_success && row.role_unique);
  const sameCompany = rows.length === REQUIRED_ROLES.length && rows.every((row) => row.expected_company_matched);
  const roleDriftDetected = rows.some((row) => row.role_drift) || !roleIsolation || !sameCompany;

  return {
    role_isolation: roleIsolation,
    same_company_for_all_roles: sameCompany,
    developer_control_used_as_proof: false,
    developer_full_access_used_as_proof: false,
    role_drift_detected: roleDriftDetected,
    foreman_role_drift: roleDrift("foreman"),
    director_role_drift: roleDrift("director"),
    buyer_role_drift: roleDrift("buyer"),
    warehouse_role_drift: roleDrift("warehouse"),
    contractor_role_drift: roleDrift("contractor"),
    accountant_role_drift: roleDrift("accountant"),
  };
}

function toPublicRows(rows: OfficeAiMarketLiveInternalRoleDriftRow[]): OfficeAiMarketLiveRoleDriftRow[] {
  return rows.map((row) => ({
    role: row.role,
    email_present: row.email_present,
    auth_login_success: row.auth_login_success,
    profile_exists: row.profile_exists,
    membership_exists: row.membership_exists,
    resolved_role: row.resolved_role,
    company_id_hash: row.company_id_hash,
    user_id_hash: row.user_id_hash,
    role_unique: row.role_unique,
  }));
}

function buildSummary(
  artifactDir: string,
  runStartedAt: string,
  config: RuntimeConfig,
  authReachable: boolean,
  rows: OfficeAiMarketLiveInternalRoleDriftRow[],
  failure?: OfficeAiMarketLiveGateFailure,
): RoleDriftSummary {
  const evaluation = evaluateOfficeAiMarketLiveRoleDrift(rows);
  const allRequiredCredentialsPresent = rows.every((row) => row.email_present);
  const green = allRequiredCredentialsPresent && !evaluation.role_drift_detected && authReachable && !failure;
  return {
    final_status: green ? GREEN_STATUS : failure?.status === "STOP_AUTH_CREDENTIAL_INVALID" ? STOP_NOT_CONFIGURED_STATUS : STOP_DRIFT_STATUS,
    artifact_dir: relativeArtifactDir(artifactDir),
    run_started_at: runStartedAt,
    branch: gitValue(["branch", "--show-current"]),
    source_sha: gitValue(["rev-parse", "HEAD"]),
    target_environment: config.targetEnvironment,
    project_ref: config.expectedProjectRef,
    expected_company_id_present: Boolean(config.expectedCompanyId),
    auth_reachable: authReachable,
    role_drift_guard: green,
    all_required_credentials_present: allRequiredCredentialsPresent,
    ...evaluation,
    sanitized_matrix: toPublicRows(rows),
    ...(failure ? { failure } : {}),
  };
}

export async function runOfficeAiMarketLiveRoleDriftAudit(): Promise<RoleDriftSummary> {
  loadLocalEnv();
  const runStartedAt = new Date().toISOString();
  const runId = runStartedAt.replace(/[:.]/g, "-");
  const artifactDir = path.join(PROJECT_ROOT, ".release-runtime", "office-ai-market-live-gate-drift", runId);
  const config = readRuntimeConfig();
  validateRuntimeConfig(config);

  const rows: OfficeAiMarketLiveInternalRoleDriftRow[] = [];
  const authReachable = await ensureAuthReachable(config);
  if (!authReachable) throw new Error("STOP_LIVE_E2E_AUTH_UNREACHABLE");

  for (const role of REQUIRED_ROLES) rows.push(await auditRole(config, role));

  const missingCredentials = rows.some((row) => !row.email_present);
  const failure = missingCredentials
    ? buildOfficeAiMarketLiveGateFailure("AUTH_CREDENTIAL_INVALID", STOP_NOT_CONFIGURED_STATUS)
    : undefined;
  const summary = buildSummary(artifactDir, runStartedAt, config, authReachable, rows, failure);
  writeJson(path.join(artifactDir, "summary.json"), summary);
  return summary;
}

function isCliEntrypoint(): boolean {
  return path.basename(process.argv[1] ?? "") === "checkOfficeAiMarketLiveRoleDrift.ts";
}

if (isCliEntrypoint()) {
  runOfficeAiMarketLiveRoleDriftAudit()
    .then((summary) => {
      const output = JSON.stringify(summary, null, 2);
      if (summary.final_status === GREEN_STATUS) {
        console.log(output);
      } else {
        console.error(output);
        process.exitCode = 1;
      }
    })
    .catch((error: unknown) => {
      const runStartedAt = new Date().toISOString();
      const runId = runStartedAt.replace(/[:.]/g, "-");
      const artifactDir = path.join(PROJECT_ROOT, ".release-runtime", "office-ai-market-live-gate-drift", runId);
      const config = readRuntimeConfig();
      const failure = String(error instanceof Error ? error.message : error).includes(STOP_NOT_CONFIGURED_STATUS)
        ? buildOfficeAiMarketLiveGateFailure("AUTH_CREDENTIAL_INVALID", STOP_NOT_CONFIGURED_STATUS)
        : buildClassifiedOfficeAiMarketLiveGateFailure(error);
      const rows = REQUIRED_ROLES.map((role) => emptyRoleRow(role, roleCredentials(role.key)));
      const summary = buildSummary(artifactDir, runStartedAt, config, false, rows, failure);
      writeJson(path.join(artifactDir, "summary.json"), summary);
      console.error(JSON.stringify(summary, null, 2));
      process.exitCode = 1;
    });
}
