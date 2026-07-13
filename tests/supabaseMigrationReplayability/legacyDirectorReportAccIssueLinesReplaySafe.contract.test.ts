import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");
const backfillName = "20260329055959_backfill_acc_report_issue_lines_for_replay.sql";
const wrapperName = "20260329060000_director_report_acc_issue_lines_batch_v1.sql";

it("backfills the legacy acc_report_issue_lines RPC before the director report batch wrapper", () => {
  const migrationNames = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const sql = fs.readFileSync(path.join(migrationsDir, backfillName), "utf8").toLowerCase();

  expect(migrationNames.indexOf(backfillName)).toBeLessThan(migrationNames.indexOf(wrapperName));
  expect(sql).toContain("to_regprocedure('public.acc_report_issue_lines(bigint)') is null");
  expect(sql).toContain("create function public.acc_report_issue_lines(p_issue_id bigint)");
  expect(sql).toContain("returns table");
  expect(sql).toContain("issue_id bigint");
  expect(sql).toContain("rik_code text");
  expect(sql).toContain("qty_over numeric");
  expect(sql).toContain("grant execute on function public.acc_report_issue_lines(bigint)");

  expect(sql).not.toContain("catalog_items");
  expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function|policy)\b/);
  expect(sql).not.toMatch(/\btruncate\b/);
  expect(sql).not.toMatch(/\bdelete\s+from\b/);
});
