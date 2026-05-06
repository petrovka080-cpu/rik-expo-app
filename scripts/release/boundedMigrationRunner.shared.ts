import path from "node:path";

export const BOUNDED_MIGRATION_IDEMPOTENCY_DENYLIST = [
  "20260502170000_scale_idempotency_records_provider_smoke.sql",
] as const;

export type BoundedMigrationMode = "plan" | "apply";
export type BoundedMigrationStatus = "PASS" | "BLOCKED";

export type BoundedMigrationBlockerCode =
  | "ALLOWLIST_EMPTY"
  | "INCLUDE_ALL_REJECTED"
  | "MIGRATION_MISSING"
  | "MIGRATION_TARGET_AMBIGUOUS"
  | "ALLOWLIST_ORDER_MISMATCH"
  | "PENDING_BEFORE_ALLOWLIST"
  | "PENDING_HEAD_MISMATCH"
  | "IDEMPOTENCY_TARGET_INCLUDED"
  | "DESTRUCTIVE_SQL_REQUIRES_APPROVAL";

export type BoundedMigrationClassification =
  | "schema"
  | "read_model_dml"
  | "dml"
  | "destructive_or_unclear";

export interface BoundedMigrationLocalMigration {
  file: string;
  sqlSource?: string;
}

export interface BoundedMigrationRemoteMigration {
  version: string;
  name?: string;
}

export interface BoundedMigrationPlanInput {
  allowlist: string[];
  localMigrations: BoundedMigrationLocalMigration[];
  remoteMigrations: BoundedMigrationRemoteMigration[];
  mode?: BoundedMigrationMode;
  includeAll?: boolean;
  destructiveApproval?: boolean;
  idempotencyDenylist?: readonly string[];
}

export interface BoundedMigrationBlocker {
  code: BoundedMigrationBlockerCode;
  message: string;
  migrations: string[];
}

export interface BoundedMigrationSqlClassification {
  file: string;
  classification: BoundedMigrationClassification;
  hasDrop: boolean;
  hasTruncate: boolean;
  hasDelete: boolean;
  hasDml: boolean;
  destructiveOrUnclear: boolean;
}

export interface BoundedMigrationPlan {
  status: BoundedMigrationStatus;
  mode: BoundedMigrationMode;
  blockers: BoundedMigrationBlocker[];
  allowlist: string[];
  pendingMigrationsCount: number;
  pendingHead: string[];
  selectedMigrations: string[];
  selectedMigrationCount: number;
  idempotencyTargetExcluded: boolean;
  includeAllUsed: boolean;
  dryRunOnly: boolean;
  wouldWriteDb: boolean;
  dbWriteAttempted: false;
  manualSqlExecuted: false;
  repairExecuted: false;
  sqlContentsPrinted: false;
  rawDbRowsPrinted: false;
  destructiveSqlClassification: BoundedMigrationSqlClassification[];
}

export type BoundedMigrationExecutorMode = "plan" | "execute";
export type BoundedMigrationExecutorStatus = "PASS" | "BLOCKED" | "FAILED";
export type BoundedMigrationExecutorFailureStage =
  | "plan"
  | "adapter_missing"
  | "sql_source_missing"
  | "execute_sql"
  | "write_history";

export interface BoundedMigrationExecutableMigration {
  file: string;
  version: string;
  name: string;
  sqlSource: string;
}

export interface BoundedMigrationHistoryRecord {
  file: string;
  version: string;
  name: string;
}

export interface BoundedMigrationExecutorTransaction {
  executeMigrationSql(migration: BoundedMigrationExecutableMigration): Promise<void>;
  recordMigrationHistory(record: BoundedMigrationHistoryRecord): Promise<void>;
}

export interface BoundedMigrationExecutorAdapter {
  withTransaction<T>(
    operation: (transaction: BoundedMigrationExecutorTransaction) => Promise<T>,
  ): Promise<T>;
}

export interface BoundedMigrationSqlClient {
  query(sql: string, values?: readonly unknown[]): Promise<unknown>;
}

export interface BoundedMigrationExecutorInput extends BoundedMigrationPlanInput {
  executorMode?: BoundedMigrationExecutorMode;
  adapter?: BoundedMigrationExecutorAdapter;
}

