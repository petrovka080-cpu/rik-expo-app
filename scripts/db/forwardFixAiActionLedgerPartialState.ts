import {
  REQUIRED_AGENT_OWNER_FLAGS,
  loadAgentOwnerFlagsIntoEnv,
} from "../env/checkRequiredAgentFlags";
import {
  AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS,
} from "./preflightAiActionLedgerMigration";
import {
  AI_ACTION_LEDGER_FORWARD_FIX_MIGRATION,
  readAiActionLedgerForwardFixMigration,
} from "./aiActionLedgerMigrationShared";
import {
  inspectAiActionLedgerMigrationState,
  type AiActionLedgerMigrationState,
  type AiActionLedgerMigrationStateInspection,
} from "./inspectAiActionLedgerMigrationState";

export type AiActionLedgerPartialStateForwardFixStatus =
  | "GREEN_AI_ACTION_LEDGER_FORWARD_FIX_APPLIED"
  | "BLOCKED_FORWARD_FIX_PREFLIGHT_FAILED"
  | "BLOCKED_FORWARD_FIX_APPLY_FAILED";

export type AiActionLedgerPartialStateForwardFix = {
  status: AiActionLedgerPartialStateForwardFixStatus;
  migration: typeof AI_ACTION_LEDGER_FORWARD_FIX_MIGRATION;
  inspectedState: AiActionLedgerMigrationState | null;
  databaseUrlEnv: "present" | "missing";
  databaseUrlValuePrinted: false;
  ownerFlagsChecked: readonly string[];
  ownerFlagValuesPrinted: false;
  forwardFixPackageCreated: boolean;
  forwardFixApplied: boolean;
  blindReapplyUsed: false;
  historyRepairUsed: false;
  destructiveMigration: false;
  unboundedDml: false;
  sqlContentsPrinted: false;
  secretsPrinted: false;
  rawRowsPrinted: false;
  tableExistsBefore: boolean;
  functionsExistBefore: boolean;
  historyRecordPresentBefore: boolean;
  indexesExistBefore: boolean;
  policiesExistBefore: boolean;
  postgrestSchemaCacheRpcVisibleBefore: boolean;
  indexesExistAfter: boolean;
  policiesExistAfter: boolean;
  postgrestSchemaCacheRpcVisibleAfter: boolean;
  blocker:
    | "BLOCKED_FORWARD_FIX_PREFLIGHT_FAILED"
    | "BLOCKED_FORWARD_FIX_APPLY_FAILED"
    | null;
  exactReason: string | null;
};

type DbClient = {
  connect(): Promise<unknown>;
  end(): Promise<unknown>;
  query(sql: string, values?: readonly unknown[]): Promise<{ rows?: Array<Record<string, unknown>> }>;
};

function isEnabled(value: unknown): boolean {
  return ["true", "1", "yes"].includes(String(value ?? "").trim().toLowerCase());
}

function ownerFlagsReady(env: Record<string, string | undefined>): boolean {
  return REQUIRED_AGENT_OWNER_FLAGS.every((key) => isEnabled(env[key]));
}

function databaseUrlEnvName(env: Record<string, string | undefined>): string | null {
  return AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS.find((key) => String(env[key] ?? "").trim()) ?? null;
}

export function isAiActionLedgerPartialState(state: AiActionLedgerMigrationState | null): boolean {
  return state === "STATE_F_HISTORY_PRESENT_PARTIAL_OBJECTS";
}

export function canApplyAiActionLedgerForwardFix(input: Pick<
  AiActionLedgerMigrationStateInspection,
  "state" | "migrationHistoryRecordExists" | "tableExists" | "functionsExist"
>): boolean {
  return (
    isAiActionLedgerPartialState(input.state) &&
    input.migrationHistoryRecordExists &&
    (input.tableExists || input.functionsExist)
  );
}

