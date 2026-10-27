import fs from "fs";
import path from "path";

const summaryMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417020000_f2_1_finance_proposal_summary_v1.sql",
);

const hookupMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417021500_f2_1_director_finance_panel_scope_v4_summary_hookup.sql",
);

const summarySource = fs.readFileSync(summaryMigrationPath, "utf8");
const hookupSource = fs.readFileSync(hookupMigrationPath, "utf8");

describe("F2.1 finance proposal summary migration", () => {
  describe("summary table migration", () => {
    it("creates the summary table with correct name", () => {
      expect(summarySource).toContain(
        "create table if not exists public.finance_proposal_summary_v1",
      );
    });

    it("has proposal_id as primary key", () => {
      expect(summarySource).toContain("proposal_id       text      not null primary key");
    });

    it("defines money fields with numeric type and non-null defaults", () => {
      expect(summarySource).toContain("amount_total      numeric   not null default 0");
      expect(summarySource).toContain("amount_paid       numeric   not null default 0");
      expect(summarySource).toContain("amount_debt       numeric   not null default 0");
    });

    it("has check constraint preventing negative debt", () => {
      expect(summarySource).toContain("chk_fps_v1_amount_debt_nonneg");
      expect(summarySource).toContain("check (amount_debt >= 0)");
    });

    it("has check constraint preventing negative spend_to_pay", () => {
      expect(summarySource).toContain("chk_fps_v1_spend_to_pay_nonneg");
      expect(summarySource).toContain("check (spend_to_pay >= 0)");
    });

    it("includes freshness stamps", () => {
      expect(summarySource).toContain("projection_version");
      expect(summarySource).toContain("rebuilt_at");
      expect(summarySource).toContain("source_snapshot_id");
    });

    it("creates required indexes", () => {
      expect(summarySource).toContain("idx_fps_v1_object_id");
      expect(summarySource).toContain("idx_fps_v1_approved_date");
      expect(summarySource).toContain("idx_fps_v1_supplier_id");
      expect(summarySource).toContain("idx_fps_v1_rebuilt_at");
    });

    it("creates full rebuild function", () => {
      expect(summarySource).toContain(
        "create or replace function public.finance_proposal_summary_rebuild_all_v1()",
      );
      expect(summarySource).toContain("truncate table finance_proposal_summary_v1");
      expect(summarySource).toContain("'strategy', 'full_truncate_rebuild'");
    });

    it("creates single-proposal rebuild function", () => {
      expect(summarySource).toContain(
        "create or replace function public.finance_proposal_summary_rebuild_one_v1(",
      );
      expect(summarySource).toContain("p_proposal_id text");
    });

    it("creates drift check function", () => {
      expect(summarySource).toContain(
        "create or replace function public.finance_proposal_summary_drift_check_v1()",
      );
      expect(summarySource).toContain("'drift_count'");
      expect(summarySource).toContain("'GREEN'");
      expect(summarySource).toContain("'DRIFT_DETECTED'");
    });

    it("executes initial backfill", () => {
      expect(summarySource).toContain(
        "select public.finance_proposal_summary_rebuild_all_v1()",
      );
    });

    it("grants select to authenticated", () => {
      expect(summarySource).toContain(
        "grant select on public.finance_proposal_summary_v1 to authenticated",
      );
    });

    it("grants execute on rebuild functions to authenticated", () => {
      expect(summarySource).toContain(
        "grant execute on function public.finance_proposal_summary_rebuild_all_v1() to authenticated",
      );
      expect(summarySource).toContain(
        "grant execute on function public.finance_proposal_summary_rebuild_one_v1(text) to authenticated",
      );
      expect(summarySource).toContain(
        "grant execute on function public.finance_proposal_summary_drift_check_v1() to authenticated",
      );
    });

    it("uses exact same source tables as v4 function", () => {
      expect(summarySource).toContain("list_accountant_inbox_fact(null)");
      expect(summarySource).toContain("v_director_finance_spend_kinds_v3");
      expect(summarySource).toContain("proposal_items");
      expect(summarySource).toContain("request_items");
      expect(summarySource).toContain("request_object_identity_scope_v1");
      expect(summarySource).toContain("purchases");
    });

    it("uses greatest(total - paid, 0) for amount_debt", () => {
      expect(summarySource).toContain("greatest(");
      // Verify the canonical debt calculation pattern
      const debtPatternCount = (summarySource.match(/greatest\(/g) || []).length;
      expect(debtPatternCount).toBeGreaterThanOrEqual(2); // debt + spend_to_pay
    });

    it("is wrapped in transaction", () => {
      expect(summarySource.trim()).toMatch(/^begin;/);
      expect(summarySource.trim()).toMatch(/commit;$/);
    });

    it("notifies PostgREST schema reload", () => {
      expect(summarySource).toContain("notify pgrst, 'reload schema'");
    });

    it("does not modify payment/allocation tables", () => {
      expect(summarySource).not.toContain("create or replace function public.accounting_pay_invoice");
      expect(summarySource).not.toContain("alter table public.proposal_payments");
      expect(summarySource).not.toContain("alter table public.payment_allocations");
    });

    it("marks table as not a source of financial truth", () => {
      expect(summarySource).toContain("NOT a source of financial truth");
    });
  });

  describe("v4 hookup migration", () => {
    it("replaces the director_finance_panel_scope_v4 function", () => {
      expect(hookupSource).toContain(
        "create or replace function public.director_finance_panel_scope_v4(",
      );
    });

    it("reads from finance_proposal_summary_v1", () => {
      expect(hookupSource).toContain("finance_proposal_summary_v1");
    });

    it("has summary availability check", () => {
      expect(hookupSource).toContain("summary_available");
      expect(hookupSource).toContain("has_data");
    });

    it("has raw fallback via UNION ALL", () => {
      expect(hookupSource).toContain("union all");
      expect(hookupSource).toContain("list_accountant_inbox_fact(null)");
    });

    it("preserves v4 document contract", () => {
      expect(hookupSource).toContain("'document_type', 'director_finance_panel_scope'");
      expect(hookupSource).toContain("'version', 'v4'");
      expect(hookupSource).toContain("'sourceVersion', 'director_finance_panel_scope_v4'");
      expect(hookupSource).toContain("'payloadShapeVersion', 'v4'");
    });

    it("tags summary layer version in meta", () => {
      expect(hookupSource).toContain("'summaryLayerVersion'");
      expect(hookupSource).toContain("'f2_1_v1'");
    });

    it("tags the finance rows source based on summary availability", () => {
      expect(hookupSource).toContain("'financeRowsSource'");
      expect(hookupSource).toContain("'finance_proposal_summary_v1'");
    });

    it("still reads spend from v_director_finance_spend_kinds_v3", () => {
      expect(hookupSource).toContain("v_director_finance_spend_kinds_v3");
      expect(hookupSource).toContain("'spendRowsSource', 'v_director_finance_spend_kinds_v3'");
    });

    it("preserves the same output structure", () => {
      expect(hookupSource).toContain("'canonical'");
      expect(hookupSource).toContain("'summary'");
      expect(hookupSource).toContain("'suppliers'");
      expect(hookupSource).toContain("'objects'");
      expect(hookupSource).toContain("'spend'");
      expect(hookupSource).toContain("'rows'");
      expect(hookupSource).toContain("'pagination'");
      expect(hookupSource).toContain("'meta'");
    });

    it("uses summary_row.row_count for pagination total (F1 hardening preserved)", () => {
      expect(hookupSource).toContain("coalesce((select row_count from summary_row), 0)");
    });

    it("preserves grant to authenticated", () => {
      expect(hookupSource).toContain(
        "grant execute on function public.director_finance_panel_scope_v4(",
      );
    });

    it("is wrapped in transaction", () => {
      expect(hookupSource.trim()).toMatch(/^begin;/);
      expect(hookupSource.trim()).toMatch(/commit;$/);
    });

    it("does not modify payment truth tables", () => {
      expect(hookupSource).not.toContain("alter table public.proposal_payments");
      expect(hookupSource).not.toContain("alter table public.payment_allocations");
      expect(hookupSource).not.toContain("create or replace function public.accounting_pay_invoice");
    });
  });
});
