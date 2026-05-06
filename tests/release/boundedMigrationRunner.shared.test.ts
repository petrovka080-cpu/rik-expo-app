import {
  buildBoundedMigrationPlan,
  formatBoundedMigrationExecutorResultForLog,
  formatBoundedMigrationPlanForLog,
  runBoundedMigrationExecutor,
  type BoundedMigrationExecutorAdapter,
  type BoundedMigrationExecutorTransaction,
  type BoundedMigrationExecutorFailureStage,
  type BoundedMigrationLocalMigration,
  type BoundedMigrationRemoteMigration,
} from "../../scripts/release/boundedMigrationRunner.shared";

const BLOCKING_ONE =
  "20260430133000_s_load_fix_6_warehouse_issue_queue_visible_truth_pushdown.sql";
const BLOCKING_TWO =
  "20260501090000_s_load_11_warehouse_issue_queue_ready_rows_read_model.sql";
const IDEMPOTENCY_TARGET = "20260502170000_scale_idempotency_records_provider_smoke.sql";
const UNRELATED_BEFORE = "20260429120000_unrelated_before_allowlist.sql";

const localMigrations: BoundedMigrationLocalMigration[] = [
  {
    file: "20260429090000_already_applied.sql",
    sqlSource: "create table if not exists public.already_applied(id uuid primary key);",
  },
  {
    file: BLOCKING_ONE,
    sqlSource:
      "create or replace function public.warehouse_issue_queue_visible_truth() returns void language sql as $$ select 1 $$;",
  },
  {
    file: BLOCKING_TWO,
    sqlSource:
      "create table if not exists public.warehouse_issue_queue_ready_rows_v1(id uuid primary key); delete from public.warehouse_issue_queue_ready_rows_v1;",
  },
  {
    file: IDEMPOTENCY_TARGET,
    sqlSource:
      "create table if not exists public.scale_idempotency_records_provider_smoke(id uuid primary key);",
  },
];

const remoteMigrations: BoundedMigrationRemoteMigration[] = [
  {
    version: "20260429090000",
    name: "already_applied",
  },
];

class FakeBoundedMigrationExecutorAdapter implements BoundedMigrationExecutorAdapter {
  readonly sqlAttempts: string[] = [];
  readonly historyAttempts: string[] = [];
  sqlExecutionOrder: string[] = [];
  historyWriteOrder: string[] = [];

  constructor(
    private readonly failSqlFor: string | null = null,
    private readonly failHistoryFor: string | null = null,
  ) {}

  async withTransaction<T>(
    operation: (transaction: BoundedMigrationExecutorTransaction) => Promise<T>,
  ): Promise<T> {
    const sqlSnapshot = [...this.sqlExecutionOrder];
    const historySnapshot = [...this.historyWriteOrder];
    try {
      return await operation({
        executeMigrationSql: async (migration) => {
          this.sqlAttempts.push(migration.file);
          if (migration.file === this.failSqlFor) {
            throw stageError("execute_sql", migration.file);
          }
          this.sqlExecutionOrder.push(migration.file);
        },
        recordMigrationHistory: async (record) => {
          this.historyAttempts.push(record.file);
          if (record.file === this.failHistoryFor) {
            throw stageError("write_history", record.file);
          }
          this.historyWriteOrder.push(record.file);
        },
      });
    } catch (error) {
      this.sqlExecutionOrder = sqlSnapshot;
      this.historyWriteOrder = historySnapshot;
      throw error;
    }
  }
}

