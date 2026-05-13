import { AI_ACTION_LEDGER_RPC_FUNCTIONS } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import { parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import {
  AI_ACTION_LEDGER_REQUIRED_RPC_FUNCTIONS,
  inspectAiActionLedgerMigrationState,
} from "./inspectAiActionLedgerMigrationState";

export type AiActionLedgerPostgrestRpcVisibilityStatus =
  | "GREEN_RPC_VISIBLE_AND_CALLABLE"
  | "GREEN_RPC_VISIBLE_AUTH_REQUIRED"
  | "BLOCKED_LEDGER_RPC_NOT_DEPLOYED"
  | "BLOCKED_POSTGREST_SCHEMA_CACHE_STALE"
  | "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED"
  | "BLOCKED_POSTGREST_URL_OR_KEY_MISSING"
  | "BLOCKED_POSTGREST_NETWORK_ERROR";

export type AiActionLedgerPostgrestRpcVisibility = {
  status: AiActionLedgerPostgrestRpcVisibilityStatus;
  directSqlFunctionsChecked: boolean;
  directSqlFunctionsExist: boolean;
  postgrestOpenApiChecked: boolean;
  postgrestRpcProbeChecked: boolean;
  postgrestRpcVisible: boolean;
  postgrestRpcCallable: boolean;
  postgrestAuthRequired: boolean;
  postgrestPermissionDenied: boolean;
  submitForApprovalRpcVisible: boolean;
  getStatusRpcVisible: boolean;
  approveRpcVisible: boolean;
  rejectRpcVisible: boolean;
  executeApprovedRpcVisible: boolean;
  checkedRpc: typeof AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus;
  safeReadOnlyProbeExecuted: boolean;
  mutatingRpcExecuted: false;
  httpStatus: number | null;
  postgrestErrorCode: string | null;
  rawRowsPrinted: false;
  secretsPrinted: false;
  databaseUrlValuePrinted: false;
  credentialsPrinted: false;
  blocker: Exclude<
    AiActionLedgerPostgrestRpcVisibilityStatus,
    "GREEN_RPC_VISIBLE_AND_CALLABLE" | "GREEN_RPC_VISIBLE_AUTH_REQUIRED"
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
  blocker: AiActionLedgerPostgrestRpcVisibility["blocker"];
  exactReason: string | null;
};

const PROBE_ACTION_ID = "00000000-0000-4000-8000-000000000001";

function readEnv(projectRoot: string): ReadonlyMap<string, string> {
  const merged = new Map<string, string>();
  for (const envFile of [".env", ".env.local", ".env.agent.staging.local"]) {
    for (const [key, value] of parseAgentEnvFileValues(`${projectRoot}/${envFile}`)) {
      merged.set(key, value);
    }
  }
  return merged;
}

function envValue(env: Record<string, string | undefined>, fileEnv: ReadonlyMap<string, string>, key: string): string {
  return String(env[key] ?? fileEnv.get(key) ?? "").trim();
}

function baseResult(
  status: AiActionLedgerPostgrestRpcVisibilityStatus,
  exactReason: string | null,
  overrides: Partial<AiActionLedgerPostgrestRpcVisibility> = {},
): AiActionLedgerPostgrestRpcVisibility {
  const green = status === "GREEN_RPC_VISIBLE_AND_CALLABLE" || status === "GREEN_RPC_VISIBLE_AUTH_REQUIRED";
  return {
    status,
    directSqlFunctionsChecked: false,
    directSqlFunctionsExist: false,
    postgrestOpenApiChecked: false,
    postgrestRpcProbeChecked: false,
    postgrestRpcVisible: false,
    postgrestRpcCallable: false,
    postgrestAuthRequired: false,
    postgrestPermissionDenied: false,
    submitForApprovalRpcVisible: false,
    getStatusRpcVisible: false,
    approveRpcVisible: false,
    rejectRpcVisible: false,
    executeApprovedRpcVisible: false,
    checkedRpc: AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
    safeReadOnlyProbeExecuted: false,
    mutatingRpcExecuted: false,
    httpStatus: null,
    postgrestErrorCode: null,
    rawRowsPrinted: false,
    secretsPrinted: false,
    databaseUrlValuePrinted: false,
    credentialsPrinted: false,
    blocker: green ? null : (status as Exclude<
      AiActionLedgerPostgrestRpcVisibilityStatus,
      "GREEN_RPC_VISIBLE_AND_CALLABLE" | "GREEN_RPC_VISIBLE_AUTH_REQUIRED"
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
  return input.httpStatus === 404 && /PGRST202|Could not find the function|schema cache/i.test(combined);
}

function isPermissionDenied(input: ProbeInput): boolean {
  const combined = [input.postgrestErrorCode, input.message].map(text).filter(Boolean).join(" ");
  return input.postgrestErrorCode === "42501" || /permission denied|insufficient privilege/i.test(combined);
}

export function classifyAiActionLedgerPostgrestRpcProbe(input: ProbeInput): ProbeClassification {
  if (input.httpStatus >= 200 && input.httpStatus < 300) {
    return {
      status: "GREEN_RPC_VISIBLE_AND_CALLABLE",
      postgrestRpcVisible: true,
      postgrestRpcCallable: true,
      postgrestAuthRequired: false,
      postgrestPermissionDenied: false,
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
      blocker: "BLOCKED_POSTGREST_SCHEMA_CACHE_STALE",
      exactReason: "PostgREST returned PGRST202 for the safe get_status RPC probe.",
    };
  }

  if (input.httpStatus === 401) {
    return {
      status: "GREEN_RPC_VISIBLE_AUTH_REQUIRED",
      postgrestRpcVisible: true,
      postgrestRpcCallable: false,
      postgrestAuthRequired: true,
      postgrestPermissionDenied: false,
      blocker: null,
      exactReason: "PostgREST reached the ledger RPC and required authenticated caller credentials.",
    };
  }

  if (input.httpStatus === 403 || isPermissionDenied(input)) {
    return {
      status: "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED",
      postgrestRpcVisible: true,
      postgrestRpcCallable: false,
      postgrestAuthRequired: false,
      postgrestPermissionDenied: true,
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
  return {
    submitForApprovalRpcVisible,
    getStatusRpcVisible,
    approveRpcVisible,
    rejectRpcVisible,
    executeApprovedRpcVisible,
    postgrestRpcVisible:
      submitForApprovalRpcVisible &&
      getStatusRpcVisible &&
      approveRpcVisible &&
      rejectRpcVisible &&
      executeApprovedRpcVisible,
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

export async function verifyAiActionLedgerPostgrestRpcVisibility(
  env: Record<string, string | undefined> = process.env,
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

  const inspection = await inspectAiActionLedgerMigrationState(env, projectRoot);
  const directSqlFunctionsChecked = inspection.status === "GREEN_AI_ACTION_LEDGER_MIGRATION_STATE_INSPECTED";
  const directSqlFunctionsExist = directSqlFunctionsChecked ? directSqlFunctionsExistFromInspection(inspection) : false;
  if (directSqlFunctionsChecked && !directSqlFunctionsExist) {
    return baseResult(
      "BLOCKED_LEDGER_RPC_NOT_DEPLOYED",
      "SQL RPC functions are missing in DB.",
      {
        directSqlFunctionsChecked,
        directSqlFunctionsExist,
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
        Authorization: `Bearer ${anonKey}`,
        Accept: "application/openapi+json, application/json",
      },
    });
    if (openApi.ok) {
      postgrestOpenApiChecked = true;
      openApiVisibility = parseAiActionLedgerPostgrestOpenApiVisibility(await openApi.text());
    }
  } catch {
    return baseResult(
      "BLOCKED_POSTGREST_NETWORK_ERROR",
      "PostgREST OpenAPI visibility probe failed before producing a sanitized result.",
      {
        directSqlFunctionsChecked,
        directSqlFunctionsExist,
      },
    );
  }

  try {
    const response = await fetch(`${restBaseUrl}/rpc/${AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus}`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        p_action_id: PROBE_ACTION_ID,
        p_actor_role: "director",
      }),
    });
    const summary = await responseJsonSummary(response);
    const probe = classifyAiActionLedgerPostgrestRpcProbe({
      httpStatus: response.status,
      postgrestErrorCode: summary.code,
      message: summary.message,
    });
    const visibleFlags =
      probe.postgrestRpcVisible && !openApiVisibility.postgrestRpcVisible
        ? {
            ...openApiVisibility,
            getStatusRpcVisible: true,
            postgrestRpcVisible: true,
          }
        : openApiVisibility;
    return baseResult(probe.status, probe.exactReason, {
      directSqlFunctionsChecked,
      directSqlFunctionsExist,
      postgrestOpenApiChecked,
      postgrestRpcProbeChecked: true,
      ...visibleFlags,
      postgrestRpcVisible: probe.postgrestRpcVisible || visibleFlags.postgrestRpcVisible,
      postgrestRpcCallable: probe.postgrestRpcCallable,
      postgrestAuthRequired: probe.postgrestAuthRequired,
      postgrestPermissionDenied: probe.postgrestPermissionDenied,
      safeReadOnlyProbeExecuted: true,
      httpStatus: response.status,
      postgrestErrorCode: summary.code,
      blocker: probe.blocker,
    });
  } catch {
    return baseResult(
      "BLOCKED_POSTGREST_NETWORK_ERROR",
      "PostgREST safe get_status RPC probe failed before producing a sanitized result.",
      {
        directSqlFunctionsChecked,
        directSqlFunctionsExist,
        postgrestOpenApiChecked,
        ...openApiVisibility,
      },
    );
  }
}

if (require.main === module) {
  void verifyAiActionLedgerPostgrestRpcVisibility()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exitCode =
        result.status === "GREEN_RPC_VISIBLE_AND_CALLABLE" ||
        result.status === "GREEN_RPC_VISIBLE_AUTH_REQUIRED"
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
