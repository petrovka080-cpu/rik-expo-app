import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260420120000_pdf_z2_director_production_report_rpc_volatility.sql",
);

it("guards director production PDF volatility hardening when the legacy PDF source RPC is absent locally", () => {
  const sql = fs.readFileSync(migrationPath, "utf8").toLowerCase();

  expect(sql).toContain(
    "to_regprocedure('public.pdf_director_production_source_v1(text,text,text,boolean)')",
  );
  expect(sql).toContain("alter function public.pdf_director_production_source_v1(text, text, text, boolean) volatile");
  expect(sql).toContain("pdf-z2 volatility guard failed");
  expect(sql).not.toContain("create or replace function public.pdf_director_production_source_v1");
  expect(sql).not.toContain("catalog_items");
  expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function)\b/);
  expect(sql).not.toMatch(/\btruncate\b/);
  expect(sql).not.toMatch(/\bdelete\s+from\b/);
});
