import { AI_ACTION_LEDGER_RPC_FUNCTIONS } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import { parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { parseMigrationFilename } from "../release/boundedMigrationRunner.shared";
import { AI_ACTION_LEDGER_APPLY_MIGRATION } from "./aiActionLedgerMigrationShared";
import { AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS } from "./preflightAiActionLedgerMigration";

export const AI_ACTION_LEDGER_REQUIRED_RPC_FUNCTIONS = [
  AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval,
  AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
  AI_ACTION_LEDGER_RPC_FUNCTIONS.approve,
  AI_ACTION_LEDGER_RPC_FUNCTIONS.reject,
  AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved,
] as const;

export const AI_ACTION_LEDGER_REQUIRED_INDEXES = [
  "ai_action_ledger_org_hash_status_created_idx",
  "ai_action_ledger_status_expires_idx",
  "ai_action_ledger_idempotency_key_idx",
] as const;

export const AI_ACTION_LEDGER_REQUIRED_POLICIES = [
  "ai_action_ledger_select_company_scope",
  "ai_action_ledger_insert_pending_company_scope",
  "ai_action_ledger_update_approval_company_scope",
  "ai_action_ledger_update_executed_company_scope",
] as const;

export type AiActionLedgerMigrationState =
  | "STATE_A_OBJECTS_AND_HISTORY_PRESENT"
  | "STATE_READY_BUT_POSTGREST_SCHEMA_CACHE_STALE"
  | "STATE_B_OBJECTS_PRESENT_HISTORY_MISSING"
  | "STATE_C_OBJECTS_MISSING_HISTORY_MISSING"
  | "STATE_D_PARTIAL_OBJECTS_HISTORY_MISSING"
  | "STATE_E_HISTORY_PRESENT_OBJECTS_MISSING"
  | "STATE_F_HISTORY_PRESENT_PARTIAL_OBJECTS";

export type AiActionLedgerMigrationStateInspectionStatus =
  | "GREEN_AI_ACTION_LEDGER_MIGRATION_STATE_INSPECTED"
  | "BLOCKED_DB_URL_NOT_APPROVED"
  | "BLOCKED_AI_ACTION_LEDGER_STATE_INSPECT_FAILED";

export type AiActionLedgerMigrationStateBooleans = {
  tableExists: boolean;
  indexesExist: boolean;
  rlsEnabled: boolean;
  policiesExist: boolean;
  submitRpcExists: boolean;
  getStatusRpcExists: boolean;
  approveRpcExists: boolean;
  rejectRpcExists: boolean;
  executeApprovedRpcExists: boolean;
  migrationHistoryTableExists: boolean;
  migrationHistoryRecordExists: boolean;
};

export type AiActionLedgerMigrationStateInspection = AiActionLedgerMigrationStateBooleans & {
  status: AiActionLedgerMigrationStateInspectionStatus;
  migration: typeof AI_ACTION_LEDGER_APPLY_MIGRATION;
  databaseUrlEnv: "present" | "missing";
  databaseUrlValuePrinted: false;
  rawRowsPrinted: false;
  secretsPrinted: false;
  state: AiActionLedgerMigrationState | null;
  objectsPresent: boolean;
  functionsExist: boolean;
  postgrestSchemaCacheRpcVisible: boolean;
  postgrestSchemaCacheChecked: boolean;
  migrationHistoryRecordChecked: boolean;
  blocker:
    | "BLOCKED_DB_URL_NOT_APPROVED"
    | "BLOCKED_AI_ACTION_LEDGER_STATE_INSPECT_FAILED"
    | null;
  exactReason: string | null;
};

type DbClient = {
  connect(): Promise<unknown>;
  end(): Promise<unknown>;
  query(sql: string, values?: readonly unknown[]): Promise<{ rows?: Array<Record<string, unknown>> }>;
};

function databaseUrlEnvName(env: Record<string, string | undefined>): string | null {
  return AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS.find((key) => String(env[key] ?? "").trim()) ?? null;
}

function bool(value: unknown): boolean {
  return value === true || value === "true";
}

function migrationParts(): { version: string; name: string } {
  const parsed = parseMigrationFilename(AI_ACTION_LEDGER_APPLY_MIGRATION);
  if (!parsed) {
    return { version: "", name: "" };
  }
  return { version: parsed.version, name: parsed.name };
}

function functionsExist(input: Pick<
  AiActionLedgerMigrationStateBooleans,
  "submitRpcExists" | "getStatusRpcExists" | "approveRpcExists" | "rejectRpcExists" | "executeApprovedRpcExists"
>): boolean {
  return (
    input.submitRpcExists &&
    input.getStatusRpcExists &&
    input.approveRpcExists &&
    input.rejectRpcExists &&
    input.executeApprovedRpcExists
  );
}

type AiActionLedgerMigrationClassificationInput = AiActionLedgerMigrationStateBooleans & {
  postgrestSchemaCacheRpcVisible?: boolean;
};

export function classifyAiActionLedgerMigrationState(
  input: AiActionLedgerMigrationClassificationInput,
): AiActionLedgerMigrationState {
  const objectFlags = [
    input.tableExists,
    input.indexesExist,
    input.rlsEnabled,
    input.policiesExist,
    functionsExist(input),
  ];
  const objectsPresent = objectFlags.every(Boolean);
  const objectsMissing = objectFlags.every((value) => !value);
  const schemaCacheVisible = input.postgrestSchemaCacheRpcVisible ?? true;

  if (objectsPresent && schemaCacheVisible && input.migrationHistoryRecordExists) {
    return "STATE_A_OBJECTS_AND_HISTORY_PRESENT";
  }
  if (objectsPresent && !schemaCacheVisible && input.migrationHistoryRecordExists) {
    return "STATE_READY_BUT_POSTGREST_SCHEMA_CACHE_STALE";
  }
  if (input.migrationHistoryRecordExists && (!objectsPresent || !schemaCacheVisible)) {
    return "STATE_F_HISTORY_PRESENT_PARTIAL_OBJECTS";
  }
  if (objectsPresent && !input.migrationHistoryRecordExists) {
    return "STATE_B_OBJECTS_PRESENT_HISTORY_MISSING";
  }
  if (objectsMissing && !input.migrationHistoryRecordExists) {
    return "STATE_C_OBJECTS_MISSING_HISTORY_MISSING";
  }
  if (objectsMissing && input.migrationHistoryRecordExists) {
    return "STATE_E_HISTORY_PRESENT_OBJECTS_MISSING";
  }
  return "STATE_D_PARTIAL_OBJECTS_HISTORY_MISSING";
}

async function inspectPostgrestSchemaCache(
  env: Record<string, string | undefined>,
  projectRoot: string,
): Promise<boolean> {
  const agentEnv = parseAgentEnvFileValues(`${projectRoot}/.env.agent.staging.local`);
  const localEnv = parseAgentEnvFileValues(`${projectRoot}/.env.local`);
  const supabaseUrl = String(
    env.EXPO_PUBLIC_SUPABASE_URL ?? localEnv.get("EXPO_PUBLIC_SUPABASE_URL") ?? agentEnv.get("EXPO_PUBLIC_SUPABASE_URL") ?? "",
  ).trim();
  const anonKey = String(
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      localEnv.get("EXPO_PUBLIC_SUPABASE_ANON_KEY") ??
      agentEnv.get("EXPO_PUBLIC_SUPABASE_ANON_KEY") ??
      "",
  ).trim();
  if (!supabaseUrl || !anonKey) return false;

  const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/rest/v1/`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: "application/openapi+json, application/json",
    },
  });
  if (!response.ok) return false;
  const text = await response.text();
  return AI_ACTION_LEDGER_REQUIRED_RPC_FUNCTIONS.every((fn) => text.includes(`/rpc/${fn}`) || text.includes(fn));
}

async function inspectDbObjects(client: DbClient): Promise<Omit<
  AiActionLedgerMigrationStateBooleans,
  "migrationHistoryTableExists" | "migrationHistoryRecordExists"
>> {
  const result = await client.query(
    `
      select jsonb_build_object(
        'tableExists', to_regclass('public.ai_action_ledger') is not null,
        'indexesExist', (
          select count(*) = $1::int
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relkind = 'i'
            and c.relname = any($2::text[])
        ),
        'rlsEnabled', exists (
          select 1
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relname = 'ai_action_ledger'
            and c.relrowsecurity = true
        ),
        'policiesExist', (
          select count(*) = $3::int
          from pg_policies
          where schemaname = 'public'
            and tablename = 'ai_action_ledger'
            and policyname = any($4::text[])
        ),
        'submitRpcExists', exists (
          select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = $5
        ),
        'getStatusRpcExists', exists (
          select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = $6
        ),
        'approveRpcExists', exists (
          select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = $7
        ),
        'rejectRpcExists', exists (
          select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = $8
        ),
        'executeApprovedRpcExists', exists (
          select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = $9
        )
      ) as result
    `,
    [
      AI_ACTION_LEDGER_REQUIRED_INDEXES.length,
      [...AI_ACTION_LEDGER_REQUIRED_INDEXES],
      AI_ACTION_LEDGER_REQUIRED_POLICIES.length,
      [...AI_ACTION_LEDGER_REQUIRED_POLICIES],
      AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.approve,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.reject,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved,
    ],
  );
  const row = result.rows?.[0]?.result as Record<string, unknown> | undefined;
  return {
    tableExists: bool(row?.tableExists),
    indexesExist: bool(row?.indexesExist),
    rlsEnabled: bool(row?.rlsEnabled),
    policiesExist: bool(row?.policiesExist),
    submitRpcExists: bool(row?.submitRpcExists),
    getStatusRpcExists: bool(row?.getStatusRpcExists),
    approveRpcExists: bool(row?.approveRpcExists),
    rejectRpcExists: bool(row?.rejectRpcExists),
    executeApprovedRpcExists: bool(row?.executeApprovedRpcExists),
  };
}

async function inspectHistory(client: DbClient): Promise<Pick<
  AiActionLedgerMigrationStateBooleans,
  "migrationHistoryTableExists" | "migrationHistoryRecordExists"
>> {
  const tableResult = await client.query(
    "select to_regclass('supabase_migrations.schema_migrations') is not null as present",
  );
  const migrationHistoryTableExists = bool(tableResult.rows?.[0]?.present);
  if (!migrationHistoryTableExists) {
    return { migrationHistoryTableExists, migrationHistoryRecordExists: false };
  }
  const { version, name } = migrationParts();
  const recordResult = await client.query(
    `
      select exists (
        select 1
        from supabase_migrations.schema_migrations
        where version = $1 and name = $2
      ) as present
    `,
    [version, name],
  );
  return {
    migrationHistoryTableExists,
    migrationHistoryRecordExists: bool(recordResult.rows?.[0]?.present),
  };
}

function blocked(
  status: Exclude<AiActionLedgerMigrationStateInspectionStatus, "GREEN_AI_ACTION_LEDGER_MIGRATION_STATE_INSPECTED">,
  exactReason: string,
  databaseUrlEnv: "present" | "missing",
): AiActionLedgerMigrationStateInspection {
  return {
    status,
    migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
    databaseUrlEnv,
    databaseUrlValuePrinted: false,
    rawRowsPrinted: false,
    secretsPrinted: false,
    tableExists: false,
    indexesExist: false,
    rlsEnabled: false,
    policiesExist: false,
    submitRpcExists: false,
    getStatusRpcExists: false,
    approveRpcExists: false,
    rejectRpcExists: false,
    executeApprovedRpcExists: false,
    migrationHistoryTableExists: false,
    migrationHistoryRecordExists: false,
    state: null,
    objectsPresent: false,
    functionsExist: false,
    postgrestSchemaCacheRpcVisible: false,
    postgrestSchemaCacheChecked: false,
    migrationHistoryRecordChecked: false,
    blocker: status,
    exactReason,
  };
}

export async function inspectAiActionLedgerMigrationState(
  env: Record<string, string | undefined> = process.env,
  projectRoot = process.cwd(),
): Promise<AiActionLedgerMigrationStateInspection> {
  const dbEnvName = databaseUrlEnvName(env);
  if (!dbEnvName) {
    return blocked(
      "BLOCKED_DB_URL_NOT_APPROVED",
      "AI_ACTION_LEDGER_DATABASE_URL or another approved DB URL env key is not present in this process.",
      "missing",
    );
  }

  const pgModule = await import("pg");
  const client = new pgModule.Client({ connectionString: env[dbEnvName] }) as DbClient;
  await client.connect();
  try {
    const [objects, history, postgrestSchemaCacheRpcVisible] = await Promise.all([
      inspectDbObjects(client),
      inspectHistory(client),
      inspectPostgrestSchemaCache(env, projectRoot),
    ]);
    const booleans = { ...objects, ...history };
    const state = classifyAiActionLedgerMigrationState({
      ...booleans,
      postgrestSchemaCacheRpcVisible,
    });
    const allFunctionsExist = functionsExist(booleans);
    const objectsPresent =
      booleans.tableExists &&
      booleans.indexesExist &&
      booleans.rlsEnabled &&
      booleans.policiesExist &&
      allFunctionsExist;
    return {
      status: "GREEN_AI_ACTION_LEDGER_MIGRATION_STATE_INSPECTED",
      migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
      databaseUrlEnv: "present",
      databaseUrlValuePrinted: false,
      rawRowsPrinted: false,
      secretsPrinted: false,
      ...booleans,
      state,
      objectsPresent,
      functionsExist: allFunctionsExist,
      postgrestSchemaCacheRpcVisible,
      postgrestSchemaCacheChecked: true,
      migrationHistoryRecordChecked: true,
      blocker: null,
      exactReason: null,
    };
  } catch {
    return blocked(
      "BLOCKED_AI_ACTION_LEDGER_STATE_INSPECT_FAILED",
      "AI action ledger migration state inspection failed before producing a green classified state.",
      "present",
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}

if (require.main === module) {
  void inspectAiActionLedgerMigrationState()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exitCode = result.status === "GREEN_AI_ACTION_LEDGER_MIGRATION_STATE_INSPECTED" ? 0 : 2;
    })
    .catch(() => {
      process.stdout.write(
        `${JSON.stringify(
          blocked(
            "BLOCKED_AI_ACTION_LEDGER_STATE_INSPECT_FAILED",
            "AI action ledger migration state inspection failed before producing a sanitized result.",
            "present",
          ),
          null,
          2,
        )}\n`,
      );
      process.exitCode = 2;
    });
}
