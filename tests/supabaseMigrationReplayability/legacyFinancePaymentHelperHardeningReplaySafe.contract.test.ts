import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416220000_p0_3_finance_security_definer_search_path_payment_v1.sql",
);

it("guards legacy accountant payment helper hardening when the helper is absent locally", () => {
  const sql = fs.readFileSync(migrationPath, "utf8").toLowerCase();

  expect(sql).toContain(
    "to_regprocedure('public.acc_add_payment_v3_uuid(uuid,numeric,text,text,text,text,jsonb)')",
  );
  expect(sql).toContain("alter function public.acc_add_payment_v3_uuid(");
  expect(sql).toContain("set search_path = ''");
  expect(sql).toContain("legacy accountant payment helper");
  expect(sql).toContain("notify pgrst, 'reload schema'");

  expect(sql).not.toContain("create or replace function public.acc_add_payment_v3_uuid");
  expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function)\b/);
  expect(sql).not.toMatch(/\btruncate\b/);
  expect(sql).not.toMatch(/\bdelete\s+from\b/);
});
