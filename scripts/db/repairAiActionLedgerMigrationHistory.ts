import { parseMigrationFilename } from "../release/boundedMigrationRunner.shared";
import { AI_ACTION_LEDGER_APPLY_MIGRATION } from "./aiActionLedgerMigrationShared";
import {
  inspectAiActionLedgerMigrationState,
  type AiActionLedgerMigrationState,
} from "./inspectAiActionLedgerMigrationState";
import { AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS } from "./preflightAiActionLedgerMigration";

export type AiActionLedgerHistoryRepairStatus =
  | "GREEN_AI_ACTION_LEDGER_MIGRATION_HISTORY_REPAIRED"
  | "BLOCKED_DB_URL_NOT_APPROVED"
  | "BLOCKED_HISTORY_REPAIR_STATE_NOT_ALLOWED"
  | "BLOCKED_MIGRATION_HISTORY_WRITE_FAILED";

export type AiActionLedgerHistoryRepairResult = {
  status: AiActionLedgerHistoryRepairStatus;
  migration: typeof AI_ACTION_LEDGER_APPLY_MIGRATION;
  inspectedState: AiActionLedgerMigrationState | null;
  historyRepairUsed: boolean;
  migrationSqlReapplied: false;
  ledgerDataModified: false;
  destructiveMigration: false;
  unboundedDml: false;
  rawRowsPrinted: false;
  secretsPrinted: false;
  databaseUrlValuePrinted: false;
  blocker: Exclude<AiActionLedgerHistoryRepairStatus, "GREEN_AI_ACTION_LEDGER_MIGRATION_HISTORY_REPAIRED"> | null;
  exactReason: string | null;
};

type DbClient = {
  connect(): Promise<unknown>;
  end(): Promise<unknown>;
  query(sql: string, values?: readonly unknown[]): Promise<unknown>;
};

function dbEnvName(env: Record<string, string | undefined>): string | null {
  return AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS.find((key) => String(env[key] ?? "").trim()) ?? null;
}

function migrationParts(): { version: string; name: string } {
  const parsed = parseMigrationFilename(AI_ACTION_LEDGER_APPLY_MIGRATION);
  return { version: parsed?.version ?? "", name: parsed?.name ?? "" };
}

export function canRepairAiActionLedgerHistory(state: AiActionLedgerMigrationState | null): boolean {
  return state === "STATE_B_OBJECTS_PRESENT_HISTORY_MISSING";
}

function blocked(
  status: Exclude<AiActionLedgerHistoryRepairStatus, "GREEN_AI_ACTION_LEDGER_MIGRATION_HISTORY_REPAIRED">,
  inspectedState: AiActionLedgerMigrationState | null,
  exactReason: string,
): AiActionLedgerHistoryRepairResult {
  return {
    status,
    migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
    inspectedState,
    historyRepairUsed: false,
    migrationSqlReapplied: false,
    ledgerDataModified: false,
    destructiveMigration: false,
    unboundedDml: false,
    rawRowsPrinted: false,
    secretsPrinted: false,
    databaseUrlValuePrinted: false,
    blocker: status,
    exactReason,
  };
}

export async function repairAiActionLedgerMigrationHistory(
  env: Record<string, string | undefined> = process.env,
  projectRoot = process.cwd(),
): Promise<AiActionLedgerHistoryRepairResult> {
  const inspection = await inspectAiActionLedgerMigrationState(env, projectRoot);
  if (inspection.status === "BLOCKED_DB_URL_NOT_APPROVED") {
    return blocked("BLOCKED_DB_URL_NOT_APPROVED", null, inspection.exactReason ?? "Approved DB URL is missing.");
  }
  if (!canRepairAiActionLedgerHistory(inspection.state)) {
    return blocked(
      "BLOCKED_HISTORY_REPAIR_STATE_NOT_ALLOWED",
      inspection.state,
      "History-only repair is allowed only for STATE_B_OBJECTS_PRESENT_HISTORY_MISSING.",
    );
  }

  const envName = dbEnvName(env);
  if (!envName) {
    return blocked("BLOCKED_DB_URL_NOT_APPROVED", inspection.state, "Approved DB URL is missing.");
  }
  const { version, name } = migrationParts();
  const pgModule = await import("pg");
  const client = new pgModule.Client({ connectionString: env[envName] }) as DbClient;
  await client.connect();
  try {
    await client.query("begin");
    await client.query(
      `
        insert into supabase_migrations.schema_migrations(version, name)
        select $1, $2
        where not exists (
          select 1
          from supabase_migrations.schema_migrations
          where version = $1 and name = $2
        )
      `,
      [version, name],
    );
    await client.query("commit");
    return {
      status: "GREEN_AI_ACTION_LEDGER_MIGRATION_HISTORY_REPAIRED",
      migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
      inspectedState: inspection.state,
      historyRepairUsed: true,
      migrationSqlReapplied: false,
      ledgerDataModified: false,
      destructiveMigration: false,
      unboundedDml: false,
      rawRowsPrinted: false,
      secretsPrinted: false,
      databaseUrlValuePrinted: false,
      blocker: null,
      exactReason: null,
    };
  } catch {
    await client.query("rollback").catch(() => undefined);
    return blocked(
      "BLOCKED_MIGRATION_HISTORY_WRITE_FAILED",
      inspection.state,
      "History-only repair failed while writing the bounded migration history record.",
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}

if (require.main === module) {
  void repairAiActionLedgerMigrationHistory()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exitCode = result.status === "GREEN_AI_ACTION_LEDGER_MIGRATION_HISTORY_REPAIRED" ? 0 : 2;
    })
    .catch(() => {
      process.stdout.write(
        `${JSON.stringify(
          blocked(
            "BLOCKED_MIGRATION_HISTORY_WRITE_FAILED",
            null,
            "History-only repair failed before producing a sanitized result.",
          ),
          null,
          2,
        )}\n`,
      );
      process.exitCode = 2;
    });
}
