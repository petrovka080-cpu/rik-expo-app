import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260420090100_n1_sec1_fn_calc_kit_basic_grant_hardening.sql",
);

it("guards fn_calc_kit_basic hardening when the legacy calculation function is absent locally", () => {
  const sql = fs.readFileSync(migrationPath, "utf8").toLowerCase();

  expect(sql).toContain(
    "to_regprocedure('public.fn_calc_kit_basic(text,numeric,numeric,numeric,numeric,numeric,numeric,numeric)')",
  );
  expect(sql).toContain("revoke execute on function public.fn_calc_kit_basic");
  expect(sql).toContain("from anon");
  expect(sql).toContain("alter function public.fn_calc_kit_basic");
  expect(sql).toContain("set search_path = public");
  expect(sql).not.toContain("create or replace function public.fn_calc_kit_basic");
  expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function)\b/);
  expect(sql).not.toMatch(/\btruncate\b/);
  expect(sql).not.toMatch(/\bdelete\s+from\b/);
});
