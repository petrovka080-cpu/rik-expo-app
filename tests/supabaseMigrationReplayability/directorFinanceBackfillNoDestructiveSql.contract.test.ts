import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260323023959_backfill_director_finance_fetch_summary_v1.sql",
);

it("keeps the director finance replayability backfill non-destructive and catalog_items-free", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const lower = sql.toLowerCase();

  expect(lower).not.toMatch(/\bdrop\s+(table|column|schema|function|policy)\b/);
  expect(lower).not.toMatch(/\btruncate\b/);
  expect(lower).not.toMatch(/\bdelete\s+from\b/);
  expect(lower).not.toMatch(/\binsert\s+into\s+public\.catalog_items\b/);
  expect(lower).not.toMatch(/\bupdate\s+public\.catalog_items\b/);
  expect(lower).not.toMatch(/\balter\s+table\s+public\.catalog_items\b/);
  expect(lower).not.toContain("catalog_items");
  expect(lower).not.toContain("production");
});
