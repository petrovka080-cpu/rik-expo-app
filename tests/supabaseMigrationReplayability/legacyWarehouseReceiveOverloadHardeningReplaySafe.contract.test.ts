import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416214500_p0_security_definer_search_path_warehouse_receive_legacy_overload.sql",
);

it("guards legacy warehouse receive uuid-overload hardening when the overload is absent locally", () => {
  const sql = fs.readFileSync(migrationPath, "utf8").toLowerCase();

  expect(sql).toContain("to_regprocedure('public.wh_receive_apply_ui(uuid,jsonb,text,text)')");
  expect(sql).toContain("alter function public.wh_receive_apply_ui(uuid, jsonb, text, text)");
  expect(sql).toContain("set search_path = ''''");
  expect(sql).toContain("legacy uuid overload");
  expect(sql).toContain("notify pgrst, 'reload schema'");

  expect(sql).not.toContain("create or replace function public.wh_receive_apply_ui");
  expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function)\b/);
  expect(sql).not.toMatch(/\btruncate\b/);
  expect(sql).not.toMatch(/\bdelete\s+from\b/);
});