export interface BoundedMigrationExecutorResult {
  status: BoundedMigrationExecutorStatus;
  executorMode: BoundedMigrationExecutorMode;
  plan: BoundedMigrationPlan;
  blockers: BoundedMigrationBlocker[];
  failureStage: BoundedMigrationExecutorFailureStage | null;
  failureMigration: string | null;
  selectedMigrations: string[];
  sqlExecutionOrder: string[];
  historyWriteOrder: string[];
  appliedMigrations: string[];
  appliedMigrationCount: number;
  dryRunOnly: boolean;
  dbWriteAttempted: boolean;
  manualSqlExecuted: false;
  repairExecuted: false;
  includeAllUsed: boolean;
  idempotencyTargetExcluded: boolean;
  idempotencyMigrationApplied: false;
  unrelatedMigrationsApplied: false;
  sqlContentsPrinted: false;
  rawDbRowsPrinted: false;
  secretsPrinted: false;
}

interface ParsedMigration {
  file: string;
  version: string;
  name: string;
  sqlSource?: string;
}

const MIGRATION_FILE_PATTERN = /^(\d{14})_(.+)\.sql$/;

export function normalizeMigrationFilename(file: string): string {
  return path.basename(file.replace(/\\/g, "/"));
}

export function parseMigrationFilename(file: string): ParsedMigration | null {
  const normalized = normalizeMigrationFilename(file);
  const match = MIGRATION_FILE_PATTERN.exec(normalized);
  if (!match) {
    return null;
  }

  return {
    file: normalized,
    version: match[1],
    name: match[2],
  };
}

