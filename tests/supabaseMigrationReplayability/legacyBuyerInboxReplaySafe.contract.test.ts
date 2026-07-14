import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260323023959_backfill_director_finance_fetch_summary_v1.sql",
);

const readMigration = () => fs.readFileSync(migrationPath, "utf8");

it("backfills the legacy list_buyer_inbox RPC before buyer inbox scope migrations need it", () => {
  const sql = readMigration();

  expect(sql).toContain("if to_regprocedure('public.list_buyer_inbox(uuid)') is null then");
  expect(sql).toContain("create function public.list_buyer_inbox(");
  expect(sql).toMatch(/p_company_id\s+uuid\s+default\s+null/i);
  expect(sql).toMatch(/returns\s+table\s*\(/i);

  for (const column of [
    "app_code text",
    "created_at timestamptz",
    "director_reject_at timestamptz",
    "director_reject_note text",
    "kind text",
    "name_human text",
    "note text",
    "object_name text",
    "qty numeric",
    "request_id uuid",
    "request_id_old bigint",
    "request_item_id uuid",
    "rik_code text",
    "status text",
    "uom text",
  ]) {
    expect(sql).toContain(column);
  }

  expect(sql).toMatch(/security\s+definer/i);
  expect(sql).toMatch(/set\s+search_path\s*=\s*public/i);
  expect(sql).toContain("from public.request_items ri");
  expect(sql).toContain("join public.requests r");
  expect(sql).toContain("on r.id = ri.request_id");
  expect(sql).toContain("where p_company_id is null");
  expect(sql).toContain("grant execute on function public.list_buyer_inbox(uuid) to authenticated");
  expect(sql).toContain("comment on function public.list_buyer_inbox(uuid)");
  expect(sql).not.toContain("catalog_items");
  expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function|policy)\b/i);
  expect(sql).not.toMatch(/\btruncate\b/i);
  expect(sql).not.toMatch(/\bdelete\s+from\b/i);
});
