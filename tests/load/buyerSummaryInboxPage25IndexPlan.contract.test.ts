import fs from "fs";
import path from "path";

import {
  buildBoundedMigrationPlan,
  type BoundedMigrationLocalMigration,
} from "../../scripts/release/boundedMigrationRunner.shared";

const planFile = "20260511093000_buyer_summary_inbox_page25_index_plan.sql";
const planPath = path.join(process.cwd(), "docs/migration-plans", planFile);
const liveMigrationPath = path.join(process.cwd(), "supabase/migrations", planFile);
const source = fs.readFileSync(planPath, "utf8");
const lowerSource = source.toLowerCase();
const lowerExecutableSource = source
  .replace(/--.*$/gm, "")
  .toLowerCase();

describe("W39 buyer summary inbox page 25 index plan package", () => {
  it("keeps the package repo-only and out of live migration discovery", () => {
    expect(planPath.replace(/\\/g, "/")).toContain("docs/migration-plans/");
    expect(fs.existsSync(liveMigrationPath)).toBe(false);
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
    expect(lowerSource).toContain("proposal package, not a live-applied migration");
    expect(lowerSource).toContain("create index concurrently");
  });

  it("targets only buyer inbox proposal item joins used by the page 25 source shape", () => {
    expect(source).toContain("idx_buyer_summary_inbox_pi_req_item_text_proposal_w39");
    expect(source).toContain("idx_buyer_summary_inbox_pi_req_item_text_context_w39");
    expect(source).toContain("on public.proposal_items");
    expect(source).toContain("(request_item_id::text)");
    expect(source).toContain("(proposal_id::text)");
    expect(source).toContain("(coalesce(updated_at, created_at)) desc nulls last");
    expect(source).toContain("include (");
    expect(source).toContain("director_comment");
    expect(source).toContain("supplier");
    expect(source).toContain("price");
    expect(source).toContain("note");
    expect(source).toContain("buyer_summary_inbox_scope_v1");
    expect(source).toContain("buyer_summary_inbox_scope_v1_source_before_sloadfix3");
    expect(source).not.toContain("create or replace function public.buyer_summary_inbox_scope_v1");
    expect(source).not.toContain("public.requests");
    expect(source).not.toContain("public.request_items");
  });

  it("is additive SQL with an explicit rollback note and no live data mutation", () => {
    expect(lowerSource.match(/create index if not exists/g)).toHaveLength(2);
    expect(lowerSource).toContain(
      "drop index concurrently if exists public.idx_buyer_summary_inbox_pi_req_item_text_proposal_w39",
    );
    expect(lowerSource).toContain(
      "drop index concurrently if exists public.idx_buyer_summary_inbox_pi_req_item_text_context_w39",
    );
    expect(lowerExecutableSource).not.toMatch(/\bdrop\s+(table|schema|function|view|materialized\s+view|type|extension|index)\b/);
    expect(lowerExecutableSource).not.toMatch(/\bdelete\s+from\b/);
    expect(lowerExecutableSource).not.toMatch(/\btruncate\b/);
    expect(lowerExecutableSource).not.toMatch(/\bupdate\s+public\./);
    expect(lowerExecutableSource).not.toMatch(/\binsert\s+into\b/);
    expect(lowerSource).not.toContain("service_role");
    expect(lowerSource).not.toContain("raw payload");
  });

  it("passes bounded migration runner planning without executing SQL", () => {
    const localMigrations: BoundedMigrationLocalMigration[] = [
      {
        file: planFile,
        sqlSource: source,
      },
    ];
    const plan = buildBoundedMigrationPlan({
      mode: "plan",
      allowlist: [planFile],
      localMigrations,
      remoteMigrations: [],
    });

    expect(plan.status).toBe("PASS");
    expect(plan.dryRunOnly).toBe(true);
    expect(plan.wouldWriteDb).toBe(false);
    expect(plan.dbWriteAttempted).toBe(false);
    expect(plan.manualSqlExecuted).toBe(false);
    expect(plan.selectedMigrations).toEqual([planFile]);
    expect(plan.transactionSafety[0]).toEqual(
      expect.objectContaining({
        wrapperStatus: "safe_outer_wrapper",
        outerWrapperStrippedInMemory: true,
        transactionSafe: true,
      }),
    );
  });
});
