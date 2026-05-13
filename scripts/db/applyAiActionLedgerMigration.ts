import {
  REQUIRED_AGENT_OWNER_FLAGS,
  loadAgentOwnerFlagsIntoEnv,
} from "../env/checkRequiredAgentFlags";
import {
  buildBoundedMigrationPlan,
  createPostgresBoundedMigrationExecutorAdapter,
  formatBoundedMigrationPlanForLog,
  formatBoundedMigrationExecutorResultForLog,
  normalizeMigrationFilename,
  runBoundedMigrationExecutor,
} from "../release/boundedMigrationRunner.shared";
import {
  preflightAiActionLedgerMigration,
  AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS,
} from "./preflightAiActionLedgerMigration";
import {
  AI_ACTION_LEDGER_APPLY_MIGRATION,
  readAiActionLedgerApplyMigration,
} from "./aiActionLedgerMigrationShared";

export { AI_ACTION_LEDGER_APPLY_MIGRATION } from "./aiActionLedgerMigrationShared";

const APPLY_APPROVAL_FLAGS = REQUIRED_AGENT_OWNER_FLAGS;

type ApplyStatus =
  | "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED"
  | "BLOCKED_DB_PREFLIGHT_FAILED"
  | "BLOCKED_MIGRATION_HISTORY_WRITE_FAILED"
  | "BLOCKED_AI_ACTION_LEDGER_VERIFY_FAILED"
  | "GREEN_AI_ACTION_LEDGER_MIGRATION_PACKAGE_READY"
  | "GREEN_AI_ACTION_LEDGER_MIGRATION_APPLIED_AND_VERIFIED";

export type AiActionLedgerMigrationApplyPackage = {
  status: ApplyStatus;
  migration: typeof AI_ACTION_LEDGER_APPLY_MIGRATION;
  boundedPlan: Record<string, unknown>;
  approvalFlagsChecked: readonly string[];
  approvalValuesPrinted: false;
  dbWriteAttempted: false;
  sqlContentsPrinted: false;
  secretsPrinted: false;
  blocker: "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED" | null;
  exactReason: string | null;
};

export type AiActionLedgerMigrationApplyResult = {
  status: Exclude<ApplyStatus, "GREEN_AI_ACTION_LEDGER_MIGRATION_PACKAGE_READY">;
  migration: typeof AI_ACTION_LEDGER_APPLY_MIGRATION;
  ownerFlagsChecked: readonly string[];
  approvalValuesPrinted: false;
  databaseUrlEnv: "present" | "missing";
  databaseUrlValuePrinted: false;
  dbWriteAttempted: boolean;
  sqlContentsPrinted: false;
  rawRowsPrinted: false;
  secretsPrinted: false;
  destructiveMigration: false;
  unboundedDml: false;
  executor: Record<string, unknown> | null;
  verifyStatus: string | null;
  blocker:
    | "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED"
    | "BLOCKED_DB_PREFLIGHT_FAILED"
    | "BLOCKED_MIGRATION_HISTORY_WRITE_FAILED"
    | "BLOCKED_AI_ACTION_LEDGER_VERIFY_FAILED"
    | null;
  exactReason: string | null;
};

function isEnabled(value: unknown): boolean {
  return value === "1" || value === "true" || value === "TRUE" || value === "yes";
}

function hasEveryEnabled(env: Record<string, string | undefined>, keys: readonly string[]): boolean {
  return keys.every((key) => isEnabled(env[key]));
}

function readLocalMigration(projectRoot: string): { file: string; sqlSource: string } {
  return readAiActionLedgerApplyMigration(projectRoot);
}

function resolveDatabaseUrlEnvName(env: Record<string, string | undefined>): string | null {
  return AI_ACTION_LEDGER_DATABASE_URL_ENV_KEYS.find((key) => String(env[key] ?? "").trim()) ?? null;
}

