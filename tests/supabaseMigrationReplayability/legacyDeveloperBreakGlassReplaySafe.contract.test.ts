import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416193000_h1_8_developer_break_glass_override.sql",
);

it("keeps developer break-glass seed replay-safe when the target auth user is absent locally", () => {
  const sql = fs.readFileSync(migrationPath, "utf8").toLowerCase();

  expect(sql).toContain("create table if not exists public.developer_access_overrides");
  expect(sql).toContain("references auth.users(id) on delete cascade");
  expect(sql).toContain("insert into public.developer_access_overrides");
  expect(sql).toContain("from auth.users u");
  expect(sql).toContain("where u.id = seed.user_id");
  expect(sql).toContain("on conflict (user_id) do update");

  expect(sql).not.toContain("insert into auth.users");
  expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function)\b/);
  expect(sql).not.toMatch(/\btruncate\b/);
});
