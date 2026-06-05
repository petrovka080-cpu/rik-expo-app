import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260329233000_director_pdf_source_security_definer_v1.sql",
);

it("keeps director PDF security-definer hardening replay-safe when legacy PDF RPCs are absent", () => {
  const sql = fs.readFileSync(migrationPath, "utf8").toLowerCase();

  for (const signature of [
    "public.pdf_director_finance_source_v1(text,text,integer,integer)",
    "public.pdf_director_production_source_v1(text,text,text,boolean)",
    "public.pdf_director_subcontract_source_v1(text,text,text)",
  ]) {
    expect(sql).toContain(`to_regprocedure('${signature}') is not null`);
  }

  expect(sql).toContain("security definer");
  expect(sql).toContain("set search_path = public");
  expect(sql).not.toContain("catalog_items");
  expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function|policy)\b/);
  expect(sql).not.toMatch(/\btruncate\b/);
  expect(sql).not.toMatch(/\bdelete\s+from\b/);
});
