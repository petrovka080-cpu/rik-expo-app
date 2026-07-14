import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");
const backfillName = "20260323023959_backfill_director_finance_fetch_summary_v1.sql";
const oldScopeName = "20260323024000_director_finance_panel_scope_rpc_v1.sql";
const restoreCheckBodiesName = "20260605085959_restore_check_function_bodies_after_legacy_replay.sql";
const ontologyName = "20260605090000_add_construction_work_ontology.sql";

it("runs the director finance summary backfill before the old panel scope migration", () => {
  const migrationNames = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const backfillIndex = migrationNames.indexOf(backfillName);
  const oldScopeIndex = migrationNames.indexOf(oldScopeName);
  const restoreCheckBodiesIndex = migrationNames.indexOf(restoreCheckBodiesName);
  const ontologyIndex = migrationNames.indexOf(ontologyName);

  expect(backfillIndex).toBeGreaterThanOrEqual(0);
  expect(oldScopeIndex).toBeGreaterThanOrEqual(0);
  expect(restoreCheckBodiesIndex).toBeGreaterThanOrEqual(0);
  expect(ontologyIndex).toBeGreaterThanOrEqual(0);
  expect(backfillIndex).toBeLessThan(oldScopeIndex);
  expect(oldScopeIndex).toBeLessThan(restoreCheckBodiesIndex);
  expect(restoreCheckBodiesIndex).toBeLessThan(ontologyIndex);
  expect(Number(backfillName.slice(0, 14))).toBeLessThan(Number(oldScopeName.slice(0, 14)));

  const backfillSql = fs.readFileSync(path.join(migrationsDir, backfillName), "utf8");
  const oldScopeSql = fs.readFileSync(path.join(migrationsDir, oldScopeName), "utf8");
  const restoreCheckBodiesSql = fs.readFileSync(path.join(migrationsDir, restoreCheckBodiesName), "utf8");

  expect(backfillSql).toContain(
    "to_regprocedure('public.director_finance_fetch_summary_v1(date,date,integer,integer)') is null",
  );
  expect(backfillSql).toContain("to_regclass('public.v_director_finance_spend_kinds_v3') is null");
  expect(backfillSql).toContain("to_regprocedure('public.list_accountant_inbox_fact(text)') is null");
  expect(backfillSql).toContain("alter database postgres set check_function_bodies = off;");
  expect(restoreCheckBodiesSql).toContain("alter database postgres reset check_function_bodies;");
  expect(restoreCheckBodiesSql).toContain("set check_function_bodies = on;");
  expect(oldScopeSql).toContain("public.director_finance_fetch_summary_v1(");
  expect(oldScopeSql).toContain("public.v_director_finance_spend_kinds_v3");
  expect(oldScopeSql).toContain("create or replace function public.director_finance_panel_scope_v1");
});
