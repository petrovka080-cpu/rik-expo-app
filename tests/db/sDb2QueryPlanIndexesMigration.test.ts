import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260428154000_s_db_2_query_plan_indexes.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");
const lowerSource = source.toLowerCase();

describe("S-DB-2 query-plan indexes migration", () => {
  it("adds exactly ten additive indexes", () => {
    expect((lowerSource.match(/create index if not exists/g) ?? []).length).toBe(10);
    expect(lowerSource).not.toContain("create unique index");
  });

  it("does not use destructive SQL or deploy-time table rewrites", () => {
    expect(lowerSource).not.toMatch(/\bdrop\s+/);
    expect(lowerSource).not.toMatch(/\bdelete\s+from\b/);
    expect(lowerSource).not.toMatch(/\btruncate\b/);
    expect(lowerSource).not.toMatch(/\bupdate\s+public\./);
    expect(lowerSource).not.toMatch(/\balter\s+table\b/);
  });

  it("documents the production concurrently deployment note without using it in repo migration", () => {
    expect(source).toContain("CREATE INDEX CONCURRENTLY");
    expect(lowerSource).not.toMatch(/create index concurrently\s+if not exists/);
  });

  it("covers the selected high-volume query domains", () => {
    for (const expected of [
      "idx_requests_submitted_display_id_sdb2",
      "idx_request_items_request_row_position_id_sdb2",
      "idx_request_items_request_status_sdb2",
      "idx_proposals_director_pending_submitted_sdb2",
      "idx_proposals_request_supplier_updated_sdb2",
      "idx_proposal_items_proposal_id_id_sdb2",
      "idx_market_listings_company_status_created_sdb2",
      "idx_market_listings_user_status_created_sdb2",
      "idx_work_progress_log_progress_created_sdb2",
      "idx_wh_ledger_direction_moved_at_sdb2",
    ]) {
      expect(source).toContain(expected);
    }
  });
});
