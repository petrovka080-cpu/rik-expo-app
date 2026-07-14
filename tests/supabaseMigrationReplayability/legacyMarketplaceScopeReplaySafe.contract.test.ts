import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260328042000_marketplace_scope_page_rpc_v1.sql",
);
const backfillName = "20260328041959_backfill_marketplace_scope_dependencies_for_replay.sql";
const scopeName = "20260328042000_marketplace_scope_page_rpc_v1.sql";
const migrationsDir = path.join(process.cwd(), "supabase/migrations");

it("keeps the legacy marketplace scope migration replay-safe without a local market_listings table", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const lower = sql.toLowerCase();
  const migrationNames = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const backfillSql = fs.readFileSync(path.join(migrationsDir, backfillName), "utf8").toLowerCase();

  expect(migrationNames.indexOf(backfillName)).toBeLessThan(migrationNames.indexOf(scopeName));

  expect(lower).toContain("set check_function_bodies = off;");
  expect(lower).toContain("to_regclass('public.market_listings') is not null");
  expect(lower).toContain("create index if not exists market_listings_active_created_idx");
  expect(lower).toContain("create index if not exists market_listings_active_side_kind_created_idx");
  expect(lower).toContain("create or replace function public.marketplace_items_scope_page_v1");
  expect(backfillSql).toContain("create table if not exists public.market_listings");
  expect(backfillSql).toContain("create table if not exists public.companies");
  expect(backfillSql).toContain("owner_user_id uuid");
  expect(backfillSql).toContain("alter table if exists public.companies");
  expect(backfillSql).toContain("add column if not exists owner_user_id uuid");
  expect(backfillSql).toContain("create table if not exists public.company_members");
  expect(backfillSql).toContain("primary key (company_id, user_id)");
  expect(backfillSql).toContain("create table if not exists public.company_invites");
  for (const column of [
    "invite_code text not null",
    "name text not null",
    "phone text not null",
    "role text not null",
    "status text not null default 'pending'",
    "accepted_at timestamptz",
  ]) {
    expect(backfillSql).toContain(column);
  }
  expect(backfillSql).toContain("create table if not exists public.user_profiles");
  expect(backfillSql).toContain("create view public.v_catalog_marketplace as");
  expect(backfillSql).toContain("create view public.v_marketplace_catalog_stock as");

  expect(backfillSql).not.toContain("catalog_items");
  expect(lower).not.toContain("catalog_items");
  expect(lower).not.toMatch(/\bdrop\s+(table|column|schema|function|policy)\b/);
  expect(lower).not.toMatch(/\btruncate\b/);
  expect(lower).not.toMatch(/\bdelete\s+from\b/);
});
