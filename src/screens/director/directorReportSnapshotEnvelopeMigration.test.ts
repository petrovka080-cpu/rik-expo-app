import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417044500_r2_4_director_report_snapshot_envelope.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

const volatilityFixPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417045000_r2_4_director_report_snapshot_volatility_fix.sql",
);

const volatilityFixSource = fs.readFileSync(volatilityFixPath, "utf8");

describe("R2.4 director report snapshot envelope migration", () => {
  it("creates the snapshot envelope, rebuild events, and runtime metrics", () => {
    expect(source).toContain("create table if not exists public.director_report_works_snapshots_v1");
    expect(source).toContain(
      "create table if not exists public.director_report_works_snapshot_rebuild_events_v1",
    );
    expect(source).toContain(
      "create table if not exists public.director_report_works_snapshot_runtime_metrics_v1",
    );
    expect(source).toContain("payload jsonb not null");
    expect(source).toContain("summary jsonb not null");
    expect(source).toContain("works jsonb not null");
    expect(source).toContain("payload_hash text not null");
  });

  it("defines the required metadata and snapshot identity contract", () => {
    expect(source).toContain("date_from date");
    expect(source).toContain("date_to date");
    expect(source).toContain("object_name text");
    expect(source).toContain("include_costs boolean not null default false");
    expect(source).toContain("source_high_water_mark timestamptz");
    expect(source).toContain("fact_projection_version text");
    expect(source).toContain("projection_version text not null default 'r2_4_works_snapshot_v1'");
    expect(source).toContain("rebuild_duration_ms integer");
    expect(source).toContain("row_count bigint not null default 0");
    expect(source).toContain("director_report_works_snapshots_v1_identity_idx");
  });

  it("preserves the existing facts implementation and wraps only the works path", () => {
    expect(source).toContain(
      "alter function public.director_report_fetch_works_v1(date, date, text, boolean)",
    );
    expect(source).toContain("rename to director_report_fetch_works_from_facts_v1");
    expect(source).toContain("create or replace function public.director_report_fetch_works_v1");
    expect(source).toContain("public.director_report_fetch_works_from_facts_v1(");
    expect(source).toContain("director_report_works_snapshot_status_v1");
    expect(source).not.toContain("create or replace function public.director_report_transport_scope_v1");
    expect(source).not.toContain("create or replace function public.director_report_fetch_materials_v1");
    expect(source).not.toContain("create or replace function public.director_report_canonical_decorations_v1");
  });

  it("classifies freshness and explicit fallback reasons", () => {
    expect(source).toContain("missing_snapshot");
    expect(source).toContain("version_mismatch");
    expect(source).toContain("rebuild_failed");
    expect(source).toContain("snapshot_incomplete");
    expect(source).toContain("stale_snapshot");
    expect(source).toContain("expired_snapshot");
    expect(source).toContain("p_max_age_seconds");
    expect(source).toContain("source_high_water_mark is distinct from current_source_high_water_mark");
  });

  it("keeps facts and raw fallback behavior instead of making snapshot the truth", () => {
    expect(source).toContain("when fallback_reason = 'none' then 'snapshot'");
    expect(source).toContain("then 'facts'");
    expect(source).toContain("else 'raw_fallback'");
    expect(source).toContain("v_payload := public.director_report_fetch_works_from_facts_v1");
    expect(source).toContain("R2.4 uses fresh snapshot when available, otherwise preserves facts/raw fallback behavior");
  });

  it("adds rebuild and drift proof helpers without changing money/report semantics", () => {
    expect(source).toContain("create or replace function public.director_report_works_snapshot_rebuild_v1");
    expect(source).toContain("'started'");
    expect(source).toContain("status = 'success'");
    expect(source).toContain("status = 'failed'");
    expect(source).toContain("create or replace function public.director_report_works_snapshot_drift_v1");
    expect(source).toContain("'diff_count'");
    expect(source).toContain("snapshot_payload = facts_payload");
    expect(source).toContain("preserved facts-path implementation of Director works report");
  });

  it("does not introduce out-of-scope materialization or product areas", () => {
    expect(source).not.toContain("create materialized view");
    expect(source.toLowerCase()).not.toContain("pdf");
    expect(source.toLowerCase()).not.toContain("finance");
    expect(source).not.toContain("warehouse_stock");
    expect(source).not.toContain("select public.director_report_fetch_materials_v1");
  });

  it("restores release metadata and grants", () => {
    expect(source).toContain("comment on table public.director_report_works_snapshots_v1");
    expect(source).toContain("comment on function public.director_report_fetch_works_v1");
    expect(source).toContain("grant execute on function public.director_report_works_snapshot_status_v1");
    expect(source).toContain("grant execute on function public.director_report_fetch_works_v1");
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
  });

  it("marks facts helper and drift proof as volatile because the fact scope records metrics", () => {
    expect(volatilityFixSource).toContain(
      "alter function public.director_report_fetch_works_from_facts_v1(date, date, text, boolean)",
    );
    expect(volatilityFixSource).toContain(
      "alter function public.director_report_works_snapshot_drift_v1(date, date, text, boolean)",
    );
    expect(volatilityFixSource).toContain("volatile");
    expect(volatilityFixSource).toContain("R2.3 fact scope records runtime metrics");
    expect(volatilityFixSource).toContain("notify pgrst, 'reload schema'");
    expect(volatilityFixSource.trim()).toMatch(/^begin;/);
    expect(volatilityFixSource.trim()).toMatch(/commit;$/);
  });
});
