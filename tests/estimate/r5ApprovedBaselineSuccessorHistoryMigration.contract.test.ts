import fs from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  "supabase/migrations/20260823183000_r5_approved_baseline_successor_history.sql",
);

describe("R5 immutable approved-baseline successor history", () => {
  const source = fs.readFileSync(migrationPath, "utf8");

  it("allows a successor without rewriting the immutable definition", () => {
    expect(source).toContain("drop constraint if exists estimate_approved_template_baseline_definition_version_id_key");
    expect(source).toContain("drop constraint if exists estimate_approved_template_ba_catalog_id_source_definition__key");
    expect(source).toContain("estimate_approved_template_baseline_definition_history_idx");
    expect(source).toContain("definition_version_id,accepted_at desc,id");
  });

  it("keeps the baseline chain single-successor and explicit", () => {
    expect(source).toContain("estimate_approved_template_baseline_one_direct_successor_uq");
    expect(source).toContain("on public.estimate_approved_template_baseline(supersedes_baseline_id)");
    expect(source).toContain("where supersedes_baseline_id is not null");
    expect(source).toContain("explicit cumulative-manifest baseline ID");
  });

  it("does not update or delete accepted data", () => {
    expect(source).not.toMatch(/update\s+public\.estimate_approved_template_baseline/i);
    expect(source).not.toMatch(/delete\s+from\s+public\.estimate_approved_template_baseline/i);
  });
});