describe("bounded migration runner", () => {
  it("builds a dry-run plan for the exact two allowlisted blocking migrations", () => {
    const plan = buildBoundedMigrationPlan({
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations,
      remoteMigrations,
      mode: "plan",
      destructiveApproval: true,
    });

    expect(plan.status).toBe("PASS");
    expect(plan.selectedMigrations).toEqual([BLOCKING_ONE, BLOCKING_TWO]);
    expect(plan.dryRunOnly).toBe(true);
    expect(plan.wouldWriteDb).toBe(false);
    expect(plan.dbWriteAttempted).toBe(false);
  });

  it("keeps the idempotency target excluded when it follows the allowlist", () => {
    const plan = buildBoundedMigrationPlan({
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations,
      remoteMigrations,
      mode: "plan",
      destructiveApproval: true,
    });

    expect(plan.status).toBe("PASS");
    expect(plan.idempotencyTargetExcluded).toBe(true);
    expect(plan.selectedMigrations).not.toContain(IDEMPOTENCY_TARGET);
  });

  it("rejects include-all", () => {
    const plan = buildBoundedMigrationPlan({
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations,
      remoteMigrations,
      includeAll: true,
      destructiveApproval: true,
    });

    expect(plan.status).toBe("BLOCKED");
    expect(plan.blockers.map((blocker) => blocker.code)).toContain("INCLUDE_ALL_REJECTED");
  });

  it("rejects allowlists that are not in migration order", () => {
    const plan = buildBoundedMigrationPlan({
      allowlist: [BLOCKING_TWO, BLOCKING_ONE],
      localMigrations,
      remoteMigrations,
      destructiveApproval: true,
    });

    expect(plan.status).toBe("BLOCKED");
    expect(plan.blockers.map((blocker) => blocker.code)).toContain("ALLOWLIST_ORDER_MISMATCH");
  });

  it("rejects allowlists when another pending migration is before them", () => {
    const plan = buildBoundedMigrationPlan({
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations: [
        localMigrations[0],
        {
          file: UNRELATED_BEFORE,
          sqlSource: "create table if not exists public.unrelated_before(id uuid primary key);",
        },
        ...localMigrations.slice(1),
      ],
      remoteMigrations,
      destructiveApproval: true,
    });

    expect(plan.status).toBe("BLOCKED");
    expect(plan.blockers.map((blocker) => blocker.code)).toContain("PENDING_BEFORE_ALLOWLIST");
  });

  it("blocks destructive or unclear SQL without explicit destructive approval", () => {
    const plan = buildBoundedMigrationPlan({
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations,
      remoteMigrations,
      mode: "plan",
    });

    expect(plan.status).toBe("BLOCKED");
    expect(plan.blockers.map((blocker) => blocker.code)).toContain(
      "DESTRUCTIVE_SQL_REQUIRES_APPROVAL",
    );
    expect(plan.destructiveSqlClassification).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: BLOCKING_TWO,
          classification: "destructive_or_unclear",
          hasDelete: true,
        }),
      ]),
    );
  });

  it("does not include raw SQL or secret-like values in formatted output", () => {
    const plan = buildBoundedMigrationPlan({
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations: [
        ...localMigrations,
        {
          file: "20260503090000_secret_fixture.sql",
          sqlSource: "select 'SUPABASE_SECRET_EXAMPLE' as leaked_value;",
        },
      ],
      remoteMigrations,
      mode: "plan",
      destructiveApproval: true,
    });
    const formatted = JSON.stringify(formatBoundedMigrationPlanForLog(plan));

    expect(formatted).not.toContain("create table");
    expect(formatted).not.toContain("delete from");
    expect(formatted).not.toContain("SUPABASE_SECRET_EXAMPLE");
  });

  it("does not write DB in dry-run mode", () => {
    const plan = buildBoundedMigrationPlan({
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations,
      remoteMigrations,
      mode: "plan",
      destructiveApproval: true,
    });

    expect(plan.status).toBe("PASS");
    expect(plan.dryRunOnly).toBe(true);
    expect(plan.wouldWriteDb).toBe(false);
    expect(plan.manualSqlExecuted).toBe(false);
    expect(plan.repairExecuted).toBe(false);
  });

  it("executor plan mode does not write DB", async () => {
    const adapter = new FakeBoundedMigrationExecutorAdapter();
    const result = await runBoundedMigrationExecutor({
      executorMode: "plan",
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations,
      remoteMigrations,
      destructiveApproval: true,
      adapter,
    });

    expect(result.status).toBe("PASS");
    expect(result.dryRunOnly).toBe(true);
    expect(result.dbWriteAttempted).toBe(false);
    expect(adapter.sqlAttempts).toEqual([]);
    expect(adapter.historyAttempts).toEqual([]);
  });

  it("executor execute mode applies the exact two allowlisted migrations through a fake adapter", async () => {
    const adapter = new FakeBoundedMigrationExecutorAdapter();
    const result = await runBoundedMigrationExecutor({
      executorMode: "execute",
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations,
      remoteMigrations,
      destructiveApproval: true,
      adapter,
    });

    expect(result.status).toBe("PASS");
    expect(result.selectedMigrations).toEqual([BLOCKING_ONE, BLOCKING_TWO]);
    expect(result.appliedMigrations).toEqual([BLOCKING_ONE, BLOCKING_TWO]);
    expect(result.idempotencyMigrationApplied).toBe(false);
    expect(result.unrelatedMigrationsApplied).toBe(false);
    expect(adapter.sqlExecutionOrder).toEqual([BLOCKING_ONE, BLOCKING_TWO]);
  });

  it("executor preserves SQL execution order and migration history write order", async () => {
    const adapter = new FakeBoundedMigrationExecutorAdapter();
    const result = await runBoundedMigrationExecutor({
      executorMode: "execute",
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations,
      remoteMigrations,
      destructiveApproval: true,
      adapter,
    });

    expect(result.sqlExecutionOrder).toEqual([BLOCKING_ONE, BLOCKING_TWO]);
    expect(result.historyWriteOrder).toEqual([BLOCKING_ONE, BLOCKING_TWO]);
    expect(adapter.historyWriteOrder).toEqual([BLOCKING_ONE, BLOCKING_TWO]);
  });

  it("executor marks applied only when SQL and history both succeed", async () => {
    const adapter = new FakeBoundedMigrationExecutorAdapter();
    const result = await runBoundedMigrationExecutor({
      executorMode: "execute",
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations,
      remoteMigrations,
      destructiveApproval: true,
      adapter,
    });

    expect(result.status).toBe("PASS");
    expect(result.appliedMigrationCount).toBe(2);
    expect(result.dbWriteAttempted).toBe(true);
  });

  it("executor does not write history when SQL execution fails", async () => {
    const adapter = new FakeBoundedMigrationExecutorAdapter(BLOCKING_ONE);
    const result = await runBoundedMigrationExecutor({
      executorMode: "execute",
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations,
      remoteMigrations,
      destructiveApproval: true,
      adapter,
    });

    expect(result.status).toBe("FAILED");
    expect(result.failureStage).toBe("execute_sql");
    expect(result.appliedMigrations).toEqual([]);
    expect(adapter.historyAttempts).toEqual([]);
    expect(adapter.sqlExecutionOrder).toEqual([]);
    expect(adapter.historyWriteOrder).toEqual([]);
  });

  it("executor fails and rolls back fake adapter state when history write fails", async () => {
    const adapter = new FakeBoundedMigrationExecutorAdapter(null, BLOCKING_ONE);
    const result = await runBoundedMigrationExecutor({
      executorMode: "execute",
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations,
      remoteMigrations,
      destructiveApproval: true,
      adapter,
    });

    expect(result.status).toBe("FAILED");
    expect(result.failureStage).toBe("write_history");
    expect(result.appliedMigrations).toEqual([]);
    expect(adapter.sqlAttempts).toEqual([BLOCKING_ONE]);
    expect(adapter.historyAttempts).toEqual([BLOCKING_ONE]);
    expect(adapter.sqlExecutionOrder).toEqual([]);
    expect(adapter.historyWriteOrder).toEqual([]);
  });

  it("executor rejects include-all", async () => {
    const result = await runBoundedMigrationExecutor({
      executorMode: "execute",
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations,
      remoteMigrations,
      includeAll: true,
      destructiveApproval: true,
      adapter: new FakeBoundedMigrationExecutorAdapter(),
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.map((blocker) => blocker.code)).toContain("INCLUDE_ALL_REJECTED");
    expect(result.dbWriteAttempted).toBe(false);
  });

  it("executor rejects wrong order", async () => {
    const result = await runBoundedMigrationExecutor({
      executorMode: "execute",
      allowlist: [BLOCKING_TWO, BLOCKING_ONE],
      localMigrations,
      remoteMigrations,
      destructiveApproval: true,
      adapter: new FakeBoundedMigrationExecutorAdapter(),
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.map((blocker) => blocker.code)).toContain("ALLOWLIST_ORDER_MISMATCH");
  });

  it("executor rejects unrelated pending migrations before the allowlist", async () => {
    const result = await runBoundedMigrationExecutor({
      executorMode: "execute",
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations: [
        localMigrations[0],
        {
          file: UNRELATED_BEFORE,
          sqlSource: "create table if not exists public.unrelated_before(id uuid primary key);",
        },
        ...localMigrations.slice(1),
      ],
      remoteMigrations,
      destructiveApproval: true,
      adapter: new FakeBoundedMigrationExecutorAdapter(),
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.map((blocker) => blocker.code)).toContain("PENDING_BEFORE_ALLOWLIST");
  });

  it("executor keeps idempotency target excluded", async () => {
    const result = await runBoundedMigrationExecutor({
      executorMode: "execute",
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations,
      remoteMigrations,
      destructiveApproval: true,
      adapter: new FakeBoundedMigrationExecutorAdapter(),
    });

    expect(result.status).toBe("PASS");
    expect(result.idempotencyTargetExcluded).toBe(true);
    expect(result.appliedMigrations).not.toContain(IDEMPOTENCY_TARGET);
  });

  it("executor requires explicit destructive approval for destructive or unclear SQL", async () => {
    const result = await runBoundedMigrationExecutor({
      executorMode: "execute",
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations,
      remoteMigrations,
      adapter: new FakeBoundedMigrationExecutorAdapter(),
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.map((blocker) => blocker.code)).toContain(
      "DESTRUCTIVE_SQL_REQUIRES_APPROVAL",
    );
  });

  it("executor formatted output does not log raw SQL, secrets, env values, or DB URLs", async () => {
    const adapter = new FakeBoundedMigrationExecutorAdapter();
    const result = await runBoundedMigrationExecutor({
      executorMode: "execute",
      allowlist: [BLOCKING_ONE, BLOCKING_TWO],
      localMigrations: [
        ...localMigrations,
        {
          file: "20260503090000_secret_fixture.sql",
          sqlSource:
            "select 'SUPABASE_SECRET_EXAMPLE' as leaked_value, 'postgres://user:pass@example/db' as db_url;",
        },
      ],
      remoteMigrations,
      destructiveApproval: true,
      adapter,
    });
    const formatted = JSON.stringify(formatBoundedMigrationExecutorResultForLog(result));

    expect(formatted).not.toContain("create table");
    expect(formatted).not.toContain("delete from");
    expect(formatted).not.toContain("SUPABASE_SECRET_EXAMPLE");
    expect(formatted).not.toContain("postgres://");
    expect(formatted).not.toContain("EXPO_PUBLIC");
  });
});

function stageError(stage: BoundedMigrationExecutorFailureStage, migration: string): Error & {
  stage: BoundedMigrationExecutorFailureStage;
  migration: string;
} {
  return Object.assign(new Error("fake bounded migration executor failure"), {
    stage,
    migration,
  });
}
