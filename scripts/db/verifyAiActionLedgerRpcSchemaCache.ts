import { AI_ACTION_LEDGER_RPC_FUNCTIONS } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import { parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import {
  AI_ACTION_LEDGER_REQUIRED_RPC_FUNCTIONS,
  inspectAiActionLedgerMigrationState,
} from "./inspectAiActionLedgerMigrationState";

export type AiActionLedgerRpcSchemaCacheStatus =
  | "GREEN_AI_ACTION_LEDGER_RPC_SCHEMA_CACHE_VISIBLE"
  | "BLOCKED_DB_URL_NOT_APPROVED"
  | "BLOCKED_LEDGER_RPC_NOT_DEPLOYED"
  | "BLOCKED_POSTGREST_SCHEMA_CACHE_STALE";

export type AiActionLedgerRpcSchemaCacheVerification = {
  status: AiActionLedgerRpcSchemaCacheStatus;
  directSqlFunctionsChecked: boolean;
  directSqlFunctionsExist: boolean;
  postgrestSchemaCacheChecked: boolean;
  postgrestSchemaCacheRpcVisible: boolean;
  submitForApprovalRpcVisible: boolean;
  getStatusRpcVisible: boolean;
  approveRpcVisible: boolean;
  rejectRpcVisible: boolean;
  executeApprovedRpcVisible: boolean;
  verifyApplyRpcVisible: boolean;
  noRpcExecuted: true;
  rawRowsPrinted: false;
  secretsPrinted: false;
  databaseUrlValuePrinted: false;
  credentialsPrinted: false;
  blocker: Exclude<AiActionLedgerRpcSchemaCacheStatus, "GREEN_AI_ACTION_LEDGER_RPC_SCHEMA_CACHE_VISIBLE"> | null;
  exactReason: string | null;
};

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

function blocked(
  status: Exclude<AiActionLedgerRpcSchemaCacheStatus, "GREEN_AI_ACTION_LEDGER_RPC_SCHEMA_CACHE_VISIBLE">,
  exactReason: string,
  overrides: Partial<AiActionLedgerRpcSchemaCacheVerification> = {},
): AiActionLedgerRpcSchemaCacheVerification {
  return {
    status,
    directSqlFunctionsChecked: false,
    directSqlFunctionsExist: false,
    postgrestSchemaCacheChecked: false,
    postgrestSchemaCacheRpcVisible: false,
    submitForApprovalRpcVisible: false,
    getStatusRpcVisible: false,
    approveRpcVisible: false,
    rejectRpcVisible: false,
    executeApprovedRpcVisible: false,
    verifyApplyRpcVisible: false,
    noRpcExecuted: true,
    rawRowsPrinted: false,
    secretsPrinted: false,
    databaseUrlValuePrinted: false,
    credentialsPrinted: false,
    blocker: status,
    exactReason,
    ...overrides,
  };
}

async function readPostgrestOpenApi(projectRoot: string, env: Record<string, string | undefined>): Promise<string | null> {
  const fileEnv = readEnv(projectRoot);
  const supabaseUrl = envValue(env, fileEnv, "EXPO_PUBLIC_SUPABASE_URL");
  const anonKey = envValue(env, fileEnv, "EXPO_PUBLIC_SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return null;
  const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/rest/v1/`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: "application/openapi+json, application/json",
    },
  });
  if (!response.ok) return null;
  return response.text();
}

export function parseAiActionLedgerRpcOpenApiVisibility(source: string): Pick<
  AiActionLedgerRpcSchemaCacheVerification,
  | "submitForApprovalRpcVisible"
  | "getStatusRpcVisible"
  | "approveRpcVisible"
  | "rejectRpcVisible"
  | "executeApprovedRpcVisible"
  | "verifyApplyRpcVisible"
  | "postgrestSchemaCacheRpcVisible"
> {
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
    postgrestSchemaCacheRpcVisible:
      submitForApprovalRpcVisible &&
      getStatusRpcVisible &&
      approveRpcVisible &&
      rejectRpcVisible &&
      executeApprovedRpcVisible &&
      verifyApplyRpcVisible,
  };
}

export async function verifyAiActionLedgerRpcSchemaCache(
  env: Record<string, string | undefined> = process.env,
  projectRoot = process.cwd(),
): Promise<AiActionLedgerRpcSchemaCacheVerification> {
  const inspection = await inspectAiActionLedgerMigrationState(env, projectRoot);
  if (inspection.status === "BLOCKED_DB_URL_NOT_APPROVED") {
    return blocked("BLOCKED_DB_URL_NOT_APPROVED", inspection.exactReason ?? "Approved DB URL is missing.");
  }
  const directSqlFunctionsExist = AI_ACTION_LEDGER_REQUIRED_RPC_FUNCTIONS.every((fn) => {
    switch (fn) {
      case AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval:
        return inspection.submitRpcExists;
      case AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus:
        return inspection.getStatusRpcExists;
      case AI_ACTION_LEDGER_RPC_FUNCTIONS.approve:
        return inspection.approveRpcExists;
      case AI_ACTION_LEDGER_RPC_FUNCTIONS.reject:
        return inspection.rejectRpcExists;
      case AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved:
        return inspection.executeApprovedRpcExists;
      case AI_ACTION_LEDGER_RPC_FUNCTIONS.verifyApply:
        return inspection.verifyApplyRpcExists;
      default:
        return false;
    }
  });
  const openApi = await readPostgrestOpenApi(projectRoot, env);
  const visibility = openApi ? parseAiActionLedgerRpcOpenApiVisibility(openApi) : {
    submitForApprovalRpcVisible: false,
    getStatusRpcVisible: false,
    approveRpcVisible: false,
    rejectRpcVisible: false,
    executeApprovedRpcVisible: false,
    verifyApplyRpcVisible: false,
    postgrestSchemaCacheRpcVisible: false,
  };
  if (!directSqlFunctionsExist) {
    return blocked(
      "BLOCKED_LEDGER_RPC_NOT_DEPLOYED",
      "Direct SQL inspection does not show every AI action ledger RPC function.",
      {
        directSqlFunctionsChecked: true,
        directSqlFunctionsExist,
        postgrestSchemaCacheChecked: Boolean(openApi),
        ...visibility,
      },
    );
  }
  if (!visibility.postgrestSchemaCacheRpcVisible) {
    return blocked(
      "BLOCKED_POSTGREST_SCHEMA_CACHE_STALE",
      "AI action ledger SQL functions exist, but PostgREST schema cache does not expose every RPC.",
      {
        directSqlFunctionsChecked: true,
        directSqlFunctionsExist,
        postgrestSchemaCacheChecked: Boolean(openApi),
        ...visibility,
      },
    );
  }
  return {
    status: "GREEN_AI_ACTION_LEDGER_RPC_SCHEMA_CACHE_VISIBLE",
    directSqlFunctionsChecked: true,
    directSqlFunctionsExist: true,
    postgrestSchemaCacheChecked: true,
    ...visibility,
    noRpcExecuted: true,
    rawRowsPrinted: false,
    secretsPrinted: false,
    databaseUrlValuePrinted: false,
    credentialsPrinted: false,
    blocker: null,
    exactReason: null,
  };
}

if (require.main === module) {
  void verifyAiActionLedgerRpcSchemaCache()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exitCode = result.status === "GREEN_AI_ACTION_LEDGER_RPC_SCHEMA_CACHE_VISIBLE" ? 0 : 2;
    })
    .catch(() => {
      process.stdout.write(
        `${JSON.stringify(
          blocked(
            "BLOCKED_LEDGER_RPC_NOT_DEPLOYED",
            "AI action ledger RPC schema cache verification failed before producing a sanitized result.",
          ),
          null,
          2,
        )}\n`,
      );
      process.exitCode = 2;
    });
}
