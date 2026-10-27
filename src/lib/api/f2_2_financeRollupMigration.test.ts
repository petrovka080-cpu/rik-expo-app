import fs from "fs";
import path from "path";

const rollupTablesMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417040000_f2_2_finance_rollup_tables.sql",
);

const rollupHookupMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417041500_f2_2_director_finance_panel_scope_v4_rollup_hookup.sql",
);

const rollupSource = fs.readFileSync(rollupTablesMigrationPath, "utf8");
const hookupSource = fs.readFileSync(rollupHookupMigrationPath, "utf8");

function stripSqlComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*--.*$/gm, "");
}

const rollupExecutableSource = stripSqlComments(rollupSource);
const hookupExecutableSource = stripSqlComments(hookupSource);

describe("F2.2 finance rollup migration", () => {
  describe("rollup tables migration", () => {
    it("creates supplier rollup table", () => {
      expect(rollupSource).toContain(
        "create table if not exists public.finance_supplier_rollup_v1",
      );
    });

    it("creates object rollup table", () => {
      expect(rollupSource).toContain(
        "create table if not exists public.finance_object_rollup_v1",
      );
    });

    it("supplier table has correct primary key", () => {
      expect(rollupSource).toContain("constraint pk_fsr_v1 primary key (supplier_id)");
    });

    it("object table has correct primary key", () => {
      expect(rollupSource).toContain("constraint pk_for_v1 primary key (object_key)");
    });

    it("both tables have amount fields as numeric not null", () => {
      expect(rollupSource).toContain("amount_total        numeric     not null default 0");
      expect(rollupSource).toContain("amount_paid         numeric     not null default 0");
      expect(rollupSource).toContain("amount_debt         numeric     not null default 0");
    });

    it("both tables have due_buckets JSONB field", () => {
      expect(rollupSource).toContain("due_buckets         jsonb       not null default '[]'");
    });

    it("both tables have freshness stamps", () => {
      expect(rollupSource).toContain("projection_version");
      expect(rollupSource).toContain("rebuilt_at");
    });

    it("creates debt-sorted indexes", () => {
      expect(rollupSource).toContain("idx_fsr_v1_debt_total");
      expect(rollupSource).toContain("idx_for_v1_debt_total");
      expect(rollupSource).toContain("idx_fsr_v1_rebuilt_at");
      expect(rollupSource).toContain("idx_for_v1_rebuilt_at");
    });

    it("creates supplier rollup rebuild function", () => {
      expect(rollupSource).toContain(
        "create or replace function public.finance_supplier_rollup_rebuild_v1()",
      );
      expect(rollupSource).toContain("truncate table finance_supplier_rollup_v1");
    });

    it("creates object rollup rebuild function", () => {
      expect(rollupSource).toContain(
        "create or replace function public.finance_object_rollup_rebuild_v1()",
      );
      expect(rollupSource).toContain("truncate table finance_object_rollup_v1");
    });

    it("creates combined rollup rebuild function", () => {
      expect(rollupSource).toContain(
        "create or replace function public.finance_rollups_rebuild_all_v1()",
      );
    });

    it("creates drift check function with GREEN/DRIFT_DETECTED", () => {
      expect(rollupSource).toContain(
        "create or replace function public.finance_rollup_drift_check_v1()",
      );
      expect(rollupSource).toContain("'GREEN'");
      expect(rollupSource).toContain("'DRIFT_DETECTED'");
    });

    it("drift check covers both supplier and object", () => {
      expect(rollupSource).toContain("supplier_drift_count");
      expect(rollupSource).toContain("object_drift_count");
    });

    it("builds rollups FROM finance_proposal_summary_v1 (not raw tables)", () => {
      expect(rollupSource).toContain("from public.finance_proposal_summary_v1 fps");
    });

    it("does NOT reference list_accountant_inbox_fact (raw source is in proposal layer)", () => {
      // The rollup tables file builds from finance_proposal_summary_v1, not raw sources.
      // list_accountant_inbox_fact is only in the proposal summary migration and the v4 hookup.
      expect(rollupExecutableSource).not.toContain("list_accountant_inbox_fact");
      expect(rollupExecutableSource).toContain("from public.finance_proposal_summary_v1");
    });

    it("aggregates using sum(amount_total/paid/debt)", () => {
      expect(rollupSource).toContain("coalesce(sum(fps.amount_total), 0)::numeric");
      expect(rollupSource).toContain("coalesce(sum(fps.amount_paid), 0)::numeric");
      expect(rollupSource).toContain("coalesce(sum(fps.amount_debt), 0)::numeric");
    });

    it("stores due_buckets with due_date and amount_debt", () => {
      expect(rollupSource).toContain("'due_date', fps.due_date");
      expect(rollupSource).toContain("'amount_debt', fps.amount_debt");
    });

    it("rollup strategy is full_truncate_rebuild", () => {
      expect(rollupSource).toContain("'strategy', 'full_truncate_rebuild'");
    });

    it("grants select to authenticated on both tables", () => {
      expect(rollupSource).toContain(
        "grant select on public.finance_supplier_rollup_v1 to authenticated",
      );
      expect(rollupSource).toContain(
        "grant select on public.finance_object_rollup_v1   to authenticated",
      );
    });

    it("executes initial backfill for both tables", () => {
      expect(rollupSource).toContain(
        "select public.finance_supplier_rollup_rebuild_v1()",
      );
      expect(rollupSource).toContain(
        "select public.finance_object_rollup_rebuild_v1()",
      );
    });

    it("is wrapped in transaction", () => {
      expect(rollupSource.trim()).toMatch(/^begin;/);
      expect(rollupSource.trim()).toMatch(/commit;$/);
    });

    it("notifies PostgREST schema reload", () => {
      expect(rollupSource).toContain("notify pgrst, 'reload schema'");
    });

    it("marks tables as NOT a source of financial truth", () => {
      expect(rollupSource).toContain("NOT a source of financial truth");
    });

    it("does not modify payment truth tables", () => {
      expect(rollupSource).not.toContain("alter table public.proposal_payments");
      expect(rollupSource).not.toContain("alter table public.payment_allocations");
      expect(rollupSource).not.toContain("create or replace function public.accounting_pay_invoice");
    });

    it("combined rebuild function calls proposal, supplier, object in order", () => {
      // Find the combined function body
      const combinedStart = rollupSource.indexOf("function public.finance_rollups_rebuild_all_v1()");
      expect(combinedStart).toBeGreaterThan(-1);
      const combinedBody = rollupSource.slice(combinedStart);
      // Within the combined function, proposal is assigned first, then supplier, then object
      const proposalPos = combinedBody.indexOf("finance_proposal_summary_rebuild_all_v1()");
      const supplierPos = combinedBody.indexOf("finance_supplier_rollup_rebuild_v1()");
      const objectPos   = combinedBody.indexOf("finance_object_rollup_rebuild_v1()");
      expect(proposalPos).toBeGreaterThan(-1);
      expect(supplierPos).toBeGreaterThan(proposalPos);
      expect(objectPos).toBeGreaterThan(supplierPos);
    });

    it("drift check detects missing and extra rollup rows", () => {
      expect(rollupExecutableSource).toContain("full outer join raw_supplier");
      expect(rollupExecutableSource).toContain("where fsr.supplier_id is null");
      expect(rollupExecutableSource).toContain("or rs.supplier_id is null");
      expect(rollupExecutableSource).toContain("full outer join raw_object");
      expect(rollupExecutableSource).toContain("where fol.object_key is null");
      expect(rollupExecutableSource).toContain("or ro.object_key is null");
    });
  });

  describe("v4 rollup hookup migration", () => {
    it("replaces director_finance_panel_scope_v4", () => {
      expect(hookupSource).toContain(
        "create or replace function public.director_finance_panel_scope_v4(",
      );
    });

    it("reads from finance_supplier_rollup_v1", () => {
      expect(hookupSource).toContain("finance_supplier_rollup_v1");
    });

    it("reads from finance_object_rollup_v1", () => {
      expect(hookupSource).toContain("finance_object_rollup_v1");
    });

    it("has rollup availability checks", () => {
      expect(hookupSource).toContain("rollup_available");
      expect(hookupSource).toContain("unfiltered_scope");
      expect(hookupSource).toContain("supplier_has_data");
      expect(hookupSource).toContain("object_has_data");
    });

    it("uses rollup fast path only for unfiltered panel scope", () => {
      expect(hookupExecutableSource).toContain(
        "(p_object_id is null and p_date_from is null and p_date_to is null) as unfiltered_scope",
      );
      expect(hookupExecutableSource).toContain(
        "(p_object_id is null and p_date_from is null and p_date_to is null)\n      and exists(select 1 from public.finance_supplier_rollup_v1 limit 1) as supplier_has_data",
      );
      expect(hookupExecutableSource).toContain(
        "(p_object_id is null and p_date_from is null and p_date_to is null)\n      and exists(select 1 from public.finance_object_rollup_v1   limit 1) as object_has_data",
      );
    });

    it("has runtime overdue calculation from due_buckets", () => {
      expect(hookupSource).toContain("due_buckets");
      expect(hookupSource).toContain("b->>'due_date'");
      expect(hookupSource).toContain("b->>'amount_debt'");
      expect(hookupSource).toContain("current_date");
    });

    it("has UNION ALL fallback for supplier", () => {
      const supplierSection = hookupSource.indexOf("supplier_finance_rows as (");
      const unionAllPos = hookupSource.indexOf("union all", supplierSection);
      expect(unionAllPos).toBeGreaterThan(supplierSection);
    });

    it("has UNION ALL fallback for object", () => {
      const objectSection = hookupSource.indexOf("object_finance_rows as (");
      const unionAllPos = hookupSource.indexOf("union all", objectSection);
      expect(unionAllPos).toBeGreaterThan(objectSection);
    });

    it("preserves F2.1 proposal summary basis", () => {
      expect(hookupSource).toContain("summary_available");
      expect(hookupSource).toContain("finance_proposal_summary_v1");
    });

    it("preserves v4 document contract", () => {
      expect(hookupSource).toContain("'document_type', 'director_finance_panel_scope'");
      expect(hookupSource).toContain("'version', 'v4'");
      expect(hookupSource).toContain("'payloadShapeVersion', 'v4'");
    });

    it("tags rollup layer version in meta", () => {
      expect(hookupSource).toContain("'rollupLayerVersion'");
      expect(hookupSource).toContain("'f2_2_v1'");
    });

    it("tags supplier and object rollup sources in meta", () => {
      expect(hookupSource).toContain("'supplierRollupSource'");
      expect(hookupSource).toContain("'finance_supplier_rollup_v1'");
      expect(hookupSource).toContain("'objectRollupSource'");
      expect(hookupSource).toContain("'finance_object_rollup_v1'");
    });

    it("preserves spend section from v_director_finance_spend_kinds_v3", () => {
      expect(hookupSource).toContain("v_director_finance_spend_kinds_v3");
      expect(hookupSource).toContain("'spendRowsSource', 'v_director_finance_spend_kinds_v3'");
    });

    it("preserves output fields: suppliers, objects, spend, rows, pagination, meta", () => {
      expect(hookupSource).toContain("'suppliers'");
      expect(hookupSource).toContain("'objects'");
      expect(hookupSource).toContain("'spend'");
      expect(hookupSource).toContain("'rows'");
      expect(hookupSource).toContain("'pagination'");
      expect(hookupSource).toContain("'meta'");
    });

    it("supplier output includes all required fields", () => {
      expect(hookupSource).toContain("'supplierId'");
      expect(hookupSource).toContain("'supplierName'");
      expect(hookupSource).toContain("'approvedTotal'");
      expect(hookupSource).toContain("'paidTotal'");
      expect(hookupSource).toContain("'debtTotal'");
      expect(hookupSource).toContain("'overpaymentTotal'");
      expect(hookupSource).toContain("'invoiceCount'");
      expect(hookupSource).toContain("'debtCount'");
      expect(hookupSource).toContain("'overdueCount'");
      expect(hookupSource).toContain("'criticalCount'");
      expect(hookupSource).toContain("'overdueAmount'");
      expect(hookupSource).toContain("'criticalAmount'");
    });

    it("object output includes all required fields", () => {
      expect(hookupSource).toContain("'objectKey'");
      expect(hookupSource).toContain("'objectId'");
      expect(hookupSource).toContain("'objectCode'");
      expect(hookupSource).toContain("'objectName'");
    });

    it("is wrapped in transaction", () => {
      expect(hookupSource.trim()).toMatch(/^begin;/);
      expect(hookupSource.trim()).toMatch(/commit;$/);
    });

    it("does not modify payment truth tables", () => {
      expect(hookupSource).not.toContain("alter table public.proposal_payments");
      expect(hookupSource).not.toContain("alter table public.payment_allocations");
    });
  });
});
