import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");
const backfillName = "20260331125959_backfill_attachment_evidence_dependencies_for_replay.sql";
const attachmentBoundaryName = "20260331130000_attachment_evidence_boundary_v1.sql";

it("backfills proposal attachment evidence dependencies before legacy replay uses them", () => {
  const migrationNames = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const sql = fs.readFileSync(path.join(migrationsDir, backfillName), "utf8").toLowerCase();

  expect(migrationNames.indexOf(backfillName)).toBeLessThan(
    migrationNames.indexOf(attachmentBoundaryName),
  );

  expect(sql).toContain("create table if not exists public.proposal_attachments");
  expect(sql).toContain("id bigint generated always as identity primary key");
  expect(sql).toContain("proposal_id uuid");
  expect(sql).toContain("bucket_id text");
  expect(sql).toContain("storage_path text");
  expect(sql).toContain("file_name text not null");
  expect(sql).toContain("group_key text not null");
  expect(sql).toContain("created_at timestamptz");

  expect(sql).not.toContain("catalog_items");
  expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function|policy)\b/);
  expect(sql).not.toMatch(/\btruncate\b/);
  expect(sql).not.toMatch(/\bdelete\s+from\b/);
});
