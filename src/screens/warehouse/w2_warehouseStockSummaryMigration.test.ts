import fs from "fs";
import path from "path";

const summaryMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417030000_w2_warehouse_stock_summary_v1.sql",
);

const hookupMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417031500_w2_warehouse_stock_scope_v2_summary_hookup.sql",
);

const summarySource = fs.readFileSync(summaryMigrationPath, "utf8");
const hookupSource = fs.readFileSync(hookupMigrationPath, "utf8");

describe("W2 warehouse stock summary migration", () => {
  describe("summary table migration", () => {
    it("creates the summary table with correct name", () => {
      expect(summarySource).toContain(
        "create table if not exists public.warehouse_stock_summary_v1",
      );
    });

    it("has composite primary key (code, uom_id)", () => {
      expect(summarySource).toContain("constraint pk_wss_v1 primary key (code, uom_id)");
    });

    it("has qty_available as numeric not null", () => {
      expect(summarySource).toContain("qty_available     numeric     not null default 0");
    });

    it("has display_name for pre-resolved names", () => {
      expect(summarySource).toContain("display_name");
    });

    it("includes freshness stamps", () => {
      expect(summarySource).toContain("projection_version");
      expect(summarySource).toContain("rebuilt_at");
    });

    it("creates indexes", () => {
      expect(summarySource).toContain("idx_wss_v1_code_upper");
      expect(summarySource).toContain("idx_wss_v1_rebuilt_at");
    });

    it("creates full rebuild function", () => {
      expect(summarySource).toContain(
        "create or replace function public.warehouse_stock_summary_rebuild_all_v1()",
      );
      expect(summarySource).toContain("truncate table warehouse_stock_summary_v1");
      expect(summarySource).toContain("'strategy', 'full_truncate_rebuild'");
    });

    it("creates drift check function", () => {
      expect(summarySource).toContain(
        "create or replace function public.warehouse_stock_summary_drift_check_v1()",
      );
      expect(summarySource).toContain("'GREEN'");
      expect(summarySource).toContain("'DRIFT_DETECTED'");
    });

    it("uses exact same source view as stock scope v2", () => {
      expect(summarySource).toContain("v_wh_balance_ledger_truth_ui");
    });

    it("uses same name resolution chain as stock scope v2", () => {
      expect(summarySource).toContain("warehouse_name_map_ui");
      expect(summarySource).toContain("catalog_name_overrides");
      expect(summarySource).toContain("v_wh_balance_ledger_ui");
    });

    it("executes initial backfill", () => {
      expect(summarySource).toContain(
        "select public.warehouse_stock_summary_rebuild_all_v1()",
      );
    });

    it("grants select to authenticated", () => {
      expect(summarySource).toContain(
        "grant select on public.warehouse_stock_summary_v1 to authenticated",
      );
    });

    it("is wrapped in transaction", () => {
      expect(summarySource.trim()).toMatch(/^begin;/);
      expect(summarySource.trim()).toMatch(/commit;$/);
    });

    it("notifies PostgREST schema reload", () => {
      expect(summarySource).toContain("notify pgrst, 'reload schema'");
    });

    it("marks table as not a source of stock truth", () => {
      expect(summarySource).toContain("NOT a source of stock truth");
    });

    it("does not modify warehouse write tables", () => {
      expect(summarySource).not.toContain("alter table public.warehouse_incoming_items");
      expect(summarySource).not.toContain("alter table public.warehouse_issue_items");
      expect(summarySource).not.toContain("create or replace function public.warehouse_receive_apply");
    });
  });

  describe("v2 hookup migration", () => {
    it("replaces warehouse_stock_scope_v2 function", () => {
      expect(hookupSource).toContain(
        "create or replace function public.warehouse_stock_scope_v2(",
      );
    });

    it("reads from warehouse_stock_summary_v1", () => {
      expect(hookupSource).toContain("warehouse_stock_summary_v1");
    });

    it("has summary availability check", () => {
      expect(hookupSource).toContain("summary_available");
      expect(hookupSource).toContain("has_data");
    });

    it("has raw fallback via UNION ALL", () => {
      expect(hookupSource).toContain("union all");
      expect(hookupSource).toContain("v_wh_balance_ledger_truth_ui");
    });

    it("preserves v2 document contract", () => {
      expect(hookupSource).toContain("'document_type', 'warehouse_stock_scope'");
      expect(hookupSource).toContain("'version', 'v2'");
      expect(hookupSource).toContain("'payload_shape_version', 'v2'");
    });

    it("tags summary layer version in meta", () => {
      expect(hookupSource).toContain("'summary_layer_version'");
      expect(hookupSource).toContain("'w2_v1'");
    });

    it("tags the rows source based on summary availability", () => {
      expect(hookupSource).toContain("'rows_source'");
      expect(hookupSource).toContain("'warehouse_stock_summary_v1'");
    });

    it("preserves same output structure", () => {
      expect(hookupSource).toContain("'material_id'");
      expect(hookupSource).toContain("'code'");
      expect(hookupSource).toContain("'name'");
      expect(hookupSource).toContain("'uom_id'");
      expect(hookupSource).toContain("'qty_on_hand'");
      expect(hookupSource).toContain("'qty_reserved'");
      expect(hookupSource).toContain("'qty_available'");
      expect(hookupSource).toContain("'updated_at'");
    });

    it("preserves grant to authenticated", () => {
      expect(hookupSource).toContain(
        "grant execute on function public.warehouse_stock_scope_v2(",
      );
    });

    it("is wrapped in transaction", () => {
      expect(hookupSource.trim()).toMatch(/^begin;/);
      expect(hookupSource.trim()).toMatch(/commit;$/);
    });

    it("does not modify warehouse write tables", () => {
      expect(hookupSource).not.toContain("alter table public.warehouse_incoming_items");
      expect(hookupSource).not.toContain("alter table public.warehouse_issue_items");
    });
  });
});