export function classifyMigrationSql(
  migration: BoundedMigrationLocalMigration,
): BoundedMigrationSqlClassification {
  const file = normalizeMigrationFilename(migration.file);
  const sql = stripSqlComments(migration.sqlSource ?? "").toLowerCase();
  const hasDrop = /\bdrop\s+(table|schema|function|view|materialized\s+view|type|extension)\b/.test(sql);
  const hasTruncate = /\btruncate\b/.test(sql);
  const hasDelete = /\bdelete\s+from\b/.test(sql);
  const hasInsert = /\binsert\s+into\b/.test(sql);
  const hasUpdate = /\bupdate\s+[a-z0-9_."]+\s+set\b/.test(sql);
  const hasDml = hasInsert || hasUpdate || hasDelete;
  const readModelOnly =
    hasDml &&
    /\bwarehouse_issue_queue_ready_rows_v1\b/.test(sql) &&
    !/\bwarehouse_issues\b/.test(sql.replace(/\bwarehouse_issue_queue_ready_rows_v1\b/g, ""));
  const destructiveOrUnclear = hasDrop || hasTruncate || hasDelete;
  let classification: BoundedMigrationClassification = "schema";

  if (destructiveOrUnclear) {
    classification = "destructive_or_unclear";
  } else if (readModelOnly) {
    classification = "read_model_dml";
  } else if (hasDml) {
    classification = "dml";
  }

  return {
    file,
    classification,
    hasDrop,
    hasTruncate,
    hasDelete,
    hasDml,
    destructiveOrUnclear,
  };
}

export function buildBoundedMigrationPlan(
  input: BoundedMigrationPlanInput,
): BoundedMigrationPlan {
  const mode = input.mode ?? "plan";
  const blockers: BoundedMigrationBlocker[] = [];
  const denylist = new Set(
    (input.idempotencyDenylist ?? BOUNDED_MIGRATION_IDEMPOTENCY_DENYLIST).map(
      normalizeMigrationFilename,
    ),
  );
  const allowlist = input.allowlist.map(normalizeMigrationFilename).filter(Boolean);

  if (allowlist.length === 0) {
    blockers.push({
      code: "ALLOWLIST_EMPTY",
      message: "Explicit migration allowlist is required.",
      migrations: [],
    });
  }

  if (input.includeAll) {
    blockers.push({
      code: "INCLUDE_ALL_REJECTED",
      message: "include-all mode is never allowed for bounded production migration planning.",
      migrations: [],
    });
  }

  const duplicateAllowlist = findDuplicates(allowlist);
  if (duplicateAllowlist.length > 0) {
    blockers.push({
      code: "MIGRATION_TARGET_AMBIGUOUS",
      message: "Allowlist contains duplicate migration targets.",
      migrations: duplicateAllowlist,
    });
  }

  const localParsed: ParsedMigration[] = input.localMigrations
    .flatMap((migration) => {
      const parsed = parseMigrationFilename(migration.file);
      if (!parsed) {
        return [];
      }

      return migration.sqlSource === undefined
        ? [parsed]
        : [
            {
              ...parsed,
              sqlSource: migration.sqlSource,
            },
          ];
    });

  const localByFile = groupBy(localParsed, (migration) => migration.file);
  const duplicateVersions = findDuplicates(localParsed.map((migration) => migration.version));
  if (duplicateVersions.length > 0) {
    blockers.push({
      code: "MIGRATION_TARGET_AMBIGUOUS",
      message: "Local migration versions must be unique.",
      migrations: duplicateVersions,
    });
  }

  const selectedMigrations: ParsedMigration[] = [];
  for (const file of allowlist) {
    const matches = localByFile.get(file) ?? [];
    if (matches.length === 0) {
      blockers.push({
        code: "MIGRATION_MISSING",
        message: "Allowlisted migration does not exist locally.",
        migrations: [file],
      });
      continue;
    }

    if (matches.length > 1) {
      blockers.push({
        code: "MIGRATION_TARGET_AMBIGUOUS",
        message: "Allowlisted migration resolves to multiple local files.",
        migrations: [file],
      });
      continue;
    }

    selectedMigrations.push(matches[0]);
  }

  const denylistedSelected = allowlist.filter((file) => denylist.has(file));
  if (denylistedSelected.length > 0) {
    blockers.push({
      code: "IDEMPOTENCY_TARGET_INCLUDED",
      message: "Idempotency migration target is explicitly denied in this bounded runner wave.",
      migrations: denylistedSelected,
    });
  }

  const selectedInMigrationOrder = [...selectedMigrations]
    .sort(compareParsedMigrations)
    .map((migration) => migration.file);
  if (
    selectedInMigrationOrder.length === allowlist.length &&
    !sameOrderedList(allowlist, selectedInMigrationOrder)
  ) {
    blockers.push({
      code: "ALLOWLIST_ORDER_MISMATCH",
      message: "Allowlist order must match migration timestamp order.",
      migrations: allowlist,
    });
  }

  const remoteVersions = new Set(
    input.remoteMigrations.map((migration) => migration.version.trim()).filter(Boolean),
  );
  const localInOrder = [...localParsed].sort(compareParsedMigrations);
  const pendingMigrations = localInOrder.filter(
    (migration) => !remoteVersions.has(migration.version),
  );
  const pendingHead = pendingMigrations.slice(0, allowlist.length).map((migration) => migration.file);

  if (selectedMigrations.length === allowlist.length && selectedMigrations.length > 0) {
    const firstSelected = [...selectedMigrations].sort(compareParsedMigrations)[0];
    const pendingBeforeAllowlist = pendingMigrations
      .filter((migration) => migration.version < firstSelected.version)
      .map((migration) => migration.file);

    if (pendingBeforeAllowlist.length > 0) {
      blockers.push({
        code: "PENDING_BEFORE_ALLOWLIST",
        message: "Other pending migrations appear before the bounded allowlist.",
        migrations: pendingBeforeAllowlist,
      });
    }

    if (!sameOrderedList(pendingHead, allowlist)) {
      blockers.push({
        code: "PENDING_HEAD_MISMATCH",
        message: "Pending migration head must exactly match the bounded allowlist.",
        migrations: pendingHead,
      });
    }
  }

  const classification = selectedMigrations.map((migration) =>
    classifyMigrationSql({
      file: migration.file,
      sqlSource: migration.sqlSource,
    }),
  );
  const destructiveWithoutApproval = classification.filter(
    (item) => item.destructiveOrUnclear && !input.destructiveApproval,
  );
  if (destructiveWithoutApproval.length > 0) {
    blockers.push({
      code: "DESTRUCTIVE_SQL_REQUIRES_APPROVAL",
      message: "DROP/TRUNCATE/DELETE or unclear destructive SQL requires explicit approval.",
      migrations: destructiveWithoutApproval.map((item) => item.file),
    });
  }

  const status: BoundedMigrationStatus = blockers.length === 0 ? "PASS" : "BLOCKED";
  const nextPendingAfterAllowlist = pendingMigrations[allowlist.length];
  const idempotencyTargetExcluded =
    nextPendingAfterAllowlist !== undefined && denylist.has(nextPendingAfterAllowlist.file);

  return {
    status,
    mode,
    blockers,
    allowlist,
    pendingMigrationsCount: pendingMigrations.length,
    pendingHead,
    selectedMigrations: selectedMigrations.map((migration) => migration.file),
    selectedMigrationCount: selectedMigrations.length,
    idempotencyTargetExcluded,
    includeAllUsed: input.includeAll === true,
    dryRunOnly: mode === "plan",
    wouldWriteDb: status === "PASS" && mode === "apply",
    dbWriteAttempted: false,
    manualSqlExecuted: false,
    repairExecuted: false,
    sqlContentsPrinted: false,
    rawDbRowsPrinted: false,
    destructiveSqlClassification: classification,
  };
}

export function formatBoundedMigrationPlanForLog(
  plan: BoundedMigrationPlan,
): Record<string, unknown> {
  return {
    status: plan.status,
    mode: plan.mode,
    blockers: plan.blockers,
    allowlist: plan.allowlist,
    pending_migrations_count: plan.pendingMigrationsCount,
    pending_head: plan.pendingHead,
    selected_migrations: plan.selectedMigrations,
    selected_migration_count: plan.selectedMigrationCount,
    idempotency_target_excluded: plan.idempotencyTargetExcluded,
    include_all_used: plan.includeAllUsed,
    dry_run_only: plan.dryRunOnly,
    would_write_db: plan.wouldWriteDb,
    db_write_attempted: plan.dbWriteAttempted,
    manual_sql_executed: plan.manualSqlExecuted,
    repair_executed: plan.repairExecuted,
    sql_contents_printed: plan.sqlContentsPrinted,
    raw_db_rows_printed: plan.rawDbRowsPrinted,
    destructive_sql_classification: plan.destructiveSqlClassification.map((item) => ({
      file: item.file,
      classification: item.classification,
      has_drop: item.hasDrop,
      has_truncate: item.hasTruncate,
      has_delete: item.hasDelete,
      has_dml: item.hasDml,
      destructive_or_unclear: item.destructiveOrUnclear,
    })),
  };
}

export async function runBoundedMigrationExecutor(
  input: BoundedMigrationExecutorInput,
): Promise<BoundedMigrationExecutorResult> {
  const executorMode = input.executorMode ?? (input.mode === "apply" ? "execute" : "plan");
  const plan = buildBoundedMigrationPlan({
    ...input,
    mode: executorMode === "execute" ? "apply" : "plan",
  });
  const baseResult = createExecutorResult(plan, executorMode);

  if (plan.status === "BLOCKED") {
    return {
      ...baseResult,
      status: "BLOCKED",
      failureStage: "plan",
      blockers: plan.blockers,
    };
  }

  if (executorMode === "plan") {
    return baseResult;
  }

  if (!input.adapter) {
    return {
      ...baseResult,
      status: "BLOCKED",
      failureStage: "adapter_missing",
    };
  }

  const executableMigrations = resolveExecutableMigrations(input, plan);
  const missingSql = executableMigrations.find((migration) => migration.sqlSource.trim() === "");
  if (missingSql) {
    return {
      ...baseResult,
      status: "BLOCKED",
      failureStage: "sql_source_missing",
      failureMigration: missingSql.file,
    };
  }

  const sqlExecutionOrder: string[] = [];
  const historyWriteOrder: string[] = [];
  const appliedMigrations: string[] = [];

  try {
    await input.adapter.withTransaction(async (transaction) => {
      for (const migration of executableMigrations) {
        try {
          await transaction.executeMigrationSql(migration);
        } catch {
          throw createExecutorStageError("execute_sql", migration.file);
        }
        sqlExecutionOrder.push(migration.file);
        try {
          await transaction.recordMigrationHistory({
            file: migration.file,
            version: migration.version,
            name: migration.name,
          });
        } catch {
          throw createExecutorStageError("write_history", migration.file);
        }
        historyWriteOrder.push(migration.file);
        appliedMigrations.push(migration.file);
      }
    });
  } catch (error) {
    const failure = inferExecutorFailure(error);
    return {
      ...baseResult,
      status: "FAILED",
      failureStage: failure.stage,
      failureMigration: failure.migration,
      sqlExecutionOrder,
      historyWriteOrder,
      appliedMigrations: [],
      appliedMigrationCount: 0,
      dbWriteAttempted: true,
    };
  }

  return {
    ...baseResult,
    sqlExecutionOrder,
    historyWriteOrder,
    appliedMigrations,
    appliedMigrationCount: appliedMigrations.length,
    dbWriteAttempted: true,
  };
}

export function formatBoundedMigrationExecutorResultForLog(
  result: BoundedMigrationExecutorResult,
): Record<string, unknown> {
  return {
    status: result.status,
    executor_mode: result.executorMode,
    plan: formatBoundedMigrationPlanForLog(result.plan),
    blockers: result.blockers,
    failure_stage: result.failureStage,
    failure_migration: result.failureMigration,
    selected_migrations: result.selectedMigrations,
    sql_execution_order: result.sqlExecutionOrder,
    history_write_order: result.historyWriteOrder,
    applied_migrations: result.appliedMigrations,
    applied_migration_count: result.appliedMigrationCount,
    dry_run_only: result.dryRunOnly,
    db_write_attempted: result.dbWriteAttempted,
    manual_sql_executed: result.manualSqlExecuted,
    repair_executed: result.repairExecuted,
    include_all_used: result.includeAllUsed,
    idempotency_target_excluded: result.idempotencyTargetExcluded,
    idempotency_migration_applied: result.idempotencyMigrationApplied,
    unrelated_migrations_applied: result.unrelatedMigrationsApplied,
    sql_contents_printed: result.sqlContentsPrinted,
    raw_db_rows_printed: result.rawDbRowsPrinted,
    secrets_printed: result.secretsPrinted,
  };
}

export function createPostgresBoundedMigrationExecutorAdapter(
  client: BoundedMigrationSqlClient,
): BoundedMigrationExecutorAdapter {
  return {
    async withTransaction<T>(
      operation: (transaction: BoundedMigrationExecutorTransaction) => Promise<T>,
    ): Promise<T> {
      await client.query("begin");
      try {
        const result = await operation({
          executeMigrationSql: async (migration) => {
            await client.query(migration.sqlSource);
          },
          recordMigrationHistory: async (record) => {
            await client.query(
              "insert into supabase_migrations.schema_migrations(version, name) values ($1, $2)",
              [record.version, record.name],
            );
          },
        });
        await client.query("commit");
        return result;
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      }
    },
  };
}

function stripSqlComments(sql: string): string {
  return sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function compareParsedMigrations(left: ParsedMigration, right: ParsedMigration): number {
  return left.version.localeCompare(right.version);
}

function sameOrderedList(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates];
}

function groupBy<T>(values: T[], keyFn: (value: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const value of values) {
    const key = keyFn(value);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(value);
    } else {
      grouped.set(key, [value]);
    }
  }
  return grouped;
}

