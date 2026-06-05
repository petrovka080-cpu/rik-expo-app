import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const migrationPath = path.join(
  projectRoot,
  "supabase/migrations/20260323023959_backfill_director_finance_fetch_summary_v1.sql",
);

const readMigration = () => fs.readFileSync(migrationPath, "utf8");

it("backfills director_finance_fetch_summary_v1 with the exact legacy summary/report contract", () => {
  const sql = readMigration();

  expect(sql).toContain("set check_function_bodies = off;");
  expect(sql).toContain("alter database postgres set check_function_bodies = off;");

  for (const table of [
    "proposal_items",
    "request_items",
    "rik_items",
    "rik_aliases",
    "requests",
    "purchases",
    "purchase_items",
    "work_progress",
    "work_progress_log",
    "work_progress_log_materials",
    "subcontracts",
  ]) {
    expect(sql).toContain(`create table if not exists public.${table}`);
  }

  expect(sql).toContain("create view public.v_works_fact as");
  expect(sql).toContain("id bigint generated always as identity primary key");
  expect(sql).toContain("id uuid primary key default gen_random_uuid()");
  expect(sql).toMatch(
    /create table if not exists public\.requests\s*\(\s*id uuid primary key default gen_random_uuid\(\),/i,
  );
  expect(sql).toContain("id_old bigint");
  expect(sql).toContain("submitted_at timestamptz");
  expect(sql).toContain("submitted_by uuid");
  expect(sql).toContain("requested_by uuid");
  expect(sql).toContain("director_reject_note text");
  expect(sql).toContain("director_reject_at timestamptz");
  expect(sql).toContain("add column if not exists submitted_by uuid");
  expect(sql).toContain("add column if not exists requested_by uuid");
  expect(sql).toContain("add column if not exists director_reject_note text");
  expect(sql).toContain("add column if not exists director_reject_at timestamptz");
  expect(sql).toContain("add column if not exists request_id uuid");
  expect(sql).toContain("add column if not exists created_by uuid");

  expect(sql).toContain("create view public.v_director_finance_spend_kinds_v3 as");
  for (const column of [
    "kind_name",
    "supplier",
    "proposal_id",
    "proposal_no",
    "approved_alloc",
    "paid_alloc",
    "paid_alloc_cap",
    "overpay_alloc",
    "director_approved_at",
  ]) {
    expect(sql).toContain(` as ${column}`);
  }

  expect(sql).toContain("create function public.director_finance_fetch_summary_v1(");
  expect(sql).toMatch(/p_from\s+date\s+default\s+null/i);
  expect(sql).toMatch(/p_to\s+date\s+default\s+null/i);
  expect(sql).toMatch(/p_due_days\s+integer\s+default\s+7/i);
  expect(sql).toMatch(/p_critical_days\s+integer\s+default\s+14/i);
  expect(sql).toMatch(/returns\s+jsonb/i);
  expect(sql).toMatch(/security\s+definer/i);
  expect(sql).toMatch(/set\s+search_path\s*=\s*public/i);

  for (const key of [
    "approved",
    "paid",
    "partialPaid",
    "toPay",
    "overdueCount",
    "overdueAmount",
    "criticalCount",
    "criticalAmount",
    "partialCount",
    "debtCount",
  ]) {
    expect(sql).toContain(`'${key}'`);
  }

  expect(sql).toContain("'summary'");
  expect(sql).toContain("'report'");
  expect(sql).toContain("'suppliers'");
  expect(sql).toContain("director_finance_summary_v2");
  expect(sql).toContain("legacy_summary");
  expect(sql).toContain("legacy_report");
  expect(sql).toContain("grant select on public.v_director_finance_spend_kinds_v3");
  expect(sql).toContain("create function public.list_accountant_inbox_fact(p_tab text default null)");
  expect(sql).toMatch(/returns\s+table\(row_json\s+jsonb\)/i);
  expect(sql).toContain("grant execute on function public.list_accountant_inbox_fact");
  expect(sql).toContain("grant execute on function public.director_finance_fetch_summary_v1");
});
