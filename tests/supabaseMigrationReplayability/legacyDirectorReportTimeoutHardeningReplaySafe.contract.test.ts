import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260329154500_director_reports_transport_timeout_hardening.sql",
);

it("keeps director report timeout hardening replay-safe when later transport RPC is absent", () => {
  const sql = fs.readFileSync(migrationPath, "utf8").toLowerCase();

  for (const signature of [
    "public.director_report_fetch_issue_price_scope_v1(text[],text[],boolean)",
    "public.director_report_fetch_works_v1(date,date,text,boolean)",
    "public.director_report_transport_scope_v1(date,date,text,boolean,boolean)",
  ]) {
    expect(sql).toContain(`to_regprocedure('${signature}') is not null`);
  }

  expect(sql).toContain("alter function public.director_report_transport_scope_v1(date, date, text, boolean, boolean)");
  expect(sql).not.toContain("catalog_items");
  expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function|policy)\b/);
  expect(sql).not.toMatch(/\btruncate\b/);
  expect(sql).not.toMatch(/\bdelete\s+from\b/);
});
