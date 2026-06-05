import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");
const backfillName = "20260329112959_backfill_request_report_dependencies_for_replay.sql";
const requestGcName = "20260329113000_request_empty_draft_gc_v1.sql";
const directorReportName = "20260329153000_director_report_movement_accounting_v1.sql";

it("backfills request lifecycle and director report dependencies before legacy replay uses them", () => {
  const migrationNames = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const sql = fs.readFileSync(path.join(migrationsDir, backfillName), "utf8").toLowerCase();

  expect(migrationNames.indexOf(backfillName)).toBeLessThan(migrationNames.indexOf(requestGcName));
  expect(migrationNames.indexOf(backfillName)).toBeLessThan(migrationNames.indexOf(directorReportName));

  expect(sql).toContain("to_regtype('public.request_status_enum') is null");
  expect(sql).toContain("create type public.request_status_enum as enum");
  expect(sql).toContain("u&'\\0427\\0435\\0440\\043d\\043e\\0432\\0438\\043a'");
  expect(sql).toContain("u&'\\041d\\0430 \\0443\\0442\\0432\\0435\\0440\\0436\\0434\\0435\\043d\\0438\\0438'");
  expect(sql).toContain("u&'\\041a \\0437\\0430\\043a\\0443\\043f\\043a\\0435'");
  expect(sql).toContain("create table if not exists public.proposals");
  expect(sql).toContain("add column if not exists id_short bigint");
  expect(sql).toContain("add column if not exists sent_to_accountant_at timestamptz");
  expect(sql).toContain("add column if not exists buyer_fio text");
  expect(sql).toContain("create table if not exists public.proposal_payments");
  expect(sql).toContain("alter table if exists public.requests");
  expect(sql).toContain("add column if not exists created_by uuid");
  expect(sql).toContain("alter column status type public.request_status_enum");
  expect(sql).toContain("alter table if exists public.proposal_items");
  expect(sql).toContain("add column if not exists total_qty numeric");
  expect(sql).toContain("add column if not exists director_comment text");
  expect(sql).toContain("add column if not exists created_at timestamptz");
  expect(sql).toContain("add column if not exists updated_at timestamptz");
  expect(sql).toContain("alter table if exists public.purchase_items");
  expect(sql).toContain("create view public.v_wh_balance_ledger_ui as");
  expect(sql).toContain("null::text as name");
  expect(sql).toContain("null::timestamptz as updated_at");
  expect(sql).toContain("create view public.v_rik_names_ru as");
  expect(sql).toContain("create view public.proposal_items_view as");
  expect(sql).toContain("create view public.v_proposals_summary as");
  for (const column of [
    "buyer_fio",
    "items_cnt",
    "proposal_id",
    "sent_to_accountant_at",
    "status",
    "submitted_at",
    "total_sum",
  ]) {
    expect(sql).toContain(` as ${column}`);
  }
  expect(sql).toContain("from public.proposals p");
  expect(sql).toContain("left join public.proposal_items pi");
  expect(sql).toContain("create table if not exists public.catalog_name_overrides");
  expect(sql).toContain("create table if not exists public.warehouse_name_map_ui");
  expect(sql).toContain("display_name text");
  expect(sql).toContain("create view public.v_wh_balance_ledger_truth_ui as");
  expect(sql).toContain("0::numeric as qty_available");

  expect(sql).not.toContain("catalog_items");
  expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function|policy)\b/);
  expect(sql).not.toMatch(/\btruncate\b/);
  expect(sql).not.toMatch(/\bdelete\s+from\b/);
});