function migrationSqlIsBounded(sqlSource: string): boolean {
  const withoutComments = sqlSource.replace(/--.*$/gm, "").toLowerCase();
  return (
    !/\bdrop\b/.test(withoutComments) &&
    !/\btruncate\b/.test(withoutComments) &&
    !/\bdelete\s+from\b/.test(withoutComments) &&
    !/\bupdate\s+public\./.test(withoutComments) &&
    !/\bselect\s+\*/.test(withoutComments) &&
    !/\bservice_role\b/.test(withoutComments) &&
    withoutComments.includes("create index if not exists") &&
    withoutComments.includes("alter table public.ai_action_ledger enable row level security") &&
    withoutComments.includes("notify pgrst, 'reload schema'")
  );
}

function blockedResult(
  inspection: AiActionLedgerMigrationStateInspection | null,
  databaseUrlEnv: "present" | "missing",
  exactReason: string,
): AiActionLedgerPartialStateForwardFix {
  return {
    status: "BLOCKED_FORWARD_FIX_PREFLIGHT_FAILED",
    migration: AI_ACTION_LEDGER_FORWARD_FIX_MIGRATION,
    inspectedState: inspection?.state ?? null,
    databaseUrlEnv,
    databaseUrlValuePrinted: false,
    ownerFlagsChecked: [...REQUIRED_AGENT_OWNER_FLAGS],
    ownerFlagValuesPrinted: false,
    forwardFixPackageCreated: false,
    forwardFixApplied: false,
    blindReapplyUsed: false,
    historyRepairUsed: false,
    destructiveMigration: false,
    unboundedDml: false,
    sqlContentsPrinted: false,
    secretsPrinted: false,
    rawRowsPrinted: false,
    tableExistsBefore: Boolean(inspection?.tableExists),
    functionsExistBefore: Boolean(inspection?.functionsExist),
    historyRecordPresentBefore: Boolean(inspection?.migrationHistoryRecordExists),
    indexesExistBefore: Boolean(inspection?.indexesExist),
    policiesExistBefore: Boolean(inspection?.policiesExist),
    postgrestSchemaCacheRpcVisibleBefore: Boolean(inspection?.postgrestSchemaCacheRpcVisible),
    indexesExistAfter: false,
    policiesExistAfter: false,
    postgrestSchemaCacheRpcVisibleAfter: false,
    blocker: "BLOCKED_FORWARD_FIX_PREFLIGHT_FAILED",
    exactReason,
  };
}