export function buildAiActionLedgerMigrationApplyPackage(
  env: Record<string, string | undefined> = process.env,
  projectRoot = process.cwd(),
): AiActionLedgerMigrationApplyPackage {
  const migration = readLocalMigration(projectRoot);
  const plan = buildBoundedMigrationPlan({
    mode: "plan",
    allowlist: [normalizeMigrationFilename(AI_ACTION_LEDGER_APPLY_MIGRATION)],
    localMigrations: [migration],
    remoteMigrations: [],
    destructiveApproval: false,
  });
  const approved = hasEveryEnabled(env, APPLY_APPROVAL_FLAGS);

  if (!approved) {
    return {
      status: "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
      migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
      boundedPlan: formatBoundedMigrationPlanForLog(plan),
      approvalFlagsChecked: [...APPLY_APPROVAL_FLAGS],
      approvalValuesPrinted: false,
      dbWriteAttempted: false,
      sqlContentsPrinted: false,
      secretsPrinted: false,
      blocker: "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
      exactReason:
        "AI action ledger migration apply requires every exact owner approval flag for DB apply, DB write, migration apply, verify, and rollback plan.",
    };
  }

  return {
    status: "GREEN_AI_ACTION_LEDGER_MIGRATION_PACKAGE_READY",
    migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
    boundedPlan: formatBoundedMigrationPlanForLog(plan),
    approvalFlagsChecked: [...APPLY_APPROVAL_FLAGS],
    approvalValuesPrinted: false,
    dbWriteAttempted: false,
    sqlContentsPrinted: false,
    secretsPrinted: false,
    blocker: null,
    exactReason: null,
  };
}

