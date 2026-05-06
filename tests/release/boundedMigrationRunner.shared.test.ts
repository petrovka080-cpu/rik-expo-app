import {
  buildBoundedMigrationPlan,
  formatBoundedMigrationPlanForLog,
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
});
