import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");
const backfillName = "20260328111959_backfill_contractor_scope_dependencies_for_replay.sql";
const scopeName = "20260328112000_contractor_inbox_fact_scope_v1.sql";

it("keeps contractor inbox fact replay-safe when remote-history contractor sources are absent", () => {
  const migrationNames = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const sql = fs.readFileSync(path.join(migrationsDir, backfillName), "utf8").toLowerCase();

  expect(migrationNames.indexOf(backfillName)).toBeLessThan(migrationNames.indexOf(scopeName));

  for (const table of [
    "contractors",
    "profiles",
    "objects",
    "ref_object_types",
    "ref_systems",
    "ref_zones",
    "ref_levels",
  ]) {
    expect(sql).toContain(`create table if not exists public.${table}`);
  }

  for (const view of ["v_wh_issue_req_heads_ui", "v_wh_issue_req_items_ui", "v_warehouse_stock"]) {
    expect(sql).toContain(`create view public.${view} as`);
  }

  for (const column of [
    "display_no",
    "object_name",
    "level_code",
    "system_code",
    "zone_code",
    "level_name",
    "system_name",
    "zone_name",
  ]) {
    expect(sql).toContain(`null::text as ${column}`);
  }

  expect(sql).toContain("create table public.warehouse_issues");
  expect(sql).toContain("id bigint generated always as identity primary key");
  expect(sql).toContain("create table public.warehouse_issue_items");
  expect(sql).toContain("issue_id bigint");
  expect(sql).toContain("create table public.wh_ledger");
  for (const column of [
    "direction text not null",
    "moved_at timestamptz not null default now()",
    "code text not null",
    "qty numeric not null default 0",
    "uom_id text not null",
    "warehouse_id text not null",
  ]) {
    expect(sql).toContain(column);
  }
  expect(sql).toContain("null::text as rik_code");
  expect(sql).toContain("null::text as uom_id");
  expect(sql).toContain("alias_ru text");
  expect(sql).toContain("add column if not exists alias_ru text");
  expect(sql).toContain("add column if not exists rik_code text");
  expect(sql).toContain("add column if not exists row_no integer");
  expect(sql).toContain("add column if not exists position_order integer");
  expect(sql).toContain("add column if not exists updated_at timestamptz");
  for (const column of [
    "qty_limit",
    "qty_issued",
    "qty_left",
    "qty_available",
    "qty_can_issue_now",
  ]) {
    expect(sql).toContain(`0::numeric as ${column}`);
  }
  expect(sql).toContain("alter table if exists public.requests");
  expect(sql).toContain("alter table if exists public.request_items");
  expect(sql).toContain("alter table if exists public.subcontracts");
  expect(sql).not.toContain("catalog_items");
  expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function|policy)\b/);
  expect(sql).not.toMatch(/\btruncate\b/);
  expect(sql).not.toMatch(/\bdelete\s+from\b/);
});
