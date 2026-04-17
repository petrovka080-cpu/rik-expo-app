import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417054000_f3_2_finance_panel_spend_cpu_hardening.sql",
);

const migrationSource = fs.readFileSync(migrationPath, "utf8");
const normalizedSource = migrationSource.toLowerCase();

const artifacts = [
  "artifacts/F3_2_1_spend_field_inventory.md",
  "artifacts/F3_2_1_spend_mapping.md",
  "artifacts/F3_2_1_exec_summary.md",
];

function stripSqlComments(input: string): string {
  return input.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*--.*$/gm, "");
}

const executable = stripSqlComments(migrationSource).toLowerCase();

describe("F3.2 finance panel spend CPU hardening migration", () => {
  it("has F3.2.1 inventory and mapping artifacts", () => {
    for (const artifact of artifacts) {
      const fullPath = path.join(process.cwd(), artifact);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, "utf8");
      expect(content).toContain("F3.2");
      expect(content).toContain("spend");
    }
  });

  it("creates a prepared spend projection table and metadata table", () => {
    expect(migrationSource).toContain(
      "create table if not exists public.finance_panel_spend_projection_v1",
    );
    expect(migrationSource).toContain("projection_row_no       bigint      not null");
    expect(migrationSource).toContain("kind_name               text");
    expect(migrationSource).toContain("supplier_name           text");
    expect(migrationSource).toContain("director_approved_date  date");
    expect(migrationSource).toContain("approved_alloc          numeric");
    expect(migrationSource).toContain("paid_alloc              numeric");
    expect(migrationSource).toContain("overpay_alloc           numeric");
    expect(migrationSource).toContain(
      "create table if not exists public.finance_panel_spend_projection_meta_v1",
    );
    expect(migrationSource).toContain("last_rebuild_status");
    expect(migrationSource).toContain("source_row_count");
    expect(migrationSource).toContain("projected_row_count");
  });

  it("preserves the old runtime spend source as build/proof/fallback source", () => {
    expect(migrationSource).toContain(
      "create or replace function public.finance_panel_spend_runtime_source_v1()",
    );
    expect(migrationSource).toContain("from public.v_director_finance_spend_kinds_v3 v");
    expect(migrationSource).toContain("proposal_scope_for_spend as");
    expect(migrationSource).toContain("request_identity_for_spend as");
    expect(migrationSource).toContain("purchase_scope_for_spend as");
    expect(migrationSource).toContain("coalesce(v.paid_alloc_cap, v.paid_alloc, 0)::numeric");
  });

  it("rebuilds projection from the preserved runtime source and records status", () => {
    expect(migrationSource).toContain(
      "create or replace function public.finance_panel_spend_projection_rebuild_v1()",
    );
    expect(migrationSource).toContain("truncate table public.finance_panel_spend_projection_v1");
    expect(migrationSource).toContain("from public.finance_panel_spend_runtime_source_v1() s");
    expect(migrationSource).toContain("last_rebuild_status = 'success'");
    expect(migrationSource).toContain("last_rebuild_status = 'failed'");
    expect(migrationSource).toContain("'build_source', 'finance_panel_spend_runtime_source_v1'");
  });

  it("adds status, snapshot, scope, drift, and CPU proof helpers", () => {
    for (const fn of [
      "finance_panel_spend_projection_status_v1",
      "finance_panel_spend_snapshot_v1",
      "finance_panel_spend_scope_v1",
      "finance_panel_spend_drift_check_v1",
      "finance_panel_spend_f3_2_cpu_proof_v1",
    ]) {
      expect(migrationSource).toContain(`create or replace function public.${fn}`);
    }
    expect(migrationSource).toContain("'is_ready'");
    expect(migrationSource).toContain("'diff_count'");
    expect(migrationSource).toContain("'is_drift_free'");
    expect(migrationSource).toContain("'panel_has_direct_spend_view'");
    expect(migrationSource).toContain("'panel_uses_spend_scope_helper'");
  });

  it("keeps spend money formulas identical in the prepared snapshot helper", () => {
    for (const snippet of [
      "coalesce(sum(approved_alloc), 0)::numeric as approved",
      "coalesce(sum(paid_alloc), 0)::numeric as paid",
      "coalesce(sum(overpay_alloc), 0)::numeric as overpay",
      "greatest(sum(approved_alloc) - sum(paid_alloc), 0)::numeric as to_pay",
      "greatest(coalesce(sum(k.approved), 0) - coalesce(sum(k.paid), 0), 0)::numeric as to_pay",
      "md5(lower(supplier_name))::text as supplier_id",
    ]) {
      expect(migrationSource).toContain(snippet);
    }
  });

  it("rewires only the spend section of director_finance_panel_scope_v4", () => {
    expect(migrationSource).toContain(
      "pg_get_functiondef('public.director_finance_panel_scope_v4(uuid,date,date,integer,integer,integer,integer)'::regprocedure)",
    );
    expect(migrationSource).toContain("v_start := strpos(v_definition, 'proposal_scope_for_spend as (');");
    expect(migrationSource).toContain("v_end := strpos(v_definition, 'ordered_rows as (');");
    expect(migrationSource).toContain("spend_scope_payload as (");
    expect(migrationSource).toContain("public.finance_panel_spend_scope_v1(");
    expect(migrationSource).toContain("jsonb_to_recordset(coalesce(sp.payload #> '{spend,kindRows}'");
    expect(migrationSource).toContain("jsonb_to_recordset(coalesce(sp.payload -> 'supplierOverpayRows'");
    expect(migrationSource).toContain("jsonb_to_recordset(coalesce(sp.payload -> 'objectOverpayRows'");
    expect(migrationSource).toContain("'spendRowsSource'', coalesce((select payload #>> ''{meta,source}''");
  });

  it("guards against leaving the direct spend view in the panel body", () => {
    expect(migrationSource).toContain(
      "if strpos(lower(v_hardened_definition), 'v_director_finance_spend_kinds_v3') > 0 then",
    );
    expect(migrationSource).toContain(
      "raise exception 'F3.2 replacement failed: panel still directly references v_director_finance_spend_kinds_v3'",
    );
    expect(migrationSource).toContain(
      "'panel_has_direct_spend_view', position('v_director_finance_spend_kinds_v3'",
    );
  });

  it("does not touch supplier detail, PDF/export, or finance write paths", () => {
    expect(executable).not.toContain("create or replace function public.director_finance_supplier_scope_v1");
    expect(executable).not.toContain("create or replace function public.director_finance_supplier_scope_v2");
    expect(executable).not.toContain("create or replace function public.pdf_director_finance_source_v1");
    expect(executable).not.toContain("alter table public.proposal_payments");
    expect(executable).not.toContain("alter table public.payment_allocations");
    expect(executable).not.toContain("create or replace function public.accounting_pay_invoice");
  });

  it("wraps migration safely and grants read/proof access", () => {
    expect(normalizedSource.trim()).toMatch(/^begin;/);
    expect(normalizedSource.trim()).toMatch(/commit;$/);
    expect(migrationSource).toContain("select public.finance_panel_spend_projection_rebuild_v1();");
    expect(migrationSource).toContain("grant select on public.finance_panel_spend_projection_v1 to authenticated");
    expect(migrationSource).toContain(
      "grant execute on function public.finance_panel_spend_drift_check_v1(uuid, date, date) to authenticated",
    );
    expect(migrationSource).toContain("notify pgrst, 'reload schema'");
  });
});