export async function runAiActionLedgerMigrationApply(
  env: Record<string, string | undefined> = process.env,
  projectRoot = process.cwd(),
): Promise<AiActionLedgerMigrationApplyResult> {
  const preflight = preflightAiActionLedgerMigration(env, projectRoot);
  if (preflight.status !== "GREEN_AI_ACTION_LEDGER_MIGRATION_PREFLIGHT_READY") {
    const blocker =
      preflight.status === "BLOCKED_REQUIRED_OWNER_FLAGS_MISSING"
        ? "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED"
        : "BLOCKED_DB_PREFLIGHT_FAILED";
    return {
      status: blocker,
      migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
      ownerFlagsChecked: [...REQUIRED_AGENT_OWNER_FLAGS],
      approvalValuesPrinted: false,
      databaseUrlEnv: preflight.databaseUrlEnv,
      databaseUrlValuePrinted: false,
      dbWriteAttempted: false,
      sqlContentsPrinted: false,
      rawRowsPrinted: false,
      secretsPrinted: false,
      destructiveMigration: false,
      unboundedDml: false,
      executor: null,
      verifyStatus: null,
      blocker,
      exactReason: preflight.exactReason,
    };
  }

  const databaseUrlEnvName = resolveDatabaseUrlEnvName(env);
  if (!databaseUrlEnvName) {
    return {
      status: "BLOCKED_DB_PREFLIGHT_FAILED",
      migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
      ownerFlagsChecked: [...REQUIRED_AGENT_OWNER_FLAGS],
      approvalValuesPrinted: false,
      databaseUrlEnv: "missing",
      databaseUrlValuePrinted: false,
      dbWriteAttempted: false,
      sqlContentsPrinted: false,
      rawRowsPrinted: false,
      secretsPrinted: false,
      destructiveMigration: false,
      unboundedDml: false,
      executor: null,
      verifyStatus: null,
      blocker: "BLOCKED_DB_PREFLIGHT_FAILED",
      exactReason: "No approved database URL environment variable is present for bounded migration apply.",
    };
  }

  const migration = readLocalMigration(projectRoot);
  const pgModule = await import("pg");
  const client = new pgModule.Client({
    connectionString: env[databaseUrlEnvName],
  }) as {
    connect(): Promise<unknown>;
    end(): Promise<unknown>;
    query(sql: string, values?: readonly unknown[]): Promise<{ rows?: Array<Record<string, unknown>> }>;
  };

  await client.connect();
  try {
    const executor = await runBoundedMigrationExecutor({
      executorMode: "execute",
      allowlist: [normalizeMigrationFilename(AI_ACTION_LEDGER_APPLY_MIGRATION)],
      localMigrations: [migration],
      remoteMigrations: [],
      includeAll: false,
      destructiveApproval: false,
      adapter: createPostgresBoundedMigrationExecutorAdapter(client),
    });
    const executorLog = formatBoundedMigrationExecutorResultForLog(executor);
    if (executor.status !== "PASS") {
      return {
        status:
          executor.failureStage === "write_history"
            ? "BLOCKED_MIGRATION_HISTORY_WRITE_FAILED"
            : "BLOCKED_DB_PREFLIGHT_FAILED",
        migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
        ownerFlagsChecked: [...REQUIRED_AGENT_OWNER_FLAGS],
        approvalValuesPrinted: false,
        databaseUrlEnv: "present",
        databaseUrlValuePrinted: false,
        dbWriteAttempted: executor.dbWriteAttempted,
        sqlContentsPrinted: false,
        rawRowsPrinted: false,
        secretsPrinted: false,
        destructiveMigration: false,
        unboundedDml: false,
        executor: executorLog,
        verifyStatus: null,
        blocker:
          executor.failureStage === "write_history"
            ? "BLOCKED_MIGRATION_HISTORY_WRITE_FAILED"
            : "BLOCKED_DB_PREFLIGHT_FAILED",
        exactReason: `AI action ledger migration executor failed at ${executor.failureStage ?? "unknown"}.`,
      };
    }

    const verify = await client.query("select public.ai_action_ledger_verify_apply_v1() as result");
    const verifyResult = verify.rows?.[0]?.result;
    const verifyStatus =
      verifyResult && typeof verifyResult === "object" && "status" in verifyResult
        ? String((verifyResult as { status?: unknown }).status ?? "")
        : "";
    if (verifyStatus !== "GREEN_AI_ACTION_LEDGER_MIGRATION_APPLIED_AND_VERIFIED") {
      return {
        status: "BLOCKED_AI_ACTION_LEDGER_VERIFY_FAILED",
        migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
        ownerFlagsChecked: [...REQUIRED_AGENT_OWNER_FLAGS],
        approvalValuesPrinted: false,
        databaseUrlEnv: "present",
        databaseUrlValuePrinted: false,
        dbWriteAttempted: true,
        sqlContentsPrinted: false,
        rawRowsPrinted: false,
        secretsPrinted: false,
        destructiveMigration: false,
        unboundedDml: false,
        executor: executorLog,
        verifyStatus: verifyStatus || null,
        blocker: "BLOCKED_AI_ACTION_LEDGER_VERIFY_FAILED",
        exactReason: "AI action ledger verify query did not return the expected green status.",
      };
    }

    return {
      status: "GREEN_AI_ACTION_LEDGER_MIGRATION_APPLIED_AND_VERIFIED",
      migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
      ownerFlagsChecked: [...REQUIRED_AGENT_OWNER_FLAGS],
      approvalValuesPrinted: false,
      databaseUrlEnv: "present",
      databaseUrlValuePrinted: false,
      dbWriteAttempted: true,
      sqlContentsPrinted: false,
      rawRowsPrinted: false,
      secretsPrinted: false,
      destructiveMigration: false,
      unboundedDml: false,
      executor: executorLog,
      verifyStatus,
      blocker: null,
      exactReason: null,
    };
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  loadAgentOwnerFlagsIntoEnv(process.env);
  const result = await runAiActionLedgerMigrationApply();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode =
    result.status === "GREEN_AI_ACTION_LEDGER_MIGRATION_APPLIED_AND_VERIFIED" ? 0 : 2;
}

if (require.main === module) {
  void main().catch(() => {
    process.stdout.write(
      `${JSON.stringify(
        {
          status: "BLOCKED_DB_PREFLIGHT_FAILED",
          migration: AI_ACTION_LEDGER_APPLY_MIGRATION,
          approvalValuesPrinted: false,
          databaseUrlValuePrinted: false,
          dbWriteAttempted: false,
          sqlContentsPrinted: false,
          rawRowsPrinted: false,
          secretsPrinted: false,
          blocker: "BLOCKED_DB_PREFLIGHT_FAILED",
          exactReason: "AI action ledger migration apply failed before producing a detailed sanitized result.",
        },
        null,
        2,
      )}\n`,
    );
    process.exitCode = 2;
  });
}
