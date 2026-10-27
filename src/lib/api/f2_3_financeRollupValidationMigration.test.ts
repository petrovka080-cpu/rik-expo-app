import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417043000_f2_3_finance_rollup_runtime_validation.sql",
);

const f22HookupPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417041500_f2_2_director_finance_panel_scope_v4_rollup_hookup.sql",
);

const artifacts = [
  "artifacts/F2_3_1_drift_signal_design.md",
  "artifacts/F2_3_1_freshness_signal_design.md",
  "artifacts/F2_3_1_rebuild_contract.md",
  "artifacts/F2_3_1_exec_summary.md",
];

const source = fs.readFileSync(migrationPath, "utf8");
const f22HookupSource = fs.readFileSync(f22HookupPath, "utf8");

function stripSqlComments(input: string): string {
  return input.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*--.*$/gm, "");
}

function bodyAfter(marker: string): string {
  const pos = source.indexOf(marker);
  expect(pos).toBeGreaterThan(-1);
  return source.slice(pos);
}

const executable = stripSqlComments(source);
const panelStart = source.indexOf("create or replace function public.director_finance_panel_scope_v4(");
const panelEnd = source.indexOf(
  "comment on function public.director_finance_panel_scope_v4",
  panelStart,
);
expect(panelStart).toBeGreaterThan(-1);
expect(panelEnd).toBeGreaterThan(panelStart);
const panelBody = source.slice(panelStart, panelEnd);

