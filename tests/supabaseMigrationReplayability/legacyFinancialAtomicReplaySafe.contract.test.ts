import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");
const backfillName = "20260330105959_backfill_financial_atomic_dependencies_for_replay.sql";
const financialRpcName = "20260330110000_financial_atomic_rpc_v1.sql";

it("backfills financial atomic RPC dependencies before legacy financial replay", () => {
  const migrationNames = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const sql = fs.readFileSync(path.join(migrationsDir, backfillName), "utf8").toLowerCase();

  expect(migrationNames.indexOf(backfillName)).toBeLessThan(migrationNames.indexOf(financialRpcName));
  expect(sql).toContain("create table if not exists public.accounting_invoices");
  expect(sql).toContain("create table if not exists public.proposal_payment_allocations");
  expect(sql).toContain("create table if not exists public.accounting_events");
  expect(sql).toContain("create table if not exists public.accounting_payments");
  expect(sql).toContain("create table if not exists public.payments");
  expect(sql).toContain("purchase_id uuid");
  expect(sql).toContain("request_item_id uuid");
  expect(sql).toContain("alter table if exists public.proposals");
  expect(sql).toContain("add column if not exists invoice_number text");
  expect(sql).toContain("alter table if exists public.proposal_items");
  expect(sql).toContain("add column if not exists name_human text");
  expect(sql).toContain("add column if not exists proposal_id_text text");
  expect(sql).toContain("add column if not exists proposal_id_bigint bigint");
  expect(sql).toContain("alter table if exists public.request_items");
  expect(sql).toContain("add column if not exists cancelled_at timestamptz");
  expect(sql).toContain("alter table if exists public.proposal_payments");
  expect(sql).toContain("add column if not exists accountant_fio text");

  expect(sql).not.toContain("catalog_items");
  expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function|policy)\b/);
  expect(sql).not.toMatch(/\btruncate\b/);
  expect(sql).not.toMatch(/\bdelete\s+from\b/);
});