function createExecutorResult(
  plan: BoundedMigrationPlan,
  executorMode: BoundedMigrationExecutorMode,
): BoundedMigrationExecutorResult {
  return {
    status: "PASS",
    executorMode,
    plan,
    blockers: [],
    failureStage: null,
    failureMigration: null,
    selectedMigrations: plan.selectedMigrations,
    sqlExecutionOrder: [],
    historyWriteOrder: [],
    appliedMigrations: [],
    appliedMigrationCount: 0,
    dryRunOnly: executorMode === "plan",
    dbWriteAttempted: false,
    manualSqlExecuted: false,
    repairExecuted: false,
    includeAllUsed: plan.includeAllUsed,
    idempotencyTargetExcluded: plan.idempotencyTargetExcluded,
    idempotencyMigrationApplied: false,
    unrelatedMigrationsApplied: false,
    sqlContentsPrinted: false,
    rawDbRowsPrinted: false,
    secretsPrinted: false,
  };
}

function resolveExecutableMigrations(
  input: BoundedMigrationPlanInput,
  plan: BoundedMigrationPlan,
): BoundedMigrationExecutableMigration[] {
  const localByFile = new Map<string, ParsedMigration>();
  for (const migration of input.localMigrations) {
    const parsed = parseMigrationFilename(migration.file);
    if (!parsed) {
      continue;
    }
    localByFile.set(parsed.file, {
      ...parsed,
      sqlSource: migration.sqlSource ?? "",
    });
  }

  return plan.allowlist.flatMap((file) => {
    const migration = localByFile.get(file);
    if (!migration) {
      return [];
    }
    return [
      {
        file: migration.file,
        version: migration.version,
        name: migration.name,
        sqlSource: migration.sqlSource ?? "",
      },
    ];
  });
}

function inferExecutorFailure(error: unknown): {
  stage: BoundedMigrationExecutorFailureStage;
  migration: string | null;
} {
  if (isExecutorStageError(error)) {
    return {
      stage: error.stage,
      migration: error.migration,
    };
  }

  return {
    stage: "execute_sql",
    migration: null,
  };
}

function isExecutorStageError(error: unknown): error is {
  stage: BoundedMigrationExecutorFailureStage;
  migration: string | null;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "stage" in error &&
    typeof (error as { stage: unknown }).stage === "string"
  );
}

function createExecutorStageError(
  stage: BoundedMigrationExecutorFailureStage,
  migration: string,
): Error & {
  stage: BoundedMigrationExecutorFailureStage;
  migration: string;
} {
  return Object.assign(new Error("bounded migration executor operation failed"), {
    stage,
    migration,
  });
}
