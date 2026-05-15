import { AI_ACTION_LEDGER_RPC_FUNCTIONS } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import { parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import {
  AI_ACTION_LEDGER_REQUIRED_RPC_FUNCTIONS,
  inspectAiActionLedgerMigrationState,
} from "./inspectAiActionLedgerMigrationState";
import { AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS } from "./preflightAiActionLedgerMigration";

export type AiActionLedgerPostgrestRpcVisibilityStatus =
  | "GREEN_RPC_VISIBLE_AND_CALLABLE"
  | "GREEN_RPC_VISIBLE_AUTH_REQUIRED"
  | "GREEN_RPC_VISIBLE_SIGNATURE_MISMATCH_ONLY"
  | "BLOCKED_AI_ACTION_LEDGER_SQL_RPC_MISSING"
  | "BLOCKED_POSTGREST_SCHEMA_CACHE_STALE"
  | "BLOCKED_POSTGREST_RPC_AMBIGUOUS_OVERLOAD"
  | "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED"
  | "BLOCKED_POSTGREST_URL_OR_KEY_MISSING"
  | "BLOCKED_POSTGREST_AUTH_ENV_MISSING"
  | "BLOCKED_POSTGREST_AUTH_FAILED"
  | "BLOCKED_OLD_STUB_OVERLOADS_PRESENT"
  | "BLOCKED_POSTGREST_NETWORK_ERROR";

export type AiActionLedgerPostgrestRpcProbeSummary = {
  rpc: string;
  httpStatus: number | null;
  postgrestErrorCode: string | null;
  signatureAwarePayload: true;
  callable: boolean;
  pgrst202: boolean;
  pgrst203: boolean;
  permissionDenied: boolean;
};

export type AiActionLedgerPostgrestRpcVisibility = {
  status: AiActionLedgerPostgrestRpcVisibilityStatus;
  directSqlFunctionsChecked: boolean;
  directSqlFunctionsExist: boolean;
  postgrestOpenApiChecked: boolean;
  postgrestRpcProbeChecked: boolean;
  signatureAwareRpcProbeChecked: boolean;
  all6RpcSignatureAwareProbeOk: boolean;
  all_6_rpc_signature_aware_probe_ok: boolean;
  postgrestRpcVisible: boolean;
  ledger_rpc_visible: boolean;
  postgrestRpcCallable: boolean;
  postgrestAuthRequired: boolean;
  postgrestPermissionDenied: boolean;
  submitForApprovalRpcVisible: boolean;
  getStatusRpcVisible: boolean;
  approveRpcVisible: boolean;
  rejectRpcVisible: boolean;
  executeApprovedRpcVisible: boolean;
  verifyApplyRpcVisible: boolean;
  checkedRpc: typeof AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus;
  safeReadOnlyProbeExecuted: boolean;
  mutatingRpcExecuted: false;
  mutatingRpcProbeExecuted: boolean;
  authenticatedJwtUsed: boolean;
  authenticated_jwt_used: boolean;
  httpStatus: number | null;
  postgrestErrorCode: string | null;
  pgrst202: boolean;
  pgrst203: boolean;
  oldStubOverloads: boolean;
  old_stub_overloads: boolean;
  activeRpcCount: number | null;
  active_rpc_count: number | null;
  functionsInPublicSchema: boolean;
  functions_in_public_schema: boolean;
  authenticatedExecuteGrantOk: boolean;
  authenticated_execute_grant_ok: boolean;
  probes: AiActionLedgerPostgrestRpcProbeSummary[];
  rawRowsPrinted: false;
  secretsPrinted: false;
  databaseUrlValuePrinted: false;
  credentialsPrinted: false;
  blocker: Exclude<
    AiActionLedgerPostgrestRpcVisibilityStatus,
    "GREEN_RPC_VISIBLE_AND_CALLABLE" | "GREEN_RPC_VISIBLE_AUTH_REQUIRED" | "GREEN_RPC_VISIBLE_SIGNATURE_MISMATCH_ONLY"
  > | null;
  exactReason: string | null;
};

export type AiActionLedgerPostgrestRpcOpenApiVisibility = Pick<
  AiActionLedgerPostgrestRpcVisibility,
  | "submitForApprovalRpcVisible"
  | "getStatusRpcVisible"
  | "approveRpcVisible"
  | "rejectRpcVisible"
  | "executeApprovedRpcVisible"
  | "verifyApplyRpcVisible"
> & {
  postgrestRpcVisible: boolean;
};

type ProbeInput = {
  httpStatus: number;
  postgrestErrorCode?: string | null;
  message?: string | null;
};

type ProbeClassification = Pick<
  AiActionLedgerPostgrestRpcVisibility,
  "status" | "postgrestRpcVisible" | "postgrestRpcCallable" | "postgrestAuthRequired" | "postgrestPermissionDenied"
> & {
  pgrst202: boolean;
  pgrst203: boolean;
  blocker: AiActionLedgerPostgrestRpcVisibility["blocker"];
  exactReason: string | null;
};

type EnvLike = Record<string, string | undefined>;

type RpcCatalogInspection = {
  checked: boolean;
  activeRpcCount: number | null;
  oldStubOverloads: boolean;
  functionsInPublicSchema: boolean;
  authenticatedExecuteGrantOk: boolean;
};

const PROBE_ACTION_ID = "00000000-0000-0000-0000-000000000000";
const PROBE_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000000";

export const AI_ACTION_LEDGER_ACTIVE_RPC_SIGNATURES = [
  "public.ai_action_ledger_submit_for_approval_v1(uuid,text,text,text,text,text,jsonb,jsonb,text,timestamptz,text,text,text,text)",
  "public.ai_action_ledger_get_status_v1(uuid,text)",
  "public.ai_action_ledger_verify_apply_v1()",
  "public.ai_action_ledger_approve_v1(uuid,text,text,text)",
  "public.ai_action_ledger_reject_v1(uuid,text,text)",
  "public.ai_action_ledger_execute_approved_v1(uuid,text,text,timestamptz,jsonb)",
] as const;

export const AI_ACTION_LEDGER_OBSOLETE_STUB_OVERLOAD_SIGNATURES = [
  "public.ai_action_ledger_submit_for_approval_v1(uuid,text,text,text,text,text,jsonb,jsonb,text,timestamptz,text)",
  "public.ai_action_ledger_get_status_v1(uuid)",
  "public.ai_action_ledger_approve_v1(uuid,text)",
  "public.ai_action_ledger_execute_approved_v1(uuid,text)",
] as const;

function readEnv(projectRoot: string): ReadonlyMap<string, string> {
  const merged = new Map<string, string>();
  for (const envFile of [".env", ".env.local", ".env.agent.staging.local"]) {
    for (const [key, value] of parseAgentEnvFileValues(`${projectRoot}/${envFile}`)) {
      merged.set(key, value);
    }
  }
  return merged;
}

function envValue(env: EnvLike, fileEnv: ReadonlyMap<string, string>, key: string): string {
  return String(env[key] ?? fileEnv.get(key) ?? "").trim();
}

function databaseUrlEnvName(env: EnvLike): string | null {
  return AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS.find((key) => String(env[key] ?? "").trim()) ?? null;
}

function baseResult(
  status: AiActionLedgerPostgrestRpcVisibilityStatus,
  exactReason: string | null,
  overrides: Partial<AiActionLedgerPostgrestRpcVisibility> = {},
): AiActionLedgerPostgrestRpcVisibility {
  const green =
    status === "GREEN_RPC_VISIBLE_AND_CALLABLE" ||
    status === "GREEN_RPC_VISIBLE_AUTH_REQUIRED" ||
    status === "GREEN_RPC_VISIBLE_SIGNATURE_MISMATCH_ONLY";
  const postgrestRpcVisible = overrides.postgrestRpcVisible ?? false;
  const all6RpcSignatureAwareProbeOk = overrides.all6RpcSignatureAwareProbeOk ?? false;
  const oldStubOverloads = overrides.oldStubOverloads ?? false;
  const activeRpcCount = overrides.activeRpcCount ?? null;
  const functionsInPublicSchema = overrides.functionsInPublicSchema ?? false;
  const authenticatedExecuteGrantOk = overrides.authenticatedExecuteGrantOk ?? false;
  return {
    status,
    directSqlFunctionsChecked: false,
    directSqlFunctionsExist: false,
    postgrestOpenApiChecked: false,
    postgrestRpcProbeChecked: false,
    signatureAwareRpcProbeChecked: false,
    all6RpcSignatureAwareProbeOk,
    all_6_rpc_signature_aware_probe_ok: all6RpcSignatureAwareProbeOk,
    postgrestRpcVisible,
    ledger_rpc_visible: postgrestRpcVisible,
    postgrestRpcCallable: false,
    postgrestAuthRequired: false,
    postgrestPermissionDenied: false,
    submitForApprovalRpcVisible: false,
    getStatusRpcVisible: false,
    approveRpcVisible: false,
    rejectRpcVisible: false,
    executeApprovedRpcVisible: false,
    verifyApplyRpcVisible: false,
    checkedRpc: AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
    safeReadOnlyProbeExecuted: false,
    mutatingRpcExecuted: false,
    mutatingRpcProbeExecuted: false,
    authenticatedJwtUsed: false,
    authenticated_jwt_used: false,
    httpStatus: null,
    postgrestErrorCode: null,
    pgrst202: false,
    pgrst203: false,
    oldStubOverloads,
    old_stub_overloads: oldStubOverloads,
    activeRpcCount,
    active_rpc_count: activeRpcCount,
    functionsInPublicSchema,
    functions_in_public_schema: functionsInPublicSchema,
    authenticatedExecuteGrantOk,
    authenticated_execute_grant_ok: authenticatedExecuteGrantOk,
    probes: [],
    rawRowsPrinted: false,
    secretsPrinted: false,
    databaseUrlValuePrinted: false,
    credentialsPrinted: false,
    blocker: green ? null : (status as Exclude<
      AiActionLedgerPostgrestRpcVisibilityStatus,
      "GREEN_RPC_VISIBLE_AND_CALLABLE" | "GREEN_RPC_VISIBLE_AUTH_REQUIRED" | "GREEN_RPC_VISIBLE_SIGNATURE_MISMATCH_ONLY"
    >),
    exactReason,
    ...overrides,
  };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function isSchemaCacheMiss(input: ProbeInput): boolean {
  const combined = [input.postgrestErrorCode, input.message].map(text).filter(Boolean).join(" ");
  return input.postgrestErrorCode === "PGRST202" ||
    (input.httpStatus === 404 && /PGRST202|Could not find the function|schema cache/i.test(combined));
}

function isAmbiguousOverload(input: ProbeInput): boolean {
  const combined = [input.postgrestErrorCode, input.message].map(text).filter(Boolean).join(" ");
  return input.postgrestErrorCode === "PGRST203" || /PGRST203|ambiguous|overload/i.test(combined);
}

function isPermissionDenied(input: ProbeInput): boolean {
  const combined = [input.postgrestErrorCode, input.message].map(text).filter(Boolean).join(" ");
  return input.postgrestErrorCode === "42501" || /permission denied|insufficient privilege/i.test(combined);
}

function isSignatureMismatch(input: ProbeInput): boolean {
  const combined = [input.postgrestErrorCode, input.message].map(text).filter(Boolean).join(" ");
  return input.httpStatus === 400 && /argument|parameter|signature|function/i.test(combined);
}

export function classifyAiActionLedgerPostgrestRpcProbe(input: ProbeInput): ProbeClassification {
  if (input.httpStatus >= 200 && input.httpStatus < 300) {
    return {
      status: "GREEN_RPC_VISIBLE_AND_CALLABLE",
      postgrestRpcVisible: true,
      postgrestRpcCallable: true,
      postgrestAuthRequired: false,
      postgrestPermissionDenied: false,
      pgrst202: false,
      pgrst203: false,
      blocker: null,
      exactReason: null,
    };
  }

  if (isSchemaCacheMiss(input)) {
    return {
      status: "BLOCKED_POSTGREST_SCHEMA_CACHE_STALE",
      postgrestRpcVisible: false,
      postgrestRpcCallable: false,
      postgrestAuthRequired: false,
      postgrestPermissionDenied: false,
      pgrst202: true,
      pgrst203: false,
      blocker: "BLOCKED_POSTGREST_SCHEMA_CACHE_STALE",
      exactReason: "PostgREST returned PGRST202 for a signature-aware ledger RPC probe.",
    };
  }

  if (isAmbiguousOverload(input)) {
    return {
      status: "BLOCKED_POSTGREST_RPC_AMBIGUOUS_OVERLOAD",
      postgrestRpcVisible: false,
      postgrestRpcCallable: false,
      postgrestAuthRequired: false,
      postgrestPermissionDenied: false,
      pgrst202: false,
      pgrst203: true,
      blocker: "BLOCKED_POSTGREST_RPC_AMBIGUOUS_OVERLOAD",
      exactReason: "PostgREST returned PGRST203 for a signature-aware ledger RPC probe.",
    };
  }

  if (input.httpStatus === 401) {
    return {
      status: "GREEN_RPC_VISIBLE_AUTH_REQUIRED",
      postgrestRpcVisible: true,
      postgrestRpcCallable: false,
      postgrestAuthRequired: true,
      postgrestPermissionDenied: false,
      pgrst202: false,
      pgrst203: false,
      blocker: null,
      exactReason: "PostgREST reached the ledger RPC and required authenticated caller credentials.",
    };
  }

  if (isSignatureMismatch(input)) {
    return {
      status: "GREEN_RPC_VISIBLE_SIGNATURE_MISMATCH_ONLY",
      postgrestRpcVisible: true,
      postgrestRpcCallable: false,
      postgrestAuthRequired: false,
      postgrestPermissionDenied: false,
      pgrst202: false,
      pgrst203: false,
      blocker: null,
      exactReason: "PostgREST reached the ledger RPC but rejected the supplied argument shape.",
    };
  }

  if (input.httpStatus === 403 || isPermissionDenied(input)) {
    return {
      status: "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED",
      postgrestRpcVisible: true,
      postgrestRpcCallable: false,
      postgrestAuthRequired: false,
      postgrestPermissionDenied: true,
      pgrst202: false,
      pgrst203: false,
      blocker: "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED",
      exactReason: "PostgREST reached the ledger RPC, but the caller role lacks execute permission.",
    };
  }

  return {
    status: "BLOCKED_POSTGREST_NETWORK_ERROR",
    postgrestRpcVisible: false,
    postgrestRpcCallable: false,
    postgrestAuthRequired: false,
    postgrestPermissionDenied: false,
    pgrst202: false,
    pgrst203: false,
    blocker: "BLOCKED_POSTGREST_NETWORK_ERROR",
    exactReason: "PostgREST RPC visibility probe returned an unexpected HTTP status.",
  };
}

export function parseAiActionLedgerPostgrestOpenApiVisibility(
  source: string,
): AiActionLedgerPostgrestRpcOpenApiVisibility {
  const visible = (fn: string) => source.includes(`/rpc/${fn}`) || source.includes(fn);
  const submitForApprovalRpcVisible = visible(AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval);
  const getStatusRpcVisible = visible(AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus);
  const approveRpcVisible = visible(AI_ACTION_LEDGER_RPC_FUNCTIONS.approve);
  const rejectRpcVisible = visible(AI_ACTION_LEDGER_RPC_FUNCTIONS.reject);
  const executeApprovedRpcVisible = visible(AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved);
  const verifyApplyRpcVisible = visible(AI_ACTION_LEDGER_RPC_FUNCTIONS.verifyApply);
  return {
    submitForApprovalRpcVisible,
    getStatusRpcVisible,
    approveRpcVisible,
    rejectRpcVisible,
    executeApprovedRpcVisible,
    verifyApplyRpcVisible,
    postgrestRpcVisible:
      submitForApprovalRpcVisible &&
      getStatusRpcVisible &&
      approveRpcVisible &&
      rejectRpcVisible &&
      executeApprovedRpcVisible &&
      verifyApplyRpcVisible,
  };
}

function directSqlFunctionsExistFromInspection(input: Awaited<ReturnType<typeof inspectAiActionLedgerMigrationState>>): boolean {
  return AI_ACTION_LEDGER_REQUIRED_RPC_FUNCTIONS.every((fn) => {
    switch (fn) {
      case AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval:
        return input.submitRpcExists;
      case AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus:
        return input.getStatusRpcExists;
      case AI_ACTION_LEDGER_RPC_FUNCTIONS.approve:
        return input.approveRpcExists;
      case AI_ACTION_LEDGER_RPC_FUNCTIONS.reject:
        return input.rejectRpcExists;
      case AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved:
        return input.executeApprovedRpcExists;
      case AI_ACTION_LEDGER_RPC_FUNCTIONS.verifyApply:
        return input.verifyApplyRpcExists;
      default:
        return false;
    }
  });
}

async function responseJsonSummary(response: Response): Promise<{ code: string | null; message: string | null }> {
  const textBody = await response.text().catch(() => "");
  if (!textBody.trim()) return { code: null, message: null };
  try {
    const parsed = JSON.parse(textBody) as Record<string, unknown>;
    return {
      code: text(parsed.code) || null,
      message: text(parsed.message) || text(parsed.details) || text(parsed.hint) || null,
    };
  } catch {
    return { code: null, message: null };
  }
}

async function inspectRpcCatalog(env: EnvLike): Promise<RpcCatalogInspection> {
  const dbEnvName = databaseUrlEnvName(env);
  if (!dbEnvName) {
    return {
      checked: false,
      activeRpcCount: null,
      oldStubOverloads: false,
      functionsInPublicSchema: false,
      authenticatedExecuteGrantOk: false,
    };
  }

  const pgModule = await import("pg");
  const client = new pgModule.Client({ connectionString: env[dbEnvName] });
  await client.connect();
  try {
    const result = await client.query(
      `
        with active(signature) as (
          select unnest($1::text[])
        ),
        obsolete(signature) as (
          select unnest($2::text[])
        )
        select
          (
            select count(*)::int
            from active
            where to_regprocedure(signature) is not null
          ) as active_rpc_count,
          exists (
            select 1
            from obsolete
            where to_regprocedure(signature) is not null
          ) as old_stub_overloads,
          (
            select count(*)::int = cardinality($1::text[])
            from active a
            join pg_proc p on p.oid = to_regprocedure(a.signature)
            join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public'
          ) as functions_in_public_schema,
          (
            select count(*)::int = cardinality($1::text[])
            from active
            where to_regprocedure(signature) is not null
              and has_function_privilege('authenticated', to_regprocedure(signature), 'EXECUTE')
          ) as authenticated_execute_grant_ok
      `,
      [
        [...AI_ACTION_LEDGER_ACTIVE_RPC_SIGNATURES],
        [...AI_ACTION_LEDGER_OBSOLETE_STUB_OVERLOAD_SIGNATURES],
      ],
    );
    const row = result.rows?.[0] as Record<string, unknown> | undefined;
    return {
      checked: true,
      activeRpcCount: Number(row?.active_rpc_count ?? 0),
      oldStubOverloads: row?.old_stub_overloads === true || row?.old_stub_overloads === "true",
      functionsInPublicSchema:
        row?.functions_in_public_schema === true || row?.functions_in_public_schema === "true",
      authenticatedExecuteGrantOk:
        row?.authenticated_execute_grant_ok === true || row?.authenticated_execute_grant_ok === "true",
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

function resolveAuthCredentials(env: EnvLike, fileEnv: ReadonlyMap<string, string>): {
  email: string;
  password: string;
} | null {
  const email =
    envValue(env, fileEnv, "E2E_CONTROL_EMAIL") ||
    envValue(env, fileEnv, "E2E_DEVELOPER_EMAIL") ||
    envValue(env, fileEnv, "E2E_DIRECTOR_EMAIL");
  const password =
    envValue(env, fileEnv, "E2E_CONTROL_PASSWORD") ||
    envValue(env, fileEnv, "E2E_DEVELOPER_PASSWORD") ||
    envValue(env, fileEnv, "E2E_DIRECTOR_PASSWORD");
  return email && password ? { email, password } : null;
}

async function signInForAccessToken(params: {
  supabaseUrl: string;
  anonKey: string;
  email: string;
  password: string;
}): Promise<{ accessToken: string } | null> {
  const response = await fetch(`${params.supabaseUrl.replace(/\/+$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: params.anonKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      password: params.password,
    }),
  });
  if (!response.ok) return null;
  const parsed = await response.json().catch(() => null) as Record<string, unknown> | null;
  const accessToken = text(parsed?.access_token);
  return accessToken ? { accessToken } : null;
}

function signatureAwarePayload(fn: string): Record<string, unknown> {
  if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval) {
    return {
      p_organization_id: PROBE_ORGANIZATION_ID,
      p_action_type: "draft_request",
      p_risk_level: "draft_only",
      p_screen_id: "ai.rpc.signature_probe",
      p_domain: "procurement",
      p_summary: "Signature-aware no-op ledger RPC probe",
      p_redacted_payload: { probe: "signature_aware" },
      p_evidence_refs: ["ai_action_ledger:rpc_signature_probe"],
      p_idempotency_key: "ai-ledger-rpc-signature-probe-0001",
      p_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      p_actor_role: "director",
      p_requested_by_user_id_hash: "user:rpc_signature_probe",
      p_organization_id_hash: "org:rpc_signature_probe",
      p_audit_reason: "Signature-aware RPC visibility probe.",
    };
  }
  if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus) {
    return {
      p_action_id: PROBE_ACTION_ID,
      p_actor_role: "director",
    };
  }
  if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.verifyApply) {
    return {};
  }
  if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.approve) {
    return {
      p_action_id: PROBE_ACTION_ID,
      p_actor_role: "director",
    };
  }
  if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.reject) {
    return {
      p_action_id: PROBE_ACTION_ID,
      p_reason: "e2e_reject_probe",
      p_actor_role: "director",
    };
  }
  return {
    p_action_id: PROBE_ACTION_ID,
    p_actor_role: "director",
  };
}

async function probeSignatureAwareRpc(params: {
  restBaseUrl: string;
  anonKey: string;
  accessToken: string;
  fn: string;
}): Promise<AiActionLedgerPostgrestRpcProbeSummary> {
  const response = await fetch(`${params.restBaseUrl}/rpc/${params.fn}`, {
    method: "POST",
    headers: {
      apikey: params.anonKey,
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(signatureAwarePayload(params.fn)),
  });
  const summary = await responseJsonSummary(response);
  const classification = classifyAiActionLedgerPostgrestRpcProbe({
    httpStatus: response.status,
    postgrestErrorCode: summary.code,
    message: summary.message,
  });
  return {
    rpc: params.fn,
    httpStatus: response.status,
    postgrestErrorCode: summary.code,
    signatureAwarePayload: true,
    callable: classification.status === "GREEN_RPC_VISIBLE_AND_CALLABLE",
    pgrst202: classification.pgrst202,
    pgrst203: classification.pgrst203,
    permissionDenied: classification.postgrestPermissionDenied,
  };
}

function visibilityFromProbes(probes: readonly AiActionLedgerPostgrestRpcProbeSummary[]): AiActionLedgerPostgrestRpcOpenApiVisibility {
  const callable = (fn: string) => probes.some((probe) => probe.rpc === fn && probe.callable);
  const submitForApprovalRpcVisible = callable(AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval);
  const getStatusRpcVisible = callable(AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus);
  const approveRpcVisible = callable(AI_ACTION_LEDGER_RPC_FUNCTIONS.approve);
  const rejectRpcVisible = callable(AI_ACTION_LEDGER_RPC_FUNCTIONS.reject);
  const executeApprovedRpcVisible = callable(AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved);
  const verifyApplyRpcVisible = callable(AI_ACTION_LEDGER_RPC_FUNCTIONS.verifyApply);
  return {
    submitForApprovalRpcVisible,
    getStatusRpcVisible,
    approveRpcVisible,
    rejectRpcVisible,
    executeApprovedRpcVisible,
    verifyApplyRpcVisible,
    postgrestRpcVisible:
      submitForApprovalRpcVisible &&
      getStatusRpcVisible &&
      approveRpcVisible &&
      rejectRpcVisible &&
      executeApprovedRpcVisible &&
      verifyApplyRpcVisible,
  };
}

function firstProbeCode(probes: readonly AiActionLedgerPostgrestRpcProbeSummary[]): string | null {
  return probes.find((probe) => probe.postgrestErrorCode)?.postgrestErrorCode ?? null;
}

export async function verifyAiActionLedgerPostgrestRpcVisibility(
  env: EnvLike = process.env,
  projectRoot = process.cwd(),
): Promise<AiActionLedgerPostgrestRpcVisibility> {
  const fileEnv = readEnv(projectRoot);
  const supabaseUrl = envValue(env, fileEnv, "EXPO_PUBLIC_SUPABASE_URL");
  const anonKey = envValue(env, fileEnv, "EXPO_PUBLIC_SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return baseResult(
      "BLOCKED_POSTGREST_URL_OR_KEY_MISSING",
      "Supabase public URL or anon key is missing for PostgREST RPC visibility verification.",
    );
  }

  const [inspection, catalog] = await Promise.all([
    inspectAiActionLedgerMigrationState(env, projectRoot),
    inspectRpcCatalog(env),
  ]);
  const directSqlFunctionsChecked = inspection.status === "GREEN_AI_ACTION_LEDGER_MIGRATION_STATE_INSPECTED";
  const directSqlFunctionsExist = directSqlFunctionsChecked ? directSqlFunctionsExistFromInspection(inspection) : false;
  const catalogFields = {
    activeRpcCount: catalog.activeRpcCount,
    active_rpc_count: catalog.activeRpcCount,
    oldStubOverloads: catalog.oldStubOverloads,
    old_stub_overloads: catalog.oldStubOverloads,
    functionsInPublicSchema: catalog.functionsInPublicSchema,
    functions_in_public_schema: catalog.functionsInPublicSchema,
    authenticatedExecuteGrantOk: catalog.authenticatedExecuteGrantOk,
    authenticated_execute_grant_ok: catalog.authenticatedExecuteGrantOk,
  };
  if (directSqlFunctionsChecked && !directSqlFunctionsExist) {
    return baseResult(
      "BLOCKED_AI_ACTION_LEDGER_SQL_RPC_MISSING",
      "SQL RPC functions are missing in DB.",
      {
        directSqlFunctionsChecked,
        directSqlFunctionsExist,
        ...catalogFields,
      },
    );
  }
  if (catalog.checked && catalog.oldStubOverloads) {
    return baseResult(
      "BLOCKED_OLD_STUB_OVERLOADS_PRESENT",
      "Obsolete action-ledger contract stub overloads are still present and can cause PGRST203.",
      {
        directSqlFunctionsChecked,
        directSqlFunctionsExist,
        ...catalogFields,
      },
    );
  }

  const credentials = resolveAuthCredentials(env, fileEnv);
  if (!credentials) {
    return baseResult(
      "BLOCKED_POSTGREST_AUTH_ENV_MISSING",
      "Explicit developer/control or director E2E credentials are missing for authenticated RPC probes.",
      {
        directSqlFunctionsChecked,
        directSqlFunctionsExist,
        ...catalogFields,
      },
    );
  }

  const auth = await signInForAccessToken({
    supabaseUrl,
    anonKey,
    email: credentials.email,
    password: credentials.password,
  });
  if (!auth) {
    return baseResult(
      "BLOCKED_POSTGREST_AUTH_FAILED",
      "Explicit developer/control credentials could not authenticate for PostgREST RPC probes.",
      {
        directSqlFunctionsChecked,
        directSqlFunctionsExist,
        ...catalogFields,
      },
    );
  }

  const restBaseUrl = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1`;
  let openApiVisibility = parseAiActionLedgerPostgrestOpenApiVisibility("");
  let postgrestOpenApiChecked = false;
  try {
    const openApi = await fetch(`${restBaseUrl}/`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: "application/openapi+json, application/json",
      },
    });
    if (openApi.ok) {
      postgrestOpenApiChecked = true;
      openApiVisibility = parseAiActionLedgerPostgrestOpenApiVisibility(await openApi.text());
    }
  } catch {
    postgrestOpenApiChecked = false;
  }

  let probes: AiActionLedgerPostgrestRpcProbeSummary[];
  try {
    probes = [];
    for (const fn of [
      AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.verifyApply,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.approve,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.reject,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval,
    ]) {
      probes.push(await probeSignatureAwareRpc({
        restBaseUrl,
        anonKey,
        accessToken: auth.accessToken,
        fn,
      }));
    }
  } catch {
    return baseResult(
      "BLOCKED_POSTGREST_NETWORK_ERROR",
      "PostgREST signature-aware RPC probe failed before producing a sanitized result.",
      {
        directSqlFunctionsChecked,
        directSqlFunctionsExist,
        postgrestOpenApiChecked,
        authenticatedJwtUsed: true,
        authenticated_jwt_used: true,
        ...openApiVisibility,
        ...catalogFields,
      },
    );
  }

  const probeVisibility = visibilityFromProbes(probes);
  const pgrst202 = probes.some((probe) => probe.pgrst202);
  const pgrst203 = probes.some((probe) => probe.pgrst203);
  const permissionDenied = probes.some((probe) => probe.permissionDenied);
  const all6RpcSignatureAwareProbeOk = probes.length === 6 && probes.every((probe) => probe.callable);
  const httpStatus = probes.find((probe) => probe.httpStatus !== null)?.httpStatus ?? null;
  const baseOverrides = {
    directSqlFunctionsChecked,
    directSqlFunctionsExist,
    postgrestOpenApiChecked,
    postgrestRpcProbeChecked: true,
    signatureAwareRpcProbeChecked: true,
    all6RpcSignatureAwareProbeOk,
    all_6_rpc_signature_aware_probe_ok: all6RpcSignatureAwareProbeOk,
    ...openApiVisibility,
    ...probeVisibility,
    postgrestRpcVisible: probeVisibility.postgrestRpcVisible,
    ledger_rpc_visible: probeVisibility.postgrestRpcVisible,
    postgrestRpcCallable: all6RpcSignatureAwareProbeOk,
    safeReadOnlyProbeExecuted: true,
    mutatingRpcProbeExecuted: true,
    authenticatedJwtUsed: true,
    authenticated_jwt_used: true,
    httpStatus,
    postgrestErrorCode: firstProbeCode(probes),
    pgrst202,
    pgrst203,
    postgrestPermissionDenied: permissionDenied,
    probes,
    ...catalogFields,
  };

  if (pgrst202) {
    return baseResult(
      "BLOCKED_POSTGREST_SCHEMA_CACHE_STALE",
      "PostgREST returned PGRST202 for at least one signature-aware ledger RPC probe.",
      baseOverrides,
    );
  }
  if (pgrst203) {
    return baseResult(
      "BLOCKED_POSTGREST_RPC_AMBIGUOUS_OVERLOAD",
      "PostgREST returned PGRST203 for at least one signature-aware ledger RPC probe.",
      baseOverrides,
    );
  }
  if (permissionDenied) {
    return baseResult(
      "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED",
      "Authenticated caller reached a ledger RPC but lacks execute permission.",
      baseOverrides,
    );
  }
  if (!all6RpcSignatureAwareProbeOk) {
    return baseResult(
      "BLOCKED_POSTGREST_NETWORK_ERROR",
      "One or more signature-aware ledger RPC probes did not return a callable PostgREST response.",
      baseOverrides,
    );
  }

  return baseResult("GREEN_RPC_VISIBLE_AND_CALLABLE", null, {
    ...baseOverrides,
    blocker: null,
    exactReason: null,
  });
}

if (require.main === module) {
  void verifyAiActionLedgerPostgrestRpcVisibility()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exitCode =
        result.status === "GREEN_RPC_VISIBLE_AND_CALLABLE" ||
        result.status === "GREEN_RPC_VISIBLE_AUTH_REQUIRED" ||
        result.status === "GREEN_RPC_VISIBLE_SIGNATURE_MISMATCH_ONLY"
          ? 0
          : 2;
    })
    .catch(() => {
      process.stdout.write(
        `${JSON.stringify(
          baseResult(
            "BLOCKED_POSTGREST_NETWORK_ERROR",
            "PostgREST RPC visibility verifier failed before producing a sanitized result.",
          ),
          null,
          2,
        )}\n`,
      );
      process.exitCode = 2;
    });
}