describe("F2.3 finance rollup runtime validation migration", () => {
  it("has F2.3.1 signal design artifacts", () => {
    for (const artifact of artifacts) {
      const fullPath = path.join(process.cwd(), artifact);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, "utf8");
      expect(content).toContain("F2.3");
    }
  });

  it("creates rebuild event log with status, duration, counts, and error fields", () => {
    expect(source).toContain("create table if not exists public.finance_rollup_rebuild_events_v1");
    expect(source).toContain("rebuild_id               text        not null");
    expect(source).toContain("layer                    text        not null");
    expect(source).toContain("status                   text        not null");
    expect(source).toContain("duration_ms              integer");
    expect(source).toContain("before_count             integer");
    expect(source).toContain("after_count              integer");
    expect(source).toContain("proposal_summary_count   integer");
    expect(source).toContain("error_message            text");
    expect(source).toContain("payload                  jsonb");
    expect(source).toContain("status in ('started', 'success', 'failed')");
  });

  it("records rebuild started, success, and failed events", () => {
    expect(source).toContain("finance_rollup_rebuild_event_record_v1");
    expect(source).toContain("v_rebuild_id, 'combined', 'started'");
    expect(source).toContain("v_rebuild_id, 'supplier', 'success'");
    expect(source).toContain("v_rebuild_id, 'object', 'success'");
    expect(source).toContain("v_rebuild_id, 'combined', 'failed'");
    expect(source).toContain("'error_message', v_error");
  });

  it("keeps combined rebuild order proposal then supplier then object", () => {
    const rebuildBody = bodyAfter("create or replace function public.finance_rollups_rebuild_all_v1()");
    const proposalPos = rebuildBody.indexOf("finance_proposal_summary_rebuild_all_v1()");
    const supplierPos = rebuildBody.indexOf("finance_supplier_rollup_rebuild_v1()");
    const objectPos = rebuildBody.indexOf("finance_object_rollup_rebuild_v1()");
    expect(proposalPos).toBeGreaterThan(-1);
    expect(supplierPos).toBeGreaterThan(proposalPos);
    expect(objectPos).toBeGreaterThan(supplierPos);
  });

  it("enhances drift helper with runtime row counts and missing/extra detection", () => {
    expect(source).toContain("create or replace function public.finance_rollup_drift_check_v1()");
    expect(source).toContain("'supplier_rollup_row_count'");
    expect(source).toContain("'object_rollup_row_count'");
    expect(source).toContain("'supplier_runtime_row_count'");
    expect(source).toContain("'object_runtime_row_count'");
    expect(source).toContain("'source_proposal_summary_row_count'");
    expect(source).toContain("full outer join raw_supplier");
    expect(source).toContain("full outer join raw_object");
    expect(source).toContain("fsr.supplier_id is null");
    expect(source).toContain("ro.object_key is null");
  });

  it("adds freshness helper with required statuses and rebuild metadata", () => {
    expect(source).toContain("create or replace function public.finance_rollup_status_v1(");
    for (const status of [
      "FRESH",
      "STALE_ROLLUP",
      "MISSING_ROLLUP",
      "VERSION_MISMATCH",
      "REBUILD_INCOMPLETE",
    ]) {
      expect(source).toContain(status);
    }
    expect(source).toContain("'is_fresh'");
    expect(source).toContain("'supplier_age_seconds'");
    expect(source).toContain("'object_age_seconds'");
    expect(source).toContain("'last_successful_rebuild_at'");
    expect(source).toContain("'last_rebuild_duration_ms'");
    expect(source).toContain("'last_rebuild_status'");
    expect(source).toContain("'last_rebuild_error'");
  });

  it("adds one validation snapshot helper for remote proof", () => {
    expect(source).toContain(
      "create or replace function public.finance_rollup_validation_snapshot_v1(",
    );
    expect(source).toContain("'snapshot_version', 'f2_3_v1'");
    expect(source).toContain("'drift', public.finance_rollup_drift_check_v1()");
    expect(source).toContain(
      "'freshness', public.finance_rollup_status_v1(p_max_age_seconds, p_expected_projection_version)",
    );
  });

  it("gates rollup usage by unfiltered scope, freshness, and row availability", () => {
    expect(panelBody).toContain("rollup_status as (");
    expect(panelBody).toContain("public.finance_rollup_status_v1(900, 1)");
    expect(panelBody).toContain(
      "(p_object_id is null and p_date_from is null and p_date_to is null) as unfiltered_scope",
    );
    expect(panelBody).toContain(
      "(ra.unfiltered_scope and ra.is_fresh and ra.supplier_rows_exist) as supplier_has_data",
    );
    expect(panelBody).toContain(
      "(ra.unfiltered_scope and ra.is_fresh and ra.object_rows_exist) as object_has_data",
    );
  });

  it("exposes explicit fallback reasons in panel metadata", () => {
    expect(panelBody).toContain("'supplierRollupFallbackReason'");
    expect(panelBody).toContain("'objectRollupFallbackReason'");
    for (const reason of [
      "filtered_scope",
      "missing_rollup",
      "version_mismatch",
      "rebuild_incomplete",
      "stale_rollup",
      "none",
    ]) {
      expect(panelBody).toContain(reason);
    }
  });

  it("exposes rollup freshness and validation metadata in v4 meta", () => {
    expect(panelBody).toContain("'rollupFreshnessStatus'");
    expect(panelBody).toContain("'rollupIsFresh'");
    expect(panelBody).toContain("'rollupMaxAgeSeconds'");
    expect(panelBody).toContain("'rollupLastSuccessfulRebuildAt'");
    expect(panelBody).toContain("'rollupLastRebuildStatus'");
    expect(panelBody).toContain("'rollupValidationVersion', 'f2_3_v1'");
    expect(panelBody).toContain("'rollupLayerVersion'");
    expect(panelBody).toContain("'f2_2_v1'");
  });

  it("does not auto-rebuild from director panel runtime path", () => {
    expect(panelBody).not.toContain("finance_rollups_rebuild_all_v1()");
    expect(panelBody).not.toContain("finance_supplier_rollup_rebuild_v1()");
    expect(panelBody).not.toContain("finance_object_rollup_rebuild_v1()");
  });

  it("preserves v4 document contract shape", () => {
    expect(panelBody).toContain("'document_type', 'director_finance_panel_scope'");
    expect(panelBody).toContain("'version', 'v4'");
    expect(panelBody).toContain("'canonical'");
    expect(panelBody).toContain("'summary'");
    expect(panelBody).toContain("'suppliers'");
    expect(panelBody).toContain("'objects'");
    expect(panelBody).toContain("'spend'");
    expect(panelBody).toContain("'rows'");
    expect(panelBody).toContain("'pagination'");
    expect(panelBody).toContain("'meta'");
    expect(panelBody).toContain("'payloadShapeVersion', 'v4'");
  });

  it("preserves money field calculations and does not alter truth tables", () => {
    for (const snippet of [
      "coalesce(sum(amount_total), 0)::numeric",
      "coalesce(sum(amount_paid), 0)::numeric",
      "coalesce(sum(amount_debt), 0)::numeric",
      "greatest(coalesce(nullif(trim(src.row_json->>'invoice_amount'), '')::numeric, 0) - coalesce(nullif(trim(src.row_json->>'total_paid'), '')::numeric, 0), 0)::numeric as amount_debt",
    ]) {
      expect(source).toContain(snippet);
      expect(f22HookupSource).toContain(snippet);
    }
    expect(executable).not.toContain("alter table public.proposal_payments");
    expect(executable).not.toContain("alter table public.payment_allocations");
    expect(executable).not.toContain("create or replace function public.accounting_pay_invoice");
  });

  it("grants only read/execute validation access and wraps migration safely", () => {
    expect(source).toContain("grant select on public.finance_rollup_rebuild_events_v1 to authenticated");
    expect(source).toContain("grant execute on function public.finance_rollup_drift_check_v1()");
    expect(source).toContain("grant execute on function public.finance_rollup_status_v1(integer, integer)");
    expect(source).toContain(
      "grant execute on function public.finance_rollup_validation_snapshot_v1(integer, integer)",
    );
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
    expect(source).toContain("notify pgrst, 'reload schema'");
  });
});