export async function runAiActionLedgerPartialStateForwardFix(
  env: Record<string, string | undefined> = process.env,
  projectRoot = process.cwd(),
): Promise<AiActionLedgerPartialStateForwardFix> {
  const dbEnvName = databaseUrlEnvName(env);
  if (!dbEnvName) {
    return blockedResult(
      null,
      "missing",
      "No approved database URL environment variable is present for AI action ledger forward-fix.",
    );
  }
  if (!ownerFlagsReady(env)) {
    return blockedResult(
      null,
      "present",
      "AI action ledger forward-fix requires every exact owner approval flag before DB write.",
    );
  }

  const forwardFix = readAiActionLedgerForwardFixMigration(projectRoot);
  if (!migrationSqlIsBounded(forwardFix.sqlSource)) {
    return blockedResult(
      null,
      "present",
      "AI action ledger forward-fix SQL failed local bounded safety checks.",
    );
  }

  const before = await inspectAiActionLedgerMigrationState(env, projectRoot);
  if (before.status !== "GREEN_AI_ACTION_LEDGER_MIGRATION_STATE_INSPECTED") {
    return blockedResult(before, before.databaseUrlEnv, before.exactReason ?? "DB state inspection did not pass.");
  }
  if (!isAiActionLedgerPartialState(before.state)) {
    return blockedResult(
      before,
      "present",
      "Forward-fix is allowed only for STATE_F_HISTORY_PRESENT_PARTIAL_OBJECTS.",
    );
  }
  if (!canApplyAiActionLedgerForwardFix(before)) {
    return blockedResult(
      before,
      "present",
      before.migrationHistoryRecordExists
        ? "Forward-fix refused because both ledger table and RPC functions are missing."
        : "Forward-fix refused because migration history is missing.",
    );
  }

  const pgModule = await import("pg");
  const client = new pgModule.Client({ connectionString: env[dbEnvName] }) as DbClient;
  await client.connect();
  try {
    await client.query(forwardFix.sqlSource);
  } catch {
    return {
      ...blockedResult(before, "present", "AI action ledger forward-fix SQL failed during bounded apply."),
      status: "BLOCKED_FORWARD_FIX_APPLY_FAILED",
      forwardFixPackageCreated: true,
      blocker: "BLOCKED_FORWARD_FIX_APPLY_FAILED",
    };
  } finally {
    await client.end().catch(() => undefined);
  }

  const after = await inspectAiActionLedgerMigrationState(env, projectRoot);
  if (
    after.status !== "GREEN_AI_ACTION_LEDGER_MIGRATION_STATE_INSPECTED" ||
    !after.indexesExist ||
    !after.policiesExist ||
    !after.postgrestSchemaCacheRpcVisible
  ) {
    return {
      ...blockedResult(
        before,
        "present",
        "AI action ledger forward-fix applied, but indexes, policies, or PostgREST schema-cache visibility did not verify.",
      ),
      status: "BLOCKED_FORWARD_FIX_APPLY_FAILED",
      forwardFixPackageCreated: true,
      forwardFixApplied: true,
      indexesExistAfter: Boolean(after.indexesExist),
      policiesExistAfter: Boolean(after.policiesExist),
      postgrestSchemaCacheRpcVisibleAfter: Boolean(after.postgrestSchemaCacheRpcVisible),
      blocker: "BLOCKED_FORWARD_FIX_APPLY_FAILED",
    };
  }

  return {
    status: "GREEN_AI_ACTION_LEDGER_FORWARD_FIX_APPLIED",
    migration: AI_ACTION_LEDGER_FORWARD_FIX_MIGRATION,
    inspectedState: before.state,
    databaseUrlEnv: "present",
    databaseUrlValuePrinted: false,
    ownerFlagsChecked: [...REQUIRED_AGENT_OWNER_FLAGS],
    ownerFlagValuesPrinted: false,
    forwardFixPackageCreated: true,
    forwardFixApplied: true,
    blindReapplyUsed: false,
    historyRepairUsed: false,
    destructiveMigration: false,
    unboundedDml: false,
    sqlContentsPrinted: false,
    secretsPrinted: false,
    rawRowsPrinted: false,
    tableExistsBefore: before.tableExists,
    functionsExistBefore: before.functionsExist,
    historyRecordPresentBefore: before.migrationHistoryRecordExists,
    indexesExistBefore: before.indexesExist,
    policiesExistBefore: before.policiesExist,
    postgrestSchemaCacheRpcVisibleBefore: before.postgrestSchemaCacheRpcVisible,
    indexesExistAfter: after.indexesExist,
    policiesExistAfter: after.policiesExist,
    postgrestSchemaCacheRpcVisibleAfter: after.postgrestSchemaCacheRpcVisible,
    blocker: null,
    exactReason: null,
  };
}

export const buildAiActionLedgerPartialStateForwardFix = runAiActionLedgerPartialStateForwardFix;

if (require.main === module) {
  loadAgentOwnerFlagsIntoEnv(process.env);
  void runAiActionLedgerPartialStateForwardFix()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exitCode = result.status === "GREEN_AI_ACTION_LEDGER_FORWARD_FIX_APPLIED" ? 0 : 2;
    })
    .catch(() => {
      process.stdout.write(
        `${JSON.stringify(
          blockedResult(
            null,
            databaseUrlEnvName(process.env) ? "present" : "missing",
            "AI action ledger forward-fix failed before producing a sanitized result.",
          ),
          null,
          2,
        )}\n`,
      );
      process.exitCode = 2;
    });
}
