import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260421113000_s6_director_finance_supplier_scope_summary_hardening.sql",
);

const migrationSource = fs.readFileSync(migrationPath, "utf8");

function stripSqlComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*--.*$/gm, "");
}

const executable = stripSqlComments(migrationSource).toLowerCase();

describe("S6 director finance supplier scope summary hardening migration", () => {
  it("creates the targeted supplier-scope index on finance_proposal_summary_v1", () => {
    expect(migrationSource).toContain("create index if not exists idx_fps_v1_supplier_scope_v2");
    expect(migrationSource).toContain("on public.finance_proposal_summary_v1");
    expect(migrationSource).toContain("supplier_name");
    expect(migrationSource).toContain("object_id");
    expect(migrationSource).toContain("approved_date");
    expect(migrationSource).toContain("analyze public.finance_proposal_summary_v1");
  });

  it("adds a summary-backed helper for the normal v2 runtime path", () => {
    expect(migrationSource).toContain(
      "create or replace function public.director_finance_supplier_scope_v2_summary_v1(",
    );
    expect(migrationSource).toContain("from public.finance_proposal_summary_v1 fps");
    expect(migrationSource).toContain("'financeRowsSource', 'finance_proposal_summary_v1'");
    expect(migrationSource).toContain("'overpaymentSource', 'finance_proposal_summary_v1.spend_overpay'");
    expect(migrationSource).toContain("'pathOwner', 'summary'");
  });

  it("keeps kind-filter proposal gating but removes direct raw finance rows from the summary path", () => {
    expect(migrationSource).toContain("kind_scope_proposals as (");
    expect(migrationSource).toContain("from public.v_director_finance_spend_kinds_v3 v");
    expect(executable).not.toContain("from public.list_accountant_inbox_fact(null)");
    expect(executable).not.toContain("from public.list_accountant_inbox_fact((select tab_name from scope_input))");
  });

  it("preserves supplier invoice ordering and field semantics", () => {
    expect(migrationSource).toContain("'amount', amount");
    expect(migrationSource).toContain("'paid', paid");
    expect(migrationSource).toContain("'rest', rest");
    expect(migrationSource).toContain("'isOverdue', is_overdue");
    expect(migrationSource).toContain("'isCritical', is_critical");
    expect(migrationSource).toContain("is_overdue desc");
    expect(migrationSource).toContain("due_date asc nulls last");
    expect(migrationSource).toContain("invoice_date asc nulls last");
    expect(migrationSource).toContain("proposal_id asc nulls last");
  });

  it("preserves the legacy fallback helper for summary-missing or custom due-days calls", () => {
    expect(migrationSource).toContain(
      "create or replace function public.director_finance_supplier_scope_v2_legacy_v1(",
    );
    expect(migrationSource).toContain("public.director_finance_supplier_scope_v1(");
    expect(migrationSource).toContain("'financeRowsSource', 'legacy:director_finance_supplier_scope_v1'");
    expect(migrationSource).toContain("'overpaymentSource', 'v_director_finance_spend_kinds_v3'");
    expect(migrationSource).toContain("'pathOwner', 'legacy'");
  });

  it("wraps the public v2 function in a deterministic summary-vs-legacy gate", () => {
    expect(migrationSource).toContain(
      "create or replace function public.director_finance_supplier_scope_v2(",
    );
    expect(migrationSource).toContain("exists(select 1 from public.finance_proposal_summary_v1 limit 1)");
    expect(migrationSource).toContain("then public.director_finance_supplier_scope_v2_summary_v1(");
    expect(migrationSource).toContain("else public.director_finance_supplier_scope_v2_legacy_v1(");
    expect(migrationSource).toContain("coalesce(p_due_days, 7) = 0 then 7");
    expect(migrationSource).toContain(") = 7 as use_summary");
  });

  it("does not touch unrelated finance panel, pdf, or payment write contracts", () => {
    expect(executable).not.toContain("create or replace function public.director_finance_panel_scope_v4");
    expect(executable).not.toContain("create or replace function public.pdf_director_finance_source_v1");
    expect(executable).not.toContain("alter table public.proposal_payments");
    expect(executable).not.toContain("alter table public.payment_allocations");
    expect(executable).not.toContain("create or replace function public.accounting_pay_invoice");
  });

  it("is wrapped in a transaction and reloads the schema", () => {
    expect(migrationSource.trim()).toMatch(/^begin;/i);
    expect(migrationSource.trim()).toMatch(/commit;$/i);
    expect(migrationSource).toContain("notify pgrst, 'reload schema'");
  });
});

